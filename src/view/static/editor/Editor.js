/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {TreeRenderer} from "./TreeRenderer.js";
import * as Views from "../views/View.js";
import {FNode} from "../Node.js";
import {Panzoom} from "../Panzoom.js";
import {BasicLinkRenderer, FlowLinkRenderer} from "./LinkRenderer.js";
import SettingsForm from "../ruleset/SettingsForm.js";

export default {

    Legend: undefined,

    Tree: undefined,

    Panzoom: undefined,

    GlobalSettings: {},

    GlobalSettingRules: {
        "legend.colorscale": "in:Brewer 1,Brewer 2, Brewer 3|default:Brewer 2",
        "legend.distribute": "in:Classes,Features,Between|default:Between",
        "layout.direction":  "in:top-bottom,left-right|default:top-bottom",
        "layout.lspace":     "numeric|min:0.5|max:2|default:1",
        "layout.bspace":     "numeric|min:0.5|max:2|default:1",
        "path.style":        "in:linear,curved,ragged|default:linear",
        "path.flow":         "in:none,linear,autocontrast,colorcoded|default:none",
    },

    openFromData: async function (data) {

        // add a handle to the window
        window.Editor = this

        // load the nodes from the data
        let nodes = new FNode(d3.hierarchy(data.tree), data.meta)

        // prepare the initial settings
        const initialSettings = {}
        new Validator(initialSettings, this.GlobalSettingRules).passes()

        this.Tree = new TreeRenderer(nodes, "#tree")
        this.Tree.draw(initialSettings)

        // generate the legend
        Legend.generate()
        this.Legend = Legend

        // add pan and zoom funcionality
        this.Panzoom = new Panzoom(document.getElementById(Editor.Tree.id))

        // add all the listeners that are needed for interaction
        d3.selectAll(".tree-node")
          .on("click", function (event) {
              // prevent default
              event.preventDefault()

              // shift click opens settings, click would hide the node
              if (event.shiftKey) {
                  const nodeID = d3.select(this).attr("forID")
                  Editor.Settings.openNodeSettings(nodeID)
              }
          })

        d3.select(document)
            .on("keydown", function (event) {
                if (event.code === "Escape") {
                    if (Editor.Settings.isOpen()) {
                        Editor.Settings.closeSettings()
                    } else {
                        Editor.Settings.openGlobalSettings()
                    }
                }
            })
    },

    highlightNodes (...nodeIDs) {
        d3.selectAll(".tree-node")
          .classed("highlighted", renderer => nodeIDs.includes(renderer.node.id))
    },

    Settings: {

        currentForm: undefined,

        isOpen: function () {
            // return whether a settings panel is open
            return typeof Editor.Settings.currentForm !== "undefined"
        },

        openSettings: function (data, rules, callbackFn) {

            // check if a different settings panel is already open and close if so
            if (Editor.Settings.isOpen()) {
                Editor.Settings.closeSettings()
            }

            // clear the settings panel and the listeners
            d3.select("#settings")
              .selectAll("*")
              .remove()

            // generate the settings form
            // store the settings form object
            Editor.Settings.currentForm = new SettingsForm(data, rules, d3.select("#settings").node())

            // bind the callback to the settings panel
            d3.select("#settings")
              .on("settings-submit settings-reset settings-change", callbackFn)

            // transition in
            d3.select("#settings")
              .classed("settings-open", true)
        },

        closeSettings: function () {
            // TODO: add a reset function to the settings form that resets to initial values and dispatches a submit event
            // TODO: rename data to initialValues

            // reset the settings to the initial values of the form
            Editor.Settings.currentForm.reset()

            // transition out the settings panel
            d3.select("#settings")
              .classed("settings-open", false)

            // remove the parameter
            Editor.Settings.currentForm = undefined
        },

        openNodeSettings: function (nodeID) {
            // retrieve the current settings and rules for a node
            const nodeRenderer = Editor.Tree.renderers.get(nodeID)
            const rules  = nodeRenderer.getCurrentRules()
            const values = nodeRenderer.getCurrentSettings()

            // do not open settings when there are no rules for the node
            if (Object.keys(Object.flatten(rules)).length === 0) return

            // get the node for which the settings were opened
            // this will be the content of the onNodeSettingsChange function
            const srcNode = d3.select(".tree-node[forID='" + nodeRenderer.node.id + "']").node()

            // add a input element for the applyTo parameter
            rules.applyTo = "in:this,view,similar,all|default:this"

            // open the settings with them
            // callback function is onNodeSettingsChange
            Editor.Settings.openSettings(values, rules, event => Editor.Settings.onNodeSettingsChange.call(srcNode, event))

            // use the nodes view name as a title
            d3.select("#settings")
              .insert("h3", ":first-child")
              .text("Node Settings")
        },

        openGlobalSettings: function () {
            // retrieve the global settings and rules
            // open the settings with them
            // callback function is onGlobalSettingsChange
            Editor.Settings.openSettings(Editor.GlobalSettings, Editor.GlobalSettingRules, Editor.Settings.onGlobalSettingsChange)

            // add a title to the settings panel
            d3.select("#settings")
              .insert("h3", ":first-child")
              .text("Global Settings")
        },

        onNodeSettingsChange: function (event) {
            // when only the applyTo parameter changed, do not process the event
            // the applyTo parameter is only used for finding the nodes to
            // which the settings should be applied
            if (event.changed.length === 1 && event.changed.includes("applyTo")) return

            // get information on the node
            const nodeID  = d3.select(this).attr("forID")
            const view    = Editor.Tree.renderers.get(nodeID).view

            // get the value of the applyTo variable
            let applyTo = event.values.applyTo

            // when the user has selected only this node or the event is not a submission event
            // update only the given node
            if (applyTo === "this" || event.type !== "settings-submit") {
                applyTo = [Editor.Tree.renderers.get(nodeID)]
            }

            // with view and submit events, update all nodes that use the same view
            if (applyTo === "view") {
                applyTo = Array.from(Editor.Tree.renderers.values()).filter(renderer => renderer.view === view)
            }

            // with all and submit events, update all nodes and change the view
            if (applyTo === "all") {
                applyTo = Array.from(Editor.Tree.renderers.values())
            }

            // update settings and view for the nodes to which the settings are applied
            applyTo.map(renderer => renderer.updateSettings(event.values, view))
        },

        onGlobalSettingsChange: function (event) {

            // store the settings
            Editor.GlobalSettings = event.values

            console.log(event)

            // set the settings for the tree and legend
            Editor.Tree.updateSettings(event.values, event.changed)
        }
    }
}

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