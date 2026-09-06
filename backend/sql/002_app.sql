-- Sahayam App & DTN Schema
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'volunteer', 'admin')),
    name VARCHAR(100) NOT NULL,
    member_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS households (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    head VARCHAR(100) NOT NULL,
    ward VARCHAR(50),
    cell_id VARCHAR(10) REFERENCES spatial_cells(cell_id),
    contact VARCHAR(50),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    household_id VARCHAR(50) REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    conditions TEXT,
    medication TEXT,
    disability VARCHAR(100),
    is_elderly BOOLEAN DEFAULT FALSE,
    is_pregnant BOOLEAN DEFAULT FALSE,
    is_infant BOOLEAN DEFAULT FALSE,
    is_bedridden BOOLEAN DEFAULT FALSE,
    emergency_contact VARCHAR(50),
    qr_token VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    camp_name VARCHAR(100),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_household ON members(household_id);
CREATE INDEX IF NOT EXISTS idx_members_qr_token ON members(qr_token);

CREATE TABLE IF NOT EXISTS dtn_bundles (
    bundle_id VARCHAR(100) PRIMARY KEY,
    origin_node_id VARCHAR(50) NOT NULL,
    origin_name VARCHAR(100) NOT NULL,
    household_name VARCHAR(100) NOT NULL,
    cell_id VARCHAR(10) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    coordinates GEOMETRY(Point, 4326),
    medical_summary TEXT NOT NULL,
    blood_group VARCHAR(10),
    conditions TEXT,
    medication TEXT,
    is_bedridden BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) NOT NULL,
    integrity_hash VARCHAR(64) NOT NULL,
    hash_algo VARCHAR(20) DEFAULT 'SHA-256',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_LOCAL',
    created_at TIMESTAMP NOT NULL,
    delivered_at TIMESTAMP,
    custodian JSONB
);

CREATE TABLE IF NOT EXISTS custody_receipts (
    id BIGSERIAL PRIMARY KEY,
    bundle_id VARCHAR(100) REFERENCES dtn_bundles(bundle_id) ON DELETE CASCADE,
    custodian_id VARCHAR(50) NOT NULL,
    custodian_name VARCHAR(100) NOT NULL,
    ts TIMESTAMP NOT NULL,
    location VARCHAR(150),
    action VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custody_receipts_bundle ON custody_receipts(bundle_id);

CREATE TABLE IF NOT EXISTS silence_scores (
    id BIGSERIAL PRIMARY KEY,
    cell_id VARCHAR(10) REFERENCES spatial_cells(cell_id),
    window_start TIMESTAMP NOT NULL,
    scenario_id VARCHAR(50) REFERENCES scenarios(scenario_id),
    score NUMERIC(5, 4) NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    breakdown JSONB NOT NULL,
    scorer_version TEXT NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cell_id, window_start, scenario_id, scorer_version)
);

CREATE INDEX IF NOT EXISTS idx_silence_scores_scenario ON silence_scores(scenario_id);
CREATE INDEX IF NOT EXISTS idx_silence_scores_cell ON silence_scores(cell_id);
