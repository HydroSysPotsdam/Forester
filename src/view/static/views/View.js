/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

import {Legend} from "../editor/legend/Legend.js";
import Validator from "../ruleset/Validator.js";

/**
 * Views generate modular illustrations for nodes. They are similar to
 * different types of plots.
 *
 * Each view is always a singleton class (having only one instance) whose
 * `illustrate` method is called when an illustration should be generated
 * for a node. It additionally checks whether a passed node is applicable
 * for a specific type of illustration and verfication of the settings
 * that are used for illustration.
 *
 * This class should be extended by all user-implemented node illustrations.
 * Currently, the following views can be used: {@link BasicView},
 * {@link PieChartView}, {@link TextView} and {@link StackedBarView}.
 */
export default class View {

    // name of the view to be displayed in the editor
    // the name is also used as the css class
    // TODO: use class name as css class
    name

    // rules to validate the settings and generate a settings panel
    rules

    /**
     * Super constructor should be called when a specific view is implemented.
     * It receives and stores the name of the view (that will be displayed in
     * the editor) and a set of rules used to validate the settings used for
     * illustration (see {@link Validator})
     *
     * @param name - The name of the view.
     * @param rules - A set of rules that are used to validate the settings
     *      used for illustration.
     */
    constructor(name, rules = {}) {
        this.name  = name
        this.rules = rules
    }

    /**
     * Returns whether a view can be used to illustrate a given node by checking
     * properties of the node.
     *
     * A view could for example check if a node is a leaf or if there is a class
     * distribution that can be illustrated.
     *
     * @param node - The node to be checked
     * @param meta - The metadata that is linked to the node for easy access
     * @returns {boolean} - Whether the node illustration can be used
     */
    applicable(node, meta) {
        // TODO: view applicability is not yet implemented
        // TODO: metadata should be part of the node

        throw Error("View does not implement function \'applicable\'")
        return true
    }

    /**
     * Called by Forester, whenever the view should be illustrated.
     *
     * **Do not overwrite this method!** All illustration code should be in
     * the `illustrate` method.
     *
     * Prior to illustration, this function validates the passed settings so
     * that default values exist for unset fields and the illustration code
     * can be guarenteed to receive a appropiate set of settings.
     *
     * The `illustrate` function is called afterwards.
     *
     * @param context - The DOM element on which the illustration should happen.
     *      This needs to be an empty SVG group. Both constraints are not
     *      again.
     * @param node - The node that should be illustrated.
     * @param settings- The settings usde for illustration.
     *
     */
    async draw(context, node, settings) {

        // prepare the validator for the settings
        let settingsValidator = new Validator(settings, this.rules)

        // validate settings and throw error when there was an unknown setting
        if (settingsValidator.passes()) {
            await this.illustrate.call(context, node, settings)
        } else {
            throw Error("Settings passed to view are invalid")
        }
    }

    /**
     * Illustrates the given node using a specific set of settings.
     *
     * The context of the method is the DOM element to which the
     * illustration should be added.
     *
     * ** This method should be implemented by the user! **
     *
     * @param node - The node that should be illustrated.
     * @param settings - The valdiated settings that should be used
     *      for illustration.
     */
    async illustrate(node, settings) {
        throw Error("View does not implement function \'illustrate\'")
    }
}

