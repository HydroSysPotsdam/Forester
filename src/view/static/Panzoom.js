/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

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
    // an initial css transformation that was already on the
    // element and should not be discarded  (rotation, skew, ...)
    #initialTransform

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
    // for smoothing the motion
    #dx = 0
    #dy = 0

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
        this.#elem  = elem
        this.#initialTransform = d3.select(elem).style("transform")
        this.#zoom = this.options.initialZoom

        // add listeners and class to element
        d3.select(elem)
          .on("wheel", event => this.#inputZoom.call(this, event))
        // add the panzoom class
          .classed("panzoom", true)

        // add the parent container and insert the element
        d3.select(elem.parentElement)
          .insert("div", ".panzoom")
          .attr("class", "panzoom-parent")
          .node().appendChild(this.#elem)

        // add listeners to the parent container
        d3.select(elem.parentElement)
          .on("mousemove mouseup mousedown mouseleave contextmenu", event => this.#inputDrag.call(this, event))
          .on("dblclick", event => this.reset.call(this))

        // key listeners only work on the document
        d3.select(document.body)
          .on("keydown keyup", event => this.#disable.call(this, event))

        this.#updateElement()
    }

    #inputDrag(event) {
        // shift key disables panzoom so the user can select text
        if (this.#disabled) return

        // position of event relative to center of element
        let bbox = this.#elem.getBoundingClientRect()
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
            d3.select(document.body).classed("dragging", true)
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
            d3.select(document.body).classed("dragging", false)
        }
    }

    #inputZoom (event) {
        const dz = this.options.zoomDirection * event.deltaY
        const ds = dz * this.options.zoomSpeed
        this.zoom(ds, this.#dragFocal)
    }

    #updateElement () {
        d3.select(this.#elem)
          .style("transform", this.#initialTransform + "translate(" + this.#pan.x + "px, " + this.#pan.y + "px) " + "scale(" + this.#zoom + ")")
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
        d3.select(this.#elem)
          .style("transition", "transform " + this.options.transitionDuration + "ms " + this.options.transitionEasing)

        // do the panning an zooming
        if (dx != 0 && dy != 0) this.pan(dx, dy)
        if (ds != 0) this.zoom(ds)

        // reset to no transition after panzoom
        setTimeout(() => d3.select(this.#elem).style("transition", "none"), this.options.transitionDuration)
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

    #disable (event) {
        if (event.key === "Shift" && event.type === "keydown") {
            this.#disabled = true
        }
        if (event.key === "Shift" && event.type === "keyup") {
            this.#disabled = false
        }
    }
}