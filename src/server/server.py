#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees


from flask import Flask, render_template, abort, redirect, url_for, jsonify
from api import API


def create_app(config=None):
    app = Flask(__name__, instance_relative_config=True,
                template_folder="../view/templates",  # templates are found in folder view
                static_folder="../view/static")  # static files are found in folder view

    app.register_blueprint(API)

    @app.route("/")
    def welcome():
        return "Hello World!"

    return app;


if __name__ == '__main__':
    app = create_app()
    Flask.run(app, port=8000, debug=True)
