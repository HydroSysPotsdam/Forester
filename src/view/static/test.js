/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import * as d3 from 'https://cdn.skypack.dev/d3@7'

const data = [1, 2, 3, 4, 5, 6, 7]
console.log(data)

d3.select('.tree')
  .selectAll('circle')
  .data(data)
  .join('circle')
  .attr('r', d => d)
  .attr('cx', d => Math.random() * 500)
  .attr('cy', d => Math.random() * 500)
