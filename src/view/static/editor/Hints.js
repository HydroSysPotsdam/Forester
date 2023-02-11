/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

class Hints {

    #hint

    constructor (selector="#hint") {
        this.#hint = d3.select(selector).node()

        d3.select(this.#hint)
          .on("click", event => this.toggle())
    }

    open () {
        console.log("Opening")
        d3.select(this.#hint)
          .attr("open", "true")
    }

    close () {
        console.log("Closing")
        d3.select(this.#hint)
          .attr("open", "false")
    }

    isOpen() {
        return d3.select(this.#hint).attr("open") === "true"
    }

    toggle () {
        if (this.isOpen()) {
            this.close()
        } else {
            this.open()
        }
    }

}

export default new Hints()

 fetch("../static/hints.json")
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