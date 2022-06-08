/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/*
 * Wrapper function for d3 hierarchy structure to add functionality. The tree object is itself
 * the root node, with all further nodes. Only the root node contains meta information about the
 * whole tree. Some functions for fetching the tree and easy accessors are added.
 * @param json A JavaScript object representing an already hierarchical tree structure
 */
import * as d3 from 'https://cdn.skypack.dev/d3@7'

export class Tree {

    constructor(json) {

        if (typeof json['tree'] !== 'object') {
            throw Error("Given tree has no attribute 'tree' containing the root node.")
        }

        if (typeof json['meta'] !== 'object') {
            throw Error("Given tree structure has no attribute 'meta' containing tree metadata.")
        }

        this.nodes = d3.hierarchy(json['tree'], d => d.children)
        this.meta = json['meta']

        // set predefined fields for all nodes
        let id = 0
        this.nodes.each(function (d) {
            d.id = id
            d.collapsed = false
            d.size = 1
            id++
        })
    }

    /*
     * Fetches a JSON and converts it into a tree object.
     * @return a response of the fetched tree object
     */
    static async fetch_json(path) {
        const response = await fetch(path)
        const object = await response.json()
        return new Tree(object)
    }

    /*
     * To each node, this function adds the coordinates given by the layout
     * @param layout The layout
     */
    calculate_layout(layout) {
        // default to identity transform
        layout.xtransform = layout.hasOwnProperty('xtransform') ? layout.xtransform : x => x
        layout.ytransform = layout.hasOwnProperty('ytransform') ? layout.ytransform : y => y

        // layout nodes in general coordinate system
        layout(this.nodes)
        let nodes = this.nodes.descendants()
        let x0 = this.nodes.x
        let y0 = this.nodes.y
        let xm = Math.max.apply(Math, nodes.map(d => Math.abs(d.x - x0)))
        let ym = Math.max.apply(Math, nodes.map(d => Math.abs(d.y - y0)))
        this.nodes.eachAfter(function (d) {
            d.x = layout.xtransform((d.x - x0) / xm)
            d.y = layout.ytransform((d.y - y0) / ym)
        })

        // set layout for all collapsed nodes
        nodes.map(function (d) {
            if (d.collapsed) {
                let first_visible = d.ancestors()
                                     .filter(d => !d.collapsed)[0]
                d.x = first_visible.x
                d.y = first_visible.y
            }
        })
    }

    /*
     * Accessor function return the class names from the metadata
     * @return The class names
     */
    get_classes() {
        this.meta.type === 'classification' ? this.meta.classes : undefined
    }

    collapse_descendants(node) {
        let descendants = node.descendants()
                              .slice(1)
        let collapsed = descendants.every(d => d.collapsed === true)
        if (!node.collapsed) {
            descendants.map(d => d.collapsed = !collapsed)
        }
    }
}