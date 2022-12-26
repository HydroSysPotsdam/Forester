/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {TreeRenderer} from "./TreeRenderer.js";
import * as Views from "../views/Views.js";
import {FNode} from "../Node.js";
import {Panzoom} from "../Panzoom.js";
import {GlobalSettings} from "../Settings.js";
import {BasicLinkRenderer, FlowLinkRenderer} from "./LinkRenderer.js";

// TODO: remove this variable
export let Tree = {}

export default {

    Events: new EventEmitter(),

    // the current tree renderer
    Tree,

    // handle to the editors legend
    Legend,

    // the current panzoom handler
    Panzoom,

    openFromData: async function (data) {

        // load the nodes from the data
        let nodes = new FNode(d3.hierarchy(data.tree), data.meta)

        // register the settings handles
        this.registerEventListeners()

        // render the tree
        let settings = GlobalSettings.entries()
        this.Tree = new TreeRenderer(nodes, "#tree")
        this.Tree.draw(settings)
        Tree = this.Tree

        // generate the legend
        Legend.generate()
        this.Legend = Legend

        // add pan and zoom funcionality
        this.Panzoom = new Panzoom(document.getElementById(Tree.id))

        // add a handle to the window
        window.Editor = this
    },

    registerEventListeners: function () {
        GlobalSettings.addChangeListeners(() => this.onLayoutSettingChange.call(this, GlobalSettings.entries()), "layout.direction", "layout.lspace", "layout.bspace")
        GlobalSettings.addChangeListeners(() => this.onLinkSettingChange.call(this, GlobalSettings.entries()), "path.style", "path.flow")
    },

    onLayoutSettingChange: function (settings) {
        this.Tree.layout(settings)
    },

    onLinkSettingChange: function (settings) {

        if (settings.get("path.style") === "none") {
            Tree.linkRenderer = new BasicLinkRenderer(d3.select(".tree-links").node())
        } else {
            Tree.linkRenderer = new FlowLinkRenderer(d3.select(".tree-links").node())
        }

        this.Tree.redrawLinks(settings)
    }
}

// export let Tree
//
// window.Forester = {}
//
// Forester.loadTree = function (fgts) {
//     // Tree = new TreeInstance(fgts, "#tree")
//     // window.Tree = Tree
//     // window.Views = Views
//     //
//     // Legend.generate()
//     //
//     // Tree.draw()
//     console.log("Ready!")
// }

// $('document').ready(function () {
//
//     window.intro = introJs().setOptions({
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
//     })
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