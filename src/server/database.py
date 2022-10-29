#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
import dataclasses
import os
import uuid
from tinydb import TinyDB, Query
from datetime import datetime
from dataclasses import dataclass, field
from dataclasses_json import dataclass_json


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
    size:     int  = field(repr=False,default=None)

    def __post_init__(self):
        if hasattr(self, "modified"):
            self.modified = self.created

        if not os.path.exists(self.path):
            raise FileNotFoundError(f"The specified file {self.path} does not exist.")

    @staticmethod
    def from_folder(path):
        name = path.split("/")[-1]
        return Project(name, path, datetime.fromtimestamp(os.path.getctime(path)).isoformat(),
                       modified=datetime.fromtimestamp(os.path.getmtime(path)).isoformat(),
                       author="Forester Team", example=True, size=os.path.getsize(os.path.join(path, "tree.json")))


def load_examples(examples_folder="../../examples"):
    new_examples = 0;
    for root, dirs, files in os.walk(examples_folder):
        for file in files:
            if file.lower().startswith('tree') and file.lower().endswith(".json"):
                PROJECT = Query()
                if len(projects.search(PROJECT.path == root)) == 0:
                    print(f"Loading example {root}")
                    projects.insert(Project.from_folder(root).to_dict())
                    new_examples += 1

    if new_examples > 0:
        print(f"{new_examples} new examples loaded")
    else:
        print("No new examples found")


def get_project_by_id(uuid: str) -> Project:
    PROJECT = Query()
    result = projects.search(PROJECT.uuid == uuid)
    if len(result) != 1:
        return None
    else:
        return result[0]


database = TinyDB("./instance/database.json")
projects = database.table("projects")
if len(projects) == 0:
    print("Database created")
else:
    print("Database loaded")
    print(f"Database contains {len(projects)} entries")
load_examples()

if __name__ == "__main__":
    load_examples()
