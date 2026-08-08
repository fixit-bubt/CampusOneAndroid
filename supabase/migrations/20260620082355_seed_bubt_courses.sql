-- BACKFILL (2026-08-08): applied live 2026-06-20, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements --
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.


CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  department text NOT NULL DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_courses" ON courses FOR SELECT USING (true);

INSERT INTO courses (code, name, department) VALUES
-- English
('ENG 101', 'English Language-I Grammar', 'English'),
('ENG 111', 'English Language-II', 'English'),
-- Mathematics
('MAT 101', 'Differential and Integral Calculus', 'Mathematics'),
('MAT 111', 'Co-ordinate Geometry and Vector Calculus', 'Mathematics'),
('MAT 121', 'Linear Algebra and Differential Equations', 'Mathematics'),
('MAT 231', 'Complex Variable and Fourier Analysis', 'Mathematics'),
-- Statistics
('STA 231', 'Statistics', 'Statistics'),
-- Economics & Accounting
('ECO 101', 'Principles of Economics', 'Economics'),
('ACT 201', 'Accounting Fundamentals', 'Accounting'),
-- Physics
('PHY 101', 'Physics', 'Physics'),
-- EEE
('EEE 101', 'Electrical Technology', 'EEE'),
('EEE 102', 'Electrical Technology Lab', 'EEE'),
('EEE 211', 'Electronic Devices and Circuits', 'EEE'),
('EEE 212', 'Electronic Devices and Circuits Lab', 'EEE'),
-- CSE
('CSE 100', 'Software Development I', 'CSE'),
('CSE 101', 'Computer and Programming Concepts', 'CSE'),
('CSE 102', 'Computer and Programming Concepts Lab', 'CSE'),
('CSE 103', 'Discrete Mathematics', 'CSE'),
('CSE 111', 'Structured Programming Language', 'CSE'),
('CSE 112', 'Structured Programming Language Lab', 'CSE'),
('CSE 121', 'Object Oriented Programming Language', 'CSE'),
('CSE 122', 'Object Oriented Programming Language Lab', 'CSE'),
('CSE 200', 'Software Development II', 'CSE'),
('CSE 205', 'Digital Logic Design', 'CSE'),
('CSE 206', 'Digital Logic Design Lab', 'CSE'),
('CSE 207', 'Database Systems', 'CSE'),
('CSE 208', 'Database Systems Lab', 'CSE'),
('CSE 209', 'Data Communication', 'CSE'),
('CSE 213', 'Theory of Computing and Automata Theory', 'CSE'),
('CSE 215', 'Computer Architecture', 'CSE'),
('CSE 223', 'Numerical Analysis', 'CSE'),
('CSE 224', 'Numerical Analysis Lab', 'CSE'),
('CSE 231', 'Data Structures', 'CSE'),
('CSE 232', 'Data Structures Lab', 'CSE'),
('CSE 241', 'Algorithms', 'CSE'),
('CSE 242', 'Algorithms Lab', 'CSE'),
('CSE 300', 'Software Development III', 'CSE'),
('CSE 309', 'Operating Systems', 'CSE'),
('CSE 310', 'Operating Systems Lab', 'CSE'),
('CSE 313', 'Mathematical Analysis for Computer Science', 'CSE'),
('CSE 315', 'Microprocessor and Interfacing', 'CSE'),
('CSE 316', 'Microprocessor and Interfacing Lab', 'CSE'),
('CSE 317', 'System Analysis and Design', 'CSE'),
('CSE 318', 'System Analysis and Design Lab', 'CSE'),
('CSE 319', 'Computer Networks', 'CSE'),
('CSE 320', 'Computer Networks Lab', 'CSE'),
('CSE 323', 'Compiler Design', 'CSE'),
('CSE 324', 'Compiler Design Lab', 'CSE'),
('CSE 327', 'Software Engineering', 'CSE'),
('CSE 328', 'Software Engineering Lab', 'CSE'),
('CSE 331', 'Advanced Programming', 'CSE'),
('CSE 332', 'Advanced Programming Lab', 'CSE'),
('CSE 341', 'Computer Graphics', 'CSE'),
('CSE 342', 'Computer Graphics Lab', 'CSE'),
('CSE 351', 'Artificial Intelligence and Expert System', 'CSE'),
('CSE 352', 'Artificial Intelligence and Expert System Lab', 'CSE'),
('CSE 400', 'Software Development IV', 'CSE'),
('CSE 407', 'Project Management and Professional Ethics', 'CSE'),
('CSE 411', 'Digital Electronics and Pulse Technique', 'CSE'),
('CSE 412', 'Digital Electronics and Pulse Technique Lab', 'CSE'),
('CSE 413', 'Cyber Security and Digital Forensic', 'CSE'),
('CSE 414', 'Cyber Security and Digital Forensic Lab', 'CSE'),
('CSE 417', 'Distributed Database Management Systems', 'CSE'),
('CSE 418', 'Distributed Database Management System Lab', 'CSE'),
('CSE 425', 'Microcontroller and Embedded Systems', 'CSE'),
('CSE 426', 'Microcontroller and Embedded Systems Lab', 'CSE'),
('CSE 431', 'Communication Engineering', 'CSE'),
('CSE 435', 'Network Security', 'CSE'),
('CSE 437', 'Digital Signal Processing', 'CSE'),
('CSE 438', 'Digital Signal Processing Lab', 'CSE'),
('CSE 441', 'Switching and Routing', 'CSE'),
('CSE 442', 'Switching and Routing Lab', 'CSE'),
('CSE 445', 'Introduction to Cryptography', 'CSE'),
('CSE 451', 'Advanced Software Project Management', 'CSE'),
('CSE 453', 'Software Testing and Quality Assurance', 'CSE'),
('CSE 457', 'Web Database Programming', 'CSE'),
('CSE 458', 'Web Database Programming Lab', 'CSE'),
('CSE 459', 'Visual Programming', 'CSE'),
('CSE 460', 'Visual Programming Lab', 'CSE'),
('CSE 465', 'Machine Learning', 'CSE'),
('CSE 467', 'Pattern Recognition', 'CSE'),
('CSE 475', 'Data Mining', 'CSE'),
('CSE 476', 'Data Mining Lab', 'CSE'),
('CSE 477', 'Neural Network and Fuzzy Systems', 'CSE'),
('CSE 478', 'Neural Network and Fuzzy Systems Lab', 'CSE'),
('CSE 479', 'VLSI Design', 'CSE'),
('CSE 480', 'VLSI Design Lab', 'CSE'),
('CSE 481', 'Decision Support System', 'CSE'),
('CSE 483', 'Knowledge Engineering', 'CSE')
ON CONFLICT (code) DO NOTHING;
