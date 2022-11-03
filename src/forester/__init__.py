#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import json
import os.path
import sys
from loguru import logger

PACKAGE_PATH = os.path.dirname(__file__)

# load the config file
with open(os.path.join(PACKAGE_PATH, "config.json")) as config_json_file:
    config = json.load(config_json_file)

# replace relative path with package directory
config["projects_directory_path"] = config["projects_directory_path"].replace(".", PACKAGE_PATH)

logger_format = "<green>{time:HH:mm:ss}</green> | " \
                "<level>{level:<8}</level> | " \
                "<cyan>{function:^15}</cyan>:<cyan>{line:>3}</cyan> | " \
                "<level>{message}</level>"
logger.remove()
logger.add(sys.stdout, format=logger_format)