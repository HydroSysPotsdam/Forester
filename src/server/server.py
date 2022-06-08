#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from flask import Flask
from flask import render_template
from flask_restful import Api


app = Flask(__name__, root_path="../view")
api = Api(app)


@app.route("/")
def index():
    return render_template("Test.html")


if __name__ == '__main__':
    app.run(debug=True)
