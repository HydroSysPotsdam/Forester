from flask import Flask
from flask_restful import reqparse, abort, Api, Resource
from flask import render_template, jsonify

import model.TreeBuilder as TB
from watergap import WaterGAP as wg
from mohanetal import Mohanetal as mh

app = Flask(__name__, static_folder='view')
api = Api(app)

parser = reqparse.RequestParser()
parser.add_argument('tree')

# Read in current available project -> later through config file
t_watergap = TB.TreeBuilder(wg("../../CART-ISIMIP/data/"), 5, 2)
t_mohan = TB.TreeBuilder(mh("../../CART-ISIMIP/data/Mohan-data/data.csv"), 5, 2)


projects = {
    'watergap': t_watergap,
    'mohan': t_mohan
}

# TODO fit on-the-fly or cache fits
print("Loading trees ...")
for p in projects.values():
    p.fit()
print("Finished fitting")


def abort_tree_doesnt_exist(tree_id):
    if tree_id not in projects:
        abort(404, message="Tree {} does not exit".format(tree_id))


@app.route("/")
def index():
    return render_template("index.html")


# Representation of a tree that can be requested to be displayed, created or deleted
class Tree(Resource):

    def get(self, tree_id):
        abort_tree_doesnt_exist(tree_id)
        print("GET! {id}".format(id=tree_id))
        return jsonify(projects[tree_id].to_json())

    def delete(self, tree_id):
        print("Delete! {id}".format(id=tree_id))

    def put(self, tree_id):
        abort_tree_doesnt_exist(tree_id)
        # need to think when it is best to actually built the tree
        # TODO implement serialization of already fitted tree!!
        print("Put! {id}".format(id=tree_id))


api.add_resource(Tree, '/trees/<tree_id>')


if __name__ == '__main__':
    app.run(debug=True)
