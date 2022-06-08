import {Tree} from "./Tree.js";
import * as Views from "./Views.js";

// import * as floating from 'https://cdn.skypack.dev/@floating-ui/dom@0.5.2?min'

// console.log(floating)

let tree

let layout = d3.tree()
               .size([650, 650])
layout.xtransform = x => 25 + (x + 1) * 650 / 2
layout.ytransform = y => 25 + y * 650
layout.path = function (d) {
    console.log()
    return d3.line()
             .curve(d3.curveBasis)([
                 [d.x, d.y],
                 [d.x, 0.5 * (d.y + d.parent.y)],
                 [d.parent.x, 0.5 * (d.y + d.parent.y)],
                 [d.parent.x, d.parent.y]
             ])
}

Tree.fetch_json("static/example/Matlab/iris.json")
    .then(build_tree)

function build_tree(tree_instance) {
    tree = tree_instance

    // initial layouting not visible
    tree.calculate_layout(layout)
    let data = tree.nodes.descendants()

    // clear svg
    d3.select('.tree')
      .selectAll('*')
      .remove()

    d3.select('.tree')
      .selectAll('path')
      .data(data.slice(1))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', layout.path)
      .attr('opacity', 0)

    d3.select('.tree')
      .selectAll('g')
      .data(data, d => d.id)
      .enter()
      .append('g')
        // selectors for finding the nodes
      .attr('id', d => 'node' + d.id)
      .attr('class', (d, i) => 'node ' + (i == 0 ? 'root' : (d.children ? 'internal' : 'leaf')))
        // initial attributes
      .attr('transform', d => "translate(" + d.x + ", " + d.y + ")")
        // add views to each node
      .each(function (d) {
          let selection = d3.select(this)
          Views.CCircleIconView.illustrate(selection, selection.datum(), tree.meta)
      })
      .append('circle')
      .attr('r', 10)
      .attr('cx', 0)
      .attr('cy', 20)
      .on("click", function (e, node) {
          tree.collapse_descendants(node)
          update_tree(node, tree)
      })

    update_tree(null, tree)
}

function update_tree(update_node, tree) {

    // find originating node if update comes from event
    let duration = update_node ? 200 + 20 * update_node.descendants().length : 200

    // calculate layout
    tree.calculate_layout(layout)

    let data = tree.nodes.descendants()

    d3.selectAll('.link')
      .data(data.slice(1), d => d.id)
      .join(enter => enter,
          function (update) {
              return update.transition()
                           .duration(duration)
                           .attr('d', layout.path)
                           .attr("opacity", d => d.collapsed ? 0 : 1)
          })

    d3.selectAll('.node')
      .data(data, d => d.id)
      .join(enter => enter,
          function (update) {
              return update.transition()
                           .duration(duration)
                           .attr("visibility", "visible")
                           .attr("transform", d => "translate(" + d.x + ", " + d.y + ")")
                           .attr("opacity", d => d.collapsed ? 0 : 1)
                           .on("end", function () {
                               d3.select(this)
                                 .attr("visibility", d => d.collapsed ? "hidden" : "visible")
                           })
          })
}