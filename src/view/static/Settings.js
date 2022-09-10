/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./Forester.js";

export let Settings = {
    color: {
        scale: "Set3",
        colorblind: false
    },
    layout: {
        direction: "tb",
        vspread: 1,
        hspread: 1
    }
}

let OldSettings = JSON.parse(JSON.stringify(Settings))

// Settings Panel
$("#settings")
    .addClass("forester-ui-panel")
    .load("../templates/Settings.html")
    .ready(function () {

        // Settings button
        $("#settings-button")
            .addClass("forester-ui-panel forester-ui-button fa-solid fa-gears")
            .on("click", () => toggleSettings(false))

        // Save and update button
        $("#settings-save")
            .button()
            .on("click", updateSettings)

        // Update all the UI components for JQuery
        $("#settings select").selectmenu({width: 'auto', change: previewSettings})
        $("#settings span[type=slider]").slider({animate: 'true', range:"max", min:Math.log(1/2), max:Math.log(2), step:0.05, value:0, slide: previewSettings})

        // add event listener for changing the example tree
        // this should happen immediately
        $("#setting-example").on("selectmenuchange", (event, data) => updateExampleTree(data.item.index))

        $(document)
            .keypress((event) => {if (event.key === "Escape") toggleSettings(false)})
})

function toggleSettings (forceHide = false) {
    let settings = d3.select("#settings")

    // show
    if (settings.style("visibility") === "hidden" && !forceHide) {
        settings
            .style("visibility", "visible")
            .style("transform", "translate(0, 0)")
    // hide
    } else {
        settings
            .style("transform", "translate(100%, 0)")
            .style("visibility", "hidden")
        updateSettings(false)
    }
}

function updateExampleTree (index) {
    console.log("Switching example tree ", index)
    switch (index) {
        case 0:
            Tree.fromJson("../../../examples/R/iris.json")
            return
        case 1:
            Tree.fromJson("../../../examples/Matlab/iris.json")
            return
        case 2:
            Tree.fromJson("../../../examples/R/diabetes.json")
            return
        case 3:
            Tree.fromJson("../../../examples/Matlab/fanny.json")
            return
    }
}

function previewSettings () {
    Settings.color.scale = $("#setting-scale").find(":selected").attr("value")
    Settings.color.colorblind = $("#setting-colorblind").is(":checked")
    Settings.layout.direction = $("#setting-direction").val().toLowerCase()
    Settings.layout.vspread = Math.exp($("#setting-vspread").slider("option", "value"))
    Settings.layout.hspread = Math.exp($("#setting-hspread").slider("option", "value"))

    // re-draw the tree
    Tree.initialize()
}

function updateSettings (keep = true) {
    if (keep) {
        // keep the new settings and update the old settings
        OldSettings = JSON.parse(JSON.stringify(Settings))
    } else {
        // discard the new settings
        Settings = JSON.parse(JSON.stringify(OldSettings))
    }

    // re-draw tree
    Tree.initialize()
}