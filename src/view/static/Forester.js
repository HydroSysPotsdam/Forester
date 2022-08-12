import * as Views from "./Views.js";
// import {Legend} from "./Legend_old.js";
import {Legend} from "./Legend.js";

let LAYOUT = d3.tree()
               .size([650, 650])
LAYOUT.xtransform = x => 25 + (x + 1) * 650 / 2
LAYOUT.ytransform = y => 25 + y * 650
LAYOUT.path = function (d) {
    console.log()
    return d3.line()
             .curve(d3.curveBasis)([
                 [d.x, d.y],
                 [d.x, 0.5 * (d.y + d.parent.y)],
                 [d.parent.x, 0.5 * (d.y + d.parent.y)],
                 [d.parent.x, d.parent.y]
             ])
}

export let Tree = {

    from_json: function (path) {
        fetch(path).then(r => r.json()).then(json => this.initialize(json))
    },

    initialize: function (json) {
        this.nodes = d3.hierarchy(json['tree'], d => d.children)
        this.meta = json['meta']

        // set predefined fields for all nodes
        let id = 0
        this.nodes.each(function (d) {
            d.id = id
            d.collapsed = false
            d.size = 1
            id++
        })

        Legend.generate()
        this.draw()
        Legend.update()
    },

    draw: function () {
        // find size of canvas
        const container = d3.select("#tree")
        const width = container.node().getBoundingClientRect().width
        const height = container.node().getBoundingClientRect().height


        // calculate layout
        d3.tree().size([width, height])(this.nodes)

        // grab data for easy access
        // changes in data are not mapped to the tree structure
        let data = this.nodes.descendants()

        // clear canvas
        // d3.select('#tree')
        //   .selectAll('*')
        //   .remove()

        // prepare links between nodes
        d3.select("#tree")
          .append("svg")
          .attr("id", "links")
          .selectAll('path')
          .data(data.slice(1))
          .enter()
          .append('path')
          .attr('class', 'link')
          .attr('d', LAYOUT.path)

        // prepare views
        d3.select("#tree")
          .selectAll('div')
          .data(data, d => d.id)
          .enter()
          .append('div')
          .attr('id', d => 'node' + d.id)
          .attr('class', (d, i) => 'node ' + (i == 0 ? 'root' : (d.children ? 'internal' : 'leaf')))
          .style("left", d => d.x + "px")
          .style("top", d => d.y + "px")
          .style("opacity", 1)
          .style("visibility", "true")
          .each(function (d) {
              let selection = d3.select(this)
              Views.TextView.illustrate(selection, selection.datum(), Tree.meta)
              // if (d.data.type == "leaf") {
              //     Views.CCircleIconView.illustrate(selection, selection.datum(), Tree.meta)
              // } else {
              //     Views.TextView.illustrate(selection, selection.datum(), Tree.meta)
              // }
          })
        // .on("click", function (e, node) {
        //     // collapse descendants
        //     let descendants = node.descendants().slice(1)
        //     let collapsed = descendants.every(desc => desc.collapsed)
        //     if (!node.collapsed) {
        //         descendants.map(d => d.collapsed = !collapsed)
        //     }
        //     Tree.update(node)
        // })

        // initial animation
        //this.update(null)
    },

    update: function (node) {
        // find originating node if update comes from event
        let duration = node ? 200 + 20 * node.descendants().length : 200

        // grab data to simplify
        // changes in data are not mapped to the original data
        let data = this.nodes.descendants()

        // overwrite positions for collapsed nodes
        // data.map(function (node) {
        //     if (node.collapsed) {
        //         let first_visible = node.ancestors()
        //                              .filter(d => !d.collapsed)[0]
        //         node.x = first_visible.x
        //         node.y = first_visible.y
        //     }
        // })


        d3.selectAll('.link')
          .data(data.slice(1), d => d.id)
          .join(enter => enter,
              function (update) {
                  return update.transition()
                               .duration(duration)
                               .style("opacity", d => d.collapsed ? 0 : 1)
              })

        // translation animation for nodes
        d3.selectAll('.node')
          .data(data, d => d.id)
          .join(enter => enter,
              function (update) {
                  return update.transition()
                               .duration(duration)
                               .attr("visibility", "visible")
                               .style("left", d => d.x + "px")
                               .style("top", d => d.y + "px")
                               .style("opacity", d => d.collapsed ? 0 : 1)
                               .on("end", function () {
                                   d3.select(this)
                                     .attr("visibility", d => d.collapsed ? "hidden" : "visible")
                               })
              })
    },

    classNames: function () {
        let names = Tree.meta.classes
        return names.map(n => S(n).trim().capitalize().s)
    },

    featureNames: function () {
        let names = Tree.meta.features
        return names.map(n => S(n).trim().capitalize().s)
    },
}

Tree.from_json("../../../examples/R/diabetes.json")