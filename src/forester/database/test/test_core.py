#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

import os
import shutil
import unittest

from src.forester.database import *


class DatabaseTest(unittest.TestCase):

    def __init__(self, methodName):
        super().__init__(methodName)

        # remove old directory
        if os.path.isdir("instance"):
            shutil.rmtree("./instance", ignore_errors=True)

        # copy the test directory
        shutil.copytree("./instance_setup", "./instance")


class MethodTest(DatabaseTest):

    def __init__(self, methodName):
        super().__init__(methodName)

        self.database = Database("./instance")
        self.database.load_examples(directory="./instance/examples")

    def test_examples_loaded(self):
        self.assertEqual(4, self.database.size())
        self.assertTrue(os.path.isfile("./instance/data/R Iris/tree.json"))
        self.assertTrue(os.path.isfile("./instance/data/R Diabetes/tree.json"))
        self.assertTrue(os.path.isfile("./instance/data/Matlab Fanny/tree.json"))
        self.assertTrue(os.path.isfile("./instance/data/Matlab Iris/tree.json"))
        self.assertEqual("./instance/data/R Iris/tree.json", os.path.join("./instance/data/R Iris/", self.database.get_project("R Iris").files['tree']))

    def test_size(self):
        self.assertTrue(4, self.database.size())

    def test_get(self):
        project = self.database.get_project("R Iris")
        self.assertEqual(project.name, "R Iris")
        self.assertEqual(self.database.get_project(project.uuid).name, "R Iris")
        self.assertRaises(ProjectNotFoundException, self.database.get_project, "bla")

    def test_has(self):
        project = self.database.get_project("R Iris")
        self.assertTrue(self.database.has_project(project.name))
        self.assertTrue(self.database.has_project(project.uuid))

    def test_get_all(self):
        self.assertEqual(4, len(self.database.get_projects()))

    def test_purge(self):
        self.database.purge()
        self.assertEqual(0, self.database.size())

    def test_remove(self):
        self.database.remove_project("R Iris")
        self.assertEqual(3, self.database.size())
        self.assertRaises(ProjectNotFoundException, self.database.get_project, "R Iris")

    def test_add_double(self):
        self.assertRaises(ProjectAlreadyExistsException, self.database.create_project_from_files, "R Iris", "./instance/examples/R Iris/tree.json")

    def test_parse(self):
        self.database.purge()
        project = self.database.create_project_from_vendor("R Iris", "./instance/examples/R Iris/input.RData", type="RData", vendor="R", origin="rpart")
        self.assertEqual(1, self.database.size())

    def test_add_file(self):
        """
            Checks whether a file is properly added to a project. This includes copying into
            the project directory and recording in the file dictionary.
        """

        # set up the target of the file copy
        target_path = os.path.join(self.database.data_path, "R Iris/test.json")

        # add file to project
        project = self.database.get_project("R Iris")
        self.database.add_file_to_project("./instance/test.json", project, name="add_file_test")

        # test that the file is included in the file dict and exists on disk
        self.assertDictEqual(project.files, {"tree": "tree.json", "add_file_test": "test.json"})
        self.assertTrue(os.path.isfile(target_path))

    def test_add_file_exists(self):
        """
            Checks whether a file is properly added to a project. This includes copying into
            the project directory and recording in the file dictionary.
        """

        # set up the target of the file copy
        target_path = os.path.join(self.database.data_path, "R Iris/test.json")

        # add file to project
        project = self.database.get_project("R Iris")
        self.database.add_file_to_project("./instance/test.json", project, name="add_file_test")

        # test file exists
        self.assertRaises(DatabaseException, self.database.add_file_to_project,
                          "./instance/test.json", project, name="add_file_test_2", overwrite=False)

        # test name used
        self.assertRaises(DatabaseException, self.database.add_file_to_project,
                          "./instance/test2.json", project, name="add_file_test", overwrite=False)

        # test file with another name
        self.assertRaises(DatabaseException, self.database.add_file_to_project,
                          "./instance/test.json", project, name="add_file_test_2", overwrite=True)


if __name__ == '__main__':
    unittest.main()
