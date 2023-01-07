/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import "../static/Validator.js";

/**
 * Automatically generates a settings dialog from a list of string rules and
 * (optional) initial values.
 *
 * Rules follow the format described by {@link https://github.com/mikeerickson/validatorjs validator.js}
 * from which the parsing library is taken in a slightly adapted manner.
 *
 * Three basic input types are supported, namely a numeric slider, a boolean checkbox and a selection menu.
 * They correspond with the rules `numeric`, `boolean` and `in`.
 *
 * Consider the following:
 * ```
 *  data: {
 *      "A.a": 5
 *  }
 *
 *  rules = {
 *      A: {
 *         a: "numeric|min:0|max:20|default:10",
 *         b: "numeric|min:0|max:20|default:0"
 *      }
 *  }
 * ```
 *
 * With these values for data and rules, the dialog generates one group of input elements (called A)
 * containing two numerical sliders. The first one is bound to the variable `a` and has an initial
 * value of 5 (because this is given in the data). It varies between `0` and `20`. The second slider
 * is bound to a variable `b` and varies equally. Because no value is given in the data, the default
 * value is used, which is `0`. In the `data` field, the flattened notation is used, where the dot
 * should be thought of accessing a sub-object.
 *
 * The whole flattened notation is here called address with the last section being the field or
 * variables name.
 */
export default class SettingsDialog {

    // register for the functions that are used to generate the DOM elements,
    // retrieve their values and keep track of change events
    static #GeneratorFunctions = {}

    // the DOM element to which this dialog should be appended, default body
    #elem

    // the initial data of the dialog
    #data

    // the rules for this dialog
    #rules

    #target

    // the validator used to validate the input data
    #inputValidator

    /**
     *
     * Instantiates a new {@link SettingsDialog}.
     *
     * @param data - The initial data of the dialog in extended or flattened form.
     * @param rules - The rules that constrain the data in extended or flattened form.
     * @param elem - The DOM element to which the dialog should be appended (default body).
     */
    constructor(data, rules, elem = document.body, target = undefined) {

        // save the datas
        this.#data = data

        // save the rules
        this.#rules = rules

        this.#target = target

        // save a d3 selection of the element
        this.#elem =
            d3.select(elem)
              .append("form")
              .attr("class", "settings-form")

        // set up validator
        let validator = new Validator(data, rules)
        this.#inputValidator = validator

        // display error when validator fails
        if (validator.fails()) {
            // TODO: implement error display
            throw Error("Error display for initial validation needs to be implemented!")
        }

        for (let rules of Object.entries(validator.rules)) {

            // the variable for which the option is added
            const attribute = rules[0]

            // convert list of key, value pairs to object with key, value pairs
            rules = Object.fromEntries(rules[1].map(rule => [rule.name, rule.value ? rule.value : true]))

            // go through all the rules for this variable
            for (let rule of Object.keys(rules)) {

                // check if the rule should add an input element
                if (SettingsDialog.#GeneratorFunctions.hasOwnProperty(rule)) {

                    // the variable name is stored in flattened form
                    let address = attribute.split(".")

                    // the value of this variable that needs to be
                    // found from the output field
                    let value = validator.output

                    // the current group to which the option should be added
                    // default is the settings panel (no group)
                    let group = this.#elem

                    // go through the address step by step
                    while (address.length > 1) {
                        const next_address = address.shift()

                        // add the group when it does not exist already
                        if (group.select(".settings-group[for=" + next_address + "]").size() === 0) {
                            // add the group for this address
                            group = this.#addGroup(group, next_address)
                            // emit group-added event
                            group.node().dispatchEvent(new CustomEvent("group-added", {bubbles: true}))
                        } else {
                            group = group.select(".settings-group[for=" + next_address + "]")
                        }

                        // update the value of the validator
                        value = value[next_address]
                    }

                    // rename rules to options
                    let option = rules

                    // the final part of the address is the variable name
                    option.value = value[address]

                    // store the flattened name of the variable
                    option.for = attribute

                    // add the option to the current group
                    const entry = this.#addEntry(group, option)

                    // call the function that adds the field
                    SettingsDialog.#GeneratorFunctions[rule]["generator"].call(entry.node(), rules)

                    // add id and class to the newly added element
                    if (entry.selectAll(".settings-entry > :not(label)").size() === 1) {
                        let input = entry.select(".settings-entry > :not(label)")
                                         .attr("id", option.for)
                                         .attr("class", "settings-input")
                                         .attr("rule", rule)
                                         .node()

                        // emit entry-added event
                        entry.node().dispatchEvent(new CustomEvent("entry-added", {bubbles: true}))
                    }
                }
            }
        }

        this.#addSubmitButton()

        return this
    }

    /**
     * Adds a group to a dialog, containing a label with the group name (the object containing the fields)
     * and the input elements for the fields itself.
     *
     * @param group - The group to add.
     * @param address - The address of the group (the flattened object name).
     * @return A d3 selection of the element that is the added group
     */
    #addGroup(group, address) {
        // append the group
        group = group
            .append("div")
            .attr("class", "settings-group")
            .attr("for", address)

        // append a label to the group
        group.append("label")
             .attr("class", "settings-group-label")
             .attr("for", address)
             .text("Group " + address)

        // return the new group
        return group
    }

    /**
     * Adds and empty entry and its field name as a label to a group. The content,
     * e.g. the input DOM element is not added here, but depends on what functions are
     * registered in {@link SettingsDialog}.
     *
     * @param group - The group to add to.
     * @param options - The options for this
     * @return {*} - A d3 selection containing the DOM element that is the entry.
     */
    #addEntry(group, options) {
        // add an entry to the group for this option
        const entry = group.append("div")
                           .attr("class", "settings-entry")
                           .attr("for", options.for)

        // add a label to this entry
        entry.append("label")
                    .attr("for", options.for)
                    .attr("class", "settings-entry-label")
                    .text(options.for)

        // return the entry
        return entry
    }

    /**
     * Adds the submit button to the dialog. When the button is clicked,
     * values are retrieved from the input elements based on the registered
     * value functions for {@link SettingsDialog}. The result is again
     * validated using the specified rules.
     *
     * When the validation passes, a `submit` event is fired with the
     * retrieved values of the dialog in the form described by the rules.
     *
     * When the validation fails, an `error` event is fired.
     */
    #addSubmitButton() {
        this.#elem
            .append("button")
            .attr("class", "settings-submit")
            .text("Submit")
            .on("click", e => {
                // prevent default, because otherwise the page will be reloaded
                e.preventDefault()

                // retrieve the values
                let values = this.#getValues()

                // set up a new validator with the values and the rules
                let validator = new Validator(values, this.#rules)

                // check values
                if (validator.passes()) {
                    this.#elem.node().dispatchEvent(new CustomEvent("submit", {detail: {values: values, target: this.#target}, bubbles: true}))
                } else {
                    this.#elem.node().dispatchEvent(new CustomEvent("error",  {detail: {target: this.#target}, bubbles: true}))
                    // TODO: implement error display
                    throw Error("Error display needs to be implemented")
                }
            })
    }

    /**
     * Retrieves the values from the DOM input elements.
     *
     * @return The values in an object whose structure is described by the rules.
     */
    #getValues() {
        let values = {}

        this.#elem
            .selectAll(".settings-input")
            .each(function (input) {

                let address = d3.select(this).attr("id").split(".")
                let location = values

                while (address.length > 1) {
                    const next_address = address.shift()

                    // if the value does not exist, create an object with this name
                    if (!location.hasOwnProperty(next_address)) {
                        location[next_address] = {}
                    }

                    // if an object with the name exists, use it as the new location
                    if (typeof (location[next_address]) === "object") {
                        location = location[next_address]
                    }
                }

                // get the rule name
                let rule = d3.select(this).attr("rule")

                // write the value
                location[address[0]] = SettingsDialog.#GeneratorFunctions[rule]["value"].call(this)
            })

        const values_flat = this.#inputValidator._flattenObject(values)
        // add an accessor to a flattened version of the returned values
        values.flatten = () => values_flat

        return values
    }

    setLabelNames(labels) {
        // flatten the input
        labels = this.#inputValidator._flattenObject(labels)

        // go through all labels and update the corresponding elements
        for (const label in labels) {
            this.#elem
                .selectAll(".settings-entry > label[for='" + label + "']")
                .html(labels[label])
        }

        // return the dialog for chained calls
        return this
    }

    setGroupNames(labels) {
        // flatten the input
        labels = this.#inputValidator._flattenObject(labels)

        // go through all the group labels and update the corresponding elements
        for (const label in labels) {
            this.#elem
                .selectAll(".settings-group > label[for='" + label + "']")
                .html(labels[label])
        }

        // return the dialog for chained calls
        return this
    }

    setTarget (target) {
        this.#target = target
    }

    /**
     * Registers a new element type for the {@link SettingsDialog}. Any rule
     * from {@link https://github.com/mikeerickson/validatorjs validator.js} may be used. So can be
     * custom rules.
     *
     * Of course not all rules are meaningful: while the `numeric` rule may be used
     * to register a slider, the `min` and `max` rules are conditional on the numerical input and
     * are used as additional options.
     *
     * Rules are simply overwritten if they already exist.
     *
     * The __generator__ function is called with the DOM element to which the input should be added as its
     * `this` argument. As a parameter, additional rules are passed as name-value pairs. The function
     * is called once when the input element is added.
     *
     * The __value__ function is called with the DOM element to which the input should be added as its
     * `this` argument. It should return the parsed value (e.g. primitive like boolean, number, ...) of
     * the input element. When no value function is given, the dialog uses the DOM elements `value` property.
     *
     * @param ruleName - The name of the rule for which a new input type is registered. For example `numeric`,
     * `in` or `boolean`.
     * @param generatorFn - Function that is called to add the DOM element. The `this` context is the DOM parent
     * and the arguments are additional options.
     * @param valueFn - Function that is called to retrieve the value of the input. The `this` context is the DOM
     * input element itself.
     * @param changeFn
     */
    static register(ruleName, generatorFn, valueFn, changeFn) {

        if (typeof (generatorFn) !== "function") {
            throw Error("Generator function must be a function!")
        }

        if (typeof (valueFn) !== "function" && typeof (valueFn) !== "undefined") {
            throw Error("Value function must be a function or undefined")
        }

        if (typeof (changeFn) !== "function" && typeof (changeFn) !== "undefined") {
            throw Error("Change function must be a function or undefined")
        }

        if (!valueFn) {
            valueFn = function () {
                return d3.select(this)
                         .property("value")
            }
        }

        SettingsDialog.#GeneratorFunctions[ruleName] = {
            "generator": generatorFn,
            "value": valueFn,
            "change": changeFn
        }
    }

    /**
     * Removes an input binding to a rule.
     * @param ruleName The name of the rule.
     */
    static remove(ruleName) {
        delete SettingsDialog[ruleName]
    }
}

// register a slider for the rule numeric
SettingsDialog.register(
    "numeric",
    function (options) {
        d3.select(this)
          .append("input")
          .attr("type", "range")
          .attr("min", options.min)
          .attr("max", options.max)
          .attr("step", (options.max - options.min)/100)
          .attr("value", options.value)
    },
    // the property value would return a string, therefore a value function needs to
    // be given that parses the property
    function () {
        return parseFloat(d3.select(this).property("value"))
    }
)

// register a dropdown for the rule in
SettingsDialog.register(
    "in",
    function (options) {
        let values = options.in
        if (typeof (values) === "string") {
            values = values.split(",")
        }

        d3.select(this)
          .append("select")
          .selectAll("option")
          .data(values)
          .enter()
          .append("option")
          .attr("value", value => value)
          .text(value => value)
          .property("selected", value => value === options.value)
    }
    // no value function needs to be given, as the value property already
    // returns the selected entry
)

// register a checkbox for the rule boolean
SettingsDialog.register(
    "boolean",
    function (options) {
        d3.select(this)
          .append("input")
          .attr("type", "checkbox")
          .attr("checked", options.value && true)
    },
    // value function needs to be given, as the value property returns the string
    // "on" or "off"
    function () {
        return d3.select(this).property("value") === "on"
    }
)