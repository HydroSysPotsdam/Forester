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
        if (curve === "linear") curve = d3.curveLinear
        if (curve === "curved") curve = direction === "top-bottom" ? d3.curveBumpY : d3.curveBumpX
        if (curve === "ragged") curve = direction === "top-bottom" ? d3.curveStepAfter : d3.curveStepBefore

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

        let tree, width, height, xoffset, yoffset;

        // load layout and path settings
        let direction = Settings.layout.direction
        let lspace    = Settings.layout.lspace
        let bspace    = Settings.layout.bspace

        // calculate layout
        if (direction === "top-bottom") {
            tree = d3.tree().nodeSize([Settings.layout.lspace * 100, Settings.layout.bspace * 80])(this.nodes)
            width = range(this.nodes.descendants().map(node => node.x))
            height = range(this.nodes.descendants().map(node => node.y))
            // offset center the elements in the container and add padding
            xoffset = -Math.min(...this.nodes.descendants().map(node => node.x))
            yoffset = 0
            this.nodes.descendants().forEach(node => {
                node.x = node.x + xoffset;
                node.y = node.y + yoffset
            })
        } else if (direction === "left-right") {
            tree = d3.tree().nodeSize([Settings.layout.lspace * 80, Settings.layout.bspace * 100])(this.nodes)
            this.nodes.descendants().forEach(node => {
                [node.x, node.y] = [node.y, node.x]
            })
            width = range(this.nodes.descendants().map(node => node.x))
            height = range(this.nodes.descendants().map(node => node.y))
            // offset center the elements in the container and add padding
            xoffset = 0
            yoffset = -Math.min(...this.nodes.descendants().map(node => node.y))
            this.nodes.descendants().forEach(node => {
                node.x = node.x + xoffset;
                node.y = node.y + yoffset
            })
        }

        // page and legend for placing the container
        let page = document.body.getBoundingClientRect()
        let legend = document.getElementById("legend").getBoundingClientRect()

        // resize container
        d3.select("#" + this.id)
          .style("width", width + "px")
          .style("height", height + "px")
          .style("left", legend.left / 2 + "px")
          .style("top", "50%")
          .style("transform", "translate(-50%, -50%)")

        // updating the positions of the nodes
        this.#ui_nodes
            // .transition(Settings.transition.layout ? 400 : 0)
            .style("left", node => node.x + "px")
            .style("top",  node => node.y + "px")
    }

    /**
     * Hides a node and all it's child nodes
     * @param id Identifier of the node's HTML element
     * @param animate If a transition should be shown
     */
    #hideNode(id, animate = false) {

    }

    /**
     * Shows a node and all it's children nodes that have previously been hidden
     * @param id Identifier of the node's HTML element
     * @param animate If a transition should be shown
     */
    #showNode(id, animate = false) {

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

// export let Tree = {
//
//     fromJson: function (path) {
//         fetch(path).then(r => r.json()).then(json => {
//             this.nodes = d3.hierarchy(json['tree'], d => d.children)
//             this.meta = json['meta']
//             // add initial data to nodes and clean up some fields
//             this.initializeNodes()
//             // prepare tree for rendering
//             this.initialize()
//         })
//     },
//
//     clear() {
//         // remove dom elements
//         d3.select("#tree")
//           .selectAll("*")
//           .remove()
//     },
//
//     initializeNodes: function () {
//         let id = 0
//         let max_depth = 0
//         this.nodes
//             .each(function (node) {
//                 // initial values
//                 node.id = id
//                 node.collapsed = false
//                 id++
//
//                 // branch and depth values for root
//                 if (node.id == 0) {
//                     node.branch = 0
//                     node.depth = 0
//                 }
//
//                 // add branch value and count children
//                 if (node.children) {
//                     node.children[0].branch = node.branch - 1
//                     node.children[1].branch = node.branch + 1
//
//                     node.children_total = node.descendants().length - 1
//                 }
//
//                 // add depth value
//                 if (node.parent) {
//                     node.depth = node.parent.depth + 1
//                     max_depth = Math.max(max_depth, node.depth)
//                 }
//
//                 // copy values of data into node
//                 for (const key of ["distribution", "samples", "split", "type", "vote"]) {
//                     node[key] = node.data[key]
//                 }
//
//                 // add easy accessors for the class info
//                 node.vote_index = node.vote
//                 node.vote = Tree.meta.classes[node.vote_index]
//                 node.vote_fraction = node.distribution[node.vote_index] / node.distribution.reduce((a, b) => a + b)
//                 node.vote_samples = node.distribution[node.vote_index]
//
//                 // add easy accessors for the feature info
//                 if (node.split) {
//                     node.split.feature_index = node.split.feature
//                     node.split.feature = Tree.meta.features[node.split.feature_index]
//                 }
//             })
//             .each(function (node) {
//                 node.height = max_depth - node.depth
//             })
//
//         // add meta information
//         this.meta.branches = this.nodes.descendants().map(node => node.branch)
//         this.meta.branches = Math.max(...this.meta.branches) - Math.min(...this.meta.branches) + 1
//     },
//
//     initialize: function () {
//         // clear tree and load new data if given
//         Tree.clear()
//
//         // generate the legend
//         Legend.generate()
//
//
//         // layout the nodes
//         this.layout()
//
//         // add the dom elements
//         this.draw()
//
//         // window.Tree = Tree
//     },
//
//     layout: function () {
//         // helper function
//         const range = x => Math.max(...x) - Math.min(...x)
//
//         let tree, width, height, xoffset, yoffset;
//
//         // calculate layout
//         if (Settings.layout.direction === "tb") {
//             tree = d3.tree().nodeSize([Settings.layout.vspread * 100, Settings.layout.hspread * 80])(this.nodes)
//             width = range(this.nodes.descendants().map(node => node.x)) + 100
//             height = range(this.nodes.descendants().map(node => node.y)) + 100
//             // offset center the elements in the container and add padding
//             xoffset = -Math.min(...this.nodes.descendants().map(node => node.x)) + 50
//             yoffset = 50
//             this.nodes.descendants().forEach(node => {
//                 node.x = node.x + xoffset;
//                 node.y = node.y + yoffset
//             })
//         } else if (Settings.layout.direction === "lr") {
//             tree = d3.tree().nodeSize([Settings.layout.vspread * 80, Settings.layout.hspread * 100])(this.nodes)
//             this.nodes.descendants().forEach(node => {
//                 [node.x, node.y] = [node.y, node.x]
//             })
//             width = range(this.nodes.descendants().map(node => node.x)) + 100
//             height = range(this.nodes.descendants().map(node => node.y)) + 100
//             // offset center the elements in the container and add padding
//             xoffset = 50
//             yoffset = -Math.min(...this.nodes.descendants().map(node => node.y)) + 50
//             this.nodes.descendants().forEach(node => {
//                 node.x = node.x + xoffset;
//                 node.y = node.y + yoffset
//             })
//         }
//
//         // page and legend for placing the container
//         let page = document.body.getBoundingClientRect()
//         let legend = document.getElementById("legend").getBoundingClientRect()
//
//         // resize container
//         d3.select("#tree")
//           .style("width", width + "px")
//           .style("height", height + "px")
//           .style("left", legend.left / 2 + "px")
//           .style("top", "50%")
//           .style("transform", "translate(-50%, -50%)")
//
//         // add pan and zoom funcionality
//         Tree.panzoom = new Panzoom(document.getElementById("tree"), {
//             initialZoom: Math.min(1, legend.left / width, page.height / height)
//         })
//     },
//
//     draw: function () {
//         // clear the canvas
//         d3.select("#tree")
//           .selectAll("*")
//           .remove()
//
//         // grab data for easy access
//         // changes in data are not mapped to the tree structure
//         let data = this.nodes.descendants()
//
//         // prepare links between nodes
//         d3.select("#tree")
//           .append("svg")
//           .attr("id", "links")
//           .selectAll('path')
//           .data(data.slice(1))
//           .enter()
//           .append('path')
//           .attr('class', 'link')
//           .attr('d', LAYOUT.path)
//
//         // prepare views
//         d3.select("#tree")
//           .selectAll('div')
//           .data(data, d => d.id)
//           .enter()
//           .append('div')
//           .attr('id', d => 'node' + d.id)
//           .attr('class', (d, i) => 'node ' + (i == 0 ? 'root' : (d.children ? 'internal' : 'leaf')))
//           .style("left", d => d.x + "px")
//           .style("top", d => d.y + "px")
//           .style("opacity", 1)
//           .style("visibility", "true")
//           .each(function (d) {
//               let selection = d3.select(this)
//               let node = selection.datum()
//               // Views.TextView.illustrate(selection, selection.datum(), Tree.meta)
//               if (node.type == "leaf") {
//                   Views.CCircleIconView.illustrate(selection, selection.datum(), Tree.meta)
//               } else {
//                   Views.TextView.illustrate(selection, selection.datum(), Tree.meta)
//               }
//           })
//         // .on("click", function (e, node) {
//         //     // collapse descendants
//         //     let descendants = node.descendants().slice(1)
//         //     let collapsed = descendants.every(desc => desc.collapsed)
//         //     if (!node.collapsed) {
//         //         descendants.map(d => d.collapsed = !collapsed)
//         //     }
//         //     Tree.update(node)
//         // })
//
//         // initial animation
//         //this.update(null)
//
//         Legend.update()
//     },
//
//     update: function (node) {
//         // find originating node if update comes from event
//         let duration = node ? 200 + 20 * node.descendants().length : 200
//
//         // grab data to simplify
//         // changes in data are not mapped to the original data
//         let data = this.nodes.descendants()
//
//         // overwrite positions for collapsed nodes
//         // data.map(function (node) {
//         //     if (node.collapsed) {
//         //         let first_visible = node.ancestors()
//         //                              .filter(d => !d.collapsed)[0]
//         //         node.x = first_visible.x
//         //         node.y = first_visible.y
//         //     }
//         // })
//
//
//         d3.selectAll('.link')
//           .data(data.slice(1), d => d.id)
//           .join(enter => enter,
//               function (update) {
//                   return update.transition()
//                                .duration(duration)
//                                .style("opacity", d => d.collapsed ? 0 : 1)
//               })
//
//         // translation animation for nodes
//         d3.selectAll('.node')
//           .data(data, d => d.id)
//           .join(enter => enter,
//               function (update) {
//                   return update.transition()
//                                .duration(duration)
//                                .attr("visibility", "visible")
//                                .style("left", d => d.x + "px")
//                                .style("top", d => d.y + "px")
//                                .style("opacity", d => d.collapsed ? 0 : 1)
//                                .on("end", function () {
//                                    d3.select(this)
//                                      .attr("visibility", d => d.collapsed ? "hidden" : "visible")
//                                })
//               })
//     },
//
//     classNames: function () {
//         let names = Tree.meta.classes
//         return names.map(n => S(n).trim().capitalize().s)
//     },
//
//     featureNames: function () {
//         let names = Tree.meta.features
//         return names.map(n => S(n).trim().capitalize().s)
//     },
// }

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