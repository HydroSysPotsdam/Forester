/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/legend/Legend.js";
import View from "./View.js";

/**
 * Circular pictogram that focuses on the class distribution of the node.
 *
 * From the class distribution a pie chart is generated, where the relative
 * arc length represents the number of samples in each class.
 *
 * The radius may either be fixed or scaled with the total sample fraction at
 * the node. Scaling can either use linear interpolation or autocontrast.
 */
class PieChartView extends View {

    /**
     * Singleton constructor used to export the instance of {@link PieChartView}
     */
    constructor() {

        const rules = {
            radius: "numeric|min:10|max:100|default:20",
            "scale.scaleBySamples": "boolean|default:true",
            "scale.scaleMethod": "in:linear,auto|default:linear"
        }

        super("PieChartView", rules)
    }

    /**
     * For each node, the view generates a pie chart, where the relative
     * arc length represents the number of samples in each class.
     *
     * The following settings are allowed:
     *
     * - **`radius`** : Radius of the chart in units of pixel. Ranging from `10` to `100`.
     *                  Default: `20`.
     *
     * - **`scale.scaleBySamples`** : Whether to scale the radius by the sample fraction at the node.
     *                                Scaling happens between 10-100% of the `radius` setting.
     *                                Default: `true`.
     *
     * - **`scale.scaleMethod`** : Method used for interpolation. Either `linear` for linear
     *                             interpolation or `auto` for a scaling that is adapted to
     *                             range over multiple scales. Default: `linear`.
     *
     * @param node - The node from which the data should be queried.
     * @param settings - The settings that should be used for illustration.
     */
    async illustrate (node, settings) {

        const data = await node.query("distribution", "samplesFraction", "classes")

        let radius
        if (settings.scale.scaleBySamples) {
            radius = (0.9*data.samplesFraction + 0.1) * settings.radius
        } else {
            radius = settings.radius
        }

        const pies = d3.pie()(data.distribution)
        d3.select(this)
          .selectAll("path")
          .data(pies)
          .join("path")
          .attr("d", d3.arc().innerRadius(0).outerRadius(radius))
          .attr("class", "colorcoded")
          .attr("legend_key", (d, i) => Legend.get(data.classes[i]).key)
          .style("fill", "var(--highlight-color)")
          .style("stroke", "black")
    }
}

export default new PieChartView()