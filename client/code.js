const myData = Array(40).fill().map(() => 100*Math.random());

let bbox = d3.select("svg").node().getBoundingClientRect();

fetch("/example/iris.json")
    .then(response => response.json())
    .then(treeData => buildTree(treeData))

var treeData;
var selection = null;

function buildTree (treeData) {
    this.treeData = treeData

    let layout = d3.tree().size([700, 700])
    let nodes = d3.hierarchy(treeData, d => d.children)
    nodes = layout(nodes)

    // write id's into nodes
    let id = 0;
    levelTraverse(nodes, function (d) {
        d.id = id;
        id++
    })

    // TODO: find a better solution for the padding
    levelTraverse(nodes, function (d) {
        d.x = 0.05*700 + 0.9*d.x;
        d.y = 0.05*700 + 0.9*d.y;
    })

    // write path into nodes
    reverseLevelTraverse(nodes, function (d) {
        d.path = (d.children ? [d.id].concat(d.children[0].path, d.children[1].path) : [d.id])
    })

    // clear svg
    d3.select('.tree')
        .selectAll('*')
        .remove()

     // add the links
    const link = d3.select('.tree')
                   .selectAll('path')
                   .data(nodes.descendants().slice(1))
                   .join('path')
                   .attr('class', 'link')
                   .attr('d', function (d, i) {
                       return d3.line().curve(d3.curveBasis)([
                           [d.x, d.y],
                           [d.x, 0.75*d.y + 0.25*d.parent.y],
                           [d.parent.x, 0.25*d.y + 0.75*d.parent.y],
                           [d.parent.x, d.parent.y]
                       ])
                   })
                   .style('stroke', function (d) {
                       return d.path.includes(selection) ? 'red' : 'black'
                   })
                   .style('stroke-width', function (d) {
                       return (d.data.degree + 1)/5
                   })

    // generate html nodes
    const all_node = d3.select('.tree')
                   .selectAll('g')
                   .data(nodes.descendants())
                   .join('g')
                   .attr('class', (d, i) => 'node ' + (i == 0 ? 'root' : (d.children ? 'internal' : 'leaf')))
                   .attr('id', (d, i) => 'node' + d.data.id)
                   .attr('transform', d => "translate(" + d.x + ", " + d.y + ")")

    for (let i = 0; i < all_node.size(); i++) {
        let node = d3.select('#node' + i)
        let data = node.datum().data
        CCircleIconView.illustrate(node, data)
    }

    // // place a circle at each node
    // node.append('circle')
    //     .attr('r', 4)
    //     .attr('cx', d => d.x)
    //     .attr('cy', d => d.y)
    //     .on('mouseenter', function (e, d) {
    //         selection = d.id
    //         buildTree(treeData)
    //     })
    //     .on('mouseout', function (e, d) {
    //         selection = null
    //         buildTree(treeData)
    //     })

    // add test text
    // TODO find a better solution to the alignment of the text
    // node.append('text')
    //     .attr('x', d => d.x + 2)
    //     .attr('y', d => d.y + 4)
    //     .attr('dx', 5)
    //     .text(function(d) {
    //         if (d.data.type != 'leaf') {
    //             return d.data.split.feature + " " + d.data.split.direction + " " + d.data.split.location.toFixed(2);
    //         } else {
    //             return d.data.vote;
    //         }
    //     });
}

function levelTraverse (tree, visitFn) {
    let queue = []
    queue.push(tree)
    while (queue[queue.length - 1] != null) {
        let node = queue.pop()
        visitFn(node)
        if(node.children) {
            if(node.children[0]) {
                queue.unshift(node.children[0])
            }
            if (node.children[1]) {
                queue.unshift(node.children[1])
            }
        }
    }
}

function reverseLevelTraverse(tree, visitFn) {
    let queue = []
    let stack = []
    queue.push(tree)
    while (queue[queue.length - 1] != null) {
        let node = queue.pop()
        stack.push(node)
        if(node.children) {
            if(node.children[0]) {
                queue.unshift(node.children[0])
            }
            if (node.children[1]) {
                queue.unshift(node.children[1])
            }
        }
    }

    while (stack.length > 0) {
        visitFn(stack.pop())
    }
}