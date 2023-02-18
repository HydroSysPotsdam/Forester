#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import shutil

from loguru import logger
from tinydb import where

from .errors import *
from .project import Project


def _cross_validate(database, delete=True):
	"""
		Cross validates the database file and the project directory.

		For each entry in the database, the method checks whether a project directory exists.
		For each project directory, the method checks if there is a database entry.
		With `delete`, the folders/entries are deleted.

		Parameters
		----------
		delete: bool
			Whether to deleted unlinked entries and folders.

		Raises
		------
		DatabaseError
			Without `delete` unlinked entries and folders raise exceptions.
	"""

	# check if all database entries have a folder
	for project in database.database.all():

		# check if the important fields are in the database
		if not all(key in project for key in ("uuid", "name", "path")):
			raise DatabaseCorruptionError(f"Invalid entry in database: {project}")

		# create a Project instance
		project = Project.from_dict(project)

		# path to the project
		path = os.path.join(database.data_path, project.name)

		# delete the entry from the database if no folder is found
		if not os.path.isdir(path):

			if delete:
				database.database.remove(where('uuid') == project.uuid)
				logger.warning(f"Removed entry {project}")
			else:
				logger.error(f"Unlinked entry {project}")
				raise DatabaseCorruptionError(f"Database contains the unlinked entry {project}")

	# check all folders in the data directory for a database entry
	for name in os.listdir(database.data_path):
		directory = os.path.join(database.data_path, name)
		if os.path.isdir(directory) and database.database.contains(where('name') == directory):
			if delete:
				shutil.rmtree(directory)
				logger.warning(f"Removed folder ./data/{name}")
			else:
				logger.error(f"Unlinked folder ./data/{name}")
				raise DatabaseCorruptionError(f"Database has found an unlinked project {name}")


def _validate_directory(database, delete=True):
	"""
		Validates the directory.

		This includes generating the file structure and cross-validating the database file
		with the project folders.
	"""

	# temporary files folder
	if not os.path.isdir(database.temp_path):
		logger.info("Created the directory ./temp")
		os.mkdir(database.temp_path)
	else:
		logger.info("Cleared the directory ./temp")
		shutil.rmtree(database.temp_path, ignore_errors=True)
		os.mkdir(database.temp_path)

	# project files folder
	if not os.path.isdir(database.data_path):
		logger.info("Created the directory ./data")
		os.mkdir(database.data_path)

	# cross validate project files with database
	database._cross_validate(delete=delete)