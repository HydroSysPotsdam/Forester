#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import json
import shutil
import traceback
import uuid

from . import database, PACKAGE_PATH, parser
from .database import *
from loguru import logger
from flask import Blueprint, render_template, abort, current_app, url_for, jsonify, request, Response, make_response

API = Blueprint("api", __name__, url_prefix="/api", template_folder="./api_templates", static_folder="./api_static")

# start the database
database = Database(os.path.join(PACKAGE_PATH, "instance"))
database.load_examples(directory="../examples")


@API.errorhandler(DatabaseException)
def handle_database_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    response = make_response("DatabaseError", 500)
    # replace the body with JSON
    response.data = json.dumps({
        "name": type(e).__name__,
        "description": str(e),
    })
    return response


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


@API.route("/projects", methods=["GET"])
def projects():
    """ Returns a list containing all the available projects with their respective metadata. """
    return jsonify(database.get_projects())


@API.route("/project/<uuid>", methods=["GET"])
def project(uuid):
    project = database.get_project(uuid)
    if project is not None:
        path_to_load = os.path.join(project.path, project.files['tree'])
        if os.path.exists(path_to_load):
            file = open(path_to_load)
            return jsonify(json.load(file))


@API.route("/projects", methods=["POST"])
def new_project():
    name = request.form['name']
    form = json.loads(request.form['format'])
    file = request.files['file']

    raise ProjectAlreadyExistsException("Test message")

    # # temporary folder in which the project is stored
    # temp_path = os.path.join(PACKAGE_PATH, "instance/temp")
    #
    # if not os.path.isdir(temp_path):
    #     # recreate the temporary folder
    #     os.mkdir(temp_path)
    #
    # # path where the file will be saved
    # file_path = os.path.join(temp_path, file.filename)
    #
    # # remove the temporary file if it already exists
    # if os.path.exists(file_path):
    #     os.remove(file_path)
    #
    # try:
    #     # save the file
    #     # TODO: maybe it would be best to compress file
    #     # TODO: should happen in another thread
    #     file.save(file_path)
    #
    #     # parse the file
    #     # TODO: should happen in another thread
    #     tree = parser.parse(file_path, **form)
    #     print(json.dumps(tree))
    #
    #     # close the file storage
    #     file.close()
    #
    #     # save the parsed file
    #     file = open(file_path, "w")
    #     file.write(json.dumps(tree))
    #     file.close()
    #
    #     # create the project
    #     database.create_project(name, file_path)
    #
    # except (NotImplementedError, database.DatabaseError) as error:
    #     logger.error(str(error))
    #     return make_response(jsonify({"message": str(error), "code": "FAILED"}), 500)
    # finally:
    #     pass
    #     # os.remove(file_path)
    #
    # return make_response(jsonify({"message": "Done", "code": "SUCCESS"}), 201)


@API.route("/project/<uuid>", methods=["DELETE"])
def remove_project(uuid):
    raise NotImplementedError("Removing a project needs to be linked to the new database code")
    # try:
    #     project_to_delete = database.get_project(uuid)
    #     if project_to_delete is not None:
    #         database.remove_project(uuid)
    #         return Response(status=200)
    #     else:
    #         logger.warning("(not found) " + repr(request))
    #         abort(404)
    # except Exception:
    #     abort(500)


@API.route("/formats")
def formats():
    path = os.path.join(PACKAGE_PATH, "instance", "formats.json")
    file = open(path)
    return jsonify(json.load(file))