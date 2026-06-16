CREATE TABLE IF NOT EXISTS submission_grades (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  graded_by TEXT NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  graded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (graded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_submission_grades_submission ON submission_grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_grades_grader ON submission_grades(graded_by, graded_at);
