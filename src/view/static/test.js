/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Tree} from "./Tree.js";

Tree.fetch_json("../../../examples/R/diabetes.json")
    .then(draw_box1)

function draw_box1(tree) {
    const nodes = tree.nodes
    const nodes_flat = tree.nodes.descendants()

    const width = 600
    const height = 600
    const n_total = tree.meta.samples
    const l_total = nodes_flat[nodes_flat.length - 1].depth + 1
    const dx = width / l_total
    const dy = height / n_total

    const colors = chroma.brewer.Paired

    let id = 0

    nodes.each(function (n) {
        n.width  = dx * (n.children ? 1 : l_total - n.depth)
        n.height = dy * n.data.samples

        n.id = id
        id = id + 1

        if (n.parent) {
            n.x = n.parent.x + n.parent.width
            n.y = n.parent.y + n.parent.descendants()
                                .filter(o => o.depth == n.depth && o.id < n.id)
                                .map(o => o.height)
                                .reduce((a, b) => a + b, 0)
        } else {
            n.x = 0
            n.y = 0
        }
    })

    d3.select(".tree")
      .selectAll("rect")
      .data(nodes.descendants())
      .join("rect")
      .attr("x", n => n.x)
      .attr("y", n => n.y)
      .attr("width", n => n.width)
      .attr("height", n => n.height)
      .style("stroke", "black")
      //.style("fill", n => colors[n.data.distribution.indexOf(Math.max(...n.data.distribution))])
      .style("fill", function (n) {
          if (n.children) {
              return colors[tree.meta.features.indexOf(n.data.split.feature)]
          } else {
              return "lightgray"
          }
      })

    d3.select(".tree")
      .selectAll("text")
      .data(nodes.descendants())
      .join("text")
      .attr("x", n => n.x)
      .attr("y", n => n.y + 10)
      .text(n => n.data.samples)
      .attr('stroke', 'black')
      .style("font-size", 10)
}

