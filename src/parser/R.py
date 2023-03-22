#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import numpy as np
import rpy2.robjects as ro
from loguru import logger

from .utils import _humanize, _build_tree


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