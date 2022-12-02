/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./Editor.js"
import {Legend} from "./Legend.js";

export class View {

    name

    defaultSettings

    constructor(name, settings) {
        this.name     = name
        this.defaultSettings = settings

        if (!this.defaultSettings) {
            this.defaultSettings = {}
        }
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
    async illustrate(selection, node, meta) {
        throw Error("View does not implement function \'illustrate\'")
    }
}

export let BasicView = new View("BasicView")

BasicView.illustrate = async function (node, settings) {

    const data = await node.query("type", "splitFeature", "vote")

    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))

    if (data.type === "leaf") {
        d3.select(this)
          .append("circle")
          .attr("class", "colorcoded")
          .attr("r", 5)
          .attr("legend_key", Legend.byLabel(data.vote).key)
    } else {
        d3.select(this)
          .append("polygon")
          .attr("points", "2,2 12,2 2,12")
          .attr("class", "colorcoded")
          .attr("legend_key", Legend.byLabel(data.splitFeature).key)
        d3.select(this).append("polygon")
          .attr("points", "12,12 12,2 2,12")
          .attr("class", "colorcoded")
          .attr("legend_key", Legend.byLabel(data.splitFeature).key)
    }

    d3.select(this)
      .selectAll(".colorcoded")
      .style("fill", "var(--highlight-color)")
      .style("stroke", "var(--contrast-color)")
      .style("stroke-linejoin", "round")
}

/**
 * Simple node for classification trees that illustrates the class
 * distribution as a pie chart. Classes are color coded, the total
 * number of samples determines the size of the circle.
 * @type {View}
 */
export let CCircleIconView = new View("CCircleIconView", {
    maxRadius: 20,
    minRadius: 5,
    scaleBySamples: false,
    scaleMethod: "linear"
})

CCircleIconView.center = false

CCircleIconView.illustrate = async function (node, settings) {

    const data = await node.query("distribution", "samplesFraction", "classes")

    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))

    let radius
    if (settings.scaleBySamples) {
        radius = data.samplesFraction * (settings.maxRadius - settings.minRadius) + settings.minRadius
    } else {
        radius = settings.maxRadius
    }

    const pies = d3.pie()(data.distribution)
    d3.select(this)
      .selectAll("path")
      .data(pies)
      .join("path")
      .attr("d", d3.arc().innerRadius(0).outerRadius(radius))
      .attr("class", "colorcoded")
      .attr("legend_key", (d, i) => Legend.byLabel(data.classes[i]).key)
      .style("fill", "var(--highlight-color)")
      .style("stroke", "black")
}

export let TextView = new View("TextView")

TextView.illustrate = async function (node, settings) {

    const data = await node.query("vote", "voteFraction", "samples", "splitFeature", "splitOperator", "splitLocation")

    // TODO: this should be done with CSS
    d3.select(this)
      .style("font-size", "0.5em")
      .style("transform", "scale(1.2)")

    if (data.splitFeature) {
        d3.select(this)
          .append("text")
          .attr("class", "label")
          .text("Sp:")
        d3.select(this)
          .append("text")
          .attr("class", "value")
          .html("<tspan class='colorcoded'>" + data.splitFeature + "</tspan> " + data.splitOperator + " " + numeral(data.splitLocation).format("0.00a"))
    }

    d3.select(this)
      .append("text")
      .attr("class", "label")
      .text("V:")
    d3.select(this)
      .append("text")
      .attr("class", "value")
      .html("<tspan class='colorcoded'>" + data.vote + "</tspan>" + " (" + numeral(data.voteFraction).format("0%") + ")")

    d3.select(this)
      .append("text")
      .attr("class", "label")
      .text("S:")
    d3.select(this)
      .append("text")
      .attr("class", "value")
      .text(numeral(data.samples).format("0a"))

    d3.select(this)
      .selectAll(".label")
      .attr("text-anchor", "end")
      .attr("y", (d, i) => i + "em")
      .style("font-weight", "bold")

    d3.select(this)
      .selectAll(".value")
      .attr("x", "0.2em")
      .attr("y", (d, i) => i + "em")

    const view = this
    d3.select(this)
      .selectAll(".colorcoded")
      .each(function (d, i, g) {
          const bbox = this.getBBox()
          d3.select(view)
            .insert("rect", ":first-child")
            .attr("class", "colorcoded")
            .attr("legend_key", Legend.byLabel(d3.select(this).text()).key)
            .attr("x", bbox.x + "px")
            .attr("y", bbox.y + "px")
            .attr("width",  bbox.width + "px")
            .attr("height", bbox.height + "px")
            .style("fill", "var(--highlight-color)")
      })

    // draw a box behind the view
    const bbox = d3.select(this).node().getBBox()
    d3.select(this)
        .insert("rect", ":first-child")
        .attr("x", bbox.x + "px")
        .attr("y", bbox.y + "px")
        .attr("width", bbox.width + "px")
        .attr("height", bbox.height + "px")
        .style("fill", "white")
}

// export let TextView = new View("TextView");
//
// TextView.illustrate = function (selection, node, meta) {
//     const entry_vote = Legend.byLabel(node.vote)
//     const entry_feature = node.split ? Legend.byLabel(node.split.feature) : undefined
//
//     const table =
//         selection.append("div")
//                  .attr("class", "TextView")
//                  .append("table")
//
//     // SPLIT
//     if (node.type != "leaf") {
//         table.append("tr")
//              .call(function (row) {
//                  row.append("th")
//                     .text("Sp")
//                  row.append("td")
//                     .call(function (row) {
//                         row.append("span")
//                            .attr("class", "colorcoded")
//                            .attr("legend_key", entry_feature.key)
//                            .text(node.split.feature)
//                         row.append("text")
//                            .text(" " + node.split.operator + " " + numeral(node.split.location).format("0.00a"))
//                     })
//              })
//     }
//
//     // VOTE
//     table.append("tr")
//          .call(function (row) {
//              row.append("th")
//                 .text("V")
//              const td = row.append("td")
//              td.append("span")
//                .attr("class", "colorcoded")
//                .attr("legend_key", entry_vote.key)
//                .text(node.vote)
//              td.append("text")
//                .text(" (" + numeral(node.vote_fraction).format("0%") + ")")
//          })
//
//     // SAMPLES
//     table.append("tr")
//          .call(function (row) {
//              row.append("th")
//                 .text("S")
//              row.append("td")
//                 .text(numeral(node.samples).format("0.00a"))
//          })
// }



