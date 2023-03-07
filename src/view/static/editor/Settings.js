/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import SettingsForm from "../ruleset/SettingsForm.js";

let Settings = {

    currentForm: undefined,

    isOpen: function () {
        // return whether a settings panel is open
        return typeof Settings.currentForm !== "undefined"
    },

    openSettings: function (data, rules, callbackFn, reopen = true) {

        // check if a different settings panel is already open and close if so
        if (Settings.isOpen() && reopen) {
            Settings.closeSettings()
        }

        // clear the settings panel and the listeners
        d3.select("#settings")
          .selectAll("*")
          .remove()

        // generate the settings form
        // store the settings form object
        Settings.currentForm = new SettingsForm(data, rules, d3.select("#settings").node())

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
        if (Settings.currentForm) Settings.currentForm.reset()

        // transition out the settings panel
        d3.select("#settings")
          .classed("settings-open", false)

        // remove the parameter
        Settings.currentForm = undefined
    },

    toggleGlobalSettings: function () {
        if (Editor.Settings.isOpen()) {
            Editor.Settings.closeSettings()
        } else {
            Editor.Settings.openGlobalSettings()
        }
    },

    openNodeSettings: function (nodeID) {
        // retrieve the current settings and rules for a node
        const nodeRenderer = Editor.Tree.renderers.get(nodeID)
        const rules = nodeRenderer.view.rules
        const values = nodeRenderer.settings

        // do not open settings when there are no rules for the node
        if (Object.keys(Object.flatten(rules)).length === 0) return false

        // get the node for which the settings were opened
        // this will be the content of the onNodeSettingsChange function
        const srcNode = d3.select(".tree-node[forID='" + nodeRenderer.node.id + "']").node()

        // add a input element for the applyTo parameter
        rules.applyTo = "in:this,view,subtree,all|default:this"

        // open the settings with them
        // callback function is onNodeSettingsChange
        Settings.openSettings(values, rules, event => Settings.onNodeSettingsChange.call(srcNode, event))

        // use the nodes view name as a title
        d3.select("#settings")
          .insert("h3", ":first-child")
          .text("Node Settings")

        return true
    }
,

    openGlobalSettings: function () {
        // retrieve the global settings and rules
        // open the settings with them
        // callback function is onGlobalSettingsChange
        Settings.openSettings(Editor.GlobalSettings, Editor.GlobalSettingRules, Settings.onGlobalSettingsChange)

        // add a title to the settings panel
        d3.select("#settings")
          .insert("h3", ":first-child")
          .text("Global Settings")
    }
,

    onNodeSettingsChange: function (event) {
        // when only the applyTo parameter changed, do not process the event
        // the applyTo parameter is only used for finding the nodes to
        // which the settings should be applied

        if (event.type === "settings-change" && event.changed.length === 1 && event.changed.includes("applyTo")) return

        // get information on the node
        const nodeID = d3.select(this).attr("forID")
        const view = Editor.Tree.renderers.get(nodeID).view

        // transform application field into selectors on tree
        let applyTo = event.values.applyTo
        delete event.values.applyTo
        switch (applyTo) {
            case "this":
                applyTo = nodeID
                break
            case "view":
                applyTo = view.name
                break
            case "subtree":
                applyTo = [nodeID, "subtree"]
                break
            case "all":
                applyTo = "*"
                break
        }

        // only update other nodes when settings are submitted
        applyTo = event.type === "settings-submit" ? applyTo : nodeID

        // select and update nodes
        let selection = Editor.Tree.select(applyTo)
        selection = Array.isArray(selection) ? selection : [selection]
        selection.map(renderer => renderer.updateSettings(event.values, view))
    }
,

    onGlobalSettingsChange: function (event) {

        // store the settings
        Editor.GlobalSettings = event.values

        // set the settings for the tree and legend
        Editor.Tree.updateSettings(event.values, event.changed)

        // update the legend's colorscale
        if (event.changed.includes("legend.colorscale")) {
            const colorscale = chroma.brewer[event.values.legend.colorscale]
            if (colorscale) {
                Legend.assign(colorscale)
                Legend.colorize()
            }
        }

        // collapse if the event type submit
        if (event.type === "settings-submit") {
            Settings.closeSettings()
        }
    }
}

export default Settings