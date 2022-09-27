/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

class Settings {

    // latest settings
    #settings
    // old settings (before user change)
    #settingsO
    // default settings (for resetting the settings)
    #settingsD

    // each setting has listeners that are called when it changes
    #changeCallback

    // title of the settings page
    #title

    // the quicksettings.js object that is used to add the settings
    #QS
    #element
    #open = false
    #changed = false

    constructor(elementID, title = "Settings") {
        this.#element = document.getElementById(elementID)
        this.#settings = new Map();
        this.#changeCallback = new Map();

        // don't use the default style sheet
        QuickSettings.useExtStyleSheet()

        // create the QS panel on the #settings div
        this.#QS = QuickSettings.create(0, 0, null, this.#element)

        // QS panel should not be collapsed
        this.#QS.setCollapsible(false)

        // add global change handler
        this.#QS.setGlobalChangeHandler(() => this.#onChange.call(this))

        // add save button
        d3.select(this.#element)
          .append("button")
          .attr("class", "settings-save")
          .text("Save")
          .on("click", () => this.toggle(false))
    }

    addHeader (header) {
        d3.select(".qs_title_bar").html(header)
        return this
    }

    addSubheader(header) {
        d3.select(".qs_content").append("div").attr("class", "qs_subheader").html(header)
        return this;
    }

    addDropdown (key, value, title, values = [value], labels = values.map(o => o.toString())) {
        // check if values and labels share same length
        if (!Array.isArray(values) || !Array.isArray(labels) || values.length != labels.length)
            throw "Illegal argument: values and labels need to be arrays with same length"

        // add the entry to the settings map
        this.set(key, value)

        // add the drop-down with quicksettings.js
        this.#QS.addDropDown(title, labels, (selection) => this.set(key, values[selection.index]))

        return this
    }

    addSlider (key, value, title, min = 0, max = value, scaleFunction = (v) => v) {
        if (isNaN(value) || isNaN(min) || isNaN(max))
            throw "Illegal argument: value, min and max need to be numbers"
        if ((min >= value) || (value >= max))
            throw "Illegal argument: min <= value <= max not fulfilled"

        // add the entry to the settings map
        this.set(key, scaleFunction(value))

        // add the slider with quicksettings.js
        this.#QS.addRange(title, min, max, value, (max - min)/50, (value) => this.set(key, scaleFunction(value)))

        return this
    }

    addCheckbox (key, value, title) {
        if (typeof value !== "boolean")
            throw "Illegal argument: value needs to be a boolean"

        // add the entry to the settings map
        this.set(key, value)

        // add the entry to the settings map
        this.#QS.addBoolean(title, value, (value) => this.set(key, value))

        return this
    }

    set(key, value) {
        this.#settings.set(key, value)
        let listener = this.#changeCallback.get(key)
        // when value is updated, let all change listeners know
        if (listener && listener.length > 0) listener.forEach(l => l(value))
        return this
    }

    get (key) {
        return this.#settings.get(key)
    }

    entries () {
        return this.#settings.entries()
    }

    addChangeListener(callback, key, index = -1) {
        if (typeof callback != "function") throw "Illegal argument: callback needs to be a function"

        let listener = this.#changeCallback.get(key)
        if (!listener) {
            // add a new array, when the first listener is added
            listener = [callback]
            this.#changeCallback.set(key, listener)
        } else {
            // append new listeners, when there is already one
            listener.splice(index, 0, callback)
            this.#changeCallback.set(key, listener)
        }

        return this
    }

    addChangeListeners(callback, ...keys) {
        for (const key of keys) {
            this.addChangeListener(callback, key)
        }
    }

    toggle (discard = true) {
        let settings = d3.select(this.#element)
        if (!this.#open) {
            settings
                .style("visibility", "visible")
                .style("transform", "translate(0, 0)")
            this.#onOpen()
        } else {
            settings
                .style("transform", "translate(100%, 0)")
                .style("visibility", "hidden")
            this.#onClose(discard)
        }
    }

    #onOpen () {
        this.#open = true;
        this.#changed = false;
        this.#settingsO = new Map(this.#settings)
    }

    #onChange () {
        this.#changed = true
    }

    #onClose (discard = true) {
        this.#open = false;
        // reset the settings when the panel is closed without saving
        if (discard && this.#changed) {
            for (const [key, value] of this.#settingsO) {
                if (this.#settings.get(key) !== value) this.set(key, value)
            }
        }
    }

    #onSave () {
        this.#onClose(false)
    }
}

export let GlobalSettings = new Settings("settings");
window.GlobalSettings = GlobalSettings

GlobalSettings.addHeader("Global Settings")
GlobalSettings.addDropdown("example", "../../../examples/R/diabetes.json", "Example Tree", ["../../../examples/R/diabetes.json", "../../../examples/R/iris.json", "../../../examples/Matlab/iris.json", "../../../examples/Matlab/fanny.json"], ["Diabetes", "Iris [R]", "Iris [Matlab]", "Fanny"])

GlobalSettings.addSubheader("Color")
GlobalSettings.addDropdown("color.scale", chroma.brewer.Set3, "Color Scale", [chroma.brewer.Set1, chroma.brewer.Set2, chroma.brewer.Set3], ["Brewer Set 1", "Brewer Set 2", "Brewer Set 3"])

GlobalSettings.addSubheader("Layout")
GlobalSettings.addDropdown("layout.direction", "top-bottom", "Direction", ["top-bottom", "left-right"], ["Vertical", "Horizontal"])
GlobalSettings.addSlider("layout.lspace", Math.log(1), "Level Space",  Math.log(0.5), Math.log(2), Math.exp)
GlobalSettings.addSlider("layout.bspace", Math.log(1), "Branch Space", Math.log(0.5), Math.log(2), Math.exp)

GlobalSettings.addSubheader("Path")
GlobalSettings.addDropdown("path.style", "linear", "Path Style", ["linear", "curved", "ragged"], ["Linear", "Curved", "Ragged"])
GlobalSettings.addDropdown("path.flow",  "none", "Indicate Flow", ["none", "linear", "auto", "colorcoded"], ["None", "Thickness [Linear]", "Thickness [Autocontrast]", "Colorcoded"])

// listener for Esc key
$(document).keypress((event) => {if (event.key === "Escape") GlobalSettings.toggle()})
