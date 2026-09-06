-- Sahayam Silence Dataset Schema
-- PostgreSQL + PostGIS
-- =====================================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================================
-- 1. SPATIAL CELLS
-- =====================================================================

CREATE TABLE spatial_cells (
    cell_id VARCHAR(10) PRIMARY KEY,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    cell_type VARCHAR(50) NOT NULL,  -- 'residential', 'commercial', 'industrial', 'hospital', 'shelter', 'school', 'rural', etc.
    population INTEGER NOT NULL,
    household_count INTEGER,
    building_count INTEGER,
    road_length_km NUMERIC(8, 2),
    hospital_count INTEGER DEFAULT 0,
    school_count INTEGER DEFAULT 0,
    shelter_count INTEGER DEFAULT 0,
    population_density NUMERIC(10, 2),  -- persons per km²
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spatial_cells_geometry ON spatial_cells USING GIST(geometry);
CREATE INDEX idx_spatial_cells_type ON spatial_cells(cell_type);
CREATE INDEX idx_spatial_cells_density ON spatial_cells(population_density);

-- =====================================================================
-- 2. SIGNAL TYPES
-- =====================================================================

CREATE TABLE signal_types (
    signal_type_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_weight NUMERIC(4, 3) NOT NULL,  -- e.g., 0.250
    unit VARCHAR(50),  -- 'count', 'persons', 'km', etc.
    temporal_pattern VARCHAR(50),  -- 'time_dependent', 'stable', 'event_driven'
    variance_factor NUMERIC(4, 2),  -- multiplier for noise generation
    is_count_type BOOLEAN DEFAULT TRUE,  -- if false, can be decimal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signal_types_weight ON signal_types(default_weight);

-- =====================================================================
-- 3. EXPECTED SIGNAL PROFILE
-- =====================================================================

CREATE TABLE expected_signal_profile (
    id BIGSERIAL PRIMARY KEY,
    cell_id VARCHAR(10) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    signal_type_id VARCHAR(50) NOT NULL,
    expected_value NUMERIC(12, 4) NOT NULL,
    baseline_valid BOOLEAN NOT NULL,  -- FALSE if expected_value is too low to have confidence
    confidence NUMERIC(4, 3),  -- 0.0 to 1.0, how confident in this expectation
    baseline_source VARCHAR(50),  -- 'historical', 'synthetic', 'interpolated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(cell_id) REFERENCES spatial_cells(cell_id),
    FOREIGN KEY(signal_type_id) REFERENCES signal_types(signal_type_id)
);

CREATE INDEX idx_expected_cell_window ON expected_signal_profile(cell_id, window_start);
CREATE INDEX idx_expected_window ON expected_signal_profile(window_start);
CREATE INDEX idx_expected_signal_type ON expected_signal_profile(signal_type_id);
CREATE INDEX idx_expected_baseline_valid ON expected_signal_profile(baseline_valid);

-- =====================================================================
-- 4. ACTUAL SIGNAL PROFILE
-- =====================================================================

CREATE TABLE actual_signal_profile (
    id BIGSERIAL PRIMARY KEY,
    cell_id VARCHAR(10) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    signal_type_id VARCHAR(50) NOT NULL,
    actual_value NUMERIC(12, 4) NOT NULL,
    data_available BOOLEAN NOT NULL,  -- FALSE if signal was not collected
    source VARCHAR(100),  -- 'sos_hotline', 'mobile_app', 'sensor_network', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(cell_id) REFERENCES spatial_cells(cell_id),
    FOREIGN KEY(signal_type_id) REFERENCES signal_types(signal_type_id)
);

CREATE INDEX idx_actual_cell_window ON actual_signal_profile(cell_id, window_start);
CREATE INDEX idx_actual_window ON actual_signal_profile(window_start);
CREATE INDEX idx_actual_signal_type ON actual_signal_profile(signal_type_id);
CREATE INDEX idx_actual_data_available ON actual_signal_profile(data_available);

-- =====================================================================
-- 5. SCENARIOS
-- =====================================================================

CREATE TABLE scenarios (
    scenario_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- 'normal', 'partial_silence', 'severe_silence', 'complete_silence', 'false_silence', 'communication_outage', 'network_failure', 'increased_activity'
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    severity_factor NUMERIC(4, 3),  -- how much to reduce actual values (0.0 = complete silence, 1.0 = no change)
    affected_cell_count INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_category ON scenarios(category);
CREATE INDEX idx_scenarios_time ON scenarios(start_time, end_time);

-- =====================================================================
-- 6. SCENARIO CELL MAPPING
-- =====================================================================

CREATE TABLE scenario_cells (
    id SERIAL PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL,
    cell_id VARCHAR(10) NOT NULL,
    FOREIGN KEY(scenario_id) REFERENCES scenarios(scenario_id),
    FOREIGN KEY(cell_id) REFERENCES spatial_cells(cell_id),
    UNIQUE(scenario_id, cell_id)
);

CREATE INDEX idx_scenario_cells_scenario ON scenario_cells(scenario_id);
CREATE INDEX idx_scenario_cells_cell ON scenario_cells(cell_id);

-- =====================================================================
-- 7. SILENCE GROUND TRUTH (for validation)
-- =====================================================================

CREATE TABLE silence_ground_truth (
    id BIGSERIAL PRIMARY KEY,
    cell_id VARCHAR(10) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    scenario_id VARCHAR(50),
    expected_state VARCHAR(50) NOT NULL,  -- 'NORMAL', 'LOW_SILENCE', 'MEDIUM_SILENCE', 'HIGH_SILENCE', 'CRITICAL_SILENCE', 'DATA_UNAVAILABLE'
    expected_severity_factor NUMERIC(4, 3),  -- 0.0 to 1.0
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(cell_id) REFERENCES spatial_cells(cell_id),
    FOREIGN KEY(scenario_id) REFERENCES scenarios(scenario_id)
);

CREATE INDEX idx_ground_truth_cell_window ON silence_ground_truth(cell_id, window_start);
CREATE INDEX idx_ground_truth_window ON silence_ground_truth(window_start);
CREATE INDEX idx_ground_truth_scenario ON silence_ground_truth(scenario_id);
CREATE INDEX idx_ground_truth_state ON silence_ground_truth(expected_state);

-- =====================================================================
-- 8. KNOWN SCORING TEST CASES
-- =====================================================================

CREATE TABLE known_scoring_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    test_cell_id VARCHAR(10) NOT NULL,
    test_window_start TIMESTAMP NOT NULL,
    expected_base_score NUMERIC(5, 4),  -- 0.0000 to 1.0000
    score_tolerance NUMERIC(5, 4) DEFAULT 0.001,  -- acceptable deviation
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(test_cell_id) REFERENCES spatial_cells(cell_id)
);

CREATE INDEX idx_known_cases_cell_window ON known_scoring_cases(test_cell_id, test_window_start);

-- =====================================================================
-- Metadata Table
-- =====================================================================

CREATE TABLE dataset_metadata (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dataset_metadata (key, value) VALUES 
    ('dataset_name', 'Sahayam Silence Dataset'),
    ('version', '1.0'),
    ('generated_date', NOW()::TEXT),
    ('num_cells', '0'),
    ('num_days', '0'),
    ('window_minutes', '15'),
    ('num_signal_types', '0'),
    ('total_records', '0');
