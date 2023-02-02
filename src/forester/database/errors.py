#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

class DatabaseException(Exception):
    pass


class ProjectNotFoundException(DatabaseException):
    pass


class ProjectAlreadyExistsException(DatabaseException):
    pass


class DatabaseError(RuntimeError):
    pass


class DatabaseCorruptionError(DatabaseError):
    pass