/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS project;

CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  example BIT DEFAULT 0,
  author INTEGER NOT NULL,
  FOREIGN KEY (author) REFERENCES user (id)
);