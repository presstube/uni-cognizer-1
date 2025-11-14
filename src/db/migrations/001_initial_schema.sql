-- Cognizer version tracking
CREATE TABLE IF NOT EXISTS cognizer_versions (
  version VARCHAR(20) PRIMARY KEY,
  released_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(100) PRIMARY KEY,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  percept_count INTEGER DEFAULT 0,
  mind_moment_count INTEGER DEFAULT 0,
  metadata JSONB
);

-- Mind moments (core table)
CREATE TABLE IF NOT EXISTS mind_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle INTEGER NOT NULL,
  session_id VARCHAR(100),
  
  -- Content
  mind_moment TEXT NOT NULL,
  sigil_phrase VARCHAR(200),
  sigil_code TEXT,
  
  -- Physical outputs
  kinetic JSONB,
  lighting JSONB,
  
  -- Percepts (store as JSONB arrays)
  visual_percepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_percepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Prior context (array of UUIDs)
  prior_moment_ids UUID[],
  
  -- Metadata
  cognizer_version VARCHAR(20),
  llm_provider VARCHAR(20),
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  processing_duration_ms INTEGER,
  
  -- Constraints
  CONSTRAINT unique_session_cycle UNIQUE (session_id, cycle),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_version FOREIGN KEY (cognizer_version) REFERENCES cognizer_versions(version)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mind_moments_session 
  ON mind_moments(session_id);

CREATE INDEX IF NOT EXISTS idx_mind_moments_created 
  ON mind_moments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mind_moments_version 
  ON mind_moments(cognizer_version);

CREATE INDEX IF NOT EXISTS idx_sessions_start 
  ON sessions(start_time DESC);

-- Insert current version
INSERT INTO cognizer_versions (version, notes)
VALUES ('0.1.0', 'Initial schema - Phase 1 implementation')
ON CONFLICT (version) DO NOTHING;

-- Migration metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES (1);

