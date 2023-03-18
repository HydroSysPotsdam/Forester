#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Flask, redirect, url_for, render_template
from .api import API, load_database


def create_app():
    app = Flask(__name__,
                instance_relative_config=True,
                template_folder="../view/templates",
                static_folder="../view/static")

    # register api routes
    with app.app_context():
        load_database()
        app.register_blueprint(API)

    @app.route("/")
    def welcome():
        return redirect(url_for('projects'))

    @app.route("/projects")
    def projects():
        return render_template("projects.html")

    @app.route("/editor/<uuid>")
    def editor(uuid):
        print(f"Opening editor for project {uuid}")
        return render_template("editor.html", uuid=uuid)

    return app
