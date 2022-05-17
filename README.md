# Forester
Interactive human-in-the-loop web-based visualization of machine learning trees

## Required Libraries
__Python__
* [rpy2](https://github.com/rpy2/rpy2) (requires a R kernel)
* [Flask](https://flask.palletsprojects.com/en/2.1.x/) including flask_restful
* [Scipy](https://scipy.org)

__JavaScript__
* [d3.js](https://d3js.org) v7.min

## General CART Interface Format
```
{
    "meta": {
    "type":        "classification | regression",
    "features":     ["list of features"],
    "classes":      ["list of classes"],
    "samples":      "total sample number",
    "data name":    "name of dataset",
    "origin":       "R.rpart | Matlab.tree | ..."
  },

  tree: {
    id:             "unique id in tree",
    children:       ["other nodes"],
    samples:        "samples at the node",
    distribution:   ["class distribution going in" | "regression values going in"]
    vote:           "majority vote class" | "regression value" | unknown
    split:    {
        feature:   "feature to split",
        operator:      "< | > | == | != ..."
        location:  "location of split",
        statistics: {
            gini:  "gini impurity of split",
            hstat: "h statistics of split"
            // ...
        }
    }
  }
}
```
