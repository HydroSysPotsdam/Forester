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

import {Legend} from "./Forester.js";
import {Tree} from "./Forester.js"

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
     .attr("color_key", (d, i) => "class" + i)
}

export let TextView = new View("TextView");
TextView.node_html = "<table><text><span class = \"feature\">$SPLIT$</span> $OP$ $LOCATION$</text><tr><th>Vote:</th><td><span class=\"class\">$VOTE$</span></td></tr><tr><th>Samples:</th><td>$SAMPLES$</td></tr></table>"
TextView.leaf_html = "<table><span class = \"class\">$VOTE$</span><tr><th>Samples:</th><td>$SAMPLES$</td></tr></table>"

TextView.illustrate = function (selection, node, meta) {
    // the TextView uses a div element as a base
    // const container = selection.append("div")
    //                            .attr("class", "TextView")
    //
    // // generate from predefined html
    // if (node.data.type != "leaf") {
    //     let html = TextView.node_html
    //     html = html.replace("$SPLIT$", S(node.data.split["feature"]).trim().capitalize().s)
    //     html = html.replace("$OP$", node.data.split['operator'])
    //     html = html.replace("$LOCATION$", numeral(node.data.split['location']).format("0.00a"))
    //     html = html.replace("$VOTE$", meta.classes[node.data["vote"] - 1])
    //     html = html.replace("$SAMPLES$", numeral(node.data["samples"]).format("0a"))
    //     container.html(html)
    // } else {
    //     let html = TextView.leaf_html
    //     html = html.replace("$VOTE$", meta.classes[node.data["vote"] - 1])
    //     html = html.replace("$SAMPLES$", numeral(node.data["samples"]).format("0a"))
    //     container.html(html)
    // }
    //
    // // highlight class and feature in the text using the different colors
    // const featureColor = Legend.featureColor(node.data.split["feature"])
    // const classColor   = Legend.classColors[node.data["vote"] - 1]
    //
    // container.select(".feature")
    //          .style("background-color", featureColor)
    //          .style("color", chroma(featureColor).luminance() > 0.5 ? "black" : "white")
    // container.select(".class")
    //          .style("background-color", classColor)
    //          .style("color", chroma(classColor).luminance() > 0.5 ? "black" : "white")

    const split = S(node.data.split["feature"]).trim().capitalize().s
    const operator = node.data.split['operator']
    const location = numeral(node.data.split['location']).format("0.00a")
    const vote = meta.classes[node.data["vote"] - 1]
    const samples = numeral(node.data["samples"]).format("0a")

    const class_key = "class" + (node.data["vote"] - 1)
    const feature_key = "feature" + Tree.featureNames().indexOf(split)

    const table = selection.append("div")
                           .attr("class", "TextView")
                           .append("table")

    if (node.data.type != "leaf") {
        table.append("text")
             .call(function (row) {
                 row.append("span")
                    .attr("class", "colorcoded")
                    .attr("color_key", feature_key)
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
                    .attr("color_key", class_key)
                    .text(vote)
             })
        table.append("tr")
             .call(function (row) {
                 row.append("th")
                    .text("Samples:")
                 row.append("td")
                    .text(samples)
             })
    }
}



