/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/**
 * Views are code snippets that are used to illustrate nodes in the decision tree.
 * They contain functions to determine whether an illustration can be used with one node,
 * and to generate the illustration.
 *
 * .. note:: As of today, the illustration is generated once for each node and there is no d3 typical vectorization.
 */
// load settings file
let SETTINGS = {}
fetch("../static/settings.json")
    .then(r => r.json())
    .then(r => SETTINGS = r)

import {Tree} from "./Forester.js"
import {Legend} from "./Legend.js";

export class View {

    constructor(name) {
        this.name = name
    }

    /**
     * Returns whether a view can be used to illustrate a given node by checking properties of the node.
     * @param node - The node to be checked
     * @param meta - The metadata that is linked to the node for easy access
     * @returns {boolean} - Whether the node illustration can be used
     */
    applicable(node, meta) {
        throw Error("View does not implement function \'applicable\'")
        return false
    }

    /**
     * Generates the illustration for a given node and canvas key.
     * @param selection - The d3 selection to which all graphic elements should be added
     * @param node - The node that should be added
     * @param meta - The metadata that is linked to the node for easy access
     */
    illustrate(selection, node, meta) {
        throw Error("View does not implement function \'illustrate\'")
    }

    settings() {
        return SETTINGS[this.name]
    }
}

/**
 * Simple node for classification trees that illustrates the class
 * distribution as a pie chart. Classes are color coded, the total
 * number of samples determines the size of the circle.
 * @type {View}
 */
export let CCircleIconView = new View("CCircleIconView")

CCircleIconView.illustrate = function (selection, node, meta) {
    let d = 2 * this.settings().r
    let colors = Legend.classColors
    let g = selection.append("svg")
                     .attr("class", "CCircleIconView")
                     .attr("width", d)
                     .attr("height", d)
                     .append("g")
                     .attr("transform", "translate(" + d / 2 + "," + d / 2 + ")")

    g.selectAll("path")
     .data(d3.pie()(node.data["distribution"]))
     .join("path")
     .attr('d', d3.arc()
                  .innerRadius(0)
                  .outerRadius(20))
        // .attr('fill', (d, i) => colors[i])
     .attr("class", "colorcoded")
     .attr("legend_key", (d, i) => Legend.byLabel(Tree.classNames()[i]).key)
}

export let TextView = new View("TextView");

TextView.illustrate = function (selection, node, meta) {
    const vote = meta.classes[node.data["vote"] - 1]
    const samples = numeral(node.data["samples"]).format("0a")
    const class_key = Legend.byLabel(vote).key

    const table = selection.append("div")
                           .attr("class", "TextView")
                           .append("table")

    if (node.data.type != "leaf") {
        const split = S(node.data.split["feature"]).trim().capitalize().toString()
        const operator = node.data.split['operator']
        const location = numeral(node.data.split['location']).format("0.00a")
        const feature_key = Legend.byLabel(split).key

        table.append("tr")
             .append("td")
             .attr("colspan", 2)
             .call(function (row) {
                 row.append("span")
                    .attr("class", "colorcoded")
                    .attr("legend_key", feature_key)
                    .text(split)
                 row.append("text")
                    .text(" " + operator + " " + location)
             })
        table.append("tr")
             .call(function (row) {
                 row.append("th")
                    .text("Vote:")
                 row.append("td")
                    .append("span")
                    .attr("class", "colorcoded")
                    .attr("legend_key", class_key)
                    .text(vote)
             })
        table.append("tr")
             .call(function (row) {
                 row.append("th")
                    .text("Samples:")
                 row.append("td")
                    .text(samples)
             })
    } else {
        const class_index   = node.data["vote"] - 1
        const distribution  = node.data["distribution"]
        const fraction_vote = distribution[class_index]/distribution.reduce((a, b) => a + b)

        table.append("tr")
             .append("td")
             .attr("colspan", 2)
             .call(function (row) {
                 row.append("span")
                    .attr("class", "colorcoded")
                    .attr("legend_key", class_key)
                    .text(vote)
             })
        table.append("tr")
             .call(function (row) {
                 row.append("th")
                    .text("Samples:")
                 row.append("td")
                    .text(numeral(distribution[class_index]).format("0a") + " (" + numeral(fraction_vote).format("0%") + ")")
             })
    }
}



