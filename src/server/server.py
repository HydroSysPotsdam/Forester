#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees


import os
from flask import Flask, render_template, abort, redirect, url_for, jsonify
from datetime import datetime
from database import database, load_examples, Project
from api import API


def create_app(config=None):
    app = Flask(__name__,
                instance_relative_config=True,
                template_folder="../view/templates",  # templates are found in folder view
                static_folder="../view/static")  # static files are found in folder view

    app.register_blueprint(API)

    # adding configuration for using a sqlite database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///forester.sqlite'

    # initialize database
    with app.app_context():
        database.init_app(app)
        database.create_all()
        load_examples()

    @app.route("/")
    def welcome():
        return redirect(url_for("projects"))

    @app.route("/<example>")
    def editor(example):
        return render_template("Editor.html", project_data_url=f"/api/examples/{example}")

    @app.route("/projects")
    def projects():
        return render_template("Projects.html")

    @app.route("/api/projects")
    def get_projects():
        return [project.serialize for project in database.session.query(Project).all()]

    @app.route("/api/examples/<example>")
    def get_example(example):
        examples_folder = "../../examples"
        example_path = os.path.join(examples_folder, example.replace("_", " "), "tree.json")

        if os.path.exists(example_path):
            return open(example_path)
        else:
            abort(404)

    return app


if __name__ == '__main__':
    app = create_app()
    Flask.run(app, port=8000, debug=True)
