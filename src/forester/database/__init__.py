#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os.path
import shutil
import uuid

from loguru import logger
from tinydb import TinyDB, where

from .project import Project
from .errors import *


class Database:

	from .validate import _cross_validate, _validate_directory
	from .examples import load_examples
	from .projects import create_project_from_files, create_project_from_vendor

	root_path = None
	base_path = None
	temp_path = None
	data_path = None

	database = None

	def __init__(self, directory, table_name="projects", delete_unlinked=True, clean=False) -> None:

		# create the different paths
		self.root_path = directory
		self.base_path = os.path.join(directory, "database.json")
		self.temp_path = os.path.join(directory, "temp")
		self.data_path = os.path.join(directory, "data")

		for path in [self.base_path, self.temp_path, self.data_path]:
			if os.path.exists(path) and clean:
				logger.warning(f"Clean startup: Deleted {path}")
				shutil.rmtree(path, ignore_errors=True)

		# add the directories if they not already exists
		for path in [self.root_path, self.temp_path, self.data_path]:
			if not os.path.isdir(path):
				logger.info(f"Created {path}")
				os.mkdir(path)

		# create the TinyDB database
		database = TinyDB(self.base_path)
		self.database = database.table(table_name)

		# validate the directory
		self._validate_directory(delete=delete_unlinked)

	def purge(self):
		"""
			Purges the database.

			This deletes all entries from the database, as well as all folders in the
			project directory.
		"""

		# number of entries
		n = len(self.database.all())

		# clear the database
		self.database.truncate()

		# remove all the folders in the project directory.
		try:
			shutil.rmtree(self.data_path)
			os.mkdir(self.data_path)
		except FileNotFoundError:
			pass

		# inform the user
		logger.warning(f"Purged {n} entries from the database.")

	def size(self):
		return len(self.database.all())

	def has_project(self, name_or_uuid, uuid_version=4):
		"""
			Checks, whether a project exists.
			For this, either the `name` or `uuid` values are checked.
			For a given name, projects may not be unique.

			Parameters
			----------
			name_or_uuid: str or uuid
				Either the project name or its UUID as a string. UUIDs will automatically be detected.
			uuid_version: int
				Version of the UUID (default 4)

			Returns
			-------
			bool: Whether at least one entry was found with this name or UUID.
		"""
		try:
			# check if name_or_uuid is uuid
			uuid.UUID(name_or_uuid, version=uuid_version)
			return self.database.contains(where('uuid') == name_or_uuid)
		except ValueError:
			return self.database.contains(where('name') == name_or_uuid)

	def get_project(self, name_or_uuid, uuid_version=4) -> Project:
		"""
		Returns a project based on its name or UUID.

		Parameters
		----------
		name_or_uuid: str or uuid
			Either the project name or its UUID as a string. UUIDs will automatically be detected.
		uuid_version: int
			Version of the UUID (default 4)

		Returns
		-------
		:class:`database.Project`:
			Returns the first match.
			If no project is found, `None` is returned.
			If multiple projects with the same name are found, the first one is returned.

		See Also
		--------
		:meth:`database.has_project`

		"""
		try:
			# check if name_or_uuid is uuid
			uuid.UUID(name_or_uuid, version=uuid_version)
			query_result = self.database.get(where('uuid') == name_or_uuid)
		except ValueError:
			query_result = self.database.get(where('name') == name_or_uuid)

		# raise a database exception if there is no entry for this query
		if query_result is not None:
			project = Project.from_dict(query_result)
			# this line is needed, as the Project.from_dict function is not recursive
			# and converts the files dict into a set
			if "files" in query_result.keys():
				project.files = query_result['files']
				return project
			else:
				raise DatabaseCorruptionError(f"Project {project} has no file directory.")
		else:
			raise ProjectNotFoundException(f"No project for {name_or_uuid}")

	def get_projects(self):
		"""
		Returns a list of all projects in the database.

		The list may be empty if the database does not hold any projects.

		Returns
		-------
		projects: list
			List of all projects in the database.

		"""
		return [Project.from_dict(project) for project in self.database.all()]

	def remove_project(self, name_or_uuid, uuid_version=4):
		"""
		Removes on project from the database based on its name or UUID.

		Parameters
		----------
		name_or_uuid: str or uuid
			Either the project name or its UUID as a string. UUIDs will automatically be detected.
		uuid_version: int
			Version of the UUID (default 4)

		See Also
		--------
		:meth:`database.has_project`
		"""
		# get the project
		# this raises a DatabaseException when the project is not available
		project = self.get_project(name_or_uuid)

		# remove an entry
		self.database.remove(where('uuid') == project.uuid)

		# remove the folder from the underlying file structure, too
		shutil.rmtree(os.path.join(self.data_path, project.name), ignore_errors=True)

		logger.warning(f"Deleted project {project}")

	def _add_project(self, project: Project):
		"""
		Includes a project in the JSON database.

		Before adding the project, it is checked whether the project folder and
		all linked files exist.

		Parameters
		----------
		project: Project
			The project to add.

		Returns
		-------
			The added project.

		"""
		# check if project already exists
		if self.has_project(project.uuid) or self.has_project(project.name):
			raise ProjectAlreadyExistsException(
				f"A project with id {project.uuid} or name {project.name} already exists.")

		# check if project directory exists
		if not os.path.isdir(project.path):
			raise DatabaseCorruptionError(f"Project {project} does not have a directory yet.")

		# check if all files exist
		for filename in project.files.values():
			path = os.path.join(project.path, filename)
			if not os.path.isfile(path):
				raise DatabaseCorruptionError(f"File {filename} missing in project directory.")

		# add the project to the database
		self.database.insert(project.to_dict())

		logger.info(f"{project} created")

		# return the project wrapper
		return project