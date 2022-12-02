#  CC-0 2022.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
import os
import shutil
import unittest
from distutils.dir_util import copy_tree

from src.forester.database2 import DatabaseError, DatabaseException, Project, Database


class DatabaseTest(unittest.TestCase):

    def __init__(self, methodName):
        super().__init__(methodName)

        # remove old directory
        if os.path.isdir("./instance"):
            shutil.rmtree("./instance", ignore_errors=True)

        # copy the test directory
        shutil.copytree("./instance_setup", "./instance")


class ConstructorTest(DatabaseTest):

    # def test_wrong(self):
    #     self.assertRaises(DatabaseError, lambda: Database("./instance", delete_unlinked=False))

    def test_correct(self):
        database = Database("./instance")
        self.assertEqual(database.size(), 2)


class MethodTest(DatabaseTest):

    def __init__(self, methodName):
        super().__init__(methodName)

        self.database = Database("./instance")

    def test_size(self):
        self.assertTrue(self.database.size(), 2)

    def test_has_by_name(self):
        self.assertTrue(self.database.has_project("R Iris"))

    def test_has_by_uuid(self):
        self.assertTrue(self.database.has_project("272bc7a4-ef89-43cc-a1e7-0a139fed456d"))

    def test_get_by_name(self):
        self.assertTrue(self.database.get_project("R Iris").name, "R Iris")

    def test_get_by_uuid(self):
        self.assertTrue(self.database.get_project("272bc7a4-ef89-43cc-a1e7-0a139fed456d").name, "R Iris")

    def test_get_unavailable(self):
        self.assertRaises(DatabaseException, lambda: self.database.get_project("this is wrong"))

    def test_get_all(self):
        self.assertEqual(len(self.database.get_projects()), 2)

    def test_purge(self):
        self.database.purge()
        self.assertTrue(self.database.size() == 0)

    def test_remove(self):
        self.database.remove_project("R Iris")
        self.assertTrue(self.database.size() == 1)

    def test_remove_unavailable(self):
        self.assertRaises(DatabaseException, lambda: self.database.remove_project("this is wrong"))

    def test_load_examples(self):
        self.database.purge()
        new_examples = self.database.load_examples("./instance/examples")
        self.assertEqual(4, new_examples)

    def test_add_double(self):
        project = Project("R Iris", "./instance/data/Test")
        self.assertRaises(DatabaseException, self.database.create_project, project)

    def test_add(self):
        self.database.purge()
        project = Project("R Iris", "./instance/data/Test")
        self.database.create_project(project)
        self.assertEqual(1, self.database.size())


if __name__ == '__main__':
    unittest.main()
