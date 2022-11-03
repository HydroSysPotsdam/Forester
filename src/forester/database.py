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


@dataclass_json
@dataclass
class Project:
    """
        A project dataclass that represents a Forester project.
    """
    name:     str
    path:     str
    created:  str  = field(repr=False)
    modified: str  = field(repr=False, default=None)
    author:   str  = field(default="local")
    example:  bool = field(default=False)
    uuid:     str  = field(default_factory=lambda: str(uuid.uuid4()), repr=False)
    size:     int  = field(repr=False, default=0)

    def __post_init__(self):
        if hasattr(self, "modified"):
            self.modified = self.created


def purge():
    try:
        shutil.rmtree(config['projects_directory_path'])
        os.remove(os.path.join(PACKAGE_PATH, "instance", "database.json"))
    except FileNotFoundError:
        logger.warning("There are no database files to delete")


def has_project(name_or_uuid, uuid_version=4):
    PROJECT = Query()
    try:
        # check if name_or_uuid is uuid
        uuid.UUID(name_or_uuid, version=uuid_version)
        return len(projects.search(PROJECT.uuid == name_or_uuid)) != 0
    except ValueError:
        return len(projects.search(PROJECT.name == name_or_uuid)) != 0


def get_project(name_or_uuid, uuid_version=4) -> Project:
    PROJECT = Query()
    try:
        # check if name_or_uuid is uuid
        uuid.UUID(name_or_uuid, version=uuid_version)
        query_result = projects.search(PROJECT.uuid == name_or_uuid)
    except ValueError:
        query_result = projects.search(PROJECT.name == name_or_uuid)

    # return the first entry in the list of projects or None
    if len(query_result) == 1:
        return Project.from_dict(query_result[0])
    else:
        return None


def get_all_projects():
    return [Project.from_dict(dict) for dict in projects.all()]


def remove_project(name_or_uuid, uuid_version=4):
    project = get_project(name_or_uuid)

    # remove an entry
    PROJECT = Query()
    projects.remove(PROJECT.uuid == project.uuid)

    # remove the folder from the underlying file structure, too
    project_path = os.path.join(config['projects_directory_path'], project.name)
    shutil.rmtree(project_path)

    logger.info(f"Project {project.name} deleted")


def create_project(name: str, *copy_files, **kwargs) -> Project:
    project_path = os.path.join(config['projects_directory_path'], name)

    # check if a project with the same name already exists
    if os.path.isdir(project_path):
        return None

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
                                   modified=datetime.fromtimestamp(os.path.getmtime(path)).isoformat())
                    logger.warning(os.path.getsize(path))
                    new_examples += 1

    logger.info(f"{new_examples if new_examples > 0 else 'no'} new examples added")


def open_database(app=None, **kwargs):
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
        logger.warning("No database was found, created a new one")
    else:
        logger.info(f"Database containing {len(projects)} entries loaded")

    # check if there are new examples in the example folder and create a project directory for them
    load_examples(**kwargs)
