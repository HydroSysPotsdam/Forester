import {FTree} from "./Tree.js";
import * as Views from "./Views.js";
import {FNode} from "./Node.js";

export let Tree = {}

export function openFromData (data) {
    return new Promise((resolve, reject) => {

        let nodes = new FNode(d3.hierarchy(data.tree), data.meta)
        console.log(nodes)

        let tree = new FTree(nodes, "#tree")
        console.log(tree)

        // Tree = new TreeInstance(data, "#tree")
        // window.Tree = Tree
        // window.Views = Views
        //
        // Legend.generate()
        //
        // Tree.draw()
        resolve()
    })
}

// export let Tree
//
// window.Forester = {}
//
// Forester.loadTree = function (fgts) {
//     // Tree = new TreeInstance(fgts, "#tree")
//     // window.Tree = Tree
//     // window.Views = Views
//     //
//     // Legend.generate()
//     //
//     // Tree.draw()
//     console.log("Ready!")
// }

// $('document').ready(function () {
//
//     window.intro = introJs().setOptions({
//         steps: [
//             {
//                 title: "🏳️‍🌈 Legend",
//                 element: document.getElementById("legend"),
//                 intro: "The legend displays information on the colorcoding of classes and features.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".group"),
//                 intro: "Entries are initially grouped based on classes and features.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".group-toggle"),
//                 intro: "Click this icon to hide a group.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".entry"),
//                 intro: "Each entry represents one visible feature or class and is matched to one color.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector(".entry .colorcoded"),
//                 intro: "Click this field to change a color.",
//                 position: "left"
//             },
//             {
//                 element: document.querySelector("#group-new"),
//                 intro: "Click this button to add a new group.",
//                 position: "left",
//                 onchange: function () {
//                     console.log("Something happened")
//                 }
//             }
//         ]
//     })
//
//     /**
//      * HINTS
//      */
//     fetch("../static/hints.json")
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
// })