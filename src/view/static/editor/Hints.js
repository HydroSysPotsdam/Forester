/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

class Hints {
    //TODO: add method to programmatically add hint
    //TODO: reset text when closing

    // the ui element
    #hint

    // list of hints downloaded from the server
    #hints = []

    // current state of the hint panel
    #open

    // mutation observer used to keep track of all the
    // elements that are added to the DOM
    #mutationObserver

    // current timer id for automatically closing the panel
    #currentTimer

    // Global option whether hints should be opened and closed automatically.
    auto = true

    constructor (hint="#hint", mutationsOn=".forester-content") {

        // the DOM element that is used as a hint panel
        this.#hint = d3.select(hint).node()

        // link event-based functionality
        d3.select(this.#hint)
            .on("click", event => this.#onHintClick(event))
            .on("mouseenter", event => this.#onHintEnter(event))
            .on("mouseleave", event => this.#onHintLeave(event))
            .on("hint-open", event => this.#onHintOpened(event))
            .on("hint-close", event => this.#onHintClosed(event))
        d3.select(this.#hint)
          .select(".hint-autoopen")
          .select(".fa")
          .on("click", event => this.#onAutoopenClick(event))

        // set up the mutation observer to listen for the addition of elements
        this.#mutationObserver = new MutationObserver((m, o) => this.#onElementAdded(m, o))
        this.#mutationObserver.observe(document.querySelector(mutationsOn), {subtree: true, childList: true})

        // download the hints
        fetch(window.origin + "/api/hints").then(res => res.json()).then(hints => this.#hints = hints)
    }

    /**
     * Returns the current state of the hint panel.
     *
     * When the panel was never opened or closed programmatically, the state is derived
     * from the DOM element.
     * @returns {boolean|*} - Whether the panel is open.
     */
    get open () {
        return (this.#open === undefined) ? (this.#hint.getAttribute("open") === "true") : this.#open
    }

    /**
     * Set the current state of the hint panel.
     *
     * The state is additionally store as attribute `open` on the DOM element.
     * Setting the element dispatches either an `hint-open` or `hint-closed` event on the panel,
     * based on the updated value. By default, the event updates the hint icon.
     * @param open - The new state of the panel
     */
    set open (open) {
        this.#open = open
        this.#hint.setAttribute("open", open)
        this.#hint.dispatchEvent(new Event(open ? "hint-open" : "hint-close"))
    }

    /**
     * Inverts the current state of the panel.
     * @see Hints.open
     */
    toggle () {
        this.open = !this.open
    }

    /**
     * Updates the title and text of the hint panel.
     *
     * The update happens regardless of the panels current state.
     * Both `title` and `content` can be styled using HTML.
     *
     * @param title - The title to be displayed.
     * @param content - The hint body to be displayed.
     */
    update (title, content) {

        // update the hint panel's title
        d3.select(this.#hint)
          .select(".hint-title")
          .html(title)

        // update the hint panel's content
        d3.select(this.#hint)
          .select(".hint-content")
          .html(content)

        // dispatch event to inform other routines
        this.#hint.dispatchEvent(new Event("hint-update"))
    }

    /**
     * Starts a timer to automatically close the panel after a fixed `duration`.
     *
     * When a timer is already running, it is stopped. Whether the panel really closes
     * after the timer finishes depends on the value of the {@link Hints.open} attribute.
     * It needs to be `true`.
     *
     * @param duration - The duration after which the panel closes. Default: 5s.
     */
    #startCloseTimer (duration=5000) {
        if (this.#currentTimer) this.#stopCloseTimer()
        this.#currentTimer = setTimeout(() => {
            if (this.auto && this.open) this.open = false
        }, duration)
    }

    /**
     * Interrupts any timer that would close the panel.
     *
     * By default, closing is interrupted, when the user moves the mouse onto
     * the hint panel and resumed after it leaves it again.
     */
    #stopCloseTimer () {
        if (this.#currentTimer) clearTimeout(this.#currentTimer)
        this.#currentTimer == undefined
    }

    /**
     * Called when the user clicks on the hint panel regardless of its
     * current state.
     *
     * By default, this inverts the panel's current state.
     *
     * @param event - The intercepted mouse event.
     */
    #onHintClick (event) {
        this.toggle()
    }

    /**
     * Called when the mouse enters the hint panel.
     *
     * By default, this interrupts the closing timer.
     *
     * @param event - The intercepted mouse event.
     */
    #onHintEnter (event) {
        this.#stopCloseTimer()
    }

    /**
     * Called when the mouse leaves the hint panel.
     *
     * By default, this starts a new timer for closing the panel,
     * when the attribute {@link Hints.auto} is enabled.
     *
     * @param event - The intercepted mouse event.
     */
    #onHintLeave (event) {
        if (this.#hint.contains(event.toElement)) return
        this.#startCloseTimer()
    }

    /**
     * Called when the hint panel is opened.
     *
     * By default, this updates the icon of the hint panel and starts a timer
     * to close the panel again automatically. The latter is done only when the
     * attribute {@link Hints.auto} is enabled.
     *
     * @param event - The intercepted mouse event.
     */
    #onHintOpened (event) {
        d3.select(this.#hint)
          .select("i")
          .classed("fa-circle-info", true)
          .classed("fa-info", false)

        if (this.auto && this.open) {
            this.#startCloseTimer()
        }
    }

    /**
     * Called when the hint panel is opened.
     *
     * By default, this updates the icon of the hint panel.
     *
     * @param event - The intercepted mouse event.
     */
    #onHintClosed (event) {
        d3.select(this.#hint)
          .select("i")
          .classed("fa-circle-info", false)
          .classed("fa-info", true)
    }

    /**
     * Called when the "Autoclose" button on the hint panel is clicked and inverts
     * the `auto` attribute.
     *
     * The event propagation to the hint panel is stopped to prevent accidental
     * closing of the whole panel. Based on the value of the attribute {@link Hints.auto}
     * the icon is updated.
     *
     * @param event - The intercepted mouse event.
     */
    #onAutoopenClick (event) {
        // stop closing of the hint panel
        event.stopPropagation()

        // toggle the auto option
        this.auto = !this.auto

        // update the icon on the hint panel
        d3.select(event.target)
          .classed("fa-check-circle", this.auto)
          .classed("fa-circle-xmark", !this.auto)
    }

    /**
     * Called whenever changes on the DOM occur. Checks, whether the new elements
     * are hinted and adds needed functionality.
     *
     * The observation of the DOM is done by a {@link MutationObserver}. It bundles updates
     * that happen in quick succession. For each update, the whole tree is checked against all
     * hint selectors.
     */
    #onElementAdded () {
        for (const j in this.#hints) {

            // grab the hint's selector
            const selector = this.#hints[j].selector

            // select elements based on hint selector and
            // prepare for hinting
            d3.selectAll(selector + ":not(.hinted)")
              .classed("hinted", true)
              .attr("hintID", j)
              .on("mouseover",  event => this.#onHoverHinted(event))
        }
    }

    /**
     * Called when the user hovers over a hinted element. Update the hint panel based on the
     * element's hint.
     *
     * With the global attribute {@link Hints.auto} enabled, the panel is opened automatically.
     *
     * @param event - The intercepted mouse event.
     */
    #onHoverHinted (event) {

        // retrieve the hint id and update the hint panel
        const hintID = d3.select(event.currentTarget).attr("hintID")
        if (hintID < this.#hints.length) this.update(this.#hints[hintID].title, this.#hints[hintID].hint)

        // open the hint panel
        if (this.auto) this.open = true
    }
}

export default new Hints()