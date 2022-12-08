#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import shutil
import uuid
from loguru import logger
from tinydb import TinyDB, Query
from datetime import datetime
from dataclasses import dataclass, field
from dataclasses_json import dataclass_json
from . import config, PACKAGE_PATH

global database, projects


class DatabaseError(Exception):
    pass


@dataclass_json
@dataclass
class Project:
    """
        Dataclass representing a forester project.
        A name and the path to the project directory are required, as is a creation date.
        Other parameters are optional and have default values.

        Attributes
        ----------
        name: str
            The user given name of the project, may not be unique.
        path: file path
            The path to the project directory, where the server saves all project related files.
        created: str
            Timestamp of creation in ISO format.
        modified: str
            Timestamp of last modification in ISO format (default same as `created`)
        author: str
            Author of the project (default local)
            .. note:: With Forester v.0 the server is only local, and thus it is not necessary to change this attribute.
        example: bool
            Whether this project is an example of the Forester Team (default `true`)
        uuid: UUID
            Unique identifier for this project. Is generated automatically.
        size: int
            File size of the project in bytes (default zero)
    """
    name:     str
    path:     str
    created:  str  = field(repr=False, default=None)
    modified: str  = field(repr=False, default=None)
    author:   str  = field(default="local")
    example:  bool = field(default=False)
    uuid:     str  = field(default_factory=lambda: str(uuid.uuid4()), repr=False)
    size:     int  = field(repr=False, default=0)

    def __post_init__(self):
        """
            When no timestamp of last modification is given, the creation timestamp will automatically be used.
        """
        if hasattr(self, "modified"):
            self.created = datetime.now().isoformat()

        if hasattr(self, "modified"):
            self.modified = self.created


def purge():
    """
        Purges the database.
        This does not delete all entries but remove the entire database file, as well as all project
        related directories.
        The file structure is then regenerated on the next startup.
    """
    logger.warning("Database purged")
    try:
        shutil.rmtree(config['projects_directory_path'])
        os.remove(os.path.join(PACKAGE_PATH, "instance", "database.json"))
    except FileNotFoundError:
        logger.warning("There are no database files to delete")


def has_project(name_or_uuid, uuid_version=4):
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
    PROJECT = Query()
    try:
        # check if name_or_uuid is uuid
        uuid.UUID(name_or_uuid, version=uuid_version)
        return len(projects.search(PROJECT.uuid == name_or_uuid)) != 0
    except ValueError:
        return len(projects.search(PROJECT.name == name_or_uuid)) != 0


def get_project(name_or_uuid, uuid_version=4) -> Project:
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
    PROJECT = Query()
    try:
        # check if name_or_uuid is uuid
        uuid.UUID(name_or_uuid, version=uuid_version)
        query_result = projects.search(PROJECT.uuid == name_or_uuid)
    except ValueError:
        query_result = projects.search(PROJECT.name == name_or_uuid)

    # return the first entry in the list of projects or None
    if len(query_result) >= 1:
        return Project.from_dict(query_result[0])
    else:
        return None


def get_all_projects():
    """
    Returns a list of all projects in the database.

    Returns
    -------
    list:
        List of type :class:`database.Project` with all projects in the database.

    See Also
    --------
    :meth:`database.get_project`
    """
    return [Project.from_dict(dict) for dict in projects.all()]


def remove_project(name_or_uuid, uuid_version=4):
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
    project = get_project(name_or_uuid)

    # remove an entry
    PROJECT = Query()
    projects.remove(PROJECT.uuid == project.uuid)

    # remove the folder from the underlying file structure, too
    project_path = os.path.join(config['projects_directory_path'], project.name)
    shutil.rmtree(project_path)

    logger.info(f"Project {project.name} deleted")


def create_project(name: str, *copy_files, **kwargs) -> Project:
    """
    Creates a new project and adds it to the database.
    All specified files are copied into a folder with the given name at the project directories location.

    .. note:: When a project folder with this name already exists, `None` is returned and no project is created.

    Parameters
    ----------
    name: str
        The name of the project (folder).
    copy_files: list
        A list of paths that should be copied into the project directory.
    kwargs: dict
        List of arguments that should be passed to the :class:`database.Project` constructor.
        It should not contain the name, as the argument of the function is used.

    Returns
    -------
    :class:`database.Project`
        Project that was added or None if the function aborted.

    """
    project_path = os.path.join(config['projects_directory_path'], name)

    # check if a project with the same name already exists
    if os.path.exists(project_path) and os.path.isdir(project_path):
        raise DatabaseError(f"A project with the name {name} already exists.")

    # create directory
    os.mkdir(project_path)

    # copy all given files if they exist
    for copy_file in copy_files:
        if os.path.exists(copy_file):
            shutil.copy(copy_file, project_path, follow_symlinks=False)

    # create a new project
    project = Project(name, project_path, **kwargs)

    # add the project to the database
    projects.insert(project.to_dict())
    logger.info(f"Project {project.name} created")

    # return the project wrapper
    return project


def load_examples(examples_folder="../../examples", reload=False):
    """
    Checks all files in the specified folder and creates new projects if they not already exist.
    Creation and modification timestamp are taken from the computers file system.
    The author is automatically set to *Forester Team*.

    .. note:: For now, all files should be named *tree.json* for automatic detection.

    Parameters
    ----------
    examples_folder: str
        Path to the folder that should be checked for new examples.
    reload: bool
        Whether already existing projects should be overwritten (default `False`)

    Returns
    -------
    int:
    The number of new examples added.

    """
    new_examples = 0;
    for root, dirs, files in os.walk(os.path.abspath(os.path.join(PACKAGE_PATH, examples_folder))):
        for file in files:
            if file.lower().startswith('tree') and file.lower().endswith(".json"):
                name = root.split("/")[-1]
                path = os.path.join(root, file)

                # remove project is existing
                if has_project(name) and reload:
                    remove_project(name)

                # load new project
                if not has_project(name):
                    create_project(name, path,
                                   size=os.path.getsize(path),
                                   created=datetime.fromtimestamp(os.path.getctime(path)).isoformat(),
                                   modified=datetime.fromtimestamp(os.path.getmtime(path)).isoformat(),
                                   example=True,
                                   author="Forester Team")
                    new_examples += 1

    logger.info(f"{new_examples if new_examples > 0 else 'no'} new examples added")

    return new_examples


def open_database(app=None, **kwargs):
    """
    Opens the database.

    The database consists of one index *json* file and a directory in which each project has its own folder.
    The location of the directory is saved in Foresters configuration and may be changed by the user.
    If the database index file does not exist a new one is created and the database is regarded as empty.
    If the database file directory does not exist, it is equally generated automatically.

    After opening the database, examples will be automatically loaded.

    Parameters
    ----------
    app: FlaskApp
        The current flask app to get the app context.
    kwargs: dict
        Parameters passed to the :meth:`database.load_examples` function.


    See Also
    --------
    :func:`database.load_examples` for how the database loads examples.
    """
    # get projects directory path from config
    projects_directory_path = config["projects_directory_path"]
    logger.info(f"Database is located in {projects_directory_path}")

    # check if the projects directory exists and create otherwise
    if not os.path.isdir(projects_directory_path):
        os.mkdir(projects_directory_path)
        logger.info("Project database folder created")

    # create database in the directory
    global database, projects
    database = TinyDB(os.path.join(PACKAGE_PATH, "instance", "database.json"))
    projects = database.table("projects")
    if len(projects) == 0:
        logger.warning("Database contains no entries")
    else:
        logger.info(f"Database containing {len(projects)} entries loaded")

    # check if there are new examples in the example folder and create a project directory for them
    load_examples(**kwargs)


def parse_project(file):
    return None;