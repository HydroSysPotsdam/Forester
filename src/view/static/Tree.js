/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Panzoom} from "./Panzoom.js";
import {GlobalSettings} from "./Settings.js";
import * as Views from "./Views.js";
import {Legend} from "./Legend.js";
import {Tree} from "./Editor.js";

export class TreeInstance {

    id

    meta
    nodes
    links

    #ui_elem
    #ui_links
    #ui_nodes

    /**
     * Initializes the tree from the data structure.
     * @param fgts Instance of Forester's general tree structure
     */
    constructor(fgts, elem) {
        // console.log("Initializing tree " + this.#meta.name + "...")
        this.#ui_elem = d3.select(elem)
        this.id = "Tree-" + uuid.v4()
        this.meta = fgts.meta
        this.nodes = d3.hierarchy(fgts.tree)
        this.links  = this.nodes.descendants().slice(1)

        // prepare the container
        this.#ui_elem
            .classed("tree", true)
            .attr("id", this.id)

        // add pan and zoom funcionality
        this.panzoom = new Panzoom(document.getElementById(this.id))

        // clean up the data for each node and add some initial fields
        this.nodes.each(node => this.#initializeNode(node))
        // generate all the flow-relevant fields
        this.#initializeFlow()

        // add the listeners for the settings
        GlobalSettings.addChangeListeners(() => this.draw.call(this), "layout.direction", "layout.lspace", "layout.bspace", "path.style", "path.flow")
    }

    /**
     * initialize all nodes and set pre-defined fields that dependant on
     * the whole tree structure (numerical id, branch, level, ...)
     */
    #initializeNode(node) {
        // initial values
        node.id = "Node-" + uuid.v4()
        node.collapsed = false
        node.view = [Views.BasicView, Views.TextView, Views.CCircleIconView][Math.floor(3 * Math.random())]//(node.data.type === "leaf") ? Views.CCircleIconView : Views.TextView
        node.elements = {}

        // copy values of data into node
        for (const key of ["distribution", "samples", "split", "type", "vote"]) {
            node[key] = node.data[key]
        }

        // add easy accessors for the class info
        node.vote_index = node.vote
        node.vote = this.meta.classes[node.vote_index]
        node.vote_fraction = node.distribution[node.vote_index] / node.distribution.reduce((a, b) => a + b)
        node.vote_samples = node.distribution[node.vote_index]

        // add easy accessors for the feature info
        if (node.split) {
            node.split.feature_index = node.split.feature
            node.split.feature = this.meta.features[node.split.feature_index]
        }
    }

    #initializeFlow() {
        let flow_shown_classes = 2
        let flow_path_samples  = 19

        // CALCULATE the scaled node index
        // grab all the samples and scale
        let samples = this.nodes.descendants().map(node => node.samples)
        // bin samples and count
        let bins   = d3.bin().thresholds(flow_path_samples)(samples)
        let counts = bins.map(bin => bin.length)
        // cumulative count function
        let sum = 0
        let ccf = counts.map(count => sum += count)
        // for each note, find the bin index and invert the normalized ccf
        this.nodes.descendants().forEach(
            function (node) {
                let index = bins.map(bin => bin.indexOf(node.samples) >= 0).indexOf(true)
                node.flow = {}
                node.flow.samples_scaled = (ccf[index] - ccf[0])/(ccf.slice(-1)[0] - ccf[0])

                let distribution_sorted = [...node.distribution].sort((a, b) => a < b)
                let distribution_flow   = distribution_sorted.slice(0, flow_shown_classes)
                let distribution_other  = distribution_sorted.slice(flow_shown_classes)
                if (distribution_other.length == 0) {
                    node.flow.distribution = distribution_flow
                } else {
                    node.flow.distribution = [...distribution_flow, distribution_other.reduce((a, b) => a + b)]
                }
            })
    }

    /**
     * Remove all HTML elements from the tree and
     * reverts to default options
     */
    #clear() {
        // console.log("Clearing all nodes ...")
        this.nodes.descendants().forEach(this.#clearNode)
    }

    /**
     * Clears all HTML elements for one node
     * @param node The node that should be cleared
     */
    #clearNode(node) {
        d3.select("#" + node.id)
          .selectAll("*")
          .remove()
    }

    #clearLinks() {
        d3.select(".links")
          .selectAll(".link")
          .selectAll("*")
          .remove()
    }

    /**
     * Clears and redraws the whole tree. On the first method call, the DOM structure is prepared
     * and the data is bound to the _d3_ selection.
     * Based on the `view` paremeter, the corresponding node illustration is added.
     * The layout is always re-calculated, as the illustration's size may have changed.
     */
    draw() {
        // add the nodes on the first call
        if (this.#ui_elem.selectAll(".node").empty()) {
            this.#ui_nodes = this.#ui_elem
                .selectAll("div")
                .data(this.nodes.descendants())
                .enter()
                .append("div")
                .attr("id", node => node.id)
                .attr('class', node => 'node ' + (!node.parent ? 'root' : (node.children ? 'internal' : 'leaf')))
                .style("left", "50%")
                .style("top", "50%")
                .style("visibility", "true")
                .each(function (node) {node.elements.node = d3.select(this).node()})
        }

        // add the links on the first call
        if (this.#ui_elem.select(".links").empty()) {
            this.#ui_links = this.#ui_elem
                .insert("svg", ":first-child")
                .attr("class", "links")
                .selectAll("path")
                .data(this.nodes.descendants().slice(1))
                .enter()
                .append('g')
                .attr('class', 'link')
                .attr('from', node => node.parent.id)
                .attr('to', node => node.id)
                .each(function (node) {node.elements.link = d3.select(this).node()})
        }

        // do (or update) the layout
        this.#layout()

        // draw the views
        this.nodes.each(node => this.#drawNode(node))

        // draw the links
        this.#drawLinks()

        // update legend
        Legend.update()
    }

    /**
     * Clears and redraws one node.
     * @param node The node that should be cleared
     */
    #drawNode(node) {
        const ui_node = d3.select("#" + node.id)

        // clear any illustration of the node
        this.#clearNode(node)

        // add the illustration
        node.view.illustrate(ui_node.append("div").attr("class", "view"), node, this.meta)

        // TODO: better solution for changing the illustration
        ui_node.on("click", function (event) {
            const node = d3.select(this).datum()
            const view = node.view.name

            if (event.shiftKey) {
                // change node view
                let all_views = Object.values(Views).filter(v => typeof v === "object")
                node.view = all_views[(all_views.indexOf(node.view) + 1) % all_views.length]
                Tree.draw()
            } else {
                // togle node
                Tree.toggleNode(node)
                return;
            }
        })

        ui_node.on("mouseenter mouseleave", this.#onToggleNodeMenu)
    }

    /**
     * Draws the links that connect the nodes
     */
    #drawLinks(link) {
        this.#clearLinks()

        let direction = GlobalSettings.get("layout.direction")
        let curve     = GlobalSettings.get("path.style")
        let flow      = GlobalSettings.get("path.flow")

        if (curve === "linear") curve = d3.curveLinear
        if (curve === "curved") curve = d3.curveBumpY
        if (curve === "ragged") curve = d3.curveStepAfter

        let stroke_max_width = 10;
        let flow_sample_dist = 10;

        let paths = this
            .#ui_links
            .append("path")
            .attr("d", node => d3.link(curve)({source: [node.parent.x, node.parent.y], target: [node.x, node.y]}))

        switch (flow) {
            case "none":
                // do nothing
                break;
            case "linear":
                paths.attr("style", node => "stroke-width:" + ((stroke_max_width - 1)*node.samples/Tree.meta.samples + 1) + "px")
                break;
            case "auto":
                paths.attr("style", node => "stroke-width:" + ((stroke_max_width - 1)*node.flow.samples_scaled + 1) + "px")
                break;
            case "colorcoded":
                paths.each(function (node) {
                    let curve = d3.select(node.elements.link).select("path").node()

                    // sample points along curve
                    let L = curve.getTotalLength()
                    let N = Math.floor(L/flow_sample_dist)
                    let points = [...Array(N + 1).keys()].map(n => curve.getPointAtLength(n/N*L))

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
                    let steps = [0, ...node.flow.distribution.map((s => sum += s/node.samples))]
                    let curves = steps.map(step => points.map(
                        function (p) {
                            return {
                                x: p.x + ((stroke_max_width - 1)*node.flow.samples_scaled + 1)*(2*step - 1)*p.dy,
                                y: p.y + ((stroke_max_width - 1)*node.flow.samples_scaled + 1)*(1 - 2*step)*p.dx
                            }
                        }
                    ))

                    // prepare the areas between them
                    let areas = curves.slice(0, -1).map((c, i) => [...Array.from(c), ...Array.from(curves[i + 1]).reverse()])

                    // remove old link
                    d3.select(node.elements.link)
                      .selectAll("path")
                      .remove()

                    // add colorcoded flow
                    d3.select(node.elements.link)
                      .selectAll("path")
                      .data(areas)
                      .enter()
                      .append("path")
                      .classed("colorcoded", true)
                      .classed("flow", true)
                      .attr("d", c => d3.line().curve(d3.curveLinearClosed)(c.map(p => [p.x, p.y])))
                      .attr("legend_key", function (c, i) {
                          let class_index = node.distribution.indexOf(node.flow.distribution[i])
                          let class_name  = Tree.classNames()[class_index]
                          return (class_index >= 0 ? Legend.byLabel(class_name).key : "")
                      })
                })

                break;
        }
    }

    /**
     * Recalculates the layout of the tree. Nodes are placed at their respective
     * locations and the tree container and link positions are updated.
     */
    #layout() {
        // console.log("Calculating layout ...")

        // helper function
        const range = x => Math.max(...x) - Math.min(...x)

        // load layout and path settings
        let direction = GlobalSettings.get("layout.direction")
        let lspace    = GlobalSettings.get("layout.lspace")
        let bspace    = GlobalSettings.get("layout.bspace")

        let tree, width, height, xmin, ymin;
        // calculate the tree layout
        tree    = d3.tree().nodeSize([bspace * 100, lspace * 80])(this.nodes)
        // find range of x and y coordinates
        width   = range(this.nodes.descendants().map(node => node.x))
        height  = range(this.nodes.descendants().map(node => node.y))
        // move x and y coordinates, so that they are positive
        xmin = -Math.min(...this.nodes.descendants().map(node => node.x))
        ymin = 0
        this.nodes.descendants().forEach(node => {
            node.x = node.x + xmin;
            node.y = node.y + ymin
            // save the original position again for the collapsing of nodes
            node.ox = node.x
            node.oy = node.y
        })

        // update direction parameter
        this.#ui_elem.classed("layout-left-right", direction === "left-right")

        // TODO: can you solve this with scale?
        // page and legend for placing the container
        let page = document.body.getBoundingClientRect()
        let legend = document.getElementById("legend").getBoundingClientRect()

        // resize container
        d3.select("#" + this.id)
          .style("width", width + "px")
          .style("height", height + "px")
          // .style("left", legend.left / 2 + "px")
          // .style("top", "50%")

        // updating the positions of the nodes
        this.#ui_nodes
            .style("left", node => node.x + "px")
            .style("top",  node => node.y + "px")
    }

    toggleNode(node, animate = true) {
        if (node.collapsed) {
            node.collapsed = false;
            this.#showNode(node, animate)
        } else {
            node.collapsed = true;
            this.#hideNode(node, animate)
        }
    }

    /**
     * Hides a node and all it's child nodes
     * @param id Identifier of the node's HTML element
     * @param animate If a transition should be shown
     */
    #hideNode(origin, animate = true) {

        let childrenNodes = origin.descendants().slice(1).map(node => node.elements.node)
        let childrenLinks = origin.descendants().slice(1).map(node => node.elements.link)

        // add indicator for hidden nodes
        d3.select(origin.elements.node)
          .append("span")
          .attr("class", "hide-indicator fa-solid fa-ellipsis")

        d3.selectAll(childrenLinks)
          .transition()
          .style("opacity", 0)
          .on("end", function () {d3.select(this).style("visibility", "hidden")})

        d3.selectAll(childrenNodes)
          .transition()
          .style("opacity", 0)
          .on("end", function (node) {d3.select(this).style("visibility", "hidden"), node.collapsed = true})
    }

    /**
     * Shows a node and all it's children nodes that have previously been hidden
     * @param id Identifier of the node's HTML element
     * @param animate If a transition should be shown
     */
    #showNode(origin, animate = true) {

        let childrenNodes = origin.descendants().slice(1).map(node => node.elements.node)
        let childrenLinks = origin.descendants().slice(1).map(node => node.elements.link)

        // remove indicator for hidden nodes
        d3.select(origin.elements.node)
          .select(".hide-indicator")
          .remove()

        // remove all the indicators for the hidden children nodes too
        d3.selectAll(childrenNodes)
          .selectAll(".hide-indicator")
          .remove()

        d3.selectAll(childrenLinks)
        // animate the opacity
          .style("visibility", "visible")
          .style("opacity", 0)
          .transition()
          .style("opacity", 1)

        d3.selectAll(childrenNodes)
        // animate the opacity
          .transition()
          .style("visibility", "visible")
          .style("opacity", 1)
          .on("end", node => node.collapsed = false)

    }

    #onToggleNodeMenu(event) {
        return;

        let ui_node = d3.select(this)


        if (event.type === "mouseenter") {
            console.log("Showing node menu")
            // browse nodes left
            ui_node.append("span")
                   .attr("class", "view-menu-item view-browse-left fa-solid fa-angle-left")

            // browse nodes right
            ui_node.append("span")
                   .attr("class", "view-menu-item view-browse-right fa-solid fa-angle-right")

            // hide
            ui_node.append("span")
                   .attr("class", "view-menu-item view-collapse fa-solid fa-eye-slash fa-sm")
        } else {
            console.log("Hiding node menu")
            ui_node.selectAll(".view-menu-item")
                   .remove()
        }
    }

    classNames() {
        let names = this.meta.classes
        return names.map(n => S(n).trim().capitalize().s)
    }

    featureNames() {
        let names = this.meta.features
        return names.map(n => S(n).trim().capitalize().s)
    }
}