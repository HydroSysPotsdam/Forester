#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import numpy as np
import json
from loguru import logger

from .utils import _humanize

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