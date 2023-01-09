Views and Node Illustrations
============================

.. note:: This section assumes that the reader is familiar with the *general
          concept of decision trees* and has some idea on the how decision trees
          are trained computationally.

Traditional illustrations of decision trees focus on three main features:
the variable that was used for splitting, the class distribution and the vote
that is assigned to a node. **We think that there is room for much more diverse
illustrations.**

Forester employs a more modular approach to illustrating a node in a
decision tree.

It all starts with understanding each node as a
subset of the training data. This subset has properties like the different
*features* that are recorded, their *values*, the class of each element and the
distribution of all *classes* in the subset. Metrics can be used to characterized
the node further. These include for example the node *impurity*.
The training algorithm that derives the decision tree adds some additional
information: the feature that was used for *splitting* the data and why any one
was selected above others.

All this data is relevant for the users understanding of the decision tree and
the interpretation of the results. We therefore think, that it is important to
include all information in the illustrations and not only focus on some aspects.

Views
-----

Let us introduce what we call node views. A view is one perspective on a decision
trees node. It could for example focus on the *vote* or the *split*


- explain the method
- explain the three methods

View Settings
-------------

A Custom View
-------------