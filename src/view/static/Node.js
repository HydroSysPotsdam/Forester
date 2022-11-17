/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import * as Views from "./Views.js";

export class FNode extends d3.Node {

    constructor(d3Node, meta) {
        super();

        // copy all the fields
        Object.assign(this, d3Node)

        // delete the redundant children field in data
        delete this.data.children

        // change the type of the children and their parent variables
        if (this.children) {
            this.children = this.children.map(child => new FNode(child, meta))
            this.children.map(child => child.parent = this)
        }

        // initialize some handy accessor fields
        this.#initialize(meta)
    }

    /**
     * Initializes some handy accessor fields.
     */
    #initialize(meta) {
        this.id = uuid.v4()

        this.data.classes  = meta.classes
        this.data.features = meta.features

        this.data.samplesMax      = meta.samples
        this.data.samplesFraction = this.data.samples/this.data.samplesMax

        this.data.voteIndex    = this.data.vote
        this.data.vote         = meta.classes[this.data.voteIndex]
        this.data.voteFraction = this.data.distribution[this.data.voteIndex] / this.data.distribution.reduce((a, b) => a + b)
        this.data.voteSamples  = this.data.distribution[this.data.voteIndex]

        if (this.data.split) {
            this.data.splitFeature      = this.data.features[this.data.split.feature]
            this.data.splitFeatureIndex = this.data.split.feature
            this.data.splitOperator     = this.data.split.operator
            this.data.splitLocation     = this.data.split.location
            delete this.data.split
        }

        this.view = Views.AsyncView
    }

    async #queryOne(key) {
        if (this.data && this.data.hasOwnProperty(key)) {
            return this.data[key]
        } else {
            console.log("This would need to be implemented")
            return undefined
        }
    }

    async #queryMany(...keys) {
        console.log("This would need to be implemented")
        return undefined
    }

    async query(...keys) {
        // directly return value of key
        if (keys.length == 1) {
            return this.#queryOne(keys[0])
        // return a dictionary of key value pairs
        } else {
            return this.#queryMany(keys)
        }
    }
}
