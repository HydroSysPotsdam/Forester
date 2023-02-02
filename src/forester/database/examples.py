#  CC-0 2023
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees


import os
from datetime import datetime
from loguru import logger


def load_examples(database, directory, reload=False):
	"""
		Checks all files in the specified folder and creates new projects if they not already exist.
		Creation and modification timestamp are taken from the computers file system.
		The author is automatically set to *Forester Team*.

		.. note:: For now, all files should be named *tree.json* for automatic detection.

		Parameters
		----------
		database: Database
			The database to which the examples should be added.
		directory: str
			Path to the folder that should be checked for new examples.
		reload: bool
			Whether already existing projects should be overwritten (default `False`)

		Returns
		-------
		int:
		The number of new examples added.
	"""
	# carry for the number of examples loaded
	new_examples = 0;

	for root, dirs, files in os.walk(os.path.abspath(directory)):
		for file in files:
			if file.lower().startswith('tree') and file.lower().endswith(".json"):
				name = root.split("/")[-1]
				path = os.path.join(root, file)

				# when a project with this name already exists, overwrite it if
				# the reload setting is given
				if database.has_project(name) and reload:
					database.remove_project(name)

				# load new project
				if not database.has_project(name):
					database.create_project_from_files(name, path,
					                                   size=os.path.getsize(path),
					                                   created=datetime.fromtimestamp(
						                               os.path.getctime(path)).isoformat(),
					                                   modified=datetime.fromtimestamp(
						                               os.path.getmtime(path)).isoformat(),
					                                   example=True,
					                                   author="Forester Team")

					# keep track of the number of added projects
					new_examples += 1

	logger.info(f"{new_examples if new_examples > 0 else 'no'} new examples added")

	return new_examples