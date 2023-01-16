/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import * as Views from "./views/View.js";

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

    async #queryMany(keys) {
        return Object.fromEntries(keys.map(key => [key, this.data[key]]))
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

    /**
     * Selects all nodes similar to this one.
     *
     * The similarity is determined by the passed function that is applied over all
     * nodes of the (sub)tree, determining whether a node should be included.
     *
     * @param func - Function indicating similarity. Should return a boolean value.
     * @param onlyDescendants - Whether only nodes that are descendants should be
     *      checked for similarity. By default, the whole tree is checked.
     */
    selectSimilar(func, args, onlyDescendants=true) {
        let nodeCollection = onlyDescendants ? this.ancestors().slice(-1)[0].descendants() : this.descendants()
        return nodeCollection.filter((node) => func(this, node, args))
    }

    static basedOnType(comparator, node) {
        return comparator.data.type == node.data.type
    }

    static basedOnDistance(comparator, node, threshold = 1) {
        return comparator.path(node).length <= (threshold + 1)
    }

    static basedOnVote (comparator, node) {
        return comparator.data.vote == node.data.vote
    }

    static basedOnDistribution (comparator, node, threshold = 0.95) {
        let bc = comparator.data.distribution
        bc = bc.map((v, i) => v * node.data.distribution[i] / comparator.data.samples / node.data.samples)
        bc = bc.map(v => Math.sqrt(v))
        bc = bc.reduce((a, b) => a + b)
        return bc >= threshold
    }

    static basedOnFeature (comparator, node) {
        return comparator.data.splitFeature && node.data.splitFeature && comparator.data.splitFeature == node.data.splitFeature
    }
}

window.FNode = FNode

//     // CALCULATE the scaled node index
//     // grab all the samples and scale
//     let samples = this.nodes.descendants().map(node => node.samples)
//     // bin samples and count
//     let bins = d3.bin().thresholds(flow_path_samples)(samples)
//     let counts = bins.map(bin => bin.length)
//     // cumulative count function
//     let sum = 0
//     let ccf = counts.map(count => sum += count)
//     // for each note, find the bin index and invert the normalized ccf
//     this.nodes.descendants().forEach(
//         function (node) {
//             let index = bins.map(bin => bin.indexOf(node.samples) >= 0).indexOf(true)
//             node.flow = {}
//             node.flow.samples_scaled = (ccf[index] - ccf[0]) / (ccf.slice(-1)[0] - ccf[0])
//
//             let distribution_sorted = [...node.distribution].sort((a, b) => a < b)
//             let distribution_flow = distribution_sorted.slice(0, flow_shown_classes)
//             let distribution_other = distribution_sorted.slice(flow_shown_classes)
//             if (distribution_other.length == 0) {
//                 node.flow.distribution = distribution_flow
//             } else {
//                 node.flow.distribution = [...distribution_flow, distribution_other.reduce((a, b) => a + b)]
//             }
//         })
// }