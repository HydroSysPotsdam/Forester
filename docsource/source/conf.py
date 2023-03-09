# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))


# -- Project information -----------------------------------------------------

project = 'Forester'
copyright = '2023, David Strahl'
author = 'David Strahl'

# The full version, including alpha/beta/rc tags
release = ''


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    #"sphinx_js",
    'sphinx.ext.autosectionlabel',
    "sphinx_design",
    "sphinx_copybutton"
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = []


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'furo'
html_logo = "_static/logo.svg"

html_theme_options = {
    "sidebar_hide_name": True,
    "light_css_variables": {
        "color-brand-primary": "#69823c",
        "color-brand-content": "#69823c",
    },
    "dark_css_variables": {
        "color-brand-primary": "#83a24b",
        "color-brand-content": "#83a24b",
    },
    "footer_icons": [
        {
            "name": "Banner",
            "html": "Made with <span class='fa fa-solid fa-heart'></span> in Potsdam."
        },
        {
            "name": "GitHub",
            "url": "https://github.com/HydroSysPotsdam/Forester",
            "html": "<span class='fa fa-brands fa-github' style='margin-left:1em'></span>",
        },
        {
            "name": "About Us",
            "url": "https://www.uni-potsdam.de/de/umwelt/forschung/hysys",
            "html": "<span class='fa fa-solid fa-people-group' style='margin-left:1em'></span>"
        }
    ],
}

html_sidebars = {
    "**": [
        "sidebar/brand.html",
        "sidebar/search.html",
        "sidebar/navigation.html",
        "sidebar/ethical-ads.html",
        "sidebar/buttons.html"
    ]
}

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

# These paths are either relative to html_static_path
# or fully qualified paths (eg. https://...)
html_css_files = [
    'css/forester.css',
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
]

html_js_files = [
    "https://code.jquery.com/jquery-3.6.3.min.js"
]