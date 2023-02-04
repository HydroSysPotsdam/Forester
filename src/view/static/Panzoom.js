/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import Flatten from "../static/lib/flatten.js"

window.PanzoomOptions = {
    'minZoom': "numeric|min:0",
    'maxZoom': "numeric|min:0",
    'focal.*': "numeric",
    'zoomDirection': 'in:[1,-1]',
    'zoomSpeed': 'numeric|min:0',
    'zoomInOutStep': 'numeric|min:0',
    'initialZoom': 'numeric|min:0',
    'transitionDuration': 'numeric|min:0',
    'transitionEasing': 'in:linear,ease,ease-in,ease-out,ease-in-out,none',
    'element': 'required',
    'panFramerate': 'numeric|min:0'
}

export class Panzoom {

    // the element for which panzoom is added
    #elem
    // transform wrapper
    #elem_transform
    // the panzoom wrapper
    #elem_parent

    // an initial css transformation that was already on the
    // element and should not be discarded  (rotation, skew, ...)
    // #initialTransform
    #oldTransform

    // whether panzoom is disabled
    #disabled = false

    // boolean keeping track of mouse dragging
    #drag = false
    // focal point for zooming, in a coordinate system centered
    // on the element with x right and y up
    #dragFocal = {x: 0, y: 0}
    // point keeping track of mouse position
    #dragPos

    // current pan values relative to the element's original position
    #pan = {x: 0, y: 0}

    // current zoom level relative to the element's initial size
    #zoom = 1

    // when the last mouse move happened
    #lastMouseMove = 0

    // options for this Panzoom instance
    options

    constructor(elem, options = {}) {
        options.element = elem

        const validated = new Validator(options, PanzoomOptions)
        if (validated.fails()) {
            throw Object.values(validated.errors.all())[0].toString()
        }

        // user options
        this.options = {
            minZoom:            options.minZoom ? options.minZoom : 0.5,
            maxZoom:            options.maxZoom ? options.maxZoom : 2.0,
            defaultFocal:       options.defaultFocal ? options.defaultFocal : {x: 0, y: 0},
            zoomDirection:      options.zoomDirection ? options.zoomDirection : -1,
            zoomSpeed:          options.zoomSpeed ? options.zoomSpeed : 0.01,
            zoomInOutStep:      options.zoomInOutStep ? options.zoomInOutStep : 0.2,
            initialZoom:        options.initialZoom ? options.initialZoom : 1,
            transitionDuration: options.transitionDuration ? options.transitionDuration : 300,
            transitionEasing:   options.transitionEasing ? options.transitionEasing : 'ease-in-out',
            panFramerate:       options.panFramerate ? options.panFramerate : 40
        }

        // initial values for some fields
        // this.#initialTransform = d3.select(elem).style("transform")
        this.#zoom = this.options.initialZoom

        // make this element panzoom ready
        this.#elem  = elem
        d3.select(elem)
          .classed("panzoom", true)

        // add the parent container, transform wrapper and insert the element
        this.#elem_parent =
            d3.select(elem.parentElement)
              .insert("div", ".panzoom")
              .attr("class", "panzoom-parent")
              .node()

        // add transformation wrapper
        this.#elem_transform =
            d3.select(this.#elem_parent)
              .append("div")
              .attr("class", "panzoom-transform")
              .node()

        // move the element to the transformation wrapper
        d3.select(this.#elem_transform)
          .node()
          .appendChild(this.#elem)

        // add listeners and class to element
        d3.select(this.#elem_transform)
          .on("wheel", event => this.#inputZoom.call(this, event))
          .on("mousemove mouseup mousedown mouseleave contextmenu", event => this.#inputDrag.call(this, event))

        // add listeners to the parent container
        d3.select(this.#elem_parent)
          .on("dblclick", event => this.centerOnStage.call(this))

        // key listeners only work on the document
        d3.select(document.body)
          .on("keydown keyup", event => this.#disable.call(this, event))

        this.#updateElement()
    }

    #inputDrag(event) {
        // shift key disables panzoom so the user can select text
        if (this.#disabled) return

        // position of event relative to center of element
        let bbox = this.#elem_transform.getBoundingClientRect()
        this.#dragFocal = {
            x: (event.pageX - bbox.left)/(bbox.width /2) - 1,
            y: (event.pageY - bbox.top) /(bbox.height/2) - 1
        }

        if (event.type === "mousedown") {
            this.#drag = true
            this.#dragPos = {x: event.pageX, y: event.pageY}

            // prevent text selection
            window.getSelection().removeAllRanges()

            // style the dragged element
            // TODO: using the body here fixed the cursor while dragging but this is probably not best practice
            d3.select(this.#elem_parent).classed("dragging", true)
        }
        if (event.type === "mousemove" && this.#drag) {
            // do not count this event, when the specified time has not elapsed since the last movement
            if (this.#lastMouseMove + 1000/this.options.panFramerate > event.timeStamp) return

            // reset mouse move counter
            this.#lastMouseMove = event.timeStamp

            // pan
            const dx = event.pageX - this.#dragPos.x
            const dy = event.pageY - this.#dragPos.y
            this.#dragPos = {x: event.pageX, y: event.pageY}
            this.pan(dx, dy)
        }
        if (event.type === "mouseup" || event.type === "mouseleave" || event.type === "contextmenu") {
            this.#drag = false

            // style the dragged element
            d3.select(this.#elem_parent).classed("dragging", false)
        }
    }

    #inputZoom (event) {
        const dz = this.options.zoomDirection * event.deltaY
        const ds = dz * this.options.zoomSpeed
        this.zoom(ds, this.#dragFocal)
    }

    #updateElement () {
        d3.select(this.#elem_transform)
          .style("transform", "translate(-50%, -50%) translate(" + this.#pan.x + "px, " + this.#pan.y + "px) " + "scale(" + this.#zoom + ")")
    }

    pan (dx = 0, dy = 0) {
        this.#pan.x += dx
        this.#pan.y += dy
        this.#updateElement()
    }

    zoom (dzoom = 0, focal = undefined) {
        let zoom =  Math.max(Math.min(this.#zoom + dzoom, this.options.maxZoom), this.options.minZoom)

        if (zoom != this.#zoom) {
            // update scale
            this.#zoom = zoom

            // focal point zooming
            let bbox = this.#elem.getBoundingClientRect()
            let f = focal ? focal : this.options.defaultFocal
            let dx = f.x * bbox.width  / 2 * dzoom / zoom
            let dy = f.y * bbox.height / 2 * dzoom / zoom
            this.#pan.x -= dx
            this.#pan.y -= dy

            // update the elements css
            this.#updateElement()
        }
    }

    smoothPan(dx, dy, ds = 0) {
        d3.select(this.#elem_transform)
          .style("transition", "transform " + this.options.transitionDuration + "ms " + this.options.transitionEasing)

        // do the panning and zooming
        if (dx != 0 || dy != 0) this.pan(dx, dy)
        if (ds != 0) this.zoom(ds)

        // reset to no transition after panzoom
        setTimeout(() => d3.select(this.#elem_transform).style("transition", "none"), this.options.transitionDuration)
    }

    zoomIn () {
        this.smoothPan(0, 0,  this.options.zoomInOutStep)
    }

    zoomOut () {
        this.smoothPan(0, 0, -this.options.zoomInOutStep)
    }

    reset () {
        this.smoothPan(-this.#pan.x, -this.#pan.y, this.options.initialZoom - this.#zoom)
    }

    #centerOnRect(rect, padding=0.1) {
        let parent_rect = this.#elem_parent.getBoundingClientRect()
        let elem_rect   = this.#elem.getBoundingClientRect()

        // invert padding
        padding = Math.max(0, Math.min(1 - padding, 1))

        // first remove current pan value, then move to upper left corner (origin is center), then move to center of rect
        let dx = - this.#pan.x - parent_rect.width/2  + (rect.x - parent_rect.x + rect.width/2)
        let dy = - this.#pan.y - parent_rect.height/2 + (rect.y - parent_rect.y + rect.height/2)

        // zoom level based on available space
        let dz = Math.min(padding*rect.width/elem_rect.width, padding*rect.height/elem_rect.height)

        // only change the zoom level, when the element is too large for the rectangle
        // zoom works incrementally, therefore subtract the current level
        dz = dz < this.#zoom ? dz - this.#zoom : 0

        this.smoothPan(dx, dy, dz)
    }

    centerOnStage (occlusion_threshold = 0.05, debug=false) {

        if (debug) {
            d3.select("#panzoom-debug")
              .remove()
        }

        let box = function (rect) {
            return Flatten.box(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height)
        }

        let size = function (box) {
            return (box.xmax - box.xmin)*(box.ymax - box.ymin)
        }

        let e = this.#elem_parent
        let bounds = box(e.getBoundingClientRect())

        let collections = []

        let reduce = function (elem) {
            // the element contains the panzoom wrapper, check its children
            if (elem.contains(e) && !elem.isEqualNode(e)) {
                for (let child of elem.children) {
                    reduce(child)
                }
            } else {
                if (!elem.isEqualNode(e) && elem.scrollWidth > 0 && elem.scrollHeight > 0 && !elem.isEqualNode(document.getElementById("test"))) {
                    let elem_bounds = box(elem.getBoundingClientRect())
                    elem_bounds.xmin += 1
                    elem_bounds.xmax -= 1
                    elem_bounds.ymin += 1
                    elem_bounds.ymax -= 1

                    if (bounds.intersect(elem_bounds) && size(elem_bounds)/size(bounds) > occlusion_threshold) {
                        collections.push(elem_bounds)
                    }
                }
            }
        }

        reduce(document.body)

        let xcuts = [bounds.xmin, ...collections.map(collection => collection.xmin), ...collections.map(collection => collection.xmax), bounds.xmax]
        xcuts = xcuts.filter(a => bounds.xmin <= a && a <= bounds.xmax).sort((a, b) => a - b)

        let ycuts = [bounds.ymin, ...collections.map(collection => collection.ymin), ...collections.map(collection => collection.ymax), bounds.ymax]
        ycuts = ycuts.filter(a => bounds.ymin <= a && a <= bounds.ymax).sort((a, b) => a - b)

        let n = 0
        let rects = []

        for (let left in xcuts) {
            for (let right = xcuts.length - 1; right > left; right--) {
                for (let top in ycuts) {
                    for (let bottom = ycuts.length - 1; bottom > top; bottom--) {

                        const test = Flatten.box(xcuts[left] + 1, ycuts[top] + 1, xcuts[right] - 1, ycuts[bottom] - 1)

                        const free = collections.reduce((carry, collection) => carry && !test.intersect(collection), true)

                        if (free) {
                            test.size = (test.xmax - test.xmin) * (test.ymax - test.ymin)
                            rects.push(test)
                        }

                        n++;
                    }
                }
            }
        }

        rects = rects.sort((a, b) => b.size - a.size)

        if (debug) {

            let c = d3
                .select(document.body)
                .append("svg")
                .attr("id", "panzoom-debug")
                .style("pointer-events", "none")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("width", "100%")
                .style("height", "100%")

            c.append("g")
             .selectAll("line")
             .data(xcuts)
             .enter()
             .append("line")
             .attr("x1", d => d)
             .attr("x2", d => d)
             .attr("y1", bounds.ymin)
             .attr("y2", bounds.ymax)
             .style("stroke", "gray")

            c.append("g")
             .selectAll("line")
             .data(ycuts)
             .enter()
             .append("line")
             .attr("y1", d => d)
             .attr("y2", d => d)
             .attr("x1", bounds.xmin)
             .attr("x2", bounds.xmax)
             .style("stroke", "gray")

            c.append("g")
             .selectAll("g")
             .data(collections)
             .enter()
             .append("g")
             .html(d => d.svg({"stroke": "orange"}))

            c.append("g")
             .html(rects[0].svg({"stroke": "red"}))

            setTimeout(() => d3.select("#panzoom-debug").remove(), 500)
        }

        let stage = rects[0]
        this.#centerOnRect({x: stage.xmin, y:stage.ymin, width:stage.xmax - stage.xmin, height: stage.ymax - stage.ymin})
    }

    #disable (event) {
        if (event.key === "Shift" && event.type === "keydown") {
            this.#disabled = true
        }
        if (event.key === "Shift" && event.type === "keyup") {
            this.#disabled = false
        }
    }
}