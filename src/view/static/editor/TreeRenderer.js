/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import Views from "../views/Views.js"

import {NodeRenderer} from "./NodeRenderer.js";
import {BasicLinkRenderer, FlowLinkRenderer} from "./LinkRenderer.js";
import {Legend} from "./legend/Legend.js";

export class TreeRenderer {

    id

    nodes
    renderers = new Map()

    observer

    #ui_elem

    constructor(nodes, save = undefined, elem = "#tree") {
        this.id = "Tree-" + uuid.v4()
        this.nodes = nodes

        // writes all necessary attributes and styles into the container
        this.#initializeContainer(elem)

        // try to load from save, if not possible fall back to basic view without custom settings
        // TODO: the tree renderer should receive a list and the loading of the save should happen somewhere else
        this.nodes.descendants().forEach((node, i) => {
            try {
                const view = Views[save.renderers[i].view]
                const nodeSettings = save.renderers[i].settings
                this.renderers.set(node.id, new NodeRenderer(node, view, nodeSettings))
            } catch (e) {
                this.renderers.set(node.id, new NodeRenderer(node, Object.values(Views)[Math.round(Math.random()*4)]))
            }
        })

        this.observer = new MutationObserver((mutations, observer) => this.#onNodePositionUpdate.call(this, mutations, observer))
    }

    #initializeContainer(elem) {
        // TODO: make this function accept d3 selections and html elements too
        this.#ui_elem = d3
            .select(elem)
            .classed("tree", true)
            .attr("id", this.id)
    }

    #bindNodeRenderers() {

        // for all nodes, append a svg group and bind
        // the node renderer to it
        this.#ui_elem
            .select(".tree-nodes")
            .selectAll("g")
            .data(this.renderers.values())
            .enter()
            .append("g")
            .each(function (renderer) {
                renderer.bind(this)
            })

        d3.selectAll(".tree-node")
          .nodes()
          .forEach(node => this.observer.observe(node, {attributes: true, attributeFilter: ["transform", "display"]}))
    }

    clear() {
        // remove all children
        this.#ui_elem
            .selectAll("*")
            .remove()

        // append the svg canvas
        this.#ui_elem
            .append("svg")
            .attr("class", "canvas")
            .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
            .style("position", "relative")

        // append the links group
        this.#ui_elem
            .select(".canvas")
            .append("g")
            .attr("class", "tree-links")

        // append the link groups
        this.#ui_elem
            .select(".tree-links")
            .selectAll("g")
            .data(this.nodes.links())
            .enter()
            .append("g")
            .attr("class", "link")
            .attr("sourceID", link => link.source.id)
            .attr("targetID", link => link.target.id)

        // append the node group
        this.#ui_elem
            .select(".canvas")
            .append("g")
            .attr("class", "tree-nodes")

        this.#bindNodeRenderers()
    }

    layout(settings) {

        // load layout and path settings
        let direction = settings.layout.direction
        let lspace = settings.layout.lspace
        let bspace = settings.layout.bspace
        let dendro = settings.layout.dendrogram
        let layout, width, height, xmin, ymin;

        // helper function
        const range = x => Math.max(...x) - Math.min(...x)

        const algorithm = dendro ? d3.cluster() : d3.tree()
        console.log(settings)


        // calculate the tree layout
        layout = algorithm.nodeSize([bspace * 100, lspace * 80])(this.nodes)

        // find range of x and y coordinates
        // TODO: include the view sizes so that there is padding
        width = range(this.nodes.descendants().map(node => node.x)) + 100
        height = range(this.nodes.descendants().map(node => node.y)) + 80

        // move x and y coordinates, so that they are positive
        // TODO: include the view sizes so that there is padding
        xmin = -Math.min(...this.nodes.descendants().map(node => node.x)) + 50
        ymin = 40

        // add the minimum values to the coordinates
        this.nodes.descendants().forEach(node => {
            node.x += xmin;
            node.y += ymin
        })

        // with left-right direction, swap the coordinate axes
        if (direction === "left-right") {
            [width, height] = [height, width]
            this.nodes.descendants().forEach(node => {
                [node.x, node.y] = [node.y, node.x]
            })
        }

        // place same levels
        if (dendro) {
            this.nodes.descendants().filter(node => node.data.type !== "leaf").forEach(node => {
                const y = this.nodes.descendants().filter(n => n.depth === node.depth).map(n => n.y)
                node.y = Math.min(...y)
            })
        }

        // update the size of the svg image
        this.#ui_elem
            .select("svg")
            .style("width", width)
            .style("height", height)

        for (const node of this.nodes) {
            let renderer = this.renderers.get(node.id)

            // update the renderers position
            renderer.layoutPosition = [node.x, node.y]

            // remove the fields from the nodes after usage
            delete node.x
            delete node.y
        }

        // this.redrawLinks(settings)
    }

    /**
     * Completely redraws the whole tree.
     * @param settings
     */
    draw(settings) {
        // TODO: what should happen if settings is undefined -> use global settings

        this.settings = settings

        this.clear()
        this.layout(settings)
        this.redrawNodes(settings)
    }

    redrawNodes(settings) {
        for (const node of this.nodes) {
            this.redrawNode(node)
        }

        Legend.update()
    }

    redrawNode(node) {
        let renderer = this.renderers.get(node.id)
        renderer.draw()
    }

    /**
     * Redraws the links that originate or terminate at any of the nodes identified
     * by the given IDs.
     *
     * When no IDs are passed, all links are redrawn.
     *
     * Links need to re-drawn, whenever a node's position changes. This is because for
     * example curved links can not simply be rescaled to fit the new positions. The
     * algorithm therefore removes the old link and adds a new one based on the
     * updated positions.
     *
     * @param nodeIDs An array of touched node IDs for which the links should be updated.
     *
     * @returns A list of the links that have been updated.
     */
    async redrawLinks(...nodeIDs) {

        // TODO: this is not well done
        const linkRenderer = this.settings.path.flow === "none" ? new BasicLinkRenderer() : new FlowLinkRenderer()

        let links = []

        for (const link of this.nodes.links()) {

            if (nodeIDs.length == 0 | nodeIDs.includes(link.source.id) | nodeIDs.includes(link.target.id)) {

                const source = this.renderers.get(link.source.id)
                const target = this.renderers.get(link.target.id)

                // retrieve the svg group to which the link should be added
                const group = d3.select(".link[sourceID='" + link.source.id + "'][targetID='" + link.target.id + "']")

                // remove previous drawings of the links
                group
                    .selectAll("*")
                    .remove()

                // redraw the original link
                await linkRenderer.draw.call(group.node(), source, target, this.settings)

                links.push(group.node())
            }
        }

        return links
    }

    /**
     * Whenever any node's transform attribute changes, the affected links are updated.
     *
     * The transform attribute is tracked using an instance of {@see MutationObserver}.
     * It exclusively observes the `transform` attribute of the nodes.
     *
     * From a list of mutations, the unique ids of the affected nodes are retrieved.
     * This list is then used to find all links that need to be redrawn (up to three
     * per node).
     *
     * **This method should only be called as the mutation observer callback.**
     *
     * @param mutations Array of mutations on the elements
     * @param observer The watching observer
     */
    #onNodePositionUpdate(mutations, observer) {

        // get a set of the unique id's that are included in the mutations
        let nodeIDs = [...new Set(mutations.map(record => record.target.getAttribute("forID")))]

        // redraw links for the nodes whose positions changed
        this.redrawLinks(...nodeIDs)
    }

    classNames() {
        return this.nodes.data.classes
    }

    featureNames() {
        return this.nodes.data.features
    }

    updateSettings(settings, changed) {

        if (changed && changed.length > 0) {
           this.draw(settings)
        }
    }

    #setLinkRenderer(renderer) {

    }

    getNode(nodeID) {
        return this.renderers.get(nodeID).node
    }

    save() {
        return this.nodes.descendants().map(node => this.renderers.get(node.id).save())
    }
}