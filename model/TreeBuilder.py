from .DataBuilder import DataBuilder

from sklearn.tree import DecisionTreeClassifier
import json
from json import JSONEncoder
import numpy as np


class NumpyArrayEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return JSONEncoder.default(self, obj)


# Interface for preparing for fitting a tree and rebuilding it with user input
class TreeBuilder(object):

    def __init__(self, data_builder, depth, min_s):
        if not isinstance(data_builder, DataBuilder):
            raise Exception("Not a proper data builder.")
        self.clf = DecisionTreeClassifier(max_depth=depth, min_samples_leaf=min_s)
        self.data = data_builder
        self.depth = depth
        self.min_s = min_s
        self.classnames = self.data.classnames
        self.featurenames = self.data.featurenames

    def fit(self):
        X, y = self.data.get_x(), self.data.get_y()
        print("Input (samples) dimensions: {}".format(X.shape))
        print("Output (labels) dimensions: {}".format(y.shape))
        self.clf.ft(X, y)

    def to_json(self):
        n_nodes = self.clf.tree_.node_count
        children_left = self.clf.tree_.children_left
        children_right = self.clf.tree_.children_right
        feature = self.clf.tree_.feature
        threshold = self.clf.tree_.threshold
        impurity = self.clf.tree_.impurity
        samples = self.clf.tree_.n_node_samples
        values = self.clf.tree_.value

        def build_tree(i):
            left = children_left[i]
            right = children_right[i]
            # get the values to determine the class
            # dimension of val = n_classes
            val = values[i][0]
            pos = np.argmax(val)
            c_name = self.classnames[pos]

            if left == right:
                # This is a leave node
                return {"name": "LN", "impurity": float(impurity[i]), "type": "leaf",
                        "samples": int(samples[i]), "cl": val, "class": c_name, "cpos": int(pos)}
            else:
                n = {"name": self.featurenames[feature[i] - 1], "type": "split-node", "samples": int(samples[i]),
                     "th": float(threshold[i]), "impurity": float(impurity[i]), "cl": val, "class": c_name,
                     "cpos": int(pos),
                     "children": [build_tree(left), build_tree(right)]}
                return n

        a = build_tree(0)
        s = json.dumps(a, cls=NumpyArrayEncoder)
        return s

