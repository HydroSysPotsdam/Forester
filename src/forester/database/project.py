#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import shutil
import uuid

from dataclasses import dataclass, field
from dataclasses_json import dataclass_json
from datetime import datetime
from loguru import logger

from .errors import *

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
        files: file path
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
    name: str
    path: str
    created: str = field(repr=False, default=None)
    modified: str = field(repr=False, default=None)
    author: str = field(default="You")
    example: bool = field(default=False)
    uuid: str = field(default_factory=lambda: str(uuid.uuid4()), repr=False)
    size: int = field(repr=False, default=0)
    files: dict = field(repr=False, default_factory=lambda: {})

    def __post_init__(self):
        """
            When no timestamp of last modification is given, the creation timestamp will automatically be used.
        """
        if hasattr(self, "modified"):
            self.created = datetime.now().isoformat()

        if hasattr(self, "modified"):
            self.modified = self.created

        # use tree as a default name for the tree path
        self.files = {'tree': os.path.join(self.path, "tree.json")}

    def add_file(self, path, name="unnamed", overwrite=True):
        """

        Adds a file to the project directory and records it in the list
        of project files.

        Raises an exception when (1) the file already exists and should
        not overwrite (2) the name is already used and should not overwrite
        and (3) when two different names are used for the same file.

        Parameters
        ----------
        path: str
            The source path from which the file should be copied.
        name: str
            The name under which the file should be registered.
        overwrite:
            Whether files and names should be overwritten if they
            already exist.
        """

        # where to save the new file (in the project directory)
        new_path = os.path.join(self.path, os.path.basename(path))

        # whether the file already exists in the project directory
        exists = os.path.isfile(new_path)

        # whether a file is already registered with this name
        has_name = name in self.files

        # when the file already exists
        if exists and not overwrite:
            raise DatabaseException(f"{new_path} already exists and should not be overwritten")

        # when the name is already used
        if has_name and not overwrite:
            raise DatabaseException(f"A file with name {name} already exists")

        # when a similar file is registered under another name
        if exists and name != [key for key, value in self.files.items() if value == os.path.basename(path)][0]:
            raise DatabaseException(f"{new_path} already exists with other name")

        # remove the file under the name
        if has_name:
            os.remove(os.path.join(self.path, self.files[name]))
            del self.files[name]

        # copy file into project directory
        shutil.copy(path, new_path)

        # add file to project's file list
        self.files[name] = os.path.basename(path)
