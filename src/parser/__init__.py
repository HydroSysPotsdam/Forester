#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import traceback
import dataclasses
from loguru import logger

from .errors import UnknownFormatException

# supported formats for parsing a file
FORMATS = {}
# errors for the given formats
ERRORS = {}

def has(format):
	return format.lower() in FORMATS.keys()

def register(format, parser):
	FORMATS[format] = parser

def unregister(format):
	del FORMATS[format]

def error_message(format):
	if format.lower() in ERRORS.keys():
		return ERRORS[format]
	else:
		return None

# register the parser for matlab
try:
	from .Matlab import _parse_fitctree
	register('json.matlab.fitctree', _parse_fitctree)
except Exception as e:
	error = f"Unable to load Matlab parsing module due to error: {e}"
	logger.error(error)
	logger.error("Module will be disabled.")
	logger.error(traceback.format_exc())
	ERRORS['json.matlab.fitctree'] = error


# register the parser for R
try:
	from .R import _parse_rpart_class
	raise Exception("This is a test!")
	register('rdata.r.rpart', _parse_rpart_class)
except Exception as e:
	error = f"Unable to load R parsing module due to error: {e}"
	logger.error(error)
	logger.error("Module will be disabled.")
	logger.error(traceback.format_exc())
	ERRORS['rdata.r.rpart'] = error

def parse(path, **kwargs):
    """
    Converts some output formats from Matlab and R into the Forester generalized format.

    Output from Matlab can be parsed by first running the function ``jsonencode`` within
    Matlab and loading the resulting .json string (file).

    Output from R can be loaded by loading the .RData file that can be exported from R studio.

    Parameters
    ----------
    path: str
          The path to the output file to be loaded. May be absolute or relative.
    kwargs: dict
            Dictionary containing some additional information for the parser. See Notes.

    Returns
    -------
    str
        The generalized Forester tree structure as a .json string

    Examples
    --------

    .. code-block:: python
        :name: Iris dataset from R's ``rpart``

            r = parse("../../examples/R/iris.RData")
            file = open("../../examples/R/iris.json", "w")
            file.write(json.dumps(r))
            file.close()

    .. code-block:: python
        :name: Diabetes dataset from R's ``rpart``

            r = parse("../../examples/R/diabetes.RData")
            file = open("../../example/R/diabetes.json", "w")
            file.write(json.dumps(r))
            file.close()

    .. code-block:: python
        :name: Iris dataset from Matlab's ``fitctree``
        :emphasize-lines: 1

            mat = parse("../view/static/example/Matlab/output.json", origin="MAT.fitctree")
            file = open("../view/static/example/Matlab/iris.json", "w")
            file.write(json.dumps(mat))
            file.close()

    Because the parser can not read .mat files directly and the result from Matlab is given as .json,
    the user may need to set the origin algorithm using the ``origin`` field.

    Notes
    -----
    The following values can be passed to the ``**kwargs`` field.

    * **origin** - Algorithm from which the output originated, at the moment only necessary for ``"Matlab.fitctree"``
    * **name** - Name of the R object if not at the first splot in the environment.

    """
    # change to absolute path if necessary
    path = os.path.abspath(path)

    logger.info("Loading CART structure from file " + path)

    # check if there is a file type in the arguments
    # if not extract from path
    if "type" not in kwargs:
        kwargs['type'] = str(path.split(".").pop())

    # use Forester as default vendor
    if "vendor" not in kwargs:
        kwargs['vendor'] = "Forester"

    # use Forester export as default origin
    if "origin" not in kwargs:
        kwargs['origin'] = "export"

    # combine into format key
    format = (kwargs['type'] + "." + kwargs['vendor'] + "." + kwargs['origin']).lower()

    if has(format):
        return FORMATS[format](path, **kwargs)
    else:
        raise UnknownFormatException(f"No module loaded that can parse format {format}")