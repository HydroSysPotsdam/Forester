/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {TreeRenderer} from "./TreeRenderer.js";
import "../views/Views.js";
import {FNode} from "../Node.js";
import {Panzoom} from "../Panzoom.js";
import {BasicLinkRenderer, FlowLinkRenderer} from "./LinkRenderer.js";
import SettingsForm from "../ruleset/SettingsForm.js";

// submodules for the editor to improve code readability
import Hints from "./Hints.js"
import Settings from "./Settings.js"

export default {

    Legend: undefined,

    Tree: undefined,

    Panzoom: undefined,

    Settings: Settings,

    Hints: Hints,

    GlobalSettings: {},

    GlobalSettingRules: {
        "legend.colorscale": `in:${Object.keys(chroma.brewer).sort().slice(0,36).toString()}|default:Pastel2`,
        "layout.direction": "in:top-bottom,left-right|default:top-bottom",
        "layout.lspace": "numeric|min:0.5|max:2|default:1",
        "layout.bspace": "numeric|min:0.5|max:2|default:1",
        "layout.dendrogram": "boolean|default:false",
        "path.style": "in:linear,curved,ragged|default:linear",
        "path.flow": "in:none,linear,scaled,colorcoded|default:none"
    },

    openFromData: async function (data) {

        // add a handle to the window
        window.Editor = this

        // const observer = new MutationObserver(this.Hints.onElementAdded)
        // observer.observe(d3.select(".forester-content").node(), {childList: true, subtree: true})

        // load the global settings
        this.loadGlobalSettings(data.save)

        // create the hierarchic node structure from the data
        let nodes = new FNode(d3.hierarchy(data.tree.tree), data.tree.meta)

        nodes.descendants().forEach(function (node) {
            const n = nodes.descendants().filter(n => n.data.samplesFraction <= node.data.samplesFraction).length
            node.data.samplesFractionScaled = n / nodes.descendants().length
        })

        // create the tree illustration
        this.Tree = new TreeRenderer(nodes, data.save)
        this.Tree.draw(Editor.GlobalSettings)

        // create the legend
        Legend.generate(data.save)
        this.Legend = Legend

        // add pan and zoom funcionality
        this.Panzoom = new Panzoom(document.getElementById(Editor.Tree.id))

        // add a keyboard listener for opening the settings and saving
        d3.select(document)
          .on("keydown", Editor.onKeyPress)

        // add listeners for interactivity to the tree
        d3.select("#" + Editor.Tree.id)
          .on("view-ready", Editor.onViewReady)
          .on("view-change", Editor.onViewChange)
    },

    loadGlobalSettings: function (save) {
        // prepare the initial settings
        const initialSettings = save ? save["global-settings"] : {}
        new Validator(initialSettings, this.GlobalSettingRules).passes()
        Editor.GlobalSettings = initialSettings
    },

    onKeyPress(event) {
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
    },

    /**
     * Called when the illustration of a node is changed.
     * It triggers the Editor to close the settings panel.
     * TODO: Update the settings panel on view-change and not close it.
     */
    onViewChange(event) {
        Editor.Settings.closeSettings()
    },

    /**
     * Called when a node finished drawing.
     * It is used to (re)add the listeners for clicking and hovering to the node that
     * allow opening the settings, collapsing the subtree and changing the view.
     * TODO: When performance is poor, the MutationListener can also be used to add the listeners.
     */
    onViewReady(event) {
        d3.select(event.target)
          .on("click", Editor.onNodeClick)
          .on("mouseenter", Editor.onNodeEnter)
          .on("mouseleave", Editor.onNodeLeave)
          // disable double click on node
          // otherwise the event would trigger Panzoom centering
          .on("dblclick", event => event.stopPropagation())
    },

    /**
     * Called when the user clicks on a node.
     * Collapses the nodes subtree.
     */
    onNodeClick(event) {
        // disable default and propagation so that Panzoom does not react
        event.preventDefault()
        event.stopPropagation()
        // get the node id and collapse the subtree
        const nodeID = d3.select(this).attr("forID")
        Editor.collapseNode(nodeID)
    },

    /**
     * Called when the cursor enters a node.
     * Opens the node lens menu.
     */
    onNodeEnter(event) {
        // get the id of the node and open lens
        const nodeID = d3.select(this).attr("forID")
        Editor.Lens.open(nodeID)
    },

    /**
     * Called when the cursor leaves a node.
     * Closes the lens menu.
     */
    onNodeLeave(event) {
        Editor.Lens.close()
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

        // indicate collapse of node
        renderer.collapsed = !renderer.collapsed
    },

    Lens: {

        onMouseLeave: function (event) {

            const lens = d3.select(".lens").node()
            const node = d3.select(`.tree-node[forID='${lens.getAttribute("forID")}']`).node()

            if (lens.contains(event.toElement) || node.contains(event.toElement)) return

            Editor.Lens.close()
        },

        open: function (nodeID) {

            // do not open lens again for the same node
            if (d3.select(".lens").attr("forID") === nodeID && Editor.Lens.isOpen()) return

            // close the old lense
            Editor.Lens.close()

            const renderer = Editor.Tree.renderers.get(nodeID)
            const node = renderer.node

            // relocate lens
            const bbox = d3.select(`.tree-node[forID='${node.id}']`).node().getBoundingClientRect()
            d3.select(".lens")
              .attr("forID", node.id)
              .style("visibility", "visible")
              .style("left", bbox.left + bbox.width/2 + "px")
              .style("top",  bbox.bottom - 0.2*bbox.height + "px")

            // when the mouse leaves the lens or node
            d3.select(".lens")
              .on("mouseleave", Editor.Lens.onMouseLeave)
            d3.select(`.tree-node[forID='${node.id}']`)
              .on("mouseleave", Editor.Lens.onMouseLeave)

            // when one of the buttons is pressed
            d3.select(".lens-left")
              .on("click", event => renderer.nextApplicableView("left"))
            d3.select(".lens-right")
              .on("click", event => renderer.nextApplicableView("right"))
            d3.select(".lens-settings")
              .on("click", function (event) {

                  if (Editor.Settings.isOpen()) {
                      Editor.Settings.closeSettings()
                  } else {
                      const opened = Editor.Settings.openNodeSettings(node.id)
                      if (!opened) {
                          d3.select(this)
                            .classed("fa-shake", true)
                            .style("color", "red")
                            .transition()
                            .duration(200)
                            .on("end", function (event) {
                                d3.select(this)
                                  .classed("fa-shake", false)
                                  .style("color", undefined)
                            })
                      }
                  }
              })
        },

        close: function () {
            // TODO: remove the listener from the current node
            d3.select(".lens")
              .style("visibility", "hidden")
        },

        isOpen: function () {
            return d3.select(".lens").style("visibility") === "visible"
        }

    },

    save: function () {

        let save = {
            "global-settings": Editor.GlobalSettings,
            "legend": Legend.save(),
            "renderers": Editor.Tree.save()
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
        req.send(formData)

        // try to render the view
        // Editor.saveSVG()
    },

    saveSVG: async function () {

        console.log("Attempting to save svg")

        // get the bounding box of the svg element
        var svgElement = document.getElementById(Editor.Tree.id).querySelector(".canvas");
        let {width, height} = svgElement.getBBox();

        // clone the svg elemetn
        let clonedSvgElement = svgElement.cloneNode(true);

        // create a blow from the svg html
        let outerHTML = clonedSvgElement.outerHTML
        let blob = new Blob([outerHTML],{type:'image/svg+xml;charset=utf-8'});

        // create url for blob
        let URL = window.URL || window.webkitURL || window;
        let blobURL = URL.createObjectURL(blob);

        d3.select(document.body)
            .append("img")
            .attr("src", blobURL)
            .attr("onload", function () {
                let canvas = document.createElement('canvas');

                console.log(width, height)
                canvas.widht = width;
                canvas.height = height;

                let context = canvas.getContext('2d');
                // draw image in canvas starting left-0 , top - 0
                context.drawImage(this, 0, 0, width, height);

                console.log("Downloading image")

                // download the image
                var link = document.createElement('a');
                link.download = "tree.png";
                link.style.opacity = "0";
                document.body.append(link);
                link.href = canvas.toDataURL();
                link.click();
                link.remove();
            })
    }
}