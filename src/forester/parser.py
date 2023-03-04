"""
Conversion from Matlab, R, Python to Forester
=============================================

Module that implements conversion functionality for common R, Matlab and Python function that
train classification or regression trees. From the output of these functions, a common 
representation is extracted and given in `.json` format. This file can than be loaded in 
Forester

| As of today, the following functions are supported:  
| - Matlab's ``fitctree``
| - R's ``rpart``

.. note:: For the R functionality to work, the user needs to have a **running installation
          of R studio** and needs to have the Python module **rpy2 installed**.
"""

import os
import json
import numpy as np
import rpy2.robjects as ro
from loguru import logger


class UnknownFormatException(Exception):
    pass


def _build_tree(nodes):
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

                if node['type'] == 'node':
                    stack.append(node)
    return stack[0]


def _humanize(S):
    if type(S) is not list:
        return S.strip().capitalize()
    else:
        return [s.strip().capitalize() for s in S]


def parse(path, **kwargs):
    """
    Converts some output formats from Matlab and R into the Forester generalized format.

    Output from Matlab can be parsed by first running the function ``jsonencode`` within
    Matlab and loading the resulting .json string (file).

    Output from R can be loaded by loading the .RData file that can be exported from R studio.

    Parameters
    ----------
    path: str
          The path to the output file to be loaded. May be absolute or relative.
    kwargs: dict
            Dictionary containing some additional information for the parser. See Notes.

    Returns
    -------
    str
        The generalized Forester tree structure as a .json string

    Examples
    --------

    .. code-block:: python
        :name: Iris dataset from R's ``rpart``

            r = parse("../../examples/R/iris.RData")
            file = open("../../examples/R/iris.json", "w")
            file.write(json.dumps(r))
            file.close()

    .. code-block:: python
        :name: Diabetes dataset from R's ``rpart``

            r = parse("../../examples/R/diabetes.RData")
            file = open("../../example/R/diabetes.json", "w")
            file.write(json.dumps(r))
            file.close()

    .. code-block:: python
        :name: Iris dataset from Matlab's ``fitctree``
        :emphasize-lines: 1

            mat = parse("../view/static/example/Matlab/output.json", origin="MAT.fitctree")
            file = open("../view/static/example/Matlab/iris.json", "w")
            file.write(json.dumps(mat))
            file.close()

    Because the parser can not read .mat files directly and the result from Matlab is given as .json,
    the user may need to set the origin algorithm using the ``origin`` field.

    Notes
    -----
    The following values can be passed to the ``**kwargs`` field.

    * **origin** - Algorithm from which the output originated, at the moment only necessary for ``"Matlab.fitctree"``
    * **name** - Name of the R object if not at the first splot in the environment.

    """
    # change to absolute path if necessary
    if not path.startswith("/"):
        path = os.path.join(os.path.dirname(__file__), path)

    logger.info("Loading CART structure from file " + path)

    # check if there is a file type in the arguments
    # if not extract from path
    if "type" not in kwargs:
        kwargs['type'] = str(path.split(".").pop())

    # use Forester as default vendor
    if "vendor" not in kwargs:
        kwargs['vendor'] = "Forester"

    # use Forester export as default origin
    if "origin" not in kwargs:
        kwargs['origin'] = "export"

    # get file ending to determine format
    format_key = (kwargs['type'] + "." + kwargs['vendor'] + "." + kwargs['origin']).lower()

    if format_key in FORMATS.keys():
        return FORMATS[format_key](path, **kwargs)
    else:
        raise UnknownFormatException(f"Format {format_key} not supported.")


# def _parse_json(path, **kwargs):
#     fit = json.load(open(path))
#
#     if 'origin' not in kwargs.keys():
#         raise NotImplementedError("Unsure what file format to use, please specify manually by setting field \'origin\'")
#
#     if kwargs['origin'] in FORMATS:
#         return FORMATS[kwargs['origin']](fit, **kwargs)


# def _parse_r(path, **kwargs):
#     # TODO check if R is installed and package rpy2 works
#
#     # load r object
#     ro.r['load'](path)
#
#     # get the name of the r object
#     # if no name is passed as an argument,
#     # use the first object in the environment
#     name = kwargs['name'] if 'name' in kwargs.keys() else list(ro.r['ls']())[0]
#     kwargs['name'] = name
#
#     print('* CART originates from R with name \'' + name + '\'')
#
#     # use r object's class attribute to determine origin of file
#     format_key = 'RData.' + list(ro.r['attr'](ro.r[name], 'class'))[0]
#
#     if format_key in FORMATS.keys():
#         return FORMATS[format_key](**kwargs)
#     else:
#         raise NotImplementedError("File format " + format_key + " not implemented.")


def _parse_rpart_class(path, **kwargs):

    # load r object
    ro.r['load'](path)
    name = kwargs['name'] if 'name' in kwargs.keys() else list(ro.r['ls']())[0]

    # ----------- HELPER FUNCTIONS ----------
    def rdf_to_dict(df: ro.DataFrame):
        return dict(zip(list(df.names), map(list, list(df))))

    # ----------- PARSING RPART ----------
    fit = ro.r[name]

    logger.info('CART originates from \'rpart\' and is a classification tree')

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
    nodes = []

    # go through all nodes and set up structure
    for i in range(n_nodes):
        node = {
            'children': [],
            'type': 'root' if i == 0 else ('leaf' if frame['var'][i] == '<leaf>' else 'node'),
            'samples': int(frame['n'][i]),
            'distribution': [int(s) for s in list(class_dist[i, 1:(n_classes + 1)])],
            'vote': int(class_dist[i, 0]) - 1
        }

        if not node['type'] == 'leaf':
            split = splits[split_index[i]]
            node['split'] = {
                'feature': features.index(frame['var'][i]),
                'operator': '<' if split[1] < 0 else '>',
                'location': split[3]
            }

        nodes.append(node)

    _build_tree(nodes)

    meta = {
        'type': 'classification',
        'features': _humanize(features),
        'classes': _humanize(classes),
        'samples': int(nodes[0]['samples']),
    }

    return {'meta': meta, 'tree': nodes[0]}


def _parse_fitctree(path, **kwargs) -> dict:
    """
    Parse a *.json* object that was generated using Matlab's ``jsonencode`` function
    from the result of a call to ``fitctree``.

    :param fit: The *.json* object that was produced by Matlab
    :param kwargs: Additional arguments for parsing the object
    :return: A common representation of the tree
    """

    logger.info('CART originates from MATLAB\'s function fitctree')

    fit = json.load(open(path))

    # general info describing the tree
    meta = {
        'type': 'classification',
        'features': _humanize(fit['PredictorNames']),
        'classes': _humanize(fit['ClassNames']),
        'samples': int(fit['NumObservations'])
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
            'samples': int(fit['NodeSize'][i]),
            'distribution': [int(s) for s in fit['ClassCount'][i]],
            'vote': int(np.argmax(fit['ClassProbability'][i])),
            'parent': fit['Parent'][i] - 1
        }

        # add info about split, whenever node is not leaf
        if fit['CutPoint'][i] is not None:
            node['split'] = {
                'feature': fit['CutPredictorIndex'][i] - 1,
                'operator': '<',
                'location': fit['CutPoint'][i]
            }

        nodes.append(node)

    for i in reversed(range(fit['NumNodes'])):
        node = nodes[i]

        if (j := node["parent"]) >= 0:
            parent = nodes[j]
            parent["children"].append(node)
            nodes[j] = parent

        del node["parent"]

    # assemble tree structure
    return {'meta': meta, 'tree': nodes[0]}


FORMATS = {
    'rdata.r.rpart': _parse_rpart_class,
    'json.matlab.fitctree': _parse_fitctree
}

# # R diabetes dataset
# r = parse("../../examples/R/diabetes.RData")
# file = open("../../examples/R/diabetes.json", "w")
# file.write(json.dumps(r))
# file.close()
#
# # R iris dataset
# r = parse("../../examples/R/iris.RData")
# file = open("../../examples/R/iris.json", "w")
# file.write(json.dumps(r))
# file.close()
#
# # Matlab fenny dataset
# m = parse("../../examples/Matlab/fanny_out.json", origin="MAT.fitctree")
# file = open("../../examples/Matlab/fanny.json", "w")
# file.write(json.dumps(m))
# file.close()
#
# # Matlab iris dataset
# m = parse("../../examples/Matlab/iris_out.json", origin="MAT.fitctree")
# file = open("../../examples/Matlab/iris.json", "w")
# file.write(json.dumps(m))
# file.close()
