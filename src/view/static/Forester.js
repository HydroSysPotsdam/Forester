import * as Views from "./Views.js";
import {Legend} from "./Legend.js";
import {Panzoom} from "./Panzoom.js";
import {Settings} from "./Settings.js";

export let Tree

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
        this.lins  = this.nodes.descendants().slice(1)

        // prepare the container
        this.#ui_elem
            .classed("tree", true)
            .attr("id", this.id)

        this.nodes.each(node => this.#initializeNode(node))
    }

    /**
     * initialize all nodes and set pre-defined fields that dependant on
     * the whole tree structure (numerical id, branch, level, ...)
     */
    #initializeNode(node) {
        // initial values
        node.id = "Node-" + uuid.v4()
        node.collapsed = false
        node.view = node.children ? Views.TextView : Views.CCircleIconView
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
        node.view.illustrate(ui_node, node, this.meta)

        // TODO: better solution for changing the illustration
        ui_node.on("click", function (event) {
            const node = d3.select(this).datum()
            const view = node.view.name

            if (event.shiftKey) {
                Tree.toggleNode(node)
                return;
            }

            if (view === "TextView") {
                node.view = Views.CCircleIconView
            }

            if (view === "CCircleIconView") {
                node.view = Views.TextView
            }

            Tree.draw()
        })
    }

    /**
     * Draws the links that connect the nodes
     */
    #drawLinks(link) {
        this.#clearLinks()


        let direction = Settings.layout.direction
        let curve     = Settings.path.style
        let flow      = Settings.path.flow
        // if (curve === "linear") curve = d3.curveLinear
        // if (curve === "curved") curve = direction === "top-bottom" ? d3.curveBumpY : d3.curveBumpX
        // if (curve === "ragged") curve = direction === "top-bottom" ? d3.curveStepAfter : d3.curveStepBefore

        if (curve === "linear") curve = d3.curveLinear
        if (curve === "curved") curve = d3.curveBumpY
        if (curve === "ragged") curve = d3.curveStepAfter

        if (!flow) {
            this.#ui_links
                .append("path")
                .attr("d", node => d3.link(curve)({source: [node.parent.x, node.parent.y], target: [node.x, node.y]}))
        } else {
           this.#ui_links
               .each(function (node) {
                   let n = 2
                   let class_values = [...node.distribution].sort((a, b) => a < b).slice(0, n)
                   let class_names  = class_values.map(cv => Tree.classNames()[node.distribution.indexOf(cv)])
                   console.log(class_values, class_names)

                   let offset = 0
                   for (let i = 0; i < node.distribution.length; i++) {
                       let class_name = Tree.classNames()[i]
                       if (class_names.indexOf(class_name) >= 0) {
                           let samples = node.distribution[i]
                           let doffset = samples/class_values.reduce((a, b) => a + b)
                           console.log(class_name, samples, doffset)
                           d3.select(this)
                             .append("path")
                             .classed("colorcoded", true)
                             .attr("legend_key", Legend.byLabel(class_name).key)
                             .attr("d", node => d3.link(curve)({
                                 source: [node.parent.x - 10 + 20*offset, node.parent.y],
                                 target: [node.x - 10 + 20*offset, node.y]
                             }))
                             .style("stroke-width", 10*doffset)

                           offset += doffset
                       }
                   }
               })
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
        let direction = Settings.layout.direction
        let lspace    = Settings.layout.lspace
        let bspace    = Settings.layout.bspace

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

    classNames() {
        let names = this.meta.classes
        return names.map(n => S(n).trim().capitalize().s)
    }

    featureNames() {
        let names = this.meta.features
        return names.map(n => S(n).trim().capitalize().s)
    }
}


export let Forester = {}
window.Forester = Forester

Forester.loadTree = function (path) {
    return fetch(path)
        .then(json => json.json())
        .then(fgts => {
            Tree = new TreeInstance(fgts, "#tree")
            window.Tree = Tree

            Legend.generate()

            Tree.draw()

            // add pan and zoom funcionality
            Tree.panzoom = new Panzoom(document.getElementById(Tree.id), {
                initialZoom: 1
            })
        })
}

Forester.loadTree("../../../examples/R/diabetes.json")

// $('document').ready(function () {
//     // Tree.fromJson("../../../examples/R/diabetes.json")
//
//     let legend_intro = {
//         steps: [
//             {
//                 title: "🏳️‍🌈 Legend",
//                 element: document.getElementById("legend"),
//                 intro: "The legend displays information on the colorcoding of classes and features.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".group"),
//                 intro: "Entries are initially grouped based on classes and features.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".group-toggle"),
//                 intro: "Click this icon to hide a group.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".entry"),
//                 intro: "Each entry represents one visible feature or class and is matched to one color.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".entry .colorcoded"),
//                 intro: "Click this field to change a color.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector("#group-new"),
//                 intro: "Click this button to add a new group.",
//                 position: "left",
//                 onchange: function () {
//                     console.log("Something happened")
//                 }
//             }
//         ]
//     }
//
//     /**
//      * HINTS
//      */
//     fetch("../static/hints.json")
//         .then(obj => obj.json())
//         .then(function (hints) {
//             for (let hint of hints) {
//                 d3.selectAll(hint.selector)
//                   .classed("hinted", true)
//                   .attr("hint-title", hint.title)
//                   .attr("hint-text", hint.hint)
//                   .on("mouseover", function (event) {
//                       event.stopPropagation()
//                       const hinted = d3.select(this)
//                       d3.select("#hint .hint-title")
//                         .html(hinted.attr("hint-title"))
//                       d3.select("#hint .hint-text")
//                         .html(hinted.attr("hint-text"))
//                   })
//             }
//         })
//
//     d3.select("#hint")
//       .on("click", function () {
//           const hint = d3.select(this)
//           const content = hint.select(".hint-content")
//           const icon = hint.select(".fa-info")
//           const open = hint.attr("open")
//
//           if (open === "false") {
//               hint
//                   .transition()
//                   .style("width", "300px")
//                   .style("height", "200px")
//               hint.attr("open", true)
//               content.style("visibility", "visible")
//           } else {
//               hint
//                   .transition()
//                   .style("width", "25px")
//                   .style("height", "25px")
//               hint.attr("open", false)
//               content.style("visibility", "hidden")
//           }
//       })
// })