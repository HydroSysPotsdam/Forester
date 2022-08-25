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
    const entry_vote = Legend.byLabel(node.vote)
    const entry_feature = node.split ? Legend.byLabel(node.split.feature) : undefined

    const table =
        selection.append("div")
                 .attr("class", "TextView")
                 .append("table")

    // SPLIT
    if (node.type != "leaf") {
        table.append("tr")
             .call(function (row) {
                 row.append("th")
                    .text("Sp")
                 row.append("td")
                    .call(function (row) {
                        row.append("span")
                           .attr("class", "colorcoded")
                           .attr("legend_key", entry_feature.key)
                           .text(node.split.feature)
                        row.append("text")
                           .text(" " + node.split.operator + " " + numeral(node.split.location).format("0.00a"))
                    })
             })
    }

    // VOTE
    table.append("tr")
         .call(function (row) {
             row.append("th")
                .text("V")
             const td = row.append("td")
             td.append("span")
               .attr("class", "colorcoded")
               .attr("legend_key", entry_vote.key)
               .text(node.vote)
             td.append("text")
               .text(" (" + numeral(node.vote_fraction).format("0%") + ")")
         })

    // SAMPLES
    table.append("tr")
         .call(function (row) {
             row.append("th")
                .text("S")
             row.append("td")
                .text(node.samples)
         })
}



