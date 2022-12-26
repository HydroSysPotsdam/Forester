/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/**
 * Most basic visualization of links. Nodes are connected by lines.
 * Based on the settings, lines are straight, curved or ragged.
 */
export class BasicLinkRenderer {

    // the element on which this link renderer draws
    elem

    /**
     * Creates a new basic link renderer instance and binds it to the selected element.
     * @param elem - CSS selector to which the renderer is bound. Passed to d3's select. The first matching element is used.
     */
    constructor(elem) {
        this.elem = d3.select(elem)
    }

    /**
     * Clears already drawn links from the renderer.
     * This simply removes all child nodes from the bound element.
     */
    clear() {
        this.elem
            .selectAll("*")
            .remove()
    }

    /**
     * Renders the link for one set of source and target nodes. Based on the values in settings,
     * either a straight line, a curved line or a ragged (stepped) line is used.
     *
     * For source and target nodes the respective {@link NodeRenderer} is passed. This is because the raw
     * {@link FNode} does not save any information on the layout in the tree. A clear separation between
     * data and illustration is achieved.
     *
     * The default stroke is 1px solid black. Styles may be changed using the class selector
     * `basic-link`.
     *
     * The following values for `path.style` in the settings map are understood: `linear`, `curved`, `ragged`.
     *
     * @param source - The source (parent) node renderer of the link.
     * @param target - The target (child) node renderer of the link.
     * @param settings - Settings map, containing at least `path.style`.
     *
     * @return - The d3 selection of the rendered element.
     */
    async draw(source, target, settings) {

        let curve = settings.get("path.style")

        if (curve === "linear") curve = d3.curveLinear
        if (curve === "curved") curve = d3.curveBumpY
        if (curve === "ragged") curve = d3.curveStepAfter

        return this.elem
            .append("path")
            .attr("class", "link basic-link")
            .attr("d", node => d3.link(curve)({source: [source.x, source.y], target: [target.x, target.y]}))
            .style("stroke", "black")
    }
}

/**
 * Link renderer that sets the focus on the class distribution flowing along the link.
 *
 * With `linear` or `auto` for the `path.flow` setting, the renderer encodes the fractional
 * sample number (relative to the root) in the line thickness. With `colorcoded`, the class
 * distribution is additionally encoded within the line, by splitting it into parallel lines
 * whose thickness represents the relative number of samples in one class.
 */
export class FlowLinkRenderer extends BasicLinkRenderer {

    /**
     * Instantiates a new flow link renderer and binds it to the selected element.
     * @param elem - CSS selector to which the renderer is bound. Passed to d3's select. The first matching element is used.
     */
    constructor(elem) {
        super(elem)
    }

    /**
     * Renders the link for one set of source and target nodes. Based on the values in settings,
     * either a straight line, a curved line or a ragged (stepped) line is used.
     *
     * For source and target nodes the respective {@link NodeRenderer} is passed. This is because the raw
     * {@link FNode} does not save any information on the layout in the tree. A clear separation between
     * data and illustration is achieved.
     *
     * With `linear` for `path.flow`, the line is style with linearly decreasing thickness between a maximum
     * and minimum value based on the sample fraction.
     *
     * With `auto`, the sample fraction over the whole tree is linearized, yielding best "contrast".
     * This reduces the difference between minimal and maximal line thickness and is best used
     * when the sample fraction differs greatly over the tree.
     *
     * With `colorcoded`, the class distribution is encoded in the link. For this, parallel lines are
     * drawn for each class, where the thickness represents the relative number of samples of a class
     * relative to the whole distribution. The classes are ordered by decreasing sample number.
     *
     * @param source - The source (parent) node renderer of the link.
     * @param target - The target (child) node renderer of the link.
     * @param settings - Settings map, containing at least `path.style` and `path.flow`.
     *
     * @return - The d3 selection of the rendered element.
     */
    async draw(source, target, settings) {

        let data = await target.node.query("samplesFraction", "samples", "distribution", "classes")

        // draw the link, so that the flow curve can be generated
        let path = await super.draw(source, target, settings)

        let flow = settings.get("path.flow")
        let stroke_max_width = 10;
        let flow_sample_dist = 10;

        switch (flow) {
            case "linear":
                path.classed("basic-link", false)
                    .classed("flow-link", true)
                    .style("stroke-width", ((stroke_max_width - 1) * data.samplesFraction + 1))
                break;
            case "auto": //TODO: there is no auto-contrast happening at the moment
                path.classed("basic-link", false)
                    .classed("flow-link", true)
                    .style("stroke-width", ((stroke_max_width - 1) * data.samplesFraction + 1))
                break;
            case "colorcoded": //TODO: the coloring follows the order in the distribution but should be from largest to smallest
                let curve = path.node()

                // sample points along curve
                let L = curve.getTotalLength()
                let N = Math.floor(L / flow_sample_dist)
                let points = [...Array(N + 1).keys()].map(n => curve.getPointAtLength(n / N * L))

                // calculate normal of each point
                for (let i = 0; i < points.length; i++) {
                    let dx, dy;

                    if (i == 0) {
                        // first point
                        dx = points[i + 1].x - points[i].x
                        dy = points[i + 1].y - points[i].y
                    } else if (i == points.length - 1) {
                        // last point
                        dx = points[i].x - points[i - 1].x
                        dy = points[i].y - points[i - 1].y
                    } else {
                        // middle points
                        dx = (points[i + 1].x - points[i - 1].x) / 2
                        dy = (points[i + 1].y - points[i - 1].y) / 2
                    }

                    // normalize
                    points[i].dx = dx / (dx ** 2 + dy ** 2) ** 0.5
                    points[i].dy = dy / (dx ** 2 + dy ** 2) ** 0.5
                }

                // find the points of the equidistant curves
                let sum = 0;
                let steps = [0, ...data.distribution.map((s => sum += s / data.samples))]
                let curves = steps.map(step => points.map(
                    function (p) {
                        return {
                            x: p.x + ((stroke_max_width - 1) * data.samplesFraction + 1) * (2 * step - 1) * p.dy,
                            y: p.y + ((stroke_max_width - 1) * data.samplesFraction + 1) * (1 - 2 * step) * p.dx
                        }
                    }
                ))

                // prepare the areas between them
                let areas = curves.slice(0, -1)
                                  .map((c, i) => [...Array.from(c), ...Array.from(curves[i + 1]).reverse()])


                // remove old link
                path.remove()

                // add colorcoded flow
                let group = this.elem
                    .append("g")
                    .attr("class", "link flow-link")

                group.selectAll("path")
                     .data(areas)
                     .enter()
                     .append("path")
                     .attr("class", "flow-link-area colorcoded")
                     .attr("d", c => d3.line().curve(d3.curveLinearClosed)(c.map(p => [p.x, p.y])))
                     .style("fill", "var(--highlight-color)")
                     .style("stroke", "none")
                     .attr("legend_key", function (c, i) {
                         let class_name = data.classes[i]
                         return Legend.byLabel(class_name).key
                     })

                // TODO: this should not happen every time or only this element should be updated
                Legend.update()

                return group
        }

        return path
    }
}
