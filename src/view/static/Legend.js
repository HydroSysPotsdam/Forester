/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./editor/Editor.js";
import {GlobalSettings} from "./Settings_old.js";

$("#legend").ready(function () {

    console.log("Legend ready")

    // clear everything
    // d3.select("#legend")
    //   .selectAll("*")
    //   .remove()

    // add the group container
    // d3.select("#legend")
    //   .append("div")
    //   .attr("id", "groups")

    // add the new group button
    d3.select("#legend")
      .append("button")
      .attr("class", "ui-widget-header ui-corner-all")
      .attr("id", "group-new")
      .text("Add Group")
      .on("click", function () {
          let new_group_label = prompt("Enter the group name:", "")

          // add new group when label is valid
          if (new_group_label != null & new_group_label !== "") {
              let group = new LegendGroup(new_group_label)
          }
      })

    // make groups panel sortable
    $("#groups").sortable({
        handle: ".group-header",
        cancel: ".group-toggle",
        placeholder: "group-placeholder",
    });

    // update colors
    Legend.update()
})

class LegendGroup {

    constructor(label) {
        this.key = uuid.v4()
        this.label = label
        this.accept = "all"
        this.linked = false
        this.color = undefined
        this.entries = []
        this.collapsed = false
        Legend.groups.push(this)

        // add the ui elements
        this._ui_group = d3.select("#groups").append("div")
        this._ui_header = this._ui_group.append("div")
        this._ui_container = this._ui_group.append("div")

        console.log("Adding group " + this.label)

        this._ui_group
            .attr("class", "group sortable ui-widget ui-widget-content ui-helper-clearfix ui-corner-all")
            .attr("key", this.key)
        this._ui_header
            .attr("class", "group-header ui-widget-header ui-corner-all")
        this._ui_header
            .append("text")
            .attr("class", "group-label")
            .text(this.label)
        this._ui_header
            .append("span")
            .attr("class", "fa-solid fa-fw group-link")
        this._ui_header
            .append("span")
            .attr("class", "fa-solid fa-eye-slash group-toggle")
            .on("click", callFromGroup("hide"))
        this._ui_container
            .attr("class", "group-content sortable")

        // add sortable behaviour
        $(".group-content.sortable").sortable({
            placeholder: "entry-placeholder",
            connectWith: ".group-content.sortable",
            receive:
                function (event, ui) {
                    const ui_entry = $(ui.item)
                    const ui_group = $(event.target).closest(".group")
                    const entry = Legend.byKey(ui_entry.attr("key"))
                    const group = Legend.byGroupKey(ui_group.attr("key"))
                    group.entries.push(entry)
                    entry.group = group.key
                },
            remove:
                function (event, ui) {
                    const ui_entry = $(ui.item)
                    const ui_group = $(event.target).closest(".group")
                    const entry = Legend.byKey(ui_entry.attr("key"))
                    const group = Legend.byGroupKey(ui_group.attr("key"))
                    group.entries.splice(group.entries.indexOf(entry), 1)
                }
        }).disableSelection()

        // // update context menu
        // $("#groups").contextMenu({
        //     selector: ".group-header",
        //     className: "group-context-menu",
        //     items: {
        //         "linked": {name: "Link/unlink entries", icon: "fa-link", callback: callFromGroup("link")},
        //         "rename": {name: "Rename", icon: "fa-edit", callback: callFromGroup("rename")},
        //         "delete": {name: "Delete", icon: "fa-trash", callback: callFromGroup("delete")}
        //     }
        // })
    }

    addEntries(entries) {
        entries = Array.isArray(entries) ? entries : [entries]
        for (const entry of entries) {
            this.entries.push(entry)
            entry.group = this.key
        }

        // add the ui elements for the entries
        this._ui_container
            .selectAll("div")
            .data(this.entries)
            .enter()
            .append("div")
            .attr("class", "entry")
            .attr("key", entry => entry.key)
            .call(function (entry) {
                // link the data structure with the dom elements
                entry.each((d, i, s) => d._ui_entry = d3.select(s[i]))
                // add content to entries
                entry.append("div")
                     .attr("class", "colorcoded color-picker")
                     .attr("legend_key", entry => entry.key)
                     .text(entry => entry.origin)
                entry.append("text")
                     .text(entry => entry.label)
                entry.append("span")
                     .attr("class", "entry-toggle-mono")
                     .text("M")
                     .on("click", callFromEntry("highlight"))
            })

        // add the color picker for these elements
        $(".color-picker").spectrum(LegendColorPicker)
    }

    removeEntries(entries) {
        entries = Array.isArray(entries) ? entries : [entries]
        for (let entry in entries) {
            this.entries.splice(this.entries.indexOf(entry), 1)
            entry.group = undefined
        }
    }

    hide() {
        // make jquery selections
        const ui_group = $(this._ui_group.node())
        const ui_container = ui_group.find(".group-content")
        const ui_hide_icon = ui_group.find(".group-toggle")
        const ui_group_label = ui_group.find(".group-label")

        // collapse group
        ui_container.toggle()

        // update data structure
        this.collapsed = ui_container.is(":hidden")

        // swap icon
        ui_hide_icon.toggleClass("fa-eye fa-eye-slash")

        // update group label in ui
        ui_group_label.text(this.label + (this.collapsed ? " (" + this.entries.length + ")" : ""))

        Legend.update()
    }

    rename() {
        // make jquery selections
        const ui_group = $(this._ui_group.node())
        const ui_group_label = ui_group.find(".group-label")
        const new_label = prompt("Please enter the new group name:", "")

        if (new_label != null & new_label !== "") {
            // update data structure
            this.label = new_label
            // update group label in UI
            ui_group_label.text(this.label + (this.collapsed ? " (" + this.entries.length + ")" : ""))
        }
    }

    delete() {
        if (this.entries.length == 0) {
            // remove group from UI
            this._ui_group.remove()
            Legend.groups.splice(Legend.groups.indexOf(this), 1)
        } else {
            alert("Can only delete an empty group!")
        }
    }

    link() {
        // make jquery selections
        const ui_group     = $(this._ui_group.node())
        const ui_link_icon = ui_group.find(".group-link")

        // retrieve first color in the group
        if (!this.color) {
            this.color = "white"
        }

        // update data structure
        this.linked = !this.linked

        // enable link icon
        ui_link_icon.toggleClass("fa-fw fa-link")

        Legend.update()
    }
}

class LegendEntry {

    constructor(label, color, origin) {
        this.key = uuid.v4()
        this.label = label
        this.color = color
        this.origin = origin
        this.group = undefined
        this.mono = false
        Legend.entries.push(this)
    }

    highlight() {
        const ui_entry       = $(this._ui_entry.node())
        const ui_mono_button = ui_entry.find(".entry-toggle-mono")

        // update data structure
        if (this.mono) {
            this.mono = false
        } else {
            Legend.disableHighlight()
            this.mono = true
        }

        // update color of mono button
        ui_mono_button.css("color", this.mono ? "red" : "black")

        Legend.update()
    }

    recolor(color) {
        const group = Legend.byGroupKey(this.group)

         if (color) {
            color = typeof color === "string" ? color : color.toHexString()

            // if group is linked, update the whole group to have this color
            if (group.linked) {
                group.color = color
            } else {
                this.color = color
            }
        }

        Legend.update()
    }

    getColor () {
        let group = Legend.byGroupKey(this.group)

        // overwrite when mono is selected
        if (Legend.anyMono()) return this.mono ? "red" : "white"

        // return white when group is hidden
        if (group.collapsed) return "white"

        // group color overwrites entry color
        return group.linked ? group.color : this.color
    }
}

/**
 * This function may be passed to a DOM Event Listener and retrieve the group linked with
 * this DOM. It then calls the function named func for this group.
 * @param func - the function that should be called.
 */
let callFromGroup = function (func) {
    return function () {
        const ui_source = $(this)
        const ui_group = ui_source.closest(".group")
        const group = Legend.byGroupKey(ui_group.attr("key"))
        group[func]()
    }
}

/**
 * This function may be passed to a DOM Event Listener and retrieve the entry linked with
 * this DOM. It then calls the function named func for this entry.
 * @param func - the function that should be called.
 */
let callFromEntry = function (func) {
    return function () {
        const ui_source = $(this)
        const ui_entry = ui_source.closest(".entry")
        const entry = Legend.byKey(ui_entry.attr("key"))
        entry[func]()
    }
}

export let Legend = {

    entries: [],
    groups: [],

    clear: function () {
        this.entries = []
        this.groups  = []

        // remove dom elements
        d3.select("#groups")
          .selectAll("*")
          .remove()
    },

    generate: function () {
        Legend.clear()

        const n_classes  = Tree.classNames().length
        const n_features = Tree.featureNames().length
        let colors = Array.from(GlobalSettings.get("color.scale"))

        if (n_classes + n_features > colors.length) {
            // numer of colored classes
            let m_classes = Math.min(n_classes, Math.ceil(colors.length / 2))
            // number of colored features
            let m_features = colors.length - m_classes
            // add class colors if necessary
            if (n_classes - m_classes > 0) {
                colors.splice(m_classes, 0, Array(n_classes - m_classes).fill("white"))
            }
            if (n_features - m_features > 0) {
                colors = colors.concat(Array(n_features - m_features).fill("white"))
            }
        }

        // add the legend entries for the classes
        let class_entries = Tree.classNames().map(label => new LegendEntry(label, colors.shift(), "C"))
        let classes = new LegendGroup("Classes")
        classes.addEntries(class_entries)

        // add the legend entries for the classes
        let feature_entries = Tree.featureNames().map(label => new LegendEntry(label, colors.shift(), "F"))
        let features = new LegendGroup("Features")
        features.addEntries(feature_entries)

        Legend.update()
    },

    update: function () {
        // update all the colors
        d3.selectAll(".colorcoded").each(
            function (d) {
                const colorcoded = d3.select(this)
                const color_key = colorcoded.attr("legend_key")
                const entry = Legend.byKey(color_key)
                const color = entry ? entry.getColor() : "gray"
                colorcoded.style("--highlight-color", color)
                colorcoded.style("--contrast-color", chroma(color).luminance() > 0.5 ? "black" : "white")
            })
    },

    byLabel: function (label) {
        const entry = Legend.entries.find(e => (e.label.toUpperCase() === label.toUpperCase()))
        return (entry ? entry : {key: undefined, label: "undefined", color: "white", origin:"undefined", group:"undefined", mono:false})
    },

    byKey: function (key) {
        return Legend.entries.find(e => (e.key === key))
    },

    byGroupKey: function (key) {
        return Legend.groups.find(g => (g.key === key))
    },

    anyMono: function () {
        return Legend.entries.find(e => e.mono) !== undefined
    },

    disableHighlight () {
        Legend.entries.forEach(entry => entry.mono = false)
        d3.selectAll(".entry-toggle-mono")
          .style("color", "black")
    }
}

window.Legend = Legend

let LegendColorPicker = {
    type: "color",
    showPalette: true,
    palette: [
        ["#8dd3c7", "#ffffb3"],
        ["#bebada", "#fb8072"],
        ["#80b1d3", "#fdb462"],
        ["#b3de69", "#fccde5"],
        ["#d9d9d9", "#bc80bd"],
        ["#ccebc5", "#ffed6f"],
        ["#ffffff"]
    ],
    showAlpha: false,
    allowEmpty: false,
    move: function (color) {
        if (color) {
            color = color.toHexString()
            $(this).css("--highlight-color", color)
            $(this).css("--contrast-color", chroma(color).luminance() > 0.5 ? "black" : "white")
        }
    },
    change: function (color) {
        const ui_source = $(this)
        const ui_entry = ui_source.closest(".entry")
        const entry = Legend.byKey(ui_entry.attr("key"))
        entry.recolor(color)
    },
    hide: Legend.update
}
