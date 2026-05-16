CREATE TABLE IF NOT EXISTS survey_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'Untitled survey',
  primary_color text NOT NULL DEFAULT '#2563eb',
  header_image text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO survey_config (id, name, primary_color, header_image, questions)
VALUES (1, 'Untitled survey', '#2563eb', '', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY,
  survey_name text NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
