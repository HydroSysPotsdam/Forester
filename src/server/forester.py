#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Editor: Interactive human-in-the-loop web-based visualization of machine learning trees

import click
from dataclasses import dataclass, field

@click.group(invoke_without_command=True)
@click.option("--project", type=str, help = "The project that should be loaded.")
def forester(project: str) -> None:
    """
    Editor generates beautiful interactive visualizations of decision trees.
    This command is used to start the local server and open the web-based editor.\f

    Parameters
    ----------
    project: str
             The name of the project that should be loaded.
    """

    if project is not None:
        click.echo(f"Editor will directly open project {project}")
    else:
        click.echo("Editor will display the project selection prompt")


@forester.command()
@click.option("--directory", type=click.Path(), help="The directory in which Editor saves it's files.")
def setup(directory):
    """
    Used for setting up Editor.
    With this command, you can for example set the home directory or purge the project database.\f

    Parameters
    ----------
    directory: Path
               The home directory in which the projects should be stored.
    """
    if directory is None:
        directory = "./instance"
        click.echo(f"Editor will initialize in default folder {directory}")


if __name__ == "__main__":
    forester()


@dataclass
class Project:
    name: str = field()
