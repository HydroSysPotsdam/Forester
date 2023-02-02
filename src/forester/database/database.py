#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
import json
import os.path
import shutil
import uuid
from datetime import datetime

from loguru import logger
from tinydb import TinyDB, where

from .project import Project
from .errors import *
from src.forester import parser


class Database:
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

    def _cross_validate(self, delete=True):
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
        for project in self.database.all():

            # check if the important fields are in the database
            if not all(key in project for key in ("uuid", "name", "path")):
                raise DatabaseCorruptionError(f"Invalid entry in database: {project}")

            # create a Project instance
            project = Project.from_dict(project)

            # path to the project
            path = os.path.join(self.data_path, project.name)

            # delete the entry from the database if no folder is found
            if not os.path.isdir(path):

                if delete:
                    self.database.remove(where('uuid') == project.uuid)
                    logger.warning(f"Removed entry {project}")
                else:
                    logger.error(f"Unlinked entry {project}")
                    raise DatabaseCorruptionError(f"Database contains the unlinked entry {project}")

        # check all folders in the data directory for a database entry
        for name in os.listdir(self.data_path):
            directory = os.path.join(self.data_path, name)
            if os.path.isdir(directory) and self.database.contains(where('name') == directory):
                if delete:
                    shutil.rmtree(directory)
                    logger.warning(f"Removed folder ./data/{name}")
                else:
                    logger.error(f"Unlinked folder ./data/{name}")
                    raise DatabaseCorruptionError(f"Database has found an unlinked project {name}")

    def _validate_directory(self, delete=True):
        """
            Validates the directory.

            This includes generating the file structure and cross-validating the database file
            with the project folders.
        """

        # temporary files folder
        if not os.path.isdir(self.temp_path):
            logger.info("Created the directory ./temp")
            os.mkdir(self.temp_path)
        else:
            logger.info("Cleared the directory ./temp")
            shutil.rmtree(self.temp_path, ignore_errors=True)
            os.mkdir(self.temp_path)

        # project files folder
        if not os.path.isdir(self.data_path):
            logger.info("Created the directory ./data")
            os.mkdir(self.data_path)

        # cross validate project files with database
        self._cross_validate(delete=delete)

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
            raise ProjectAlreadyExistsException(f"A project with id {project.uuid} or name {project.name} already exists.")

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

    def load_examples(self, directory, reload=False):
        """
            Checks all files in the specified folder and creates new projects if they not already exist.
            Creation and modification timestamp are taken from the computers file system.
            The author is automatically set to *Forester Team*.

            .. note:: For now, all files should be named *tree.json* for automatic detection.

            Parameters
            ----------
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
                    if self.has_project(name) and reload:
                        self.remove_project(name)

                    # load new project
                    if not self.has_project(name):

                        self.create_project_from_files(name, path,
                                                       size=os.path.getsize(path),
                                                       created=datetime.fromtimestamp(os.path.getctime(path)).isoformat(),
                                                       modified=datetime.fromtimestamp(os.path.getmtime(path)).isoformat(),
                                                       example=True,
                                                       author="Forester Team")

                        # keep track of the number of added projects
                        new_examples += 1

        logger.info(f"{new_examples if new_examples > 0 else 'no'} new examples added")

        return new_examples