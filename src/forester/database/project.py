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