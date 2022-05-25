import os
import json
import numpy as np
import rpy2.robjects as ro


def build_tree(nodes):
    stack = []
    for node in nodes:
        if len(stack) == 0:
            stack.append(node)
        else:
            parent = stack[len(stack) - 1]

            while len(parent['children']) == 2:
                stack.pop()
                parent = stack[len(stack) - 1]

            if len(parent['children']) < 2:
                parent['children'].append(node)

                node['depth'] = len(stack)

                if node['type'] == 'node':
                    stack.append(node)
    return stack[0]


def parse(path, **kwargs):
    # change to absolute path if necessary
    if not path.startswith("/"):
        path = os.path.join(os.path.dirname(__file__), path)

    print("* Loading CART structure from file " + path)

    # get file ending to determine format
    format_key = str(path.split(".").pop())

    if format_key in FORMATS.keys():
        return FORMATS[format_key](path, **kwargs)
    else:
        raise NotImplementedError("File format " + format_key + " not implemented.")


def _parse_json(path, **kwargs):
    fit = json.load(open(path))

    if 'origin' not in kwargs.keys():
        raise NotImplementedError("Unsure what file format to use, please specify manually by setting field \'origin\'")

    if kwargs['origin'] in FORMATS:
        return FORMATS[kwargs['origin']](fit, **kwargs)


def _parse_r(path, **kwargs):
    # TODO check if R is installed and package rpy2 works

    # load r object
    ro.r['load'](path)

    # get the name of the r object
    # if no name is passed as an argument,
    # use the first object in the environment
    name = kwargs['name'] if 'name' in kwargs.keys() else list(ro.r['ls']())[0]
    kwargs['name'] = name

    print('* CART originates from R with name \'' + name + '\'')

    # use r object's class attribute to determine origin of file
    format_key = 'RData.' + list(ro.r['attr'](ro.r[name], 'class'))[0]

    if format_key in FORMATS.keys():
        return FORMATS[format_key](**kwargs)
    else:
        raise NotImplementedError("File format " + format_key + " not implemented.")


def _parse_rpart_class(**kwargs):

    # ----------- HELPER FUNCTIONS ----------
    def rdf_to_dict(df: ro.DataFrame):
        return dict(zip(list(df.names), map(list, list(df))))

    # TODO write one function that generates depth and number of attached children
    # count total children
    # def write_degree_below(node):
    #     if len(node['children']) == 0:
    #         node['degree'] = 0
    #         return 0
    #     else:
    #         node['degree'] = write_degree_below(node['children'][0]) + \
    #                          write_degree_below(node['children'][1]) + len(node['children'])
    #         return node['degree']
    #
    # def write_data_id_below(node, found_in_leaf):
    #     if node['type'] == 'leaf':
    #         node['data_id'] = np.sort(np.where(found_in_leaf == node['id'])[0]).tolist()
    #     else:
    #         node['data_id'] = write_data_id_below(node['children'][0], found_in_leaf) + \
    #                           write_data_id_below(node['children'][1], found_in_leaf)
    #     return node['data_id']

    # ----------- PARSING RPART ----------
    name = kwargs['name']
    fit = ro.r[name]

    print('* CART originates from \'rpart\' and is a classification tree')

    # number of nodes
    n_nodes = fit[0].nrow

    # get feature list
    features = list(ro.r['attr'](fit[13], 'names'))
    classes  = list(ro.r['attr'](fit, 'ylevels'))

    # dictionary of all the values in each node per variable
    frame = fit[0]
    frame = rdf_to_dict(frame)

    # array of the split info (there are additional surrogate splits)
    splits = fit[10]
    splits = np.array(splits)

    # extract split indices (WORKAROUND)
    # see https://stackoverflow.com/questions/56209774/extract-split-values-from-rpart-object-in-r
    split_index = [0]
    for i in range(n_nodes):
        j = frame['ncompete'][i] + frame['nsurrogate'][i] + (frame['var'][i] != '<leaf>')
        split_index.append(split_index[len(split_index) - 1] + j)
    split_index.pop()

    # extract info on the class distribution at each node
    # in 'yval2' the prediction, absolute and relative distribution and
    # proportion in terms of the total sample number are saved
    class_dist = np.array(frame['yval2'])
    class_dist = np.split(class_dist, int(len(class_dist) / n_nodes))
    class_dist = np.transpose(class_dist)
    n_classes = int((class_dist.shape[1] - 2) / 2)

    # extract info on where the entries in the database ended up
    # - 1 because the root node is 0 here
    found_in_leaf = np.array(fit[1]) - 1

    # setup tree, the first element references the root node
    stack = []

    # go through all nodes and set up structure
    for i in range(n_nodes):
        node = {
            'children': [],
            #'id': i,
            'type': 'root' if i == 0 else ('leaf' if frame['var'][i] == '<leaf>' else 'node'),
            #'depth': 0,  # root node, other nodes will be overwritten
            #'degree': -1,
            'samples': frame['n'][i],
            'data_id': -1,
            'distribution': list(class_dist[i, 1:(n_classes + 1)]),
            'vote': int(class_dist[i, 0])
        }

        if not node['type'] == 'leaf':
            split = splits[split_index[i]]
            node['split'] = {
                'feature': frame['var'][i],
                'operator': '<' if split[1] < 0 else '>',
                'location': split[3]
            }

        # reconstruct tree structure
        # TODO Use the outsourced function to do this
        if len(stack) == 0:
            stack.append(node)
        else:
            parent = stack[len(stack) - 1]

            while len(parent['children']) == 2:
                stack.pop()
                parent = stack[len(stack) - 1]

            if len(parent['children']) < 2:
                parent['children'].append(node)

                node['depth'] = len(stack)

                if node['type'] == 'node':
                    stack.append(node)

    # count the total number of children per node
    #write_degree_below(stack[0])

    # for each observation, write the data id into each node
    # that is traversed during the decision
    #write_data_id_below(stack[0], found_in_leaf)

    meta = {
        'type': 'classification',
        'features': features,
        'classes': classes,
        'samples': stack[0]['samples'],
    }

    return {'meta': meta, 'tree': stack[0]}


def _parse_fitctree(fit: dict, **kwargs: dict) -> dict:
    """
    Parse a *.json* object that was generated using Matlab's ``jsonencode`` function
    from the result of a call to ``fitctree``.

    :param fit: The *.json* object that was produced by Matlab
    :param kwargs: Additional arguments for parsing the object
    :return: A common representation of the tree
    """

    print('* CART originates from MATLAB\'s function fitctree')

    # general info describing the tree
    meta = {
        'type': 'classification',
        'features': fit['PredictorNames'],
        'classes': fit['ClassNames'],
        'samples': fit['NumObservations']
    }

    # total number of nodes
    n_nodes = fit['NumNodes']

    # go through all nodes, they are organized in a level-first manner
    nodes = []
    for i in range(fit['NumNodes']):
        # info about the node
        node = {
            'children': [],
            'type': 'root' if fit['Parent'][i] == 0 else ('leaf' if sum(fit['Children'][i]) == 0 else 'node'),
            'samples': fit['NodeSize'][i],
            'distribution': fit['ClassCount'][i],
            'vote': int(np.argmax(fit['ClassProbability'][i]))
        }

        # add info about split, whenever node is not leaf
        if fit['CutPoint'][i] is not None:
            node['split'] = {
                'feature': fit['CutPredictorIndex'][i] - 1,
                'operator': '<',
                'location': fit['CutPoint'][i]
            }

        nodes.append(node)

    # assemble tree structure
    return {'meta': meta, 'tree': build_tree(nodes)}


FORMATS = {
    'json': _parse_json,
    'RData': _parse_r,
    'RData.rpart': _parse_rpart_class,
    'MAT.fitctree': _parse_fitctree
}

# -- iris database --
# r = parse("../example/iris.RData")
# file = open("../example/iris.json", "w")
# file.write(json.dumps(r))
# file.close()

# -- diabetes database --
# r = parse("../example/diabetes.RData")
# file = open("../example/diabetes.json", "w")
# file.write(json.dumps(r))
# file.close()

# -- matlab iris database --
mat = parse("../example/Matlab/output.json", origin="MAT.fitctree")
file = open("../example/Matlab/iris.json", "w")
file.write(json.dumps(mat))
file.close()