-- Independent pre-estimation schema, with synthetic aliases only.
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('student','teacher')),
  class_name TEXT DEFAULT '', student_code TEXT DEFAULT '', total_stars INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1, email TEXT, avatar TEXT, google_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE lessons (
  id TEXT PRIMARY KEY, number INTEGER NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '',
  topic TEXT DEFAULT '', sort_order INTEGER NOT NULL, unlock_after TEXT
);
CREATE TABLE questions (
  id TEXT PRIMARY KEY, set_id TEXT NOT NULL, lesson_id TEXT, type TEXT NOT NULL, prompt TEXT NOT NULL,
  options_json TEXT, correct_answer TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 1,
  category TEXT DEFAULT '', sort_order INTEGER NOT NULL
);
CREATE TABLE question_sets (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'exercise',
  lesson_id TEXT REFERENCES lessons(id), star_reward INTEGER NOT NULL DEFAULT 40, duration_minutes INTEGER DEFAULT 0
);
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
  ref_id TEXT NOT NULL, score_percent INTEGER NOT NULL, correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0, stars_earned INTEGER NOT NULL DEFAULT 0, duration_sec INTEGER DEFAULT 0,
  answers_json TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE progress (
  user_id INTEGER NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL REFERENCES lessons(id),
  best_score INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')), PRIMARY KEY (user_id,lesson_id)
);
INSERT INTO users (id,username,password_hash,full_name,role,class_name,total_stars) VALUES
  (1,'test-a','synthetic-not-a-login-hash','Alias A','student','TEST',7),
  (2,'test-b','synthetic-not-a-login-hash','Alias B','student','TEST',0),
  (3,'test-teacher','synthetic-not-a-login-hash','Alias T','teacher','TEST',0);
INSERT INTO lessons (id,number,title,sort_order,unlock_after) VALUES
  ('bai-9',9,'Synthetic multiplication',9,NULL), ('bai-10',10,'Synthetic division',10,'bai-9');
INSERT INTO question_sets (id,title,lesson_id) VALUES ('legacy-set','Synthetic teacher set','bai-10');
INSERT INTO questions (id,set_id,lesson_id,type,prompt,options_json,correct_answer,points,category,sort_order) VALUES
  ('legacy-input','legacy-set','bai-10','input','6 × 4 = ?',NULL,'24',1,'Nhân',1),
  ('legacy-choice','legacy-set','bai-10','multiple-choice','6 × 4 = ?', '["24","30"]','A',1,'Nhân',2),
  ('legacy-compare','legacy-set','bai-10','compare','6 × 4 ? 24',NULL,'=',1,'So sánh',3),
  ('legacy-paint','legacy-set','bai-10','paint','6 × 2',NULL,'green',1,'Màu',4);
INSERT INTO attempts (user_id,kind,ref_id,score_percent,correct_count,total_count,stars_earned,answers_json)
  VALUES (1,'exercise','legacy-set',25,1,4,7,'{"legacy-input":"24"}');
INSERT INTO progress (user_id,lesson_id,best_score,completed) VALUES (1,'bai-9',100,1),(1,'bai-10',25,0);
