#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import shutil
import json

from .project import Project
from .errors import *
from src.forester import parser


def create_project_from_files(self, name, paths, **kwargs):
	"""
	Creates a project from a file path.

	Each project has one directory in the database. If the directory does
	not exist, it is generated. An instance of Project is created based
	on the given parameters. The file is copied to the directory and linked
	with the project instance.

	Multiple files are not yet supported.

	Parameters
	----------
	name: str
		The name of the project.
	paths: path
		The path of the file from which the project should be generated.
	kwargs: dict
		Additional information for the project. See Project.

	Returns
	-------
	The added project.

	"""
	# the path where the database stores the project
	project_path = os.path.join(self.data_path, name)

	# create the project directory if not existing
	if not os.path.isdir(project_path):
		os.mkdir(project_path)

	# delete the keys from kwargs just to make sure
	kwargs.pop('name', None)
	kwargs.pop('path', None)

	# create the project
	project = Project(name, project_path, **kwargs)

	# copy the file into the project directory
	# add the file to the projects filename directory
	if type(paths) is str:
		# use the only path
		path = paths

		# check if path exists and is a file
		if not os.path.isfile(path):
			raise DatabaseException(f"The given path {path} is not a file!")

		# copy the given file into the project directory
		shutil.copy(path, project_path)

		# new path
		new_path = os.path.join(project_path, os.path.basename(path))

		# check if file was copied correctly
		if not os.path.isfile(new_path):
			raise DatabaseException(f"Copying the file {path} failed!")

		# add the only file as the tree
		project.files = {'tree': os.path.basename(path)}

	if type(paths) is dict:
		raise NotImplementedError(f"Creating a project from multiple files is not yet supported!")

	# add the project to the database
	self._add_project(project)

	return project


def create_project_from_vendor(self, name, path, **kwargs):
	"""
	Creates a new project by parsing a file.

	Parameters
	----------
	name: str
		The name of the project.
	path: path
		The path to the file that should be parsed.
	kwargs: dict
		Dictionary with values that are passed on to the parsing function.

	Returns
	-------
		The added project.
	"""

	# path where the tree will be saved
	tree_path = os.path.join(self.temp_path, "tree.json")

	try:
		# parse the file
		# TODO: should happen in another thread
		tree = parser.parse(os.path.abspath(path), **kwargs)

		# save the parsed file
		file = open(tree_path, "w")
		file.write(json.dumps(tree))
		file.close()

		# drop the name parameter from kwargs to be sure
		# that no error happens
		kwargs.pop('name', None)

		# create the project
		return self.create_project_from_files(name, tree_path)
	finally:
		os.remove(tree_path)
