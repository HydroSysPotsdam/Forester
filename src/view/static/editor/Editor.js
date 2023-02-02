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
        "layout.direction": "in:top-bottom,left-right|default:top-bottom",
        "layout.lspace": "numeric|min:0.5|max:2|default:1",
        "layout.bspace": "numeric|min:0.5|max:2|default:1",
        "layout.dendrogram": "boolean|default:false",
        "path.style": "in:linear,curved,ragged|default:linear",
        "path.flow": "in:none,linear,scaled|default:none",
        "path.colorcoded": "boolean|default:false"
    },

    openFromData: async function (data) {

        const observer = new MutationObserver(this.Hints.onElementAdded)
        observer.observe(d3.select(".forester-content").node(), {childList: true, subtree: true})

        // add a handle to the window
        window.Editor = this

        // load the nodes from the data
        let nodes = new FNode(d3.hierarchy(data.tree), data.meta)

        nodes.descendants().forEach(function (node) {
            const n = nodes.descendants().filter(n => n.data.samplesFraction <= node.data.samplesFraction).length
            node.data.samplesFractionScaled = n / nodes.descendants().length
        })

        // prepare the initial settings
        const initialSettings = {}
        new Validator(initialSettings, this.GlobalSettingRules).passes()
        Editor.GlobalSettings = initialSettings

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

              // get the id of the node
              const nodeID = d3.select(this).attr("forID")

              // shift click opens settings, click would hide the node
              if (event.shiftKey) {
                  Editor.Settings.openNodeSettings(nodeID)
                  return
              }

              Editor.collapseNode(nodeID)
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

              if (event.code === "KeyS") {
                  Editor.save()
              }
          })
    },

    highlightNodes(...nodeIDs) {
        d3.selectAll(".tree-node")
          .classed("highlighted", renderer => nodeIDs.includes(renderer.node.id))
    },

    async collapseNode(nodeID, duration = 200) {

        let hide = async function (nodeID, targetID) {

            const renderer = Editor.Tree.renderers.get(nodeID)
            const targetRenderer = Editor.Tree.renderers.get(targetID)
            const position = targetRenderer.layoutPosition

            // indictate node to be toggling
            d3.select(renderer.element)
              .classed("toggling", true)

            // transition to the target position
            renderer.smoothTranslateTo(position[0], position[1], duration)
                // fade out the node at the same time
                    .style("opacity", 0)
                // tween to fade out the link at the same time
                    .tween("link-fadeout", function () {
                        const nodeID = d3.select(this).attr("forID")
                        return t => d3.select(`.link[targetID='${nodeID}']`).style("opacity", 1 - t)
                    })
                // called when the transition ends
                    .on("end", function () {
                        d3.select(this)
                            // indicate node to be collapsed and no longer toggling
                          .classed("toggling", false)
                          .classed("collapsed", true)
                            // do not (svg) render the node
                          .attr("display", "none")

                        // hide the link
                        const nodeID = d3.select(this).attr("forID")
                        d3.select(`.link[targetID='${nodeID}']`)
                          .attr("display", "none")

                        // indicate the renderer to be fully collapsed
                        renderer.collapsed = true
                    })
        }

        let show = async function (nodeID, targetID) {
            const renderer = Editor.Tree.renderers.get(nodeID)
            const targetRenderer = Editor.Tree.renderers.get(targetID)
            const position = renderer.layoutPosition

            // set node visible again and indicate toggling
            d3.select(renderer.element)
              .attr("display", "visible")
              .classed("toggling", true)

            // show the link again
            d3.select(`.link[targetID='${nodeID}']`)
              .attr("display", "visible")

            renderer.smoothTranslateTo(position[0], position[1], duration)
                // fade in the node at the same time
                    .style("opacity", 1)
                // tween to fade in the link at the same time
                    .tween("link-fadein", function () {
                        const nodeID = d3.select(this).attr("forID")
                        return t => d3.select(`.link[targetID='${nodeID}']`).style("opacity", t)
                    })
                // called when the transition ends
                    .on("end", function () {

                        // indicate toggling is finished
                        d3.select(this)
                          .classed("toggling", false)

                        // indicate the renderer to be shown again
                        renderer.collapsed = false
                    })
        }

        const renderer = Editor.Tree.renderers.get(nodeID)

        // toggle collapse for all child nodes
        for (const node of renderer.node.descendants().slice(1)) {
            if (renderer.collapsed) {
                show(node.id, nodeID)
            } else {
                hide(node.id, nodeID)
            }
        }

        // indicate collapse of
        renderer.collapsed = !renderer.collapsed
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
            const rules = nodeRenderer.getCurrentRules()
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
            const nodeID = d3.select(this).attr("forID")
            const view = Editor.Tree.renderers.get(nodeID).view

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

            // set the settings for the tree and legend
            Editor.Tree.updateSettings(event.values, event.changed)
        }
    },

    Hints: {

        hints: [
            {
                "selector": ".group-header",
                "title": "Legend Grouping",
                "hint": "Legend entries may be grouped. This helps the user to clean up the legend and maintain an overview over all features and classes.<p>Right-clicking the group header allows the user to delete or rename the group. Here, the group entries can also be linked, to have the same color.</p>"
            },
            {
                "selector": ".entry",
                "title": "Legend Entries",
                "hint": "Each legend entry represents one class or feature.<p>Its color may be changed by clicking the colored panel.</p>"
            },
            {
                "selector": ".group-toggle",
                "title": "Hiding a Group",
                "hint": "By clicking the little eye icon, the user is able to hide groups from the legend.<p>Entries that are inside a hidden group have their colorcoding removed. In the tree visualization they appear without a color.</p>"
            },
            {
                "selector": ".entry-toggle-mono",
                "title": "Highlighting Entries",
                "hint": "By clicking the little M icon, the user can highlight any one class or feature in the visualization. <p>For the selected entry, the color is changed to a bright red, while the colorcoding of all other entries is removed. Only one entry can be highlighted at all times.</p>"
            },
            {
                "selector": ".TextView",
                "title": "Node: Basic Info",
                "hint": "The most basic node visualization gives some information on the split's feature and location (Sp), the voted class and class distribution (V) and the sample number (S). <p>Note, how class and feature names are colored according to the legend entries.</p>"
            },
            {
                "selector": ".CCircleIconView",
                "title": "Node: Pie Charts",
                "hint": "This node visualization illustrates the class distribution at this node as a pie chart. For the sake of simplicity, only the five most abundand classes are shown. <p>Note, how class colors are related to the legend.</p>"
            },
            {
                "selector": "#group-new",
                "title": "Adding a Group",
                "hint": "By clicking the \"New group\" button, the user can add an empty group to the legend. A popup menu requests the groups name so make sure that you browser does not block Forester."
            }
        ],

        onMouseOver: function (event) {
            const hintID = d3.select(this).attr("hintID")
            console.log(Editor.Hints.hints[hintID].title, Editor.Hints.hints[hintID].hint)
        },

        onElementAdded: function (mutations, observer) {

            for (const i in Editor.Hints.hints) {
                d3.selectAll(Editor.Hints.hints[i].selector + ":not(.hinted)")
                  .classed("hinted", true)
                  .attr("hintID", i)
                  .on("mouseover", Editor.Hints.onMouseOver)
            }
        }
    },

    save: function () {

        let save = {
            "global-settings": Editor.GlobalSettings,
            "legend": Legend.save(),
            "tree": Editor.Tree.save()
        }

        // prepare request
        let uri = window.location.href.replace("editor", "api/project")
        let req = new XMLHttpRequest()
        req.open("POST", uri)

        // add the information from the upload dialog
        let formData = new FormData();
        formData.set("kind", "save")
        formData.set("save", JSON.stringify(save))

        req.onload = function () {

            // parse the response string
            let response = this.responseType === "json" ? JSON.parse(this.response) : this.response

            switch (this.status) {
                case 200:
                    console.log("Sucessfully saved")
                    break;
                case 500:
                    console.log("Error during save")
                    break;
                default:
                    response = {message: this.status + " - unknown response from the server"}
                    console.log(response)
                    break;
            }
        }

        // send request
        req.send(formData);
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