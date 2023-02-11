---
title: 'Forester: Interactive visualization of tree-based machine learning'
tags:
  - machine learning
  - plotting
  - data visualization
authors:
  - name: David Strahl
    equal-contrib: true
    affiliation: 1 
  - name: Robert Reinecke
    equal-contrib: false
    affiliation: 1
  - name: Thorsten Wagener
    corresponding: false
    affiliation: 1
affiliations:
 - name: University of Potsdam, Potsdam, Germany
   index: 1
date: 6 February 2023
bibliography: paper/paper.bib
---

# Summary

Tree-based machine learning methods, such as Classification and Regression Trees or Random Forest, are well-established and widely used. However, visualization tools provided by common machine-learning environments in Python, R, or Matlab often provide graphical representations that could be more visually appealing or helpful in conveying a clear message. Therefore, illustrations are often not usable in publications and need to be redone manually.

Here we present FORESTER, a web-based and open-source software that produces visually appealing tree-based visualizations. Forester produces publication-ready plots that are, at the same time, interactive figures that can guide the user in interpreting the model. Visualizations can be streamlined to the user's requirements and offer a wide variety of insightful techniques. This makes Forester a promising alternative to currently used environments. Forester is open to collaborations, so we hope it will be extended within the Earth Science community and beyond, proving useful in other machine-learning-related fields.

# Statement of Need

Though tree-based machine learning methods are established and widely used, they can be complex and hard to interpret. It is often unclear how algorithms derive results and what properties of the data triggered certain decisions (Sarailidis 2023). This is especially problematic for research questions, as results need to be transparent, interpretable and explainable (Roscher 2020). Furthermore, problems arise when the model should mirror well-known physical processes but contradicts process understanding (Sarailidis 2023).

Visualizations help practitioners to understand, analyze, and communicate their results (Liu 2005). They help interpret complex models by providing a graphical representation of both data and model performance. Visualizations can be used to understand the underlying patterns and trends in the data (Ankerst 2000), identify biases and errors, and diagnose problems with the model. They also help in communicating the results of the model to a non-technical audience by providing an intuitive and interactive way to present the findings.

The visualization routines in common decision-tree environments have some problems that make them fall short of their full potential. Environments like R, Matlab or Python focus too much on illustrating the statistical properties of the resulting tree and not on the meaning behind their structure (Sarailidis 2023). The resulting visualization is therefore often cluttered with information and not visually appealing. 

# Good Visualizations


# Existing Software

During our work, we have found three similiar open-source approaches: 
1. _PaintingClass_ equally undestands visualizations as a tool for wider knowledge discovery (Teoh 2003). Here, each level of the tree is illustrated using a projection of the multi-dimensional feature space. The user may interacting with the training process by manually assigning classes to certain regions. 
2. _BaobabView_ aims to achieve the "tight integration of visualization, interaction and algorithmic support" (Elzen 2011). The user is able to control the growith, optimization and pruning of the tree and is guided in the analysis using the generated figures. Although this approach is very similar to Forester, the project seems to be discontinued. 
3. _dTreeViz_ is another Python library that focuses on the visualization of machine-learning trees. 


Existing software seems to 


# Forester

Forester defines a general data format for decision trees that improves interoperability between different environments. This allows the separation of model training and result visualization. Forester provides parsers for the outputs of R's `rpart` and Matlab's `fitctree`. Support for further environments can be added by writing a custom parser and either including it in Forester (when done in Python) or loading the output. 

With its web-based approach, Forester simplifies building interactive illustrations and improves scalability. Very good visualization environments already exist (d3) and are used.t. Finden Sie jetzt heraus, ob Sie berechtigt sind.

# Extensions


# Citations


# Figures

- comparison figure between matlab, r and different forester illustrations for iris dataset


# Acknowledgements

- financial support


# References