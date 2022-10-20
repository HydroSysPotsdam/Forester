#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Blueprint, render_template, abort, current_app, url_for
from werkzeug.routing import Rule

API = Blueprint("api", __name__, url_prefix="/api", template_folder="./templates", static_folder="./static")


@API.route("/")
def api():
    """ Lists all the available api functions. """
    endpoints = []
    for r in current_app.url_map.iter_rules():
        if r.endpoint.startswith("api.") and not r.endpoint.endswith(".static"):
            doc = current_app.view_functions[r.endpoint].__doc__
            endpoints.append({
                "url": url_for(r.endpoint, _external=True),
                "end": r.endpoint.replace("api.", ""),
                "doc": doc if doc is not None else ""
            })
    return render_template("api.html", endpoints=endpoints)


@API.route("/projects")
def projects():
    """ Returns a list containing all the available projects with their respective metadata. """
    return ""


@API.route("/new")
def project_new():
    """ Opens a new project """
    return ""


@API.route("/signup")
def user_signup():
    """ Allows a user to sign up """
    return ""


@API.route("/signin")
def user_signin():
    """ Allows a user to sign in """
    return ""


@API.route("/upload/existing")
def upload_existing():
    """ Uploads an existing project from a file """
    return ""


@API.route("/upload/output")
def upload_output():
    """ Uploads and parses the output file of Matlab/R/... for a new project """
    return ""


@API.route("/upload/data")
def upload_data():
    """ Uploads the training data for a project """
    return ""






