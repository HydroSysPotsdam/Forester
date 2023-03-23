#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import json
from flask import Blueprint, render_template, current_app, jsonify, request, Response, make_response, url_for
from datetime import datetime

import parser
from . import PACKAGE_PATH
from .database import *


API = Blueprint("api", __name__, url_prefix="/api", template_folder="./api_templates", static_folder="./api_static")


def load_database():
    # start the database
    global database
    database = Database(os.path.join(PACKAGE_PATH, "./instance"))

    # purge the database when the app is in debug mode
    # TODO: comment this out for roll-out
    # database.purge()

    # load new examples
    database.load_examples(directory=os.path.join(PACKAGE_PATH, "../../examples"))


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

    # retrieve the project for this uuid
    project = database.get_project(uuid)

    # prepare the data to send to the editor
    data = {
        "tree": project.open_as_json("tree"),
        "save": project.open_as_json("save")
    }

    # return json encoded data
    return data, 200


@API.route("/projects", methods=["POST"])
def new_project():
    name = request.form['name']
    form = json.loads(request.form['format'])
    file = request.files['file']

    print(form)

    # path where the file will be saved
    file_path = os.path.join(database.temp_path, file.filename)

    # path where the parsed tree will be saved
    tree_path = os.path.join(database.temp_path, "tree.json")

    try:
        # save the file
        # TODO: maybe it would be best to compress file
        # TODO: should happen in another thread
        file.save(file_path)
        file.close()

        # create the project
        database.create_project_from_vendor(name, file_path, **form)

        return make_response("Success", 200)

    except Exception as e:
        logger.error(e)
        return make_response(str(e), 500)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    return make_response("FAILED", 500)


@API.route("/project/<uuid>", methods=["DELETE"])
def remove_project(uuid):
    try:
        database.remove_project(uuid)
        return Response(status=200)
    except DatabaseException as e:
        e.with_traceback()
        return Response(status=400)


@API.route("/project/<uuid>", methods=["POST"])
def save_project(uuid):

    kind = request.form['kind']
    save = request.form['save']

    # path where the file will be saved
    file_path = os.path.join(database.temp_path, f"{kind}_{datetime.now().strftime('%Y%m%d-%H%M%S')}.json")

    try:
        # save the file
        with open(file_path, "w") as file:
            file.write(save)
            file.close()

        # store the file for the project
        database.add_file_to_project(file_path, database.get_project(uuid), name=kind)

    except DatabaseException as e:
        e.with_traceback()
        return Response(status=400)

    finally:
        # os.remove(file_path)
        pass

    return Response(status=200)


@API.route("/formats")
def formats():
    path = os.path.join(PACKAGE_PATH, "formats.json")
    file = open(path)

    fmts = json.load(file)

    for fmt in fmts:
        key = f"{fmt['type']}.{fmt['vendor']}.{fmt['origin']}".lower()
        if key != "json.forester.export" and not parser.has(key):
            logger.warning(f"No parsing module found for format {key}")
            fmt["deprecated"] = True
            fmt["note"] = f"Forester will be unable to parse them due to an internal error!" \
                if parser.error_message(key) is None else parser.error_message(key)

    return jsonify(fmts)


@API.route("/hints")
def hints():
    path  = os.path.join(PACKAGE_PATH, "hints.json")
    file  = open(path)
    return jsonify(json.load(file))


@API.route("/purge")
def purge():
    database.purge()
    examples = database.load_examples(directory="../examples")
    return f"Sucessfully purged the database and reloaded {examples} examples."