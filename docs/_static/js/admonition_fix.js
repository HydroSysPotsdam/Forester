/*
 * CC-0 2023.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

 $('div.admonition.learn > p.admonition-title').addClass('fa fa-info-circle');

 $('div.admonition.learn > p.admonition-title').text(function(ignored_para,original) {
    return " "+original
 });

