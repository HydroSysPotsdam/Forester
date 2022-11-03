#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Flask, redirect, url_for, render_template
from . import database
from .api import API

# class InterceptHandler(logging.Handler):
#     def emit(self, record):
        #logger_opt = logger.opt(depth=6, exception=record.exc_info)
        #logger.log(record.levelno, record.getMessage())


def create_app():
    app = Flask(__name__,
                instance_relative_config=True,
                template_folder="../view/templates",
                static_folder="../view/static")

    # register api routes
    app.register_blueprint(API)

    # open the database
    database.open_database(app, reload=True)

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

    return app;