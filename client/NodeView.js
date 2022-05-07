/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

class View {

    /*
     * Generates a new empty view where the functions 'applicable' and
     * 'illustrate' need to be implemented.
     * @param {string} name - The name of the view that should be displayed.
     */
    constructor(name, args = {}) {
        this.name = name
        this.args = args
    }

    /*
     * Returns whether a view can be used to illustrate a given node by
     * checking properties of the node.
     * @param node - The node that should be checked.
     */
    applicable(data) {
        throw Error("View does not implement function \'applicable\'")
        return false
    }

    /*
     * Generates the illustration for a given node and canvas key.
     * @param node - The node that should be illustrated.
     * @param id   - The key of the HTML <g> element to which the
     *               illustration should be appended.
     */
    illustrate(node, data) {
        throw Error("View does not implement function \'illustrate\'")
        return this
    }
}

/*
 * Simple node for classification trees that illustrates the class
 * distribution as a pie chart. Classes are color coded, the total
 * number of samples determines the size of the circle.
 */
CCircleIconView = new View("Circle Icon View",
    {'colors': ['#DDAA33', '#BB5566', '#004488'], 'r': 15})

CCircleIconView.applicable = function (data) {
    return true
}

CCircleIconView.illustrate = function (node, data) {
    node.selectAll("path")
        .data(d3.pie()(data.in))
        .join("path")
        .attr('d', d3.arc()
                     .innerRadius(0)
                     .outerRadius(this.args.r))
        .attr('fill', (d, i) => this.args.colors[i])

    node.append('circle')
        .attr('class', 'outline')
        .attr('r', this.args.r)
}

CSplitBarView = new View("Bar Chart Split View",
    {width: 100, height: 100 / 1.62, padding: 2.0, colors: ['#DDAA33', '#BB5566', '#004488']})

CSplitBarView.illustrate = function (node, data) {
    let x = d3.scaleBand()
              .domain(data.in.map((e, i) => "C" + (i + 1)))
              .range([0, this.args.width])
              .padding(0.2)
    let y = d3.scaleLinear()
              .domain([0, data.in.reduce((a, b) => a + b, 0)])
              .range([0, this.args.height])

    node.append('rect')
        .attr('class', 'outline')
        .attr('transform', 'translate(' + (-this.args.width/2 - this.args.padding) + ', ' + (-this.args.height/2 - this.args.padding) + ')')
        .attr('width',  this.args.width + 2*this.args.padding)
        .attr('height', this.args.height + 2*this.args.padding)
        .style('fill', 'white')
        .style('fill-opacity', 1)

    node.append('g')
        .attr('transform', 'translate(' + -this.args.width/2 + ', ' + -this.args.height/2 + ')')
        .selectAll('rect')
        .data(data.in)
        .join('rect')
        .attr("x", (d, i) => x("C" + (i + 1)))
        .attr("y", d => y(d))
        .attr("width", x.bandwidth())
        .attr("height", d => this.args.height - y(d))
        .style("fill", (d, i) => this.args.colors[i])
}

/**
 * Simple node illustration with text
 * @type {View}
 */
TextView = new View("Split Text View")

TextView.illustrate = function (node, data) {
    console.log(data)
    switch (data.type) {
        case "leaf":
            break
        default:
            node.append("text")
                .text(data.split.feature + " " + data.split.direction + " " + data.split.location.toFixed(2))
                .attr("text-anchor", "middle")
    }
}



