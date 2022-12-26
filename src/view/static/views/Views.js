/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "../editor/Editor.js"
import {Legend} from "../Legend.js";
import Validator from "../Validator.js";

export class View {

    // name of the view to be displayed in the editor
    name

    // rules to validate the settings and generate a settings panel
    rules

    constructor(name, rules) {
        this.name  = name
        this.rules = rules

        if (!this.rules) {
            this.rules = {}
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

    async draw(context, node, settings) {

        // prepare the validator for the settings
        let settingsValidator = new Validator(settings, this.rules)

        // validate settings and throw error when there was an unknown setting
        if (settingsValidator.passes()) {
            await this.illustrate.call(context, node, settings)
        } else {
            throw Error(settingsValidator.error.all())
        }
    }

    /**
     * Generates the illustration for a given node and canvas key.
     * @param selection - The d3 selection to which all graphic elements should be added
     * @param node - The node that should be added
     * @param meta - The metadata that is linked to the node for easy access
     */
    async illustrate(node, settings) {
        throw Error("View does not implement function \'illustrate\'")
    }
}

export let BasicView = new View("BasicView")

BasicView.illustrate = async function (node, settings) {

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

/**
 * Simple node for classification trees that illustrates the class
 * distribution as a pie chart. Classes are color coded, the total
 * number of samples determines the size of the circle.
 * @type {View}
 */
export let CCircleIconView = new View("CCircleIconView", {
    maxRadius:      "numeric|min:0|max:100|default:20",
    minRadius:      "numeric|min:0|max:100|default:5.5",
    scaleBySamples: "boolean|default:true",
    scaleMethod:    "in:linear,auto|default:linear"
})

CCircleIconView.illustrate = async function (node, settings) {

    const data = await node.query("distribution", "samplesFraction", "classes")

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

export let BarChartView = new View("Bar Chart", {
    axis:   "horizontal",
    width:  80,
    height: 30,
    aggregate: 0.1,
    sort: true
})

BarChartView.illustrate = async function (node, settings) {
    // TODO: the thresholding works but is not a good choice: small values are aggregated leading to larger other than some other but slightly larger values

    const data = await node.query("distribution", "classes", "samples")

    // select axis based on value
    let axis, cross_axis, extend, cross_extend
    switch (settings.axis) {
        default:
            // use vertical as default
        case "horizontal":
            extend       = "width"
            cross_extend = "height"
            axis         = "x"
            cross_axis   = "y"
            break;
        case "vertical":
            extend       = "height"
            cross_extend = "width"
            axis         = "y"
            cross_axis   = "x"
            break;
    }

    // get distribution of sample values per class
    let distribution = _.zip(data.distribution, data.classes)

    // sort distribution in ascending order
    if (settings.sort) {
        distribution = _.sortBy(distribution, e => e[0]).reverse()
    }

    let bars = []
    let other  = 0
    for (let class_value of distribution) {
        // first element is sample number, will be normalized
        let samples = class_value[0]/data.samples
        // second element is class label
        let label   = class_value[1]

        // add one bar for a value when it is either above the aggregate thresholding value or
        // there is only one left and this would fall below the threshold
        if (samples > settings.aggregate || (other == 0 && distribution.indexOf(class_value) == distribution.length - 1)) {
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
    if (settings.axis === "vertical") {
        bars.forEach(bar => bar[0] = 1 - (bar[0] + bar[1]))
    }

    d3.select(this)
      .selectAll("rect")
      .data(bars)
      .enter()
      .append("rect")
      // axis is the longer side of the chart
      .attr(axis,   d => d[0]*settings.width + "px")
      // extend is the length of the longer side
      .attr(extend, d => d[1]*settings.width + "px")
      // cross extend is the perpendicular size
      .attr(cross_extend, settings.height + "px")
      .attr("class", "colorcoded")
      .style("stroke", "black")
      .each(function (d) {
          if (d[2] !== "Other") {
              d3.select(this)
                .attr("legend_key", Legend.byLabel(d[2]).key)
                .style("fill", "var(--highlight-color)")
          } else {
              d3.select(this)
                .style("fill", "white")
          }
      })
}



