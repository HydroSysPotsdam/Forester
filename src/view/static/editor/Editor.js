/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {TreeRenderer} from "./TreeRenderer.js";
import * as Views from "../views/View.js";
import {FNode} from "../Node.js";
import {Panzoom} from "../Panzoom.js";
import Settings from "../Settings.js";
import {BasicLinkRenderer, FlowLinkRenderer} from "./LinkRenderer.js";

// TODO: remove this variable
export let Tree = {}

let LANGUAGE_QUICKFIX = {
    "bar": "Style",
    "class": "Class Distribution",
    "bar.axis": "Direction",
    "bar.width":  "Width",
    "bar.height": "Height",
    "class.aggregate":  "Collect Small Classes",
    "class.sort":       "Sort Distribution",
    "radius": "Radius",
    "scale": "Radius Scaling",
    "scale.scaleBySamples": "Scale by Samples",
    "scale.scaleMethod":    "Scaling Method",
    "applyTo": "Apply To",
    "colorscale": "Colors",
    "layout": "Tree Layout",
    "layout.direction": "Direction",
    "layout.lspace": "Level Extend",
    "layout.bspace": "Branch Extend",
    "path": "Node Links",
    "path.style": "Style",
    "path.flow": "Indicate Sample Flow"
}

export default {

    Events: new EventEmitter(),

    // the current tree renderer
    Tree,

    // handle to the editors legend
    Legend,

    // the current panzoom handler
    Panzoom,

    // the settings panel
    Settings,

    GlobalSettingRules: {
        "colorscale":       "in:Brewer 1,Brewer 2, Brewer 3|default:Brewer 2",
        "layout.direction": "in:top-bottom,left-right|default:top-bottom",
        "layout.lspace":    "numeric|min:0.5|max:2|default:1",
        "layout.bspace":    "numeric|min:0.5|max:2|default:1",
        "path.style":       "in:linear,curved,ragged|default:linear",
        "path.flow":        "in:none,linear,autocontrast,colorcoded|default:none",
    },

    openFromData: async function (data) {

        // load the nodes from the data
        let nodes = new FNode(d3.hierarchy(data.tree), data.meta)

        // register the settings handles
        // this.registerEventListeners()

        // create the Settings panel
        this.Settings = new Settings("#settings")

        // prepare the initial settings
        const initialSettings = {}
        new Validator(initialSettings, this.GlobalSettingRules).passes()

        this.Tree = new TreeRenderer(nodes, "#tree")
        this.Tree.draw(initialSettings)
        Tree = this.Tree

        // generate the legend
        Legend.generate()
        this.Legend = Legend

        // add pan and zoom funcionality
        this.Panzoom = new Panzoom(document.getElementById(Tree.id))

        // add a handle to the window
        window.Editor = this

        // add all the listeners that are needed for interaction
        d3.selectAll(".tree-node")
          .on("click", function (event) {
              // prevent default
              event.preventDefault()

              // shift click opens settings, click would hide the node
              if (event.shiftKey) {
                  Editor.onNodeShiftClick.call(this, event)
              } else {
                  Editor.onNodeClick.call(this, event)
              }
          })
          .on("mouseenter mouseleave", Editor.onNodeHover)

        d3.select("#settings")
          .on("submit", Editor.onSettingsSubmit)

        d3.select(document)
            .on("keydown", function (event) {
                if (event.key === "M") {
                    const dialog = Editor.Settings.openDialog("Global Settings", {}, Editor.GlobalSettingRules)
                    dialog.setTarget({type: "global-settings"})
                    dialog.setLabelNames(LANGUAGE_QUICKFIX)
                    dialog.setGroupNames(LANGUAGE_QUICKFIX)
                }
            })
    },

    /**
     * Called whenever the settings page submits a new set of values.
     *
     * Upon submission an `submit` event is fired from the settings form. This
     * event bubbles to the settings element and is collected by the Editor.
     *
     * Based on the target parameter in the event's details, the editor decides
     * whether the dispatched event corresponds with changing the global settings
     * or just node settings. In the first case, the function
     * {@link onGlobalSettingsChange} is called. In the latter, the event is
     * delegated to {@link onNodeSettingsChange}
     *
     * This multiple use of the `submit` event allows a more
     * modular approach, where other code listens for all setting changes regardless
     * of where the settings apply.
     *
     * @param event - A custom event with type `submit` and a detail object containing
     * at least a value field with the updated settings and a target field containing
     * either `"node-settings"` or `"global-settings"`.
     */
    onSettingsSubmit: function (event) {
        const target = event.detail.target

        if (target.type === "global-settings") {
            Editor.onGlobalSettingsChange(event)
        }

        if (target.type === "node-settings") {
            const id = target.id
            if (Editor.Tree.renderers.has(id)) {
                Editor.onNodeSettingsChange(event)
            } else {
                throw new Error("Unknown node with id " + id)
            }
        }
    },

    onGlobalSettingsChange: function (event) {
        Tree.updateSettings(event.detail.settings, event.detail.changed)
    },

    /**
     * Called whenever the settings page submits a new set of values for a node.
     *
     * Based on the value of the "Apply To" field, the settings are either applied
     * to just the selected node, all nodes with the same view, similar nodes or
     * all nodes. With the same view or similar nodes, the settings are changed
     * also in nodes which do not currently use the same view.
     *
     * @param event - A custom event with type `submit` and the following details:
     * `values` containing the updated settings and `target.id` containing the node id
     * of the selected node.
     */
    onNodeSettingsChange: function (event) {

        // get the node id from the event
        const id = event.detail.target.id

        // get the settings values
        const settings = event.detail.values

        // to what nodes should the setting change be applied?
        const applyTo = settings.applyTo
        delete settings.applyTo

        // add the view to the event details
        const view = Editor.Tree.renderers.get(id).view
        event.detail.view = view

        const nodeEvent = new CustomEvent("settings-change", {detail: event.detail})

        switch (applyTo) {
            // settings should only be applied to this node
            case "this":
                // select node based on ID and dispatch event
                const elem = d3.select(".tree-node[forID='" + id + "']").node()
                elem.dispatchEvent(nodeEvent)
            break;

            // settings should be applied to all nodes but view should not change
            case "view":
                for (const elem of d3.selectAll(".tree-node." + view.name)) {
                    nodeEvent.detail.viewChange = false
                    elem.dispatchEvent(nodeEvent)
                }
            break;

            // settings should be applied to all nodes and view should change
            case "all":
                for (const elem of d3.selectAll(".tree-node")) {
                    nodeEvent.detail.viewChange = true
                    elem.dispatchEvent(nodeEvent)
                }
            break;
        }
    },

    onNodeClick: function (event) {
        const id = d3.select(this).attr("forID")
        console.log("Clicked on node ", id)
    },

    /**
     * Called when the node settings dialog should be opened.
     *
     * The event should have been dispatched from a `.tree-node` element holding an
     * attribute `forID` that contains the node ID. From this ID, the corresponding {@link NodeRenderer}
     * can be found and its settings can be updated.
     *
     * To update the settings, a {@link SettingsDialog} is generated from the renderers current settings and
     * the rules specified by the current view. This dialog is regenerated every time.
     *
     * Settings are changed whenever a `submit` event is dispatched from the settings dialog.
     * This event is collected by the editor and processed in {@link onSettingsSubmit}.
     *
     * @param event - The event that was dispatched. The context of the function should be a `.tree-node`.
     */
    onNodeShiftClick: function (event) {
        // get the id of the node
        const id = d3.select(this).attr("forID")

        // get the current node renderer (holding view, position, ...) from the tree
        const nodeRenderer = Editor.Tree.renderers.get(id)

        console.log("Shift clicked on node ", id)

        // check whether there are settings that can be changed
        if (!_.isEmpty(nodeRenderer.getCurrentRules())) {

            // retrieve the current settings and the rules from which the settings
            // dialog can be generated
            let settings  = nodeRenderer.getCurrentSettings()
            let rules     = nodeRenderer.getCurrentRules()

            // add a field so that the user can decide for which nodes the settings should be applied
            rules.applyTo = "in:this,view,similar,all|default:this"

            // open the dialog
            const dialog = Editor.Settings.openDialog("Node Settings", settings, rules)

            // set the label names, TODO: this should happend automatically based on a language settings
            dialog.setLabelNames(LANGUAGE_QUICKFIX)
            dialog.setGroupNames(LANGUAGE_QUICKFIX)

            // the target property is part of the event details and can be
            // used to find the node for which the settings should be updated
            dialog.setTarget({type: "node-settings", id: id})
        }
    },

    onNodeHover: function (event) {
        const id = d3.select(this).attr("forID")

        if (event.type == "mouseenter") {
            console.log("Entered node ", id)
        } else if (event.type === "mouseleave") {
            console.log("Left node", id)
        }
    },

    // registerEventListeners: function () {
    //     GlobalSettings.addChangeListeners(() => this.onLayoutSettingChange.call(this, GlobalSettings.entries()), "layout.direction", "layout.lspace", "layout.bspace")
    //     GlobalSettings.addChangeListeners(() => this.onLinkSettingChange.call(this, GlobalSettings.entries()), "path.style", "path.flow")
    // },
    //
    // onLayoutSettingChange: function (settings) {
    //     this.Tree.layout(settings)
    // },
    //
    // onLinkSettingChange: function (settings) {
    //
    //     if (settings.get("path.style") === "none") {
    //         Tree.linkRenderer = new BasicLinkRenderer(d3.select(".tree-links").node())
    //     } else {
    //         Tree.linkRenderer = new FlowLinkRenderer(d3.select(".tree-links").node())
    //     }
    //
    //     this.Tree.redrawLinks(settings)
    // }
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