/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/legend/Legend.js";
import View from "./View.js";

/**
 * Most basic illustration of a node focussing on the split or vote.
 *
 * For leaf nodes, the voted class is illustrated using a colored circle.
 * For other nodes, the split feature is illustrated using a colored box
 * with diagonal line.
 *
 */
class SplitView extends View {

    /**
     * Singleton constructor used to export the instance of {@link BasicView}
     */
    constructor() {

        const rules = {
            // samples: "boolean|default:false",
            // yesno:   "boolean|default:false"
        }

        super("SplitView", rules);
    }

    isApplicable(node) {
        return Object.hasOwn(node.data, "splitFeature")
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

        const data = await node.query("splitFeature", "splitOperator", "splitLocation")

        if (data.splitFeature) {

            const svg = d3.select(this)
              .append("svg")
              .attr("width", 100)
              .attr("height", 40)

            // rect for feature of split
            svg.append("rect")
               .attr("x", 0)
               .attr("y", 0)
               .attr("width", "100%")
               .attr("height", "100%")
               .attr("class", "colorcoded")
               .attr("legend_key", Legend.get(data.splitFeature).key)
               .style("stroke", "black")
               .style("fill", "var(--highlight-color)")

            // rect for left option
            // svg.append("rect")
            //    .attr("x", 0)
            //    .attr("y", "70%")
            //    .attr("width", "50%")
            //    .attr("height", "30%")
            //    .style("stroke", "black")
            //    .style("fill", "lightgrey")

            // rect for right option
            // svg.append("rect")
            //    .attr("x", "50%")
            //    .attr("y", "70%")
            //    .attr("width", "50%")
            //    .attr("height", "30%")
            //    .style("stroke", "black")
            //    .style("fill", "lightgrey")

            // text for split
            svg.append("text")
               .attr("x", "50%")
               .attr("y", "45%")
               .attr("class", "colorcoded")
               .attr("legend_key", Legend.get(data.splitFeature).key)
               .style("fill", "var(--contrast-color)")
               .html(data.splitFeature)

            d3.select(this)
              .selectAll("text")
              .each(function () {
                  const bbox = this.getBBox()
                  d3.select(this)
                    .attr("dx", -bbox.width/2)
                    .attr("dy",  bbox.height/2)
              })
        }
    }
}

export default new SplitView()