/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/Legend.js";
import View from "./View.js";

/**
 * Textual representation of the split feature, the voted class
 * and the sample number.
 *
 * For internal nodes, the split feature, the sample number and the
 * vote is shown. For leaf nodes, the split feature is ommited.
 *
 * The view does not use HTML elements and works solely with SVG
 * text and shapes. This was done, so that it can be properly
 * exported.
 *
 * The view does currently not have any settings.
 */
class TextView extends View {

    // TODO: add a checkbox for every piece of information

    /**
     * Singleton constructor used to export the instance of {@link PieChartView}
     */
    constructor () {
        super("TextView", {})
    }

    /**
     * For each node, the view generates a textual summary of the most important
     * characteristics of the node. This includes the split feature, the sample
     * number and the voted class.
     *
     * Currently, no settings are supported.
     *
     * @param node - The node from which the data should be queried.
     * @param settings - The settings that should be used for illustration.
     */
    async illustrate (node, settings) {

        const data = await node.query("vote", "voteFraction", "samples", "splitFeature", "splitOperator", "splitLocation")

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
}

export default new TextView()
