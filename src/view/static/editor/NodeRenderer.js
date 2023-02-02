/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import Editor from "./Editor.js";
import Validator from "../ruleset/Validator.js";

/**
 * Wrapper around a node that keeps track of the used view for illustration and
 * handles the rendering logic.
 *
 * To each node in the tree, one renderer is assigned. It stores the nodes current and
 * default position in the tree, the used view, as well as settings for the illustration.
 * Using the NodeRenderer makes sure that the nodes in the tree (data) is cleanly seperated
 * from the logic to display it.
 *
 * Views are simply adapters that extend the NodeRenderer with the real illustration
 * capabilities. In the future, they could be integrated into subclasses of NodeRenderer.
 */
export class NodeRenderer {
    //TODO: implement safety check for selection
    //TODO: implement settings
    //TODO: use event based functions that may be set (onViewChange, onPositionUpdate, onSettingsChange, ...)
    //TODO: only update the color of the view and not all colorcoded elements in the DOM

    // The svg group that is used to render all illustrations for the bound node
    #elem

    // The original position of the node assigned by the layout algorithm. It
    // differs from the displayed position, which may be affected by animations.
    #xo
    #yo

    // The displayed position. The coordinate system is relative to the svg element
    // holding all node and link illustrations. By default, it is equal to the original
    // position defined by the layout algorithm but may vary due to f.e. animations.
    #x
    #y

    // The node that is linked to this NodeRenderer. It holds all the data that is used
    // for illustration. See FNode for more information.
    node

    // The current view that is used to illustrate the node.
    view

    // Node specific settings for the illustration. The settings are organized as a map of
    // dictionaries where the key is a view name. Settings therefore persist at the node, even
    // when the view changes.
    settings

    /**
     * Creates a new NodeRenderer for the given node with an initial view.
     * @param node - The node that is mapped to this renderer.
     * @param view - The initial view used for illustration.
     */
    constructor (node, view) {
        this.node     = node

        this.view     = view
        this.settings = {}
        this.settings[view.name] = {}
    }

    /**
     * Binds the renderer to a DOM element.
     *
     * For each node renderer, one svg group is generated. This separates the illustrations of
     * different nodes from each other. Because d3 is used to join the svg group to the renderer,
     * the former must be instantiated beforehand and later bound to the DOM element.
     * @param selection - A d3 selection of the svg group to which this renderer is bound.
     */
    bind (selection) {
        // save the svg group, where the node renderer will
        // draw the views
        this.#elem = d3.select(selection)

        // setup some attributes for the svg group
        this.#elem
            .attr("class", "tree-node")
            .attr("forID", this.node.id)
            .attr("opacity", 1)

        // fire a ready event
        // this.#ee.emit("ready", {context: this})

        this.#elem
            .on("settings-change", event => this.#onSettingsChange(event))
            .on("view-ready", event => this.#onViewReady())
            .on("view-draw-error", event => this.#onViewDrawError())
    }

    /**
     * Clears the illustration by removing all elements from the svg group.
     */
    clear() {
        // remove all children
        this.#elem
            .selectAll("*")
            .remove()
    }

    /**
     * (Re)draws a node using the renderers current view.
     *
     * The drawing algorithm works as follows:
     * 1. Clearing any previous illustration
     * 2. Adding a temporary placeholder showing a loading icon.
     *    This is done because the view's illustration function works asynchronously to
     *    allow requests to the server for data retrieval.
     * 3. Calling the view's illustration function where the result is hidden until the
     *    promise is resolved.
     * 4. Removing the placeholder and setting the view's illustration visible.
     */
    draw() {
        // clear the svg group
        this.clear()

        // append the view placeholder
        this.#elem
            .append("g")
            .attr("class", "node-view " + this.view.name)
            .style("visibility", "hidden")

        // append a view placeholder
        this.#elem
            .classed(this.view.name, true)
            .append("foreignObject")
            .attr("class", "view-placeholder")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 25)
            .attr("height", 25)
            .append("xhtml:img")
            .attr("src", "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif")
            .style("width", "25px")
            .style("height", "25px")

        // recenter the placeholder
        this.#updateTransform()

        // the svg group with which the view should work
        const canvas = this.#elem.select(".node-view").node()

        try {
            // illustrate the node with the current view
            this.view.draw(canvas, this.node, this.settings[this.view.name])
                .then(() => this.#elem.node().dispatchEvent(new CustomEvent("view-ready")))
        } catch(e) {
            console.log(e)
            this.#elem.node().dispatchEvent(new CustomEvent("view-draw-error"))
        }
    }

    get element () {
        return this.#elem.node()
    }

    /**
     * Returns the current position of the node.
     *
     * The position is relative to the upper left of the svg element and references
     * the nodes center. This position is calculated from the transform and the
     * bounding box. It is thus affected by animations.
     *
     * @returns [x, y] The position of the node's center.
     */
    get position () {

        // get the bounding box of the node
        // the coordinate system is relative to the group, not the svg element
        const bbox = this.#elem.node().getBBox()

        if (bbox.width > 0 & bbox.height > 0) {
            // when the node is renderer, recalculate the position of the center
            const transform = this.#elem.node().transform.baseVal[0].matrix
            return [transform.e + bbox.x + 0.5*bbox.width, transform.f + bbox.y + 0.5*bbox.height]
        } else {
            // otherwise return the last set position
            return [this.#x, this.#y]
        }
    }

    /**
     * Updates the position of the node instantaneously.
     *
     * @param position [x, y] or {x, y}: The new position to which
     * the nodes center should be displaced.
     */
    set position (position) {
        const x = Array.isArray(position) ? position[0] : position.x
        const y = Array.isArray(position) ? position[1] : position.x
        this.#updateTransform(x, y)
    }

    /**
     * Returns the position that the layout assigned to the node.
     *
     * The layout position is not touched by setting the `position` attribute.
     */
    get layoutPosition () {
        return [this.#xo, this.#yo]
    }

    /**
     * Reassigns a new layout position and instantaneously displaces the node.
     *
     * @param position [x, y] or {x, y}: The new layout position.
     */
    set layoutPosition (position) {
        const x = Array.isArray(position) ? position[0] : position.x
        const y = Array.isArray(position) ? position[1] : position.x
        this.#xo = x
        this.#yo = y
        this.#updateTransform(this.#xo, this.#yo)
    }

    /**
     * Updates the transform attribute of the node so that position changes become
     * visible. By default, the layout position is used and no animation is done.
     *
     * The node svg group is placed at the given coordinates. The view is rendered
     * in the groups coordinate system. Therefore, it may be arbitrarily displaced
     * from the origin and not centered. This displacement is calculated from the
     * bounding box and subtracted from the position that is used for the
     * transformation.
     *
     * The position update can be animated by passing a transition duration to the
     * `animate` argument. The transition is done using liner easing.
     *
     * @param x Horizontal coordinate of the node's center.
     * @param y Vertical coordinate of the node's center.
     * @param animate Either false or a number. The duration for transitioning
     * transform.
     *
     * @returns The d3 transition that was used to transition the transform attribute.
     */
    #updateTransform (x = this.#xo, y = this.#yo, animate = false) {

        // update the current position
        this.#x = x
        this.#y = y

        // get the coordinate of the center relative to the origin
        const bbox = this.#elem.node().getBBox()

        // the coordinate system in which the view is drawn is arbitrary
        // calculate it's center point
        let cx = bbox.x + 0.5*bbox.width
        let cy = bbox.y + 0.5*bbox.height

        return this.#elem
            // transition always but use a duration of zero
            .transition()
            .duration(animate > 0 ? animate : 0)
            .ease(d3.easeLinear)
            // translate the node coordinate system to x, y and center the view's
            // coordinate system by subtracting the center of the bounding box
            .attr("transform", `translate(${x - cx}, ${y - cy})`)
    }

    /**
     * Resets the current position of the node to the layout position.
     *
     * The position update can be animated by passing a transition duration to the
     * `animate` argument. The transition is done using liner easing.
     *
     * @param animate Either false or a number. The duration for transitioning
     * transform.
     *
     * @returns The d3 transition that was used to transition the transform attribute.
     */
    resetPosition(animate = false) {
        this.position = this.layoutPosition
        return this.#updateTransform(this.#xo, this.#yo, animate)
    }

    /**
     * Smoothly translates the node to the specified position.
     *
     * The position update can be animated by passing a transition duration to the
     * `animate` argument. The transition is done using liner easing.
     *
     * This does not affect the layout position.
     *
     * @param x Horizontal coordinate of the node's center.
     * @param y Vertical coordinate of the node's center.
     * @param animate Either false or a number. The duration for transitioning
     * transform.
     *
     * @returns The d3 transition that was used to transition the transform attribute.
     */
    smoothTranslateTo(x, y, animate = 1000) {
        return this.#updateTransform(x, y, animate)
    }

    /**
     * Called when the asynchronous illustration function of the view completed.
     *
     * This function implements the fourth step in the algorithmic description of
     * the draw function. It removes the temporary placeholder, and shows the
     * illustration.
     */
    #onViewReady () {

        // remove the placeholder
        this.#elem
            .select(".view-placeholder")
            .remove()

        // center the view again
        this.#updateTransform()

        // update legend
        Editor.Legend.update()

        // show the view
        this.#elem
            .select(".node-view")
            .style("visibility", "visible")
    }

    #onViewDrawError () {

        this.#elem
            .selectAll("*")
            .remove()

        this.#elem
            .append("foreignObject")
            .attr("class", "view-draw-error")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 25)
            .attr("height", 25)
            .append("xhtml:img")
            .attr("src", "data:image/png;base64,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")
            .style("width", "25px")
            .style("height", "25px")

        this.#updateTransform()
    }

    #onSettingsChange (event) {
        console.log(event)
        //
        // const settings  = event.detail.values
        // const view      = event.detail.view
        //
        // // TODO: implement safety check
        // if (this.view !== view && event.detail.viewChange) {
        //     this.view = view
        // }
        //
        // // update the setting for the new (or old) view
        // this.settings[this.view.name] = settings
        //
        // // redraw the view
        // this.draw()
    }

    getCurrentSettings () {
        return this.settings[this.view.name]
    }

    getCurrentRules () {
        return this.view.rules
    }

    async updateSettings (settings, view = undefined) {

        // change the view, if another view is specified
        if (view && this.view != view) {
            this.view = view
        }

        // update the settings for the current view
        this.settings[this.view.name] = settings

        // redraw the node
        this.draw()
    }

    save () {
        let save = _.pick(this, "view", "settings", "collapsed")
        save.view = this.view.name
        return save
    }
}