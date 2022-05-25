/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/*
 * Wrapper function for d3 hierarchy structure to add functionality. The tree object is itself
 * the root node, with all further nodes. Only the root node contains meta information about the
 * whole tree. Some functions for fetching the tree and easy accessors are added.
 * @param object A JavaScript object representing an already hierarchical tree structure
 */
Tree = function (object) {
    if (typeof object['tree'] !== 'object') {
        throw Error("Given tree has no attribute 'tree' containing the root node.")
    }

    if (typeof object['meta'] !== 'object') {
        throw Error("Given tree structure has no attribute 'meta' containing tree metadata.")
    }

    Object.assign(this, d3.hierarchy(object['tree'], d => d.children))
    this.meta = object['meta']

    // generate id's
    let id = 0
    this.each(function (d) {d.id = id; id++})
}

// Inheritance in old JavaScript needed because d3.hierarchy was not implemented as a class
Tree.prototype = Object.create(d3.hierarchy.prototype)
Tree.prototype.constructor = Tree

/*
 * Fetches a JSON and converts it into a tree object.
 * @return a response of the fetched tree object
 */
Tree.fetch_json = async function(path) {
    const response = await fetch(path)
    const object   = await response.json()
    return new Tree(object)
}

/*
 * To each node, this function adds the coordinates given by the layout
 * @param layout The layout
 */
Tree.prototype.calculate_layout = function (layout) {
    // default to identity transform
    let transform = layout.hasOwnProperty('transform') ? layout.transform : (x, y) => [0, y]
    // layout nodes in general coordinate system
    layout(this)
    // normalize x and y coordinates
    let xM = Math.max.apply(Math, this.descendants().map(n => Math.abs(n.x)))
    let yM = Math.max.apply(Math, this.descendants().map(n => Math.abs(n.y)))
    // transform general coordinate system using layout.transform
    this.each(function (d) {let xy = transform(d.x/xM, d.y/yM); d.x = xy[0]; d.y = xy[1]})
}

/*
 * Accessor function return the class names from the metadata
 * @return The class names
 */
Tree.prototype.get_classes = function () {
    this.meta.type === 'classification' ? this.meta.classes : undefined
}