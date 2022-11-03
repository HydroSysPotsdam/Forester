#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Flask
from forester import server

if __name__ == "__main__":
    app = server.create_app()
    Flask.run(app, port=8000, debug=True)
