/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import SettingsForm from "./settings/SettingsForm.js";

export default class Settings {

    #element
    #open = false

    constructor(elementID) {
        this.#element = d3.select(elementID)
        console.log(this.#element.node())
    }

    openDialog(title, data, rules) {
        // clear the settings page
        this.#element.selectAll("*")
            .remove()

        // append the title
        this.#element.append("h3").html(title)

        // toggle the settings dialog
        this.#toggle()

        // open and return the settings dialog
        return new SettingsForm(data, rules, this.#element.node())
    }

    #toggle (discard = true) {
        if (!this.#open) {
            this.#element
                .style("visibility", "visible")
                .style("transform", "translate(0, 0)")
            this.#onOpen()
        } else {
            this.#element
                .style("transform", "translate(100%, 0)")
                .style("visibility", "hidden")
            this.#onClose(discard)
        }
    }

    #onOpen () {
        this.#open = true;
    }

    #onChange () {
    }

    #onClose (discard = true) {
        this.#open = false;
    }

    #onSave () {
        this.#onClose(false)
    }
}
