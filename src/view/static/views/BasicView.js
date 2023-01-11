/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/Legend.js";
import View from "./View.js";

/**
 * Most basic illustration of a node focussing on the split or vote.
 *
 * For leaf nodes, the voted class is illustrated using a colored circle.
 * For other nodes, the split feature is illustrated using a colored box
 * with diagonal line.
 *
 */
class BasicView extends View {

    // TODO: add size to the options
    // TODO: add color-coding to the options

    /**
     * Singleton constructor used to export the instance of {@link BasicView}
     */
    constructor() {
        super("BasicView");
    }

    /**
     * For each node, the view adds either a colorcoded circle or box depending
     * on the place of the node in the tree (leaf vs. within) and the split feature
     * or vote.
     *
     * @param node - The node from which the data should be queried.
     * @param settings - The settings that should be used for illustration.
     *      {@link BasicView} does not have settings at the moment.
     */
    async illustrate (node, settings) {

        const data = await node.query("type", "splitFeature", "vote")

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
}

export default new BasicView()