/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import "../Validator.js";

/**
 * Custom event that is dispatched whenever the settings in a {@link SettingsForm} are
 * changed.
 *
 * It stores the updated values, which fields have changed and the rules that the
 * values have been validated against.
 *
 * The event is triggered in two cases:
 *
 * - When the value of any parameter is updated, an event with type `"settings-change"` is
 *   dispatched. It holds the values for all parameters and rules, but only the one parameter
 *   that triggered the event counts as changed.
 *
 * - When the user clicks on the submit button, an event with type `"settings-submit"` is
 *   dispatched. It equally holds the values for all parameters and rules, but now the changed
 *   parameters are determined relative to the initial values. The inital values are updated
 *   after submission, so that the changed parameter list is always relative to the last time
 *   a submission event was triggered.
 */
class SettingsEvent extends Event {

    // the updated settings in flattened form
    values

    // the parameters that changed relative to the initial values
    // always a list, even when only one parameter changed
    changed

    // the rules that constrain the settings and from which the
    // dialog was generated
    rules

    constructor (values, changed, rules, type = "change", bubbles = true) {

        switch (type) {
            case "submit":
                super("settings-submit", {bubbles: bubbles})
                break
            case "update":
            case "change":
                super("settings-change", {bubbles: bubbles})
                break
            case "reset":
                super("settings-reset", {bubbles: bubbles})
                break
            default:
                throw Error("Only types submit, change and reset are supported.")
        }

        this.values  = values
        this.changed = changed
        this.rules   = rules
    }
}

/**
 *
 * Recursively expands an object in flattened key notation into a nested form.
 *
 * Concider the flat object
 *
 * ```
 * {"group1.group2.parameter": "value"}
 * ```
 *
 * From this, a field with name `"group1"` is generated in the object.
 * It itself holds the field `"group2"` which again has a field
 * `"parameter` with value `"value"`.
 *
 * The result is thus
 * ```
 * {
 *     "group1": {
 *         "group2": {
 *             "parameter": "value"
 *         }
 *     }
 * }
 * ```
 *
 * *Only a dot is used as a separator.* Dashes, underscores or other non-letter
 * characters are incorporated into the field names.
 *
 * Fields that are not in flattened notation are not touched by the algorithm.
 *
 * @see {@link Object.flatten} for the inverse function.
 * @param object - The object in flattened notation that should be expanded.
 * @return The expanded version of the object.
 */
Object.expand = function (object) {

    let expanded = {}

    // go through all the keys in the object
    for (const key of Object.keys(object)) {

        // the address is the split name of the field (e.g. "group1.group2.value")
        let address  = key.split(".")
        // the initial location is the object itself
        let location = expanded

        // go through all the address values, from start to end (e.g. "group1", "group2"
        while (address.length > 1) {
            // get the first part of the address (e.g. "group1")
            const next_address = address.shift()

            // if the object does not already have a field with the name of the
            // address, add an empty object (e.g. for "group1")
            if (!location.hasOwnProperty(next_address)) {
                location[next_address] = {}
            }

            // update the location (now "group1" and "group2" will be next address
            location = location[next_address]
        }

        // the last part of the address is the variable name (e.g. value)
        // add this to the last location ("group2")
        location[address[0]] = object[key]
    }

    return expanded
}

/**
 * Converts a nested object into its flattened version where subkeys are separated by dots.
 *
 * Concider the object
 * ```
 * {
 *     "group1": {
 *         "group2": {
 *             "parameter": "value"
 *         }
 *     }
 * }
 * ```
 * The algorithm recursively goes through all fields that are objects, *omitting functions or
 * primite values*. Subkeys are combined using a dot, while other non-letter characters are
 * incorporated into the string.
 *
 * The result is then
 * ```
 * {"group1.group2.parameter": "value"}
 * ```
 *
 * All credits to Mike Erickson's {@link https://github.com/mikeerickson/validatorjs validator.js}
 * for this implementation.
 *
 * @param object - The nested object that should be flattened.
 * @returns A flattened version of the object.
 * @see {@link Object.expand} for the inverse function.
 */
Object.flatten = function (object) {

    var flattened = {};

    function recurse(current, property) {
        if (!property && Object.getOwnPropertyNames(current).length === 0) {
            return;
        }
        if (Object(current) !== current || Array.isArray(current)) {
            flattened[property] = current;
        } else {
            var isEmpty = true;
            for (var p in current) {
                isEmpty = false;
                recurse(current[p], property ? property + '.' + p : p);
            }
            if (isEmpty) {
                flattened[property] = {};
            }
        }
    }

    if (object) {
        recurse(object);
    }

    return flattened;
}

/**
 * Automatically generates a settings dialog from a list of string rules and
 * (optional) initial values.
 *
 * Rules follow the format described in Mike Erickson's {@link https://github.com/mikeerickson/validatorjs validator.js}
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
 * value is used, which is `0`.
 *
 * In the `data` field, the flattened notation is used, where the dot should be thought of accessing a
 * sub-object. For both data and rules, the expanded or flattened version may be used.
 *
 * The whole flattened notation is here called address with the last section being the field or
 * variables name.
 *
 * @see {@link Object.expand} and {@link Object.flatten}
 */
export default class SettingsForm {

    // registry for the functions that are used to generate the DOM elements,
    // retrieve their values and keep track of change events
    static #GeneratorFunctions = {}

    // the DOM element to which this dialog should be appended, default body
    #elem

    // the initial data of the dialog
    #data

    // the rules for this dialog
    #rules

    /**
     *
     * Instantiates a new {@link SettingsForm}.
     *
     * @param data  - The initial data of the dialog in extended or flattened form.
     * @param rules - The rules that constrain the data in extended or flattened form.
     * @param elem  - The DOM element to which the dialog should be appended (default body).
     * @see {@link SettingsDialog}
     */
    constructor(data, rules, elem = document.body) {

        // TODO: what happens when no default value is given --> use undefined

        // save the datas
        this.#data = data

        // save the rules
        this.#rules = rules

        // save a d3 selection of the element
        this.#elem =
            d3.select(elem)
              .append("form")
              .attr("class", "settings-form")

        // set up validator
        let validator = new Validator(data, rules)

        // display error when validator fails
        if (validator.fails()) {
            // TODO: implement error display
            throw Error("Error display for initial validation needs to be implemented!")
        }

        // TODO: try to move as much code as possible to own functions

        for (let rules of Object.entries(validator.rules)) {

            // the variable for which the option is added
            const attribute = rules[0]

            // convert list of key, value pairs to object with key, value pairs
            rules = Object.fromEntries(rules[1].map(rule => [rule.name, rule.value ? rule.value : true]))

            // go through all the rules for this variable
            for (let rule of Object.keys(rules)) {

                // check if the rule should add an input element
                if (SettingsForm.#GeneratorFunctions.hasOwnProperty(rule)) {

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
                    const input = SettingsForm.#GeneratorFunctions[rule]["generator"].call(entry.node(), rules)

                    if (d3.select(input).size() === 1) {
                        d3.select(input)
                          .attr("id", option.for)
                          .attr("class", "settings-input")
                          .attr("rule", rule)
                          .node()

                        // add the listener function
                        const valueFn  = SettingsForm.#GeneratorFunctions[rule]["value"]
                        const changeFn = SettingsForm.#GeneratorFunctions[rule]["change"]
                        changeFn.call(input, event => this.#onInputChangeEvent(event))

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
     * @param group - The group to which the new group should be added.
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
     * registered in {@link SettingsForm}.
     *
     * @param group - The group to add to.
     * @param options - The options for this entry.
     * @return A d3 selection containing the DOM element that is the entry.
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
     * value functions for {@link SettingsForm}. The result is again
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
            .on("click", event => this.#onInputSubmitEvent(event))
    }

    /**
     * Returns the settings values in expanded form.
     *
     * The values are always read from the DOM tree. For each input element,
     * the value function is retrieved that was bound to a parameter using the
     * function {@link SettingsForm.register}. This function is called and
     * returns the value of the input element. Values are collected and again
     * validated against the rules of the dialog.
     *
     * When the validation fails (what should never happen as the input
     * elements are generated by the rules) an error is thrown.
     */
    get values () {
        // retrieve a list of variable and value pairs from all input elements
        // the list is already flattened, as the variables are the flattened
        // names of the rules
        let values =
            this.#elem
                .selectAll(".settings-input")
                .nodes()
                .map(function (input) {
                    const variable = input.getAttribute("id")
                    const rule = input.getAttribute("rule")
                    const valueFn = SettingsForm.#GeneratorFunctions[rule]["value"]
                    const value = valueFn.call(input)
                    return [variable, value]
                })

        // create the dictionary
        values = Object.expand(Object.fromEntries(values))

        // validate against the rules
        const validator = new Validator(values, this.#rules)

        // return when the validation passes, throw error if not
        if (validator.passes()) {
            return values
        } else {
            throw Error("Validation of values failed")
        }
    }

    /**
     * Resets the form and dispatches a `settings-reset` event with the values of
     * the last submit. If the form never submitted values, the initial values are
     * used.
     *
     * The list of changed parameters is always empty, as it is relative to the
     * inital or latest submitted values. Because of the different event type,
     * the event can still be distinguished from a submit event with unchanged
     * values for all parameters.
     *
     * **The values of the input elements are currently not reset.**
     *
     * @return The settings form for chained calls.
     */
    reset () {
        const values = Object.expand(this.#data)
        const event  = new SettingsEvent(values, [], this.#rules, "reset")
        this.#elem.node().dispatchEvent(event)
        // TODO: reset the input fields -> this would necessitate a way to write the values or regenerate the form
        return this
    }

    /**
     * Called whenever the value of an input element is changed. The function
     * dispatches a {@link SettingsEvent} with type `settings-change` on the
     * input element that triggered the change.
     *
     * This function is passed to the `changeFn` that was registered
     * for a parameter with the function {@link SettingsForm.register}.
     * This is done, because there is no general way to retrieve a
     * **primite** value for all input events.
     *
     * The `changeFn` should add this function as a listener.
     *
     * @param event The event that was passed to the listener.
     * @see {@link SettingsEvent} for further information on the information
     * stored in the event.
     */
    #onInputChangeEvent (event) {
        const input = event.target
        this.#dispatchChangeEvent(input)
    }

    /**
     * Called when the settings form is submitted, e.g. when the submit
     * button is clicked. The function dispatches a {@link SettingsEvent}
     * with type `settings-submit` on the elem to which the dialog was
     * added.
     *
     * The default behaviour of the form is prevented, so that the page
     * does not reload.
     *
     * @param event
     */
    #onInputSubmitEvent (event) {

        // prevent the bubbling of the event so that
        // the page is not reloaded
        event.preventDefault()

        // dispatch event
        this.#dispatchSubmitEvent()
    }

    /**
     * Retrieves the value of the input element and dispatches a {@link SettingsEvent}
     * with type `settings-change` on the input element.
     *
     * For the event data, all values and rules are used, but only the parameter bound
     * to the input is concidered to have changed.
     *
     * @param input The input element that changed.
     */
    #dispatchChangeEvent (input) {

        // retrieve all values and the changed variable
        const values  = this.values
        const changed = input.getAttribute("id")

        // dispatch the event on the input element
        const event = new SettingsEvent(values, changed, this.#rules, "change")
        input.dispatchEvent(event)
    }

    /**
     * Retrieves all values from the form and dispatches a {@link SettingsEvent} with
     * type `settings-submit` on the element to which the dialog was appended.
     *
     * What values are concidered changed is described in the documentation for the event.
     */
    #dispatchSubmitEvent () {

        // retrieve all values
        const values = this.values

        // check which values changed and set the "changed" variable
        // TODO: changed values
        const flatData   = Object.flatten(this.#data)
        const flatValues = Object.flatten(values)

        // remove the keys that have not changed
        const changed    = Object.keys(flatData).filter(key => flatData[key] !== flatValues[key])

        // update the data of the dialog
        this.#data = values

        // dispatch the event
        const event = new SettingsEvent(values, changed, this.#rules, "submit")
        this.#elem.node().dispatchEvent(event)
    }

    /**
     * From a dictionary of parameter names, the label text of the settings is
     * updated.
     *
     * The labels may either be in flattened or in expanded form.
     *
     * @param labels - The labels that should be used for the parameters.
     * @return {SettingsForm} - The dialog so that calls can be chained.
     */
    setLabelNames(labels) {
        // flatten the input
        labels = Object.flatten(labels)

        // go through all labels and update the corresponding elements
        for (const label in labels) {
            this.#elem
                .selectAll(".settings-entry > label[for='" + label + "']")
                .html(labels[label])
        }

        // return the dialog for chained calls
        return this
    }

     /**
     * From a dictionary of group names, the group label is updated.
     *
     * The labels may either be in flattened or in expanded form.
     *
     * @param labels - The labels that should be used for the groups.
     * @return {SettingsForm} - The dialog so that calls can be chained.
     */
    setGroupNames(labels) {
        // flatten the input
        labels = Object.flatten(labels)

        // go through all the group labels and update the corresponding elements
        for (const label in labels) {
            this.#elem
                .selectAll(".settings-group > label[for='" + label + "']")
                .html(labels[label])
        }

        // return the dialog for chained calls
        return this
    }

    /**
     * @deprecated
     * From a dictionary, the value for each parameter name is added as an informational
     * text to the settings entry.
     *
     * @param labels - An object of parameter names and their descriptions either in flattened
     * or expanded form.
     */
    addInputInformation (labels) {

        // flatten the labels to get the same variable names
        labels = Object.flatten(labels)

        for (const label in labels) {
            d3.select(".settings-entry[for='" + label + "']")
              .append("div")
              .attr("class", "settings-entry-info")
              .attr("for", label)
              .text(labels[label])
        }

    }

    /**
     * Registers a new element type for the {@link SettingsForm}. Any rule
     * from {@link https://github.com/mikeerickson/validatorjs validator.js} may be used. So can be
     * custom rules.
     *
     * Of course not all rules are meaningful: while the `numeric` rule may be used
     * to register a slider, the `min` and `max` rules are conditional on the numerical input and
     * are used as additional options.
     *
     * Rules are simply overwritten if they already exist.
     *
     * @param ruleName - The name of the rule for which a new input type is registered. For example `numeric`,
     *      `in` or `boolean`.
     *
     * @param generatorFN - The generator function is called when the input element should be added. Its context
     *      is the DOM element to which the input element should be added. As a parameter, additional rules
     *      are passed as name-value pairs. The function is called once when the input element is added.
     *
     * @param valueFn - The value function is called to retrieve the **primite** value of the input.
     *      It should return the parsed value (e.g. primitive like boolean, number, ...) of
     *      the input element. When no value function is given, the dialog uses the DOM elements `value` property.
     *
     * @param changeFn - Function with one argument. The argument should be added as a listener to the event that
     *      triggered when the value of the input element changed. This needs to be done in the `changeFn`.
     *      By default, the argument is bound to the `change` event.
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

        if (!changeFn) {
            changeFn = function (listener) {
                return d3.select(this)
                         .on("change", listener)
            }
        }

        SettingsForm.#GeneratorFunctions[ruleName] = {
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
        delete SettingsForm[ruleName]
    }
}

// register a slider for the rule numeric
SettingsForm.register(
    "numeric",
    function (options) {
        return d3.select(this)
                 .append("input")
                 .attr("type", "range")
                 .attr("min", options.min)
                 .attr("max", options.max)
                 .attr("step", (options.max - options.min) / 100)
                 .attr("value", options.value)
                 .node()
    },
    // the property value would return a string, therefore a value function needs to
    // be given that parses the property
    function () {
        return parseFloat(d3.select(this).property("value"))
    }
)

// register a dropdown for the rule in
SettingsForm.register(
    "in",
    function (options) {
        let values = options.in
        if (typeof (values) === "string") {
            values = values.split(",")
        }

        // add a select input element and store for returning
        const select = d3
            .select(this)
            .append("select")

        // add all the options based on the values from the
        // "in:" rule that was used to decide that a
        // selection input should be added
        select.selectAll("option")
              .data(values)
              .enter()
              .append("option")
              .attr("value", value => value)
              .text(value => value)
              .property("selected", value => value === options.value)

        return select.node()
    }
    // no value function needs to be given, as the value property already
    // returns the selected entry
)

// register a checkbox for the rule boolean
SettingsForm.register(
    "boolean",
    function (options) {
        return d3.select(this)
                 .append("input")
                 .attr("type", "checkbox")
                 .property("checked", options.value && true)
                 .node()
    },
    // value function needs to be given, as the value property returns the string
    // "on" or "off"
    function () {
        return d3.select(this).property("checked")
    }
)