/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import BasicView      from "../views/BasicView.js";
import StackedBarView from "./StackedBarView.js";
import PieChartView   from "../views/PieChartView.js";
import TextView       from "../views/TextView.js";
import SplitView      from "../views/SplitView.js"

let Views = {
    BasicView:      BasicView,
    StackedBarView: StackedBarView,
    PieChartView:   PieChartView,
    TextView:       TextView,
    SplitView:      SplitView
}

export default Views

window.Views = Views