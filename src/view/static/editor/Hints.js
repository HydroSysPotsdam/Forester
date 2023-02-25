/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

class Hints {

    // the ui element
    #hint

    // list of hints downloaded from the server
    #hints = []

    // current state of the hint panel
    #open

    // mutation observer used to keep track of all the
    // elements that are added to the DOM
    #mutationObserver

    // whether hints should be opened and closed automatically
    auto = false

    constructor (hint="#hint", mutationsOn=".forester-content") {

        // the DOM element that is used as a hint panel
        this.#hint = d3.select(hint).node()

        // link event-based functionality
        d3.select(this.#hint)
            .on("click", event => this.#onHintClick(event))
            .on("hint-open", event => this.#onHintOpened(event))
            .on("hint-close", event => this.#onHintClosed(event))

        // set up the mutation observer to listen for the addition of elements
        this.#mutationObserver = new MutationObserver((m, o) => this.#onElementAdded(m, o))
        this.#mutationObserver.observe(document.querySelector(mutationsOn), {subtree: true, childList: true})

        // download the hints
        fetch(window.origin + "/api/hints").then(res => res.json()).then(hints => this.#hints = hints)
    }

    get open () {
        return (this.#open === undefined) ? (this.#hint.getAttribute("open") === "true") : this.#open
    }

    set open (open) {
        this.#open = open
        this.#hint.setAttribute("open", open)
        this.#hint.dispatchEvent(new Event(open ? "hint-open" : "hint-close"))
    }

    // toggles the hint panel
    toggle () {
        this.open = !this.open
    }

    // update the hint panel
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

    #onHintClick (event) {
        this.toggle()
    }

    #onHintOpened (event) {
        d3.select(this.#hint)
          .select("i")
          .classed("fa-circle-info", true)
          .classed("fa-info", false)

        if (this.auto && this.open) {
            if (this.currentTimer) clearTimeout(this.currentTimer)
            this.currentTimer = setTimeout(() => this.open = false, 5000)
        }
    }

    #onHintClosed (event) {
        d3.select(this.#hint)
          .select("i")
          .classed("fa-circle-info", false)
          .classed("fa-info", true)
    }

    // add hints for a collection of observed mutations
    #onElementAdded (mutations, observer) {
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

    // called when the user hovers over a hinted element
    #onHoverHinted (event) {

        // retrieve the hint id and update the hint panel
        const hintID = d3.select(event.currentTarget).attr("hintID")
        if (hintID < this.#hints.length) this.update(this.#hints[hintID].title, this.#hints[hintID].hint)

        // open the hint panel
        if (this.auto) this.open = true
    }
}

export default new Hints()

 // onMouseOver: function (event) {
 //             const hintID = d3.select(this).attr("hintID")
 //             console.log(Editor.Hints.hints[hintID].title, Editor.Hints.hints[hintID].hint)
 //         },
 //
 //         onElementAdded: function (mutations, observer) {
 //
 //             for (const i in Editor.Hints.hints) {
 //                 d3.selectAll(Editor.Hints.hints[i].selector + ":not(.hinted)")
 //                   .classed("hinted", true)
 //                   .attr("hintID", i)
 //                   .on("mouseover", Editor.Hints.onMouseOver)
 //             }
 //         }

 // fetch("../static/hints.json")
//         .then(obj => obj.json())
//         .then(function (hints) {
//             for (let hint of hints) {
//                 d3.selectAll(hint.selector)
//                   .classed("hinted", true)
//                   .attr("hint-title", hint.title)
//                   .attr("hint-text", hint.hint)
//                   .on("mouseover", function (event) {
//                       event.stopPropagation()
//                       const hinted = d3.select(this)
//                       d3.select("#hint .hint-title")
//                         .html(hinted.attr("hint-title"))
//                       d3.select("#hint .hint-text")
//                         .html(hinted.attr("hint-text"))
//                   })
//             }
//         })
//
//     d3.select("#hint")
//       .on("click", function () {
//           const hint = d3.select(this)
//           const content = hint.select(".hint-content")
//           const icon = hint.select(".fa-info")
//           const open = hint.attr("open")
//
//           if (open === "false") {
//               hint
//                   .transition()
//                   .style("width", "300px")
//                   .style("height", "200px")
//               hint.attr("open", true)
//               content.style("visibility", "visible")
//           } else {
//               hint
//                   .transition()
//                   .style("width", "25px")
//                   .style("height", "25px")
//               hint.attr("open", false)
//               content.style("visibility", "hidden")
//           }
//       })