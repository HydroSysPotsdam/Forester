/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./Forester.js";

export let Legend = {

    entries: [],

    generate: function () {

        let n_classes = Tree.classNames().length
        let n_features = Tree.featureNames().length
        let colors = chroma.brewer.Set3

        if (n_classes + n_features > colors.length) {
            // numer of colored classes
            let m_classes = Math.min(n_classes, Math.ceil(colors.length / 2))
            // number of colored features
            let m_features = colors.length - m_classes
            // add class colors if necessary
            if (n_classes - m_classes > 0) {
                colors.splice(m_classes, 0, Array(n_classes - m_classes).fill(undefined))
            }
            if (n_features - m_features > 0) {
                colors = colors.concat(Array(n_features - m_features).fill(undefined))
            }
        }

        Tree.classNames().forEach(function (c, i) {
            let color = colors.shift()
            Legend.entries.push({
                "key": "class" + i,
                "label": c,
                "color": color ? color : "white",
                "origin": "Classes",
                "group": "Classes",
                "mono": false
            })
        })

        Tree.featureNames().forEach(function (c, i) {
            let color = colors.shift()
            Legend.entries.push({
                "key": "feature" + i,
                "label": c,
                "color": color ? color : "white",
                "origin": "Features",
                "group": "Features",
                "mono": false
            })
        })

        // go through all entries, add corresponding groups and sort into groups
        Legend.groups().forEach(function (group) {
            let entries = Legend.entries.filter(e => e.group === group)
            ui_add_group(group, entries)
        })

        // make groups panel sortable
        $("#groups").sortable({
            handle: ".group-header",
            cancel: ".group-toggle",
            placeholder: "group-placeholder",
        });

        // add 'new group' button
        $("#group-new")
            .addClass("ui-widget-header ui-corner-all")
            .click(ui_new_group)

        // update colors
        Legend.update()
    },

    byLabel: function (label) {
        let e = this.entries.find(e => (e.label === label))
        return e ? e.color : undefined
    },

    byKey: function (key) {
        return this.entries.find(e => (e.key === key))
    },

    anyMono: function () {
        return this.entries.find(e => e.mono) !== undefined
    },

    groups: function () {
        return [...new Set(this.entries.map(e => e.group))]
    },

    update: function () {
        // update all the colors
        d3.selectAll(".colorcoded").each(
            function (d) {
                const colorcoded = d3.select(this)
                const color_key = colorcoded.attr("legend_key")
                const entry = Legend.byKey(color_key)
                const color = Legend.anyMono() ? (entry.mono ? "red" : "white") : entry.color
                colorcoded.style("--highlight-color", color)
                colorcoded.style("--contrast-color", chroma(color).luminance() > 0.5 ? "black" : "white")
            })
    },
}

function ui_rename_group() {
    let source = $(this)
    let group = source.closest(".group")
    let header = group.children(".group-header")
    let text = header.children("text")
    let group_name = prompt("Please enter the new group name:", "")

    if (group_name != null & group_name !== "") {
        group.attr("group", group_name)
        text.text(text.text().replace(/\w+/, group_name))
        // TODO: implement mapping to Legend entries
    }
}

function ui_collapse_group() {
    // grab the ui elements
    let source = $(this);
    let group = source.closest(".group")
    let header = group.children(".group-header")
    let content = group.children(".group-content")

    // swap icon
    source.toggleClass("ui-icon-triangle-1-s ui-icon-triangle-1-n")

    // collapse group
    content.toggle()

    // update header text
    let hidden = content.is(":hidden")
    let text = header.children("text")
    if (hidden) {
        let n = content.children().length
        text.text(group.attr("group") + " (" + n + ")")
    } else {
        text.text(group.attr("group"))
    }
}

function ui_toggle_mono() {
    let key = $(this).parent().children(".colorcoded").attr("legend_key")
    let entry = Legend.byKey(key)
    entry.mono = !entry.mono
    $(this).css("color", entry.mono ? "red" : "black")
    Legend.update()
}

function ui_change_entry_color(color) {
    if (color) {
        color = typeof color === "string" ? color : color.toHexString()
        let key = $(this).attr("legend_key")
        Legend.byKey(key).color = color
    }
    Legend.update()
}

function ui_new_group() {
    let group_name = prompt("Enter the group name:", "")
    if (group_name != null & group_name !== "") {
        ui_add_group(group_name, null)
    }
    Legend.update()
}

function ui_add_group(group_name, entries) {
    // add group
    let group = d3
        .select("#groups")
        .append("div")
        .attr("class", "group sortable ui-widget ui-widget-content ui-helper-clearfix ui-corner-all")
        .attr("group", group_name)

    // add group header
    let header = group
        .append("div")
        .attr("class", "group-header ui-widget-header ui-corner-all")

    // contents of header
    header
        .append("text")
        .text(group_name)
    header
        .append("span")
        .attr("class", "ui-icon ui-icon-pencil group-rename")
        .on("click", ui_rename_group)
    header
        .append("span")
        .attr("class", "ui-icon ui-icon-triangle-1-n group-toggle")
        .on("click", ui_collapse_group)

    if (!entries) {
        entries = []
    }

    // add group containers
    group
        .append("div")
        .attr("class", "group-content sortable")
        .selectAll("div")
        .data(entries)
        .enter()
        .append("div")
        .attr("class", "entry")
        .call(function (entry) {
            entry.append("div")
                 .attr("class", "colorcoded color-picker")
                 .attr("legend_key", d => d.key)
                 .text(d => d.origin[0])
            entry.append("text")
                 .text(d => d.label)
            entry.append("span")
                 .attr("class", "entry-toggle-mono")
                 .text("M")
                 .on("click", ui_toggle_mono)
        })

    $(".color-picker").spectrum({
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
        change: ui_change_entry_color,
        hide: Legend.update

    })

    // add sortability
    $(".group-content.sortable").sortable({
        placeholder: "entry-placeholder",
        connectWith: ".group-content.sortable"
    }).disableSelection()
}
