/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */


import Editor from "../Editor.js";

$("#legend").ready(function () {

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
    Legend.colorize()
})

class LegendGroup {

    constructor(label, accept="all", linked=false, color=undefined, collapsed=false) {
        this.key = uuid.v4()
        this.label = label
        this.accept = accept
        this.linked = linked
        this.color = color
        this.entries = []
        this.collapsed = collapsed
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
                    const entry = Legend.get(ui_entry.attr("key"))
                    const group = Legend.get(ui_group.attr("key"))
                    group.entries.push(entry)
                    entry.group = group.key
                },
            remove:
                function (event, ui) {
                    const ui_entry = $(ui.item)
                    const ui_group = $(event.target).closest(".group")
                    const entry = Legend.get(ui_entry.attr("key"))
                    const group = Legend.get(ui_group.attr("key"))
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

    get size () {
        return this.entries.length
    }

    /**
     * Assigns a colorscale to the legend group.
     *
     * Colors are assigned in the order of which entries have
     * been added. When there are more colors than entries in one
     * group, the remaining colors are used for the next group.
     *
     * Scales that are longer than the number of legend entries are
     * trimmed by removing the unnecessary elements from the end.
     *
     * **Does not update the legend!**
     *
     * @param colorscale - Array of valid `CSS` color strings.
     * @param spare - Color that should be used when scale is empty.
     * Default: `white`
     *
     * @see Legend.assign
     */
    assign (colorscale, spare="white") {

        // store the colorscale
        this.colorscale = colorscale

        // assign the colorscale to the entries
        colorscale = [...colorscale]
        for (const entry of this.entries) {
            let color = colorscale.shift()
            entry.color = color ? color : spare
        }
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

        Legend.colorize()
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

    link () {
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

        Legend.colorize()
    }

    save () {
        let save = _.pick(this, "label", "accept", "linked", "color", "collapsed")
        save.entries = this.entries.map(entry => entry.save())
        return save
    }
}

class LegendEntry {

    constructor(label, color, origin, group=undefined, mono=false) {
        this.key = uuid.v4()
        this.label = label
        this.color = color
        this.origin = origin
        this.group = group
        this.mono = mono
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

        Legend.colorize()
    }

    recolor(color) {
        const group = Legend.get(this.group)

         if (color) {
            color = typeof color === "string" ? color : color.toHexString()

            // if group is linked, update the whole group to have this color
            if (group.linked) {
                group.color = color
            } else {
                this.color = color
            }
        }

        Legend.colorize()
    }

    getColor () {
        let group = Legend.get(this.group)

        // overwrite when mono is selected
        if (Legend.anyMono()) return this.mono ? "red" : "white"

        // return white when group is hidden
        if (group.collapsed) return "white"

        // group color overwrites entry color
        return group.linked ? group.color : this.color
    }

    save () {
        return _.pick(this, "label", "color", "origin", "mono")
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
        const group = Legend.get(ui_group.attr("key"))
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
        const entry = Legend.get(ui_entry.attr("key"))
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

    generate: function (save) {
        // TODO: better to do this as a constructor?

        Legend.clear()

        if (save) {
            Legend.generateFromSave(save)
            Legend.colorize()
            return
        }

        // add the legend entries for the classes
        let class_entries = Editor.Tree.classNames().map(label => new LegendEntry(label, "white", "C"))
        let classes = new LegendGroup("Classes")
        classes.addEntries(class_entries)

        // add the legend entries for the classes
        let feature_entries = Editor.Tree.featureNames().map(label => new LegendEntry(label, "white", "F"))
        let features = new LegendGroup("Features")
        features.addEntries(feature_entries)

        // assign the default colorscale
        let colorscale = Editor.GlobalSettings.legend["colorscale"]
        colorscale = chroma.brewer[colorscale]
        Legend.assign(colorscale)
        Legend.colorize()
    },

    generateFromSave: function (save) {
        let groups = save.legend
        for (const group of groups) {

            const legendGroup   = new LegendGroup(group.label, group.accept, group.linked, group.color, group.collapsed)

            const legendEntries = group.entries.map(entry => new LegendEntry(entry.label, entry.color, entry.origin, undefined, entry.mono))
            legendGroup.addEntries(legendEntries)

            if (legendGroup.collapsed) legendGroup.hide()
        }
    },

    /**
     * Assigns a new colorscale to the legend.
     *
     * Colors are assigned in the order of which entries have
     * been added. When there are more colors than entries in one
     * group, the remaining colors are used for the next group.
     *
     * Scales that are longer than the number of legend entries are
     * trimmed by removing the unnecessary elements from the end.
     *
     * **Does not update the legend!**
     *
     * @param colorscale - Array of valid `CSS` color strings.
     * @param spare - Color that should be used when scale is empty.
     * Default: `white`.
     */
    assign: function (colorscale, spare="white") {

        // store the current colorscale
        Legend.colorscale = colorscale

        // assign the colorscale to the entries
        colorscale = [...colorscale]
        for (let group of this.groups) {
            const size  = group.size
            const slice = colorscale.splice(0, size)
            group.assign(slice, spare)
        }
    },

    /**
     * Updates the highlighting and contrast color of elements based on their `legend_key` attribute.
     *
     * @param selector Either a valid css selector or a DOM element. Elements that do not
     * have a `legend_key` attribute are excluded from the selection. In both cases, child
     * elements are included in the color-coding.
     *
     * @return A d3 selection of the updated elements.
     */
    colorize: function (selector=".colorcoded") {

        // select all elements to color code based on selector
        const selection = selector instanceof Element ?
            d3.selectAll(selector).selectAll(".colorcoded") : d3.selectAll(selector)

        // go through the selection and assign colors based on keys
        return selection.each(function (d) {
            const colorcoded = d3.select(this)
            const color_key = colorcoded.attr("legend_key")
            const entry = Legend.get(color_key)
            const color = entry ? entry.getColor() : "gray"
            colorcoded.style("--highlight-color", color)
            colorcoded.style("--contrast-color", chroma(color).luminance() > 0.5 ? "black" : "white")
        })
    },

    /**
     * Retrieves the first matching legend entry or group that is associated
     * with a given key or label.
     *
     * @param selector Selector for the entry or group. May either be the key
     * (UUID) or the label.
     */
    get: function (selector) {

        if (!selector) return undefined

        // go through all the entries and test keys and labels
        for (const entry of this.entries) {
            if (entry.key === selector || entry.label.toUpperCase() === selector.toUpperCase()) return entry
        }

        // go through all the groups and test keys and labels
        for (const group of this.groups) {
            if (group.key === selector || group.label.toUpperCase() === selector.toUpperCase()) return group
        }
    },

    anyMono: function () {
        return Legend.entries.find(e => e.mono) !== undefined
    },

    disableHighlight () {
        Legend.entries.forEach(entry => entry.mono = false)
        d3.selectAll(".entry-toggle-mono")
          .style("color", "black")
    },

    save () {
        return Legend.groups.map(group => group.save())
    }
}

window.Legend = Legend

let LegendColorPicker = {
    type: "color",
    showPalette: false,
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
        const entry = Legend.get(ui_entry.attr("key"))
        entry.recolor(color)
    },
    hide: Legend.colorize
}
