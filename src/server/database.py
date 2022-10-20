#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import click
import os
import json
from datetime import datetime
from flask import Flask, current_app, g
from flask_sqlalchemy import SQLAlchemy

# integrate SQLAlchemy with Flask. This does not only link the application
# but all Flask application. TODO: Update to only link this application.
database = SQLAlchemy()

class Project(database.Model):
    __tablename__ = "projects"
    id       = database.Column(database.Integer, primary_key=True)
    name     = database.Column(database.Unicode, nullable=False, unique=True)
    created  = database.Column(database.DateTime)
    modified = database.Column(database.DateTime)
    author   = database.Column(database.Text, nullable=False, default="David Strahl")
    api_url  = database.Column(database.Text, nullable=True)
    example  = database.Column(database.Boolean, nullable=False, default="True")

    def __init__(self, name, created, modified, author, api_url, example):
        self.name     = name
        self.created  = created
        self.modified = modified
        self.author   = author
        self.api_url  = api_url
        self.example  = example

    def __repr__(self):
        return f"Project {self.name} by {self.author}"

    @property
    def serialize(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


def load_examples(examples_folder="../../examples"):
    database.session.query(Project).filter_by(example = 1).delete()

    for root, dirs, files in os.walk(examples_folder):
        for file in files:
            if file.lower().startswith('tree') and file.lower().endswith(".json"):
                path = os.path.join(root, file)
                name = root.split("/")[-1]
                database.session.add(
                    Project(name     = name,
                            created  = datetime.fromtimestamp(os.path.getctime(path)),
                            modified = datetime.fromtimestamp(os.path.getmtime(path)),
                            author   = "Forester Team",
                            api_url  = "/api/examples/" + name.replace(" ", "_"),
                            example  = True
                    )
                )

    database.session.commit()
