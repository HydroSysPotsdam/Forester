#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Flask
from forester import server
import webbrowser
import os

if __name__ == "__main__":
    app = server.create_app()

    # The reloader has not yet run - open the browser
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        webbrowser.open_new('http://127.0.0.1:8000/')

    Flask.run(app, port=8000, debug=True)
