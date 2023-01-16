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

import "../lib/validator.js"

// register the default function
Validator.registerImplicit("default", function (value, requirement, attribute) {

    // attribute uses flat object notation
    let address = attribute.split(".")
    // start location is the input variable
    let location = this.validator.input


    // go through all address values except the last one
    // (this is the name of the variable)
    while (address.length > 1) {
        // get the next address value
        const next_address = address.shift()

        // if the value does not exist, create an object with this name
        if (!location.hasOwnProperty(next_address)) {
            location[next_address] = {}
        }

        // if an object with the name exists, use it as the new location
        if (typeof(location[next_address]) === "object") {
            location = location[next_address]
        }
    }

    // assign default value when none is given at the previously determined location
    if (!location.hasOwnProperty(address[0])) {

        try {
            // convert to primitive type (boolean, number, list, ...)
            requirement = JSON.parse(requirement)
        } catch (e) {
            // do nothing
        }

        // the last part of the address is the variable name
        // add the specified default value under this name
        location[address[0]] = requirement
    }

    // always pass this rule
    return true
}, "No default given for :attribute")

// save the original functions so that they can be called by the wrapper
Validator.prototype._fails  = Validator.prototype.fails
Validator.prototype._passes = Validator.prototype.passes

Validator.prototype.passes  = function () {

    // check if the validator fails and abort if it does
    // in the first check, the default values are assigned to
    // the input when they are empty
    if (this._fails()) {
        return false
    }

    // assign the input data to output
    this.output = {}
    Object.assign(this.output, this.input)

    // the second check is needed so that the added default values
    // are checked for other rules
    // when the validator fails, the output is cleared
    if (this._passes()) {
        return true
    } else {
        this.output = undefined
        return false
    }

}

Validator.prototype.fails = function () {
    return !this.passes()
}

Validator.prototype.results = function () {
    return this.output
}

export default Validator
