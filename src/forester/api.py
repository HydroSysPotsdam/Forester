#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import json
from flask import Blueprint, render_template, abort, current_app, url_for, jsonify
from .database import get_project, get_all_projects

API = Blueprint("api", __name__, url_prefix="/api", template_folder="./api_templates", static_folder="./api_static")


@API.route("/")
def api():
    """ Lists all the available api functions. """
    endpoints = []
    for r in current_app.url_map.iter_rules():
        if r.endpoint.startswith("api.") and not r.endpoint.endswith(".static"):
            doc = current_app.view_functions[r.endpoint].__doc__
            endpoints.append({
                "end": r.endpoint.replace(".", "/").replace("api/api", "api/"),
                "doc": doc if doc is not None else ""
            })
    return render_template("api.html", endpoints=endpoints)


@API.route("/projects")
def projects():
    """ Returns a list containing all the available projects with their respective metadata. """
    return jsonify(get_all_projects())


@API.route("/project/<uuid>")
def project(uuid):
    queried_project = get_project(uuid)
    if queried_project is not None:
        path_to_load = os.path.join(queried_project.path, "tree.json")
        if os.path.exists(path_to_load):
            file = open(path_to_load)
            return jsonify(json.load(file))
    abort(404)






