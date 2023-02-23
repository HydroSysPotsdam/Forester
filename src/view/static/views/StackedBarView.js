/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/legend/Legend.js";
import View from "./View.js";

/**
 * Rectangular pictogram that focuses on the class distribution of the node.
 *
 * From the class distribution, a stacked bar chart is generated, where the size
 * of the bars represents the relative sample number within each class.
 *
 * The classes may be sorted based on their relative sample number and classes with
 * a small sample number may be aggregated into a placeholder bar.
 */
class StackedBarView extends View {

    /**
     * Singleton constructor used to export the instance of {@link BasicView}
     */
    constructor() {

        const rules = {
            "bar.axis": "in:horizontal,vertical|default:horizontal",
            "bar.width": "numeric|min:0|max:100|default:80",
            "bar.height": "numeric|min:0|max:100|default:30",
            "class.aggregate": "numeric|min:0|max:1|default:0.1",
            "class.sort": "boolean|default:true"
        }

        super("StackedBarView", rules);
    }

    /**
     * For each node, the view generates a stacked bar chart, where the relative bar
     * size represents the number of samples in each class.
     *
     * The following settings are allowed:
     *
     * - **`bar.axis`** : Either `"horizontal"` or `"vertical"` representing the orientation
     *                    of the major axis. This setting is relative to the orientation of the
     *                    tree. Default: `"horizontal"`.
     *
     * - **`bar.width`** : Extend cross to the major axis. Number between `0` and `100`. Default: `30`.
     *
     * - **`bar.height`** : Extend along to the major axis. Number between `0` and `100`. Default: `80`.
     *
     * - **`class.aggregate`** : Percentage threshold under which classes are aggregated into a
     *                           placeholder category. Number between `0` and `1`. Default: `5%`.
     *
     * - **`class.sort`** : Whether to sort the classes in descending order based on the relative sample
     *                      number. Default: `true`.
     *
     * @param node - The node from which the data should be queried.
     * @param settings - The settings that should be used for illustration.
     */
    async illustrate (node, settings) {
        // TODO: the thresholding works but is not a good choice: small values are aggregated leading to larger other than some other but slightly larger values

        const data = await node.query("distribution", "classes", "samples")

        // select axis based on value
        let axis, cross_axis, extend, cross_extend
        switch (settings.bar.axis) {
            default:
            // use vertical as default
            case "horizontal":
                extend = "width"
                cross_extend = "height"
                axis = "x"
                cross_axis = "y"
                break;
            case "vertical":
                extend = "height"
                cross_extend = "width"
                axis = "y"
                cross_axis = "x"
                break;
        }

        // get distribution of sample values per class
        let distribution = _.zip(data.distribution, data.classes)

        // sort distribution in ascending order
        if (settings.class.sort) {
            distribution = _.sortBy(distribution, e => e[0]).reverse()
        }

        let bars = []
        let other = 0
        for (let class_value of distribution) {
            // first element is sample number, will be normalized
            let samples = class_value[0] / data.samples
            // second element is class label
            let label = class_value[1]

            // add one bar for a value when it is either above the aggregate thresholding value or
            // there is only one left and this would fall below the threshold
            if (samples > settings.class.aggregate || (other == 0 && distribution.indexOf(class_value) == distribution.length - 1)) {
                if (bars.length == 0) {
                    // first bar must have a cumsum of zero
                    bars.push([0, samples, label])
                } else {
                    // other bars calculate cumsum based on previous values
                    bars.push([bars.at(-1)[0] + bars.at(-1)[1], samples, label])
                }
                // when the sample number is below the threshold, add it to the "other" bar
            } else {
                other += samples
            }
        }


        // when the other bar has a size above zero, add it to the chart
        if (other > 0) {
            bars.push([bars.at(-1)[0] + bars.at(-1)[1], other, "Other"])
        }

        // when the axis is vertical, the direction of the bars needs to be reversed
        // this is done by inverting the cumulative sum
        if (settings.bar.axis === "vertical") {
            bars.forEach(bar => bar[0] = 1 - (bar[0] + bar[1]))
        }

        d3.select(this)
          .selectAll("rect")
          .data(bars)
          .enter()
          .append("rect")
            // axis is the longer side of the chart
          .attr(axis, d => d[0] * settings.bar.width + "px")
            // extend is the length of the longer side
          .attr(extend, d => d[1] * settings.bar.width + "px")
            // cross extend is the perpendicular size
          .attr(cross_extend, settings.bar.height + "px")
          .attr("class", "colorcoded")
          .style("stroke", "black")
          .each(function (d) {
              if (d[2] !== "Other") {
                  d3.select(this)
                    .attr("legend_key", Legend.get(d[2]).key)
                    .style("fill", "var(--highlight-color)")
              } else {
                  d3.select(this)
                    .style("fill", "white")
              }
          })
    }
}

export default new StackedBarView()