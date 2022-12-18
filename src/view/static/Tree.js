/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {GlobalSettings} from "./Settings.js";
import * as Views from "./Views.js";
import {Legend} from "./Legend.js";

/**
 * Wrapper around a node that keeps track of the used view for illustration and
 * handles the rendering logic.
 *
 * To each node in the tree, one renderer is assigned. It stores the nodes current and
 * default position in the tree, the used view, as well as settings for the illustration.
 * Using the NodeRenderer makes sure that the nodes in the tree (data) is cleanly seperated
 * from the logic to display it.
 *
 * Views are simply adapters that extend the NodeRenderer with the real illustration
 * capabilities. In the future, they could be integrated into subclasses of NodeRenderer.
 */
class NodeRenderer {
    //TODO: implement safety check for selection
    //TODO: implement settings
    //TODO: use event based functions that may be set (onViewChange, onPositionUpdate, onSettingsChange, ...)
    //TODO: only update the color of the view and not all colorcoded elements in the DOM

    // The svg group that is used to render all illustrations for the bound node
    #elem

    // The original position of the node assigned by the layout algorithm. It
    // differs from the displayed position, which may be affected by animations.
    #xo
    #yo

    // The displayed position. The coordinate system is relative to the svg element
    // holding all node and link illustrations. By default, it is equal to the original
    // position defined by the layout algorithm but may vary due to f.e. animations.
    x
    y

    // The node that is linked to this NodeRenderer. It holds all the data that is used
    // for illustration. See FNode for more information.
    node

    // The current view that is used to illustrate the node.
    view

    // Node specific settings for the illustration. The settings are organized as a map of
    // dictionaries where the key is a view name. Settings therefore persist at the node, even
    // when the view changes.
    settings

    #ee

    /**
     * Creates a new NodeRenderer for the given node with an initial view.
     * @param node - The node that is mapped to this renderer.
     * @param view - The initial view used for illustration.
     */
    constructor (node, view) {
        this.node     = node

        this.#ee      = new EventEmitter()

        this.view     = view
        this.settings = {}
        this.settings[view.name] = view.defaultSettings

        this.on("view-ready", () => this.#onViewReady())
    }

    /**
     * Binds the renderer to a DOM element.
     *
     * For each node renderer, one svg group is generated. This separates the illustrations of
     * different nodes from each other. Because d3 is used to join the svg group to the renderer,
     * the former must be instantiated beforehand and later bound to the DOM element.
     * @param selection - A d3 selection of the svg group to which this renderer is bound.
     */
    bind (selection) {
        // save the svg group, where the node renderer will
        // draw the views
        this.#elem = d3.select(selection)

        // setup some attributes for the svg group
        this.#elem
            .attr("class", "tree-node")
            .attr("forID", this.node.id)

        // fire a ready event
        this.#ee.emit("ready", {context: this})
    }

    /**
     * Clears the illustration by removing all elements from the svg group.
     */
    clear() {
        // remove all children
        this.#elem
            .selectAll("*")
            .remove()
    }

    /**
     * (Re)draws a node using the renderers current view.
     *
     * The drawing algorithm works as follows:
     * 1. Clearing any previous illustration
     * 2. Adding a temporary placeholder showing a loading icon.
     *    This is done because the view's illustration function works asynchronously to
     *    allow requests to the server for data retrieval.
     * 3. Calling the view's illustration function where the result is hidden until the
     *    promise is resolved.
     * 4. Removing the placeholder and setting the view's illustration visible.
     */
    draw() {
        // clear the svg group
        this.clear()

        // append the view placeholder
        this.#elem
            .append("g")
            .attr("class", "node-view " + this.view.name)
            .style("visibility", "hidden")

        // append a view placeholder
        this.#elem
            .classed(this.view.name, true)
            .append("foreignObject")
            .attr("class", "view-placeholder")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 25)
            .attr("height", 25)
            .append("xhtml:img")
            .attr("src", "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif")
            .style("width", "25px")
            .style("height", "25px")

        // recenter the placeholder
        this.#updateTransform()

        // illustrate the node with the current view
        this.view.illustrate.call(this.#elem.select(".node-view").node(), this.node, this.settings[this.view.name])
            .then(() => this.#ee.emit("view-ready"))
    }

    /**
     * Updates the position of the illustration.
     *
     * A renderer holds two different positions for each illustration. One displayed
     * position at which the illustration is displayed and one original position
     * that was calculated by the layout algorithm. The latter one is not affected
     * by animations, such as the node transition.
     *
     * When the illustration was already renderer and a size can be determined, the svg
     * group is already translated so that the illustration is centered with regard to
     * the displayed position.
     *
     * @param x - The x position relative the parent svg element (in pixels).
     * @param y - The x position relative the parent svg element (in pixels).
     * @param keepOriginal - Whether the original position should be kept and
     *      only the displayed position should be updated.
     * @param animate - Whether the position change should happen smoothly.
     */
    updatePosition (x, y, keepOriginal=true, animate=false) {
        // TODO: include the animation

        // check whether the original position should be updated
        if (keepOriginal) {
            this.#xo = x
            this.#yo = y
        }

        // update the current position
        this.x  = x
        this.y  = y

        // update transformation of svg group and center
        this.#updateTransform()

        // fire a position update event
        this.#ee.emit("position-update", {context: this, keepOriginal: keepOriginal, animate: animate})
    }

    /**
     * Updates the transformation of the svg group, implementing the position update
     * from `NodeRenderer.updatePosition()`.
     *
     * The positioning of the svg groups is solved using the transformation attribute.
     * Therefore, each renderer has its own coordinate system with an origin at the
     * displayed position.
     *
     * When the illustration was already renderer and a size can be determined, the svg
     * group is already translated so that the illustration is centered with regard to
     * the displayed position.
     */
    #updateTransform() {

        // get the bounding box to center the view around (x, y)
        // if the element is not ready, e.g. no bbox exists do not
        // center the view
        const bbox = this.#elem.node().getBBox()
        let x, y
        if (bbox) {
            x = this.x - (bbox.x + 0.5*bbox.width)
            y = this.y - (bbox.y + 0.5*bbox.height)
        } else {
            x = this.x
            y = this.y
        }

        // update the transform matrix
        this.#elem
            .attr("transform", "translate(" + x + ", " + y + ")")
    }

    /**
     * Register a function to be executed when a specific event is fired by
     * the renderer.
     *
     * Available events are:
     * - "ready"           (fired when the renderer is bound to a svg group)
     * - "view-ready"      (fired when the view finished its asynchronous illustration)
     * - "position-update" (fired when the views position changed)
     *
     * @param eventName - The name of the event
     * @param func - The function to be executed
     */
    on(eventName, func) {
        this.#ee.addListener(eventName, func)
    }

    /**
     * Called when the asynchronous illustration function of the view completed.
     *
     * This function implements the fourth step in the algorithmic description of
     * the draw function. It removes the temporary placeholder, and shows the
     * illustration.
     */
    #onViewReady () {
        // remove the placeholder
        this.#elem
            .select(".view-placeholder")
            .style("background", "red")
            .remove()

        // center the view again
        this.#updateTransform()

        // update legend
        Legend.update()

        // show the view
        this.#elem
            .select(".node-view")
            .style("visibility", "visible")
    }
}

class LinkRenderer {

    #elem

    constructor(elem) {
        this.#elem = d3.select(elem)
    }

    clear() {
        this.#elem
            .selectAll("*")
            .remove()
    }

    draw(source, target) {
        this.#elem
            .append("line")
            .attr("x1", source.x)
            .attr("y1", source.y)
            .attr("x2", target.x)
            .attr("y2", target.y)
            .style("stroke", "black")
    }
}

export class FTree {

    id

    nodes
    renderers = new Map()

    #ui_elem

    constructor (nodes, elem) {
        this.id       = "Tree-" + uuid.v4()
        this.nodes    = nodes

        this.#initializeContainer(elem)

        // add the panzoom functionality
        //this.panzoom = new Panzoom(this.#ui_elem.node())

        window.Tree = this
    }

    #initializeContainer (elem) {
        // TODO: make this function accept d3 selections and html elements too
        this.#ui_elem = d3
            .select(elem)
            .classed("tree", true)
            .attr("id", this.id)
    }

    #initializeRenderers() {

        // load an initial link renderer
        this.linkRenderer = new LinkRenderer(this.#ui_elem.select(".tree-links").node())

        // go through all the nodes and assign a node renderer
        for (const node of this.nodes) {
            const view = [Views.BasicView, Views.CCircleIconView, Views.TextView, Views.BarChartView][Math.floor(Math.random() * 4)]
            let renderer = new NodeRenderer(node, view)
            this.renderers.set(node.id, renderer)
        }

        // for all nodes, append a svg group and bind
        // the node renderer to it
        this.#ui_elem
            .select(".tree-nodes")
            .selectAll("g")
            .data(this.renderers.values())
            .enter()
            .append("g")
            .each(function (renderer) {
                renderer.bind(this)
            })
    }

    clear () {
        // remove all children
        this.#ui_elem
            .selectAll("*")
            .remove()

        // append the svg canvas
        this.#ui_elem
            .append("svg")
            .attr("class", "canvas")
            .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
            .style("left", 50)
            .style("top", 50)
            .style("position", "relative")

        // append the links group
        this.#ui_elem
            .select(".canvas")
            .append("g")
            .attr("class", "tree-links")

        // append the node group
        this.#ui_elem
            .select(".canvas")
            .append("g")
            .attr("class", "tree-nodes")

        this.#initializeRenderers()
    }

    layout() {
        // load layout and path settings
        let direction = GlobalSettings.get("layout.direction")
        let lspace    = GlobalSettings.get("layout.lspace")
        let bspace    = GlobalSettings.get("layout.bspace")
        let layout, width, height, xmin, ymin;

        // helper function
        const range = x => Math.max(...x) - Math.min(...x)

        // calculate the tree layout
        layout = d3.tree().nodeSize([bspace * 100, lspace * 80])(this.nodes)

        // find range of x and y coordinates
        // TODO: include the view sizes so that there is padding
        width  = range(this.nodes.descendants().map(node => node.x)) + 100
        height = range(this.nodes.descendants().map(node => node.y)) + 80

        // move x and y coordinates, so that they are positive
        // TODO: include the view sizes so that there is padding
        xmin = -Math.min(...this.nodes.descendants().map(node => node.x)) + 50
        ymin = 40

        // update the size of the svg image
        this.#ui_elem
            .select("svg")
            .style("width", width + "px")
            .style("height", height + "px")

        for (const node of this.nodes) {
            let renderer = this.renderers.get(node.id)

            // update the renderers position
            renderer.updatePosition(node.x + xmin, node.y + ymin)

            // remove the fields from the nodes after usage
            delete node.x
            delete node.y
        }
    }

    draw () {
        this.clear()
        this.layout()

        for (const node of this.nodes) {
            let renderer = this.renderers.get(node.id)
            renderer.draw()
        }

        for (const link of this.nodes.links()) {
            const source = this.renderers.get(link.source.id)
            const target = this.renderers.get(link.target.id)
            this.linkRenderer.draw(source, target)
        }
    }

    classNames() {
        return this.nodes.data.classes
    }

    featureNames () {
        return this.nodes.data.features
    }

    saveSVG() {

        // const createStyleElementFromCSS = () => {
        //     // JSFiddle's custom CSS is defined in the second stylesheet file
        //     const sheet = document.styleSheets[1];
        //
        //     const styleRules = [];
        //     for (let i = 0; i < sheet.cssRules.length; i++)
        //         styleRules.push(sheet.cssRules.item(i).cssText);
        //
        //     const style = document.createElement('style');
        //     style.type = 'text/css';
        //     style.appendChild(document.createTextNode(styleRules.join(' ')))
        //
        //     return style;
        // };

        // const style = createStyleElementFromCSS();

        // fetch SVG-rendered image as a blob object
        const svg = this.#ui_elem.select("svg").node();
        // svg.insertBefore(style, svg.firstChild); // CSS must be explicitly embedded
        const data = (new XMLSerializer()).serializeToString(svg);
        console.log(data)
        const svgBlob = new Blob([data], {
            type: 'image/svg+xml;charset=utf-8'
        });
        // style.remove(); // remove temporarily injected CSS

        // convert the blob object to a dedicated URL
        const url = URL.createObjectURL(svgBlob);

        // load the SVG blob to a flesh image object
        const img = new Image();
        img.addEventListener('load', () => {
            // draw the image on an ad-hoc canvas
            const bbox = svg.getBoundingClientRect();
            console.log(bbox)

            const canvas = document.createElement('canvas');
            canvas.width  = bbox.width;
            canvas.height = bbox.height;

            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, 2*bbox.width, 2*bbox.height);

            URL.revokeObjectURL(url);

            // trigger a synthetic download operation with a temporary link
            const a = document.createElement('a');
            a.download = 'image.png';
            document.body.appendChild(a);
            a.href = canvas.toDataURL();
            a.click();
            a.remove();
        });
        img.src = url;

    }



    /**
     * Initializes the tree from the data structure.
     * @param fgts Instance of Forester's general tree structure
     */
    // constructor(fgts, elem) {
    //     // console.log("Initializing tree " + this.#meta.name + "...")
    //     this.#ui_elem = d3.select(elem)
    //     this.id = "Tree-" + uuid.v4()
    //     this.meta = fgts.meta
    //     this.nodes = new FNode(d3.hierarchy(fgts.tree), fgts.meta)
    //     this.links = this.nodes.descendants().slice(1)
    //
    //     // prepare the container
    //     this.#ui_elem
    //         .classed("tree", true)
    //         .attr("id", this.id)
    //
    //     // add pan and zoom funcionality
    //     this.panzoom = new Panzoom(document.getElementById(this.id))
    //
    //     // clean up the data for each node and add some initial fields
    //     this.nodes.each(node => this.#initializeNode(node))
    //     // generate all the flow-relevant fields
    //     this.#initializeFlow()
    //
    //     // add the listeners for the settings
    //     GlobalSettings.addChangeListeners(() => this.draw.call(this), "layout.direction", "layout.lspace", "layout.bspace", "path.style", "path.flow")
    // }

    // /**
    //  * initialize all nodes and set pre-defined fields that dependant on
    //  * the whole tree structure (numerical id, branch, level, ...)
    //  */
    // #initializeNode(node) {
    //     // initial values
    //     node.id = "Node-" + uuid.v4()
    //     node.collapsed = false
    //     node.view = Views.BasicView //[Views.BasicView, Views.TextView, Views.CCircleIconView][Math.floor(3 * Math.random())]//(node.data.type === "leaf") ? Views.CCircleIconView : Views.TextView
    //     node.elements = {}
    //
    //     // copy values of data into node
    //     for (const key of ["distribution", "samples", "split", "type", "vote"]) {
    //         node[key] = node.data[key]
    //     }
    //
    //     // add easy accessors for the class info
    //     node.vote_index = node.vote
    //     node.vote = this.meta.classes[node.vote_index]
    //     node.vote_fraction = node.distribution[node.vote_index] / node.distribution.reduce((a, b) => a + b)
    //     node.vote_samples = node.distribution[node.vote_index]
    //
    //     // add easy accessors for the feature info
    //     if (node.split) {
    //         node.split.feature_index = node.split.feature
    //         node.split.feature = this.meta.features[node.split.feature_index]
    //     }
    // }
    //
    // #initializeFlow() {
    //     let flow_shown_classes = 2
    //     let flow_path_samples = 19
    //
    //     // CALCULATE the scaled node index
    //     // grab all the samples and scale
    //     let samples = this.nodes.descendants().map(node => node.samples)
    //     // bin samples and count
    //     let bins = d3.bin().thresholds(flow_path_samples)(samples)
    //     let counts = bins.map(bin => bin.length)
    //     // cumulative count function
    //     let sum = 0
    //     let ccf = counts.map(count => sum += count)
    //     // for each note, find the bin index and invert the normalized ccf
    //     this.nodes.descendants().forEach(
    //         function (node) {
    //             let index = bins.map(bin => bin.indexOf(node.samples) >= 0).indexOf(true)
    //             node.flow = {}
    //             node.flow.samples_scaled = (ccf[index] - ccf[0]) / (ccf.slice(-1)[0] - ccf[0])
    //
    //             let distribution_sorted = [...node.distribution].sort((a, b) => a < b)
    //             let distribution_flow = distribution_sorted.slice(0, flow_shown_classes)
    //             let distribution_other = distribution_sorted.slice(flow_shown_classes)
    //             if (distribution_other.length == 0) {
    //                 node.flow.distribution = distribution_flow
    //             } else {
    //                 node.flow.distribution = [...distribution_flow, distribution_other.reduce((a, b) => a + b)]
    //             }
    //         })
    // }
    //
    // /**
    //  * Remove all HTML elements from the tree and
    //  * reverts to default options
    //  */
    // #clear() {
    //     // console.log("Clearing all nodes ...")
    //     this.nodes.descendants().forEach(this.#clearNode)
    // }
    //
    // /**
    //  * Clears all HTML elements for one node
    //  * @param node The node that should be cleared
    //  */
    // #clearNode(node) {
    //     d3.select("#" + node.id)
    //       .selectAll("*")
    //       .remove()
    // }
    //
    // #clearLinks() {
    //     d3.select(".links")
    //       .selectAll(".link")
    //       .selectAll("*")
    //       .remove()
    // }
    //
    // /**
    //  * Clears and redraws the whole tree. On the first method call, the DOM structure is prepared
    //  * and the data is bound to the _d3_ selection.
    //  * Based on the `view` paremeter, the corresponding node illustration is added.
    //  * The layout is always re-calculated, as the illustration's size may have changed.
    //  */
    // draw() {
    //     // add the nodes on the first call
    //     if (this.#ui_elem.selectAll(".node").empty()) {
    //         this.#ui_nodes = this.#ui_elem
    //                              .selectAll("div")
    //                              .data(this.nodes.descendants())
    //                              .enter()
    //                              .append("div")
    //                              .attr("id", node => node.id)
    //                              .attr('class', node => 'node ' + (!node.parent ? 'root' : (node.children ? 'internal' : 'leaf')))
    //                              .style("left", "50%")
    //                              .style("top", "50%")
    //                              .style("visibility", "true")
    //                              .each(function (node) {
    //                                  node.elements.node = d3.select(this).node()
    //                              })
    //     }
    //
    //     // add the links on the first call
    //     if (this.#ui_elem.select(".links").empty()) {
    //         this.#ui_links = this.#ui_elem
    //                              .insert("svg", ":first-child")
    //                              .attr("class", "links")
    //                              .selectAll("path")
    //                              .data(this.nodes.descendants().slice(1))
    //                              .enter()
    //                              .append('g')
    //                              .attr('class', 'link')
    //                              .attr('from', node => node.parent.id)
    //                              .attr('to', node => node.id)
    //                              .each(function (node) {
    //                                  node.elements.link = d3.select(this).node()
    //                              })
    //     }
    //
    //     // do (or update) the layout
    //     this.#layout()
    //
    //     // draw the views
    //     this.nodes.each(node => this.#drawNode(node))
    //
    //     // draw the links
    //     this.#drawLinks()
    //
    //     // update legend
    //     Legend.update()
    // }
    //
    // /**
    //  * Clears and redraws one node.
    //  * @param node The node that should be cleared
    //  */
    // #drawNode(node) {
    //     const ui_node = d3.select("#" + node.id)
    //
    //     // clear any illustration of the node
    //     this.#clearNode(node)
    //
    //     // add the illustration
    //     node.view.illustrate(ui_node.append("div").attr("class", "view"), node, this.meta)
    //
    //     // TODO: better solution for changing the illustration
    //     ui_node.on("click", function (event) {
    //         const node = d3.select(this).datum()
    //         const view = node.view.name
    //
    //         if (event.shiftKey) {
    //             // change node view
    //             let all_views = Object.values(Views).filter(v => typeof v === "object")
    //             node.view = all_views[(all_views.indexOf(node.view) + 1) % all_views.length]
    //             Tree.draw()
    //         } else {
    //             // togle node
    //             Tree.toggleNode(node)
    //             return;
    //         }
    //     })
    //
    //     ui_node.on("mouseenter mouseleave", this.#onToggleNodeMenu)
    // }
    //
    // /**
    //  * Draws the links that connect the nodes
    //  */
    // #drawLinks(link) {
    //     this.#clearLinks()
    //
    //     let direction = GlobalSettings.get("layout.direction")
    //     let curve = GlobalSettings.get("path.style")
    //     let flow = GlobalSettings.get("path.flow")
    //
    //     if (curve === "linear") curve = d3.curveLinear
    //     if (curve === "curved") curve = d3.curveBumpY
    //     if (curve === "ragged") curve = d3.curveStepAfter
    //
    //     let stroke_max_width = 10;
    //     let flow_sample_dist = 10;
    //
    //     let paths = this
    //         .#ui_links
    //         .append("path")
    //         .attr("d", node => d3.link(curve)({source: [node.parent.x, node.parent.y], target: [node.x, node.y]}))
    //
    //     switch (flow) {
    //         case "none":
    //             // do nothing
    //             break;
    //         case "linear":
    //             paths.attr("style", node => "stroke-width:" + ((stroke_max_width - 1) * node.samples / Tree.meta.samples + 1) + "px")
    //             break;
    //         case "auto":
    //             paths.attr("style", node => "stroke-width:" + ((stroke_max_width - 1) * node.flow.samples_scaled + 1) + "px")
    //             break;
    //         case "colorcoded":
    //             paths.each(function (node) {
    //                 let curve = d3.select(node.elements.link).select("path").node()
    //
    //                 // sample points along curve
    //                 let L = curve.getTotalLength()
    //                 let N = Math.floor(L / flow_sample_dist)
    //                 let points = [...Array(N + 1).keys()].map(n => curve.getPointAtLength(n / N * L))
    //
    //                 // calculate normal of each point
    //                 for (let i = 0; i < points.length; i++) {
    //                     let dx, dy;
    //
    //                     if (i == 0) {
    //                         // first point
    //                         dx = points[i + 1].x - points[i].x
    //                         dy = points[i + 1].y - points[i].y
    //                     } else if (i == points.length - 1) {
    //                         // last point
    //                         dx = points[i].x - points[i - 1].x
    //                         dy = points[i].y - points[i - 1].y
    //                     } else {
    //                         // middle points
    //                         dx = (points[i + 1].x - points[i - 1].x) / 2
    //                         dy = (points[i + 1].y - points[i - 1].y) / 2
    //                     }
    //
    //                     // normalize
    //                     points[i].dx = dx / (dx ** 2 + dy ** 2) ** 0.5
    //                     points[i].dy = dy / (dx ** 2 + dy ** 2) ** 0.5
    //                 }
    //
    //                 // find the points of the equidistant curves
    //                 let sum = 0;
    //                 let steps = [0, ...node.flow.distribution.map((s => sum += s / node.samples))]
    //                 let curves = steps.map(step => points.map(
    //                     function (p) {
    //                         return {
    //                             x: p.x + ((stroke_max_width - 1) * node.flow.samples_scaled + 1) * (2 * step - 1) * p.dy,
    //                             y: p.y + ((stroke_max_width - 1) * node.flow.samples_scaled + 1) * (1 - 2 * step) * p.dx
    //                         }
    //                     }
    //                 ))
    //
    //                 // prepare the areas between them
    //                 let areas = curves.slice(0, -1)
    //                                   .map((c, i) => [...Array.from(c), ...Array.from(curves[i + 1]).reverse()])
    //
    //                 // remove old link
    //                 d3.select(node.elements.link)
    //                   .selectAll("path")
    //                   .remove()
    //
    //                 // add colorcoded flow
    //                 d3.select(node.elements.link)
    //                   .selectAll("path")
    //                   .data(areas)
    //                   .enter()
    //                   .append("path")
    //                   .classed("colorcoded", true)
    //                   .classed("flow", true)
    //                   .attr("d", c => d3.line().curve(d3.curveLinearClosed)(c.map(p => [p.x, p.y])))
    //                   .attr("legend_key", function (c, i) {
    //                       let class_index = node.distribution.indexOf(node.flow.distribution[i])
    //                       let class_name = Tree.classNames()[class_index]
    //                       return (class_index >= 0 ? Legend.byLabel(class_name).key : "")
    //                   })
    //             })
    //
    //             break;
    //     }
    // }
    //
    // /**
    //  * Recalculates the layout of the tree. Nodes are placed at their respective
    //  * locations and the tree container and link positions are updated.
    //  */
    // #layout() {
    //     // console.log("Calculating layout ...")
    //
    //     // helper function
    //     const range = x => Math.max(...x) - Math.min(...x)
    //
    //     // load layout and path settings
    //     let direction = GlobalSettings.get("layout.direction")
    //     let lspace = GlobalSettings.get("layout.lspace")
    //     let bspace = GlobalSettings.get("layout.bspace")
    //
    //     let tree, width, height, xmin, ymin;
    //     // calculate the tree layout
    //     tree = d3.tree().nodeSize([bspace * 100, lspace * 80])(this.nodes)
    //     // find range of x and y coordinates
    //     width = range(this.nodes.descendants().map(node => node.x))
    //     height = range(this.nodes.descendants().map(node => node.y))
    //     // move x and y coordinates, so that they are positive
    //     xmin = -Math.min(...this.nodes.descendants().map(node => node.x))
    //     ymin = 0
    //     this.nodes.descendants().forEach(node => {
    //         node.x = node.x + xmin;
    //         node.y = node.y + ymin
    //         // save the original position again for the collapsing of nodes
    //         node.ox = node.x
    //         node.oy = node.y
    //     })
    //
    //     // update direction parameter
    //     this.#ui_elem.classed("layout-left-right", direction === "left-right")
    //
    //     // TODO: can you solve this with scale?
    //     // page and legend for placing the container
    //     let page = document.body.getBoundingClientRect()
    //     let legend = document.getElementById("legend").getBoundingClientRect()
    //
    //     // resize container
    //     d3.select("#" + this.id)
    //       .style("width", width + "px")
    //       .style("height", height + "px")
    //     // .style("left", legend.left / 2 + "px")
    //     // .style("top", "50%")
    //
    //     // updating the positions of the nodes
    //     this.#ui_nodes
    //         .style("left", node => node.x + "px")
    //         .style("top", node => node.y + "px")
    // }
    //
    // toggleNode(node, animate = true) {
    //     if (node.collapsed) {
    //         node.collapsed = false;
    //         this.#showNode(node, animate)
    //     } else {
    //         node.collapsed = true;
    //         this.#hideNode(node, animate)
    //     }
    // }
    //
    // /**
    //  * Hides a node and all it's child nodes
    //  * @param id Identifier of the node's HTML element
    //  * @param animate If a transition should be shown
    //  */
    // #hideNode(origin, animate = true) {
    //
    //     let childrenNodes = origin.descendants().slice(1).map(node => node.elements.node)
    //     let childrenLinks = origin.descendants().slice(1).map(node => node.elements.link)
    //
    //     // add indicator for hidden nodes
    //     d3.select(origin.elements.node)
    //       .append("span")
    //       .attr("class", "hide-indicator fa-solid fa-ellipsis")
    //
    //     d3.selectAll(childrenLinks)
    //       .transition()
    //       .style("opacity", 0)
    //       .on("end", function () {
    //           d3.select(this).style("visibility", "hidden")
    //       })
    //
    //     d3.selectAll(childrenNodes)
    //       .transition()
    //       .style("opacity", 0)
    //       .on("end", function (node) {
    //           d3.select(this).style("visibility", "hidden"), node.collapsed = true
    //       })
    // }
    //
    // /**
    //  * Shows a node and all it's children nodes that have previously been hidden
    //  * @param id Identifier of the node's HTML element
    //  * @param animate If a transition should be shown
    //  */
    // #showNode(origin, animate = true) {
    //
    //     let childrenNodes = origin.descendants().slice(1).map(node => node.elements.node)
    //     let childrenLinks = origin.descendants().slice(1).map(node => node.elements.link)
    //
    //     // remove indicator for hidden nodes
    //     d3.select(origin.elements.node)
    //       .select(".hide-indicator")
    //       .remove()
    //
    //     // remove all the indicators for the hidden children nodes too
    //     d3.selectAll(childrenNodes)
    //       .selectAll(".hide-indicator")
    //       .remove()
    //
    //     d3.selectAll(childrenLinks)
    //         // animate the opacity
    //       .style("visibility", "visible")
    //       .style("opacity", 0)
    //       .transition()
    //       .style("opacity", 1)
    //
    //     d3.selectAll(childrenNodes)
    //         // animate the opacity
    //       .transition()
    //       .style("visibility", "visible")
    //       .style("opacity", 1)
    //       .on("end", node => node.collapsed = false)
    //
    // }
    //
    // #onToggleNodeMenu(event) {
    //     return;
    //
    //     let ui_node = d3.select(this)
    //
    //
    //     if (event.type === "mouseenter") {
    //         console.log("Showing node menu")
    //         // browse nodes left
    //         ui_node.append("span")
    //                .attr("class", "view-menu-item view-browse-left fa-solid fa-angle-left")
    //
    //         // browse nodes right
    //         ui_node.append("span")
    //                .attr("class", "view-menu-item view-browse-right fa-solid fa-angle-right")
    //
    //         // hide
    //         ui_node.append("span")
    //                .attr("class", "view-menu-item view-collapse fa-solid fa-eye-slash fa-sm")
    //     } else {
    //         console.log("Hiding node menu")
    //         ui_node.selectAll(".view-menu-item")
    //                .remove()
    //     }
    // }
    //
    // classNames() {
    //     let names = this.meta.classes
    //     return names.map(n => S(n).trim().capitalize().s)
    // }
    //
    // featureNames() {
    //     let names = this.meta.features
    //     return names.map(n => S(n).trim().capitalize().s)
    // }
    //
    // async createThumbnail() {
    //     console.log("Creating thumbnail")
    //
    //     d3.selectAll(".thumbnail-preview")
    //               .remove()
    //
    //     let node = document.getElementById(Tree.id)
    //     console.log(node.scrollHeight, node.scrollWidth)
    //     console.log(node.clientHeight, node.clientWidth)
    //     let scale = Math.min(node.clientHeight/(node.scrollHeight + 20), node.clientWidth/(node.scrollWidth + 20))
    //     console.log(scale)
    //
    //     let settings = {
    //         style: {scale: scale},
    //         canvasWidth: 300,
    //         canvasHeight: 300*(node.scrollHeight/node.scrollWidth),
    //         skipAutoScale: true}
    //
    //     htmlToImage.toPng(node, settings)
    //                .then(function (dataUrl) {
    //                    d3.select(document.body)
    //                      .append("img")
    //                      .attr("src", dataUrl)
    //                      .attr("class", "thumbnail-preview")
    //                      .style("position", "absolute")
    //                })
    //
    // }
}