/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./Forester.js";

export let Settings = {

    color: {
        scale: "Set3"
    },
    layout: {
        direction: "top-bottom",
        lspace: 1,
        bspace: 1
    },
    path: {
        style: "linear"
    },

    // Add all the settings here
    initialize: function (settings) {
        console.log("Adding settings")

        // update the header
        settings.updateHeader("<span class=\"fa-solid fa-gears\"></span> Forester's Settings")

        // example tree
        settings.addDropDown("Example Tree", ["Diabetes", "Iris [R]", "Iris [Matlab]", "Fanny"],
                    function (selection) {

                    })

        // colors
        settings.addSubheader("Colors")
                .addDropDown("Color Set", ["Brewer Set 1", "Brewer Set 2", "Brewer Set 3", "Brewer Pastel 1", "Brewer Pastel 2", "Brewer Dark"],
                    function (selection) {
                        if (selection.index == 0) Settings.color.scale ="Set1"
                        if (selection.index == 1) Settings.color.scale ="Set2"
                        if (selection.index == 2) Settings.color.scale ="Set3"
                        if (selection.index == 3) Settings.color.scale ="Pastel1"
                        if (selection.index == 4) Settings.color.scale ="Pastel2"
                        if (selection.index == 5) Settings.color.scale ="Dark2"
                    })

        // layout
        settings.addSubheader("Layout")
                .addDropDown("Direction", ["Top-Bottom", "Left-Right"],
                    function (selection) {
                        if (selection.index == 0) Settings.layout.direction ="top-bottom"
                        if (selection.index == 1) Settings.layout.direction ="left-right"
                    })
                .addRange("Level Spread", Math.log(0.5), Math.log(2), Math.log(Settings.layout.bspace), 0.05,
                    function (value) {
                        Settings.layout.lspace = Math.exp(value)
                    })
                .addRange("Branch Spread", Math.log(0.5), Math.log(2), Math.log(Settings.layout.lspace), 0.05,
                    function (value) {
                        Settings.layout.bspace = Math.exp(value)
                    })

        // paths
        settings.addSubheader("Paths")
                .addDropDown("Path Style", ["Linear", "Curved", "Ragged"],
                    function (selection) {
                        if (selection.index == 0) Settings.path.style ="linear"
                        if (selection.index == 1) Settings.path.style ="curved"
                        if (selection.index == 2) Settings.path.style ="ragged"
                    })
                .addBoolean("Show Flow", false,
                    function (value) {
                        Settings.path.flow = value
                    })
    },

    toggle: function (forceHide = false) {
        let settings = d3.select("#settings")
        if (settings.style("visibility") === "hidden" && !forceHide) {
            settings
                .style("visibility", "visible")
                .style("transform", "translate(0, 0)")
            this.onOpen()
        } else {
            settings
                .style("transform", "translate(100%, 0)")
                .style("visibility", "hidden")
            this.onClose()
        }
    },

    onOpen: function () {
        console.log("Opening settings")
    },

    onClose: function () {
         console.log("Closing settings")
    },

    onChange: function () {
        console.log("Changed settings")
        Tree.draw()
    },

    onSave: function () {
        console.log("Settings saved")

        Settings.toggle(true)
    }
}

$("#settings").ready(function () {

        // listener for Esc key
        $(document)
            .keypress((event) => {if (event.key === "Escape") Settings.toggle(false)})

        // don't use the default style sheet
        QuickSettings.useExtStyleSheet()

        // create the QS panel on the #settings div
        let QS = QuickSettings.create(0, 0, null, document.getElementById("settings"))

        // QS panel should not be collapsed
        QS.setCollapsible(false)

        // add global change listener
        QS.setGlobalChangeHandler(Settings.onChange)

        // helper to add subheader
        QS.addSubheader = function (title) {
            d3.select(".qs_content")
              .append("div")
              .attr("class", "qs_subheader")
              .text(title)
            return QS;
        }

        // helper to update the header
        QS.updateHeader = function (html) {
            d3.select(".qs_title_bar")
              .html(html)
            return QS
        }

        // call the initialize function above
        Settings.initialize(QS)
})

$("#settings-save").click(Settings.onSave)

// export let Settings = {
//     color: {
//         scale: "Set3",
//         colorblind: false
//     },
//     layout: {
//         direction: "tb",
//         vspread: 1,
//         hspread: 1
//     },
//
//     groups: [
//         {
//
//         },
//         {
//             name: "Colors",
//             scale: {
//                 name: "Color Scale",
//                 type: "selection",
//                 value: chroma.brewer.Set3,
//                 default: "Brewer Set 3",
//                 options: ["Brewer Set 1", "Brewer Set 2", "Brewer Set 3", "Brewer Pastel 1", "Brewer Pastel 2", "Brewer Dark"],
//                 onChange: function (value) {
//
//                 }
//             }
//
//         },
//         {
//             name: "Layout",
//         },
//         {
//             name: "Links",
//             style: {
//                 name: "Path Style",
//                 type: "selection",
//                 value: d3.curveLinear,
//                 default: "Linear",
//                 options: ["Linear", "Curve", "Ragged"],
//                 onChange: function (value) {
//                     switch (value) {
//                         case "Linear": this.value = d3.curveLinear
//                         case "Curve":  this.value = d3.curveBumpY
//                         case "Ragged": this.value = d3.curveStep
//                     }
//                 }
//             }
//         }
//     ],
//
//     loadSettings: function () {
//         Settings.groups.forEach(Settings.add().group)
//         console.log(Settings.get())
//     },
//
//     get(key) {
//         return Settings.groups.map(Object.values)
//     },
//
//     add: function () {
//             return {
//                 group: function (group) {
//                     // add the group container
//                     let group_ui = d3
//                         .select("#settings")
//                         .append("div")
//                         .attr("class", "settings-group")
//
//                     // add a header if given
//                     if (group.name) {
//                         group_ui.append("h3")
//                                 .text(group.name)
//                     }
//
//                     // add all the entries
//                     for (let key in group) {
//                         if (key !== "name") {
//                             let entry = group[key]
//                             let type = entry.type
//
//                             console.log("Adding entry ", entry)
//
//                             // check for malformed entries
//                             if (!entry.name && !entry.type) throw entry + "does not have a name or type."
//
//                             // add the label for the entry
//                             group_ui
//                                 .append("text")
//                                 .attr("class", "label")
//                                 .text(entry.name)
//
//                             // add the option
//                             Settings.add()[type].call(group_ui.node(), entry)
//                         }
//                     }
//                 },
//
//                 selection: function (selection) {
//                     d3.select(this)
//                       .append("select")
//                       .on("change", function (event) {selection.value = selection.default, selection.onChange.call(selection, event.target.value)})
//                       .selectAll("option")
//                       .data(selection.options)
//                       .enter()
//                       .append("option")
//                       .attr("selected", d => d === selection.default)
//                       .text(d => d.toString())
//                 },
//                 checkbox: function (options) {
//
//                 },
//                 slider: function (options) {
//
//                 }
//         }
//     }
// }
//
// let OldSettings = JSON.parse(JSON.stringify(Settings))
//
// // Settings Panel
//
//
// function updateExampleTree (index) {
//     console.log("Switching example tree ", index)
//     switch (index) {
//         case 0:
//             TreeInstance.fromJson("../../../examples/R/iris.json")
//             return
//         case 1:
//             TreeInstance.fromJson("../../../examples/Matlab/iris.json")
//             return
//         case 2:
//             TreeInstance.fromJson("../../../examples/R/diabetes.json")
//             return
//         case 3:
//             TreeInstance.fromJson("../../../examples/Matlab/fanny.json")
//             return
//     }
// }
//
// function previewSettings () {
//     Settings.color.scale       = $("#setting-scale").find(":selected").attr("value")
//     Settings.color.colorblind  = $("#setting-colorblind").is(":checked")
//     Settings.layout.direction  = $("#setting-direction").val().toLowerCase()
//     Settings.layout.vspread    = $("#setting-vspread").slider("value")
//     Settings.layout.hspread    = $("#setting-hspread").slider("value")
// ^
//     // re-draw the tree
//     Tree.draw()
// }
//
// function updateSettings (keep = true) {
//     if (keep) {
//         // keep the new settings and update the old settings
//         OldSettings = JSON.parse(JSON.stringify(Settings))
//     } else {
//         // discard the new settings
//         Settings = JSON.parse(JSON.stringify(OldSettings))
//     }
//
//     // re-draw tree
//     Tree.draw()
// }