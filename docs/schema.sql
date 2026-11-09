-- Esquema do banco SQLite do Apoio ao Estudante (versão 1.1)
-- Gerado automaticamente por server/store.js na primeira execução (data/apoio.db).
-- Cada coleção é uma tabela: chave (id), registro em JSON (data) e colunas geradas
-- (json_extract) indexadas para as chaves mais consultadas.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE c_assignments (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  student_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.studentId')) VIRTUAL,
  class_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.classId')) VIRTUAL
);

CREATE TABLE c_audit_log (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  at TEXT GENERATED ALWAYS AS (json_extract(data, '$.at')) VIRTUAL
);

CREATE TABLE c_bncc_goals (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  code TEXT GENERATED ALWAYS AS (json_extract(data, '$.code')) VIRTUAL,
  level TEXT GENERATED ALWAYS AS (json_extract(data, '$.level')) VIRTUAL
);

CREATE TABLE c_classes (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data))
);

CREATE TABLE c_feedbacks (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  student_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.studentId')) VIRTUAL,
  assignment_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.assignmentId')) VIRTUAL
);

CREATE TABLE c_needs (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data))
);

CREATE TABLE c_students (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  class_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.classId')) VIRTUAL,
  need_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.needId')) VIRTUAL
);

CREATE TABLE c_teachers (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data))
);

CREATE TABLE c_users (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data)),
  email TEXT GENERATED ALWAYS AS (json_extract(data, '$.email')) VIRTUAL,
  teacher_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.teacherId')) VIRTUAL
);

CREATE TABLE kv (
  map   TEXT NOT NULL,
  key   TEXT NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value)),
  PRIMARY KEY (map, key)
);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_c_assignments_class_id ON c_assignments(class_id);

CREATE INDEX idx_c_assignments_student_id ON c_assignments(student_id);

CREATE INDEX idx_c_audit_log_at ON c_audit_log(at);

CREATE INDEX idx_c_bncc_goals_code ON c_bncc_goals(code);

CREATE INDEX idx_c_bncc_goals_level ON c_bncc_goals(level);

CREATE INDEX idx_c_feedbacks_assignment_id ON c_feedbacks(assignment_id);

CREATE INDEX idx_c_feedbacks_student_id ON c_feedbacks(student_id);

CREATE INDEX idx_c_students_class_id ON c_students(class_id);

CREATE INDEX idx_c_students_need_id ON c_students(need_id);

CREATE INDEX idx_c_users_email ON c_users(email);

CREATE INDEX idx_c_users_teacher_id ON c_users(teacher_id);

CREATE INDEX idx_sessions_expires ON sessions(expires_at);
