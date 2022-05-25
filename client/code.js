const flextree = d3.flextree({nodeSize: n => n.size})
var tree;

Tree.fetch_json("../example/Matlab/iris.json")
    .then(build_tree)

function build_tree(tree) {
    this.tree = tree

    for (let node of tree) {
        node.size = CCircleIconView.size(node, tree.meta)
    }

    flextree.transform = (x, y) => [25 + 650/2 + 650/2*x, 25 + 650*y]
    tree.calculate_layout(flextree)

    // clear svg
    d3.select('.tree')
      .selectAll('*')
      .remove()

    // add the links
    const link = d3.select('.tree')
                   .selectAll('path')
                   .data(tree.descendants().slice(1))
                   .join('path')
                   .attr('class', 'link')
                   .attr('d', function (d, i) {
                       // TODO why is this quickfix necessary, the root does not contain xy values
                       let parent = d.depth == 1 ? tree : d.parent
                       return d3.line().curve(d3.curveBasis)([
                           [d.x, d.y],
                           [d.x, 0.75*d.y + 0.25*parent.y],
                           [parent.x, 0.25*d.y + 0.75*parent.y],
                           [parent.x, parent.y]
                       ])
                   })
                   .style('stroke', 'black')
                   .style('stroke-width', function (d) {
                       return (d.data.degree + 1)/5
                   })

    // generate html <g> nodes
    const nodes = d3.select('.tree')
                    .selectAll('g')
                    .data(tree.descendants())
                    .join('g')
                    .attr('id', d => 'node' + d.id)
                    .attr('class', (d, i) => 'node ' + (i == 0 ? 'root' : (d.children ? 'internal' : 'leaf')))
                    .attr('transform', d => "translate(" + d.x + ", " + d.y + ")")

    for (let i = 0; i < tree.descendants().length; i++) {
        let selection = d3.select('#node' + i)
        let node = selection.datum()
        CCircleIconView.illustrate(selection, node, tree.meta)
    }
}

//
// function levelTraverse (tree, visitFn) {
//     let queue = []
//     queue.push(tree)
//     while (queue[queue.length - 1] != null) {
//         let node = queue.pop()
//         visitFn(node)
//         if(node.children) {
//             if(node.children[0]) {
//                 queue.unshift(node.children[0])
//             }
//             if (node.children[1]) {
//                 queue.unshift(node.children[1])
//             }
//         }
//     }
// }
//
// function reverseLevelTraverse(tree, visitFn) {
//     let queue = []
//     let stack = []
//     queue.push(tree)
//     while (queue[queue.length - 1] != null) {
//         let node = queue.pop()
//         stack.push(node)
//         if(node.children) {
//             if(node.children[0]) {
//                 queue.unshift(node.children[0])
//             }
//             if (node.children[1]) {
//                 queue.unshift(node.children[1])
//             }
//         }
//     }
//
//     while (stack.length > 0) {
//         visitFn(stack.pop())
//     }
// }