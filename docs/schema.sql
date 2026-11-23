-- Target PostgreSQL schema for the CINEVERSE backend (roadmap phase 1/3). The shipped app reads a static snapshot and does not need it.
-- Relationship rows keep their provenance so factual links (Wikidata) and inferred ones (algorithmic, editorial) stay separable.
CREATE TABLE countries (id serial PRIMARY KEY, name text UNIQUE NOT NULL, iso2 char(2));
CREATE TABLE languages (id serial PRIMARY KEY, name text UNIQUE NOT NULL, iso1 char(2));
CREATE TABLE genres (id text PRIMARY KEY, name text NOT NULL, parent_id text REFERENCES genres(id));
CREATE TABLE studios (id text PRIMARY KEY, name text NOT NULL, country_id int REFERENCES countries(id));
CREATE TABLE movies (
  id text PRIMARY KEY,                 -- Wikidata QID
  title text NOT NULL, original_title text, release_year int NOT NULL, runtime_min int,
  synopsis text, synopsis_source text, wikipedia_title text, popularity int,
  UNIQUE (title, release_year)
);
CREATE TABLE movie_alternative_titles (movie_id text REFERENCES movies(id) ON DELETE CASCADE, title text NOT NULL, language text, PRIMARY KEY (movie_id, title));
CREATE TABLE movie_countries (movie_id text REFERENCES movies(id) ON DELETE CASCADE, country_id int REFERENCES countries(id), PRIMARY KEY (movie_id, country_id));
CREATE TABLE movie_languages (movie_id text REFERENCES movies(id) ON DELETE CASCADE, language_id int REFERENCES languages(id), PRIMARY KEY (movie_id, language_id));
CREATE TABLE movie_genres (movie_id text REFERENCES movies(id) ON DELETE CASCADE, genre_id text REFERENCES genres(id), PRIMARY KEY (movie_id, genre_id));
CREATE TABLE movie_studios (movie_id text REFERENCES movies(id) ON DELETE CASCADE, studio_id text REFERENCES studios(id), PRIMARY KEY (movie_id, studio_id));
CREATE TABLE people (id text PRIMARY KEY, name text NOT NULL, description text, born int, died int, wikipedia_title text, biography text);
CREATE TABLE movie_cast (movie_id text REFERENCES movies(id) ON DELETE CASCADE, person_id text REFERENCES people(id), billing int, role_note text, PRIMARY KEY (movie_id, person_id));   -- billing NULL = order not recorded
CREATE TYPE crew_role AS ENUM ('director', 'writer', 'composer', 'cinematographer', 'producer');
CREATE TABLE movie_crew (movie_id text REFERENCES movies(id) ON DELETE CASCADE, person_id text REFERENCES people(id), role crew_role NOT NULL, PRIMARY KEY (movie_id, person_id, role));
CREATE TABLE franchises (id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK (kind IN ('series', 'universe', 'trilogy')), trilogy_kind text CHECK (trilogy_kind IN ('narrative', 'thematic', 'director-defined')), note text, source text NOT NULL);
CREATE TABLE franchise_entries (franchise_id text REFERENCES franchises(id) ON DELETE CASCADE, movie_id text REFERENCES movies(id) ON DELETE CASCADE, release_order int, story_order int, continuity text, PRIMARY KEY (franchise_id, movie_id));
CREATE TABLE trilogies (franchise_id text PRIMARY KEY REFERENCES franchises(id) ON DELETE CASCADE);
CREATE TABLE cinematic_universes (franchise_id text PRIMARY KEY REFERENCES franchises(id) ON DELETE CASCADE);
CREATE TABLE movie_keywords (movie_id text REFERENCES movies(id) ON DELETE CASCADE, keyword text NOT NULL, source text NOT NULL, PRIMARY KEY (movie_id, keyword));
CREATE TABLE movie_awards (movie_id text REFERENCES movies(id) ON DELETE CASCADE, award text NOT NULL, PRIMARY KEY (movie_id, award));
CREATE TYPE relationship_type AS ENUM ('SEQUEL_TO', 'PREQUEL_TO', 'REMAKE_OF', 'SPINOFF_OF', 'SAME_FRANCHISE', 'SAME_TRILOGY', 'SAME_DIRECTOR', 'SHARED_ACTOR', 'SHARED_WRITER', 'SHARED_COMPOSER', 'SAME_GENRE', 'SAME_UNIVERSE', 'BASED_ON', 'INSPIRED_BY', 'THEMATICALLY_SIMILAR');
CREATE TABLE movie_relationships (
  id bigserial PRIMARY KEY, source_type text NOT NULL, source_id text NOT NULL, target_type text NOT NULL, target_id text NOT NULL,
  relationship_type relationship_type NOT NULL, relationship_strength int NOT NULL CHECK (relationship_strength BETWEEN 0 AND 100),
  relationship_source text NOT NULL,   -- 'wikidata:P57', 'editorial', 'algorithmic:dna-v1'
  factual boolean NOT NULL, confidence real NOT NULL CHECK (confidence BETWEEN 0 AND 1), description text,
  verified_by text, verified_at timestamptz, directed boolean NOT NULL DEFAULT false
);
CREATE INDEX movie_relationships_source ON movie_relationships (source_type, source_id);
CREATE INDEX movie_relationships_target ON movie_relationships (target_type, target_id);
CREATE TABLE person_relationships (LIKE movie_relationships INCLUDING ALL);
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE movie_collections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE CASCADE, name text NOT NULL, note text, is_public boolean DEFAULT false, films text[] NOT NULL DEFAULT '{}', graph jsonb);
CREATE TABLE user_watchlists (user_id uuid REFERENCES users(id) ON DELETE CASCADE, movie_id text REFERENCES movies(id), watched boolean DEFAULT false, PRIMARY KEY (user_id, movie_id));
CREATE TABLE user_ratings (user_id uuid REFERENCES users(id) ON DELETE CASCADE, movie_id text REFERENCES movies(id), stars smallint CHECK (stars BETWEEN 1 AND 5), PRIMARY KEY (user_id, movie_id));
