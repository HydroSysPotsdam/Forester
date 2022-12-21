/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../Legend.js";

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
    x
    y

    // The node that is linked to this NodeRenderer. It holds all the data that is used
    // for illustration. See FNode for more information.
    node

    // The current view that is used to illustrate the node.
    view

    // Node specific settings for the illustration. The settings are organized as a map of
    // dictionaries where the key is a view name. Settings therefore persist at the node, even
    // when the view changes.
    settings

    #ee

    /**
     * Creates a new NodeRenderer for the given node with an initial view.
     * @param node - The node that is mapped to this renderer.
     * @param view - The initial view used for illustration.
     */
    constructor (node, view) {
        this.node     = node

        this.#ee      = new EventEmitter()

        this.view     = view
        this.settings = {}
        this.settings[view.name] = view.defaultSettings

        this.on("view-ready", () => this.#onViewReady())
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

        // fire a ready event
        this.#ee.emit("ready", {context: this})
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

        // illustrate the node with the current view
        this.view.illustrate.call(this.#elem.select(".node-view").node(), this.node, this.settings[this.view.name])
            .then(() => this.#ee.emit("view-ready"))
    }

    /**
     * Updates the position of the illustration.
     *
     * A renderer holds two different positions for each illustration. One displayed
     * position at which the illustration is displayed and one original position
     * that was calculated by the layout algorithm. The latter one is not affected
     * by animations, such as the node transition.
     *
     * When the illustration was already renderer and a size can be determined, the svg
     * group is already translated so that the illustration is centered with regard to
     * the displayed position.
     *
     * @param x - The x position relative the parent svg element (in pixels).
     * @param y - The x position relative the parent svg element (in pixels).
     * @param keepOriginal - Whether the original position should be kept and
     *      only the displayed position should be updated.
     * @param animate - Whether the position change should happen smoothly.
     */
    updatePosition (x, y, keepOriginal=true, animate=false) {
        // TODO: include the animation

        // check whether the original position should be updated
        if (keepOriginal) {
            this.#xo = x
            this.#yo = y
        }

        // update the current position
        this.x  = x
        this.y  = y

        // update transformation of svg group and center
        this.#updateTransform()

        // fire a position update event
        this.#ee.emit("position-update", {context: this, keepOriginal: keepOriginal, animate: animate})
    }

    /**
     * Updates the transformation of the svg group, implementing the position update
     * from `NodeRenderer.updatePosition()`.
     *
     * The positioning of the svg groups is solved using the transformation attribute.
     * Therefore, each renderer has its own coordinate system with an origin at the
     * displayed position.
     *
     * When the illustration was already renderer and a size can be determined, the svg
     * group is already translated so that the illustration is centered with regard to
     * the displayed position.
     */
    #updateTransform() {

        // get the bounding box to center the view around (x, y)
        // if the element is not ready, e.g. no bbox exists do not
        // center the view
        const bbox = this.#elem.node().getBBox()
        let x, y
        if (bbox) {
            x = this.x - (bbox.x + 0.5*bbox.width)
            y = this.y - (bbox.y + 0.5*bbox.height)
        } else {
            x = this.x
            y = this.y
        }

        // update the transform matrix
        this.#elem
            .attr("transform", "translate(" + x + ", " + y + ")")
    }

    /**
     * Register a function to be executed when a specific event is fired by
     * the renderer.
     *
     * Available events are:
     * - "ready"           (fired when the renderer is bound to a svg group)
     * - "view-ready"      (fired when the view finished its asynchronous illustration)
     * - "position-update" (fired when the views position changed)
     *
     * @param eventName - The name of the event
     * @param func - The function to be executed
     */
    on(eventName, func) {
        this.#ee.addListener(eventName, func)
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
            .style("background", "red")
            .remove()

        // center the view again
        this.#updateTransform()

        // update legend
        Legend.update()

        // show the view
        this.#elem
            .select(".node-view")
            .style("visibility", "visible")
    }
}
