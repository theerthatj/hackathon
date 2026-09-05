-- Sahayam Silence Dataset Seed Script
-- Loads CSV-generated data into PostgreSQL database
-- 
-- Usage:
--   psql -U postgres -d sahayam_silence -f seed.sql
--
-- Prerequisites:
--   - Database created with: CREATE DATABASE sahayam_silence
--   - Schema created with: psql -d sahayam_silence -f schema.sql
--   - CSV files in ./data/ directory

\echo 'Loading Sahayam Silence Dataset...'

-- =====================================================================
-- 1. Load Signal Types (small reference table, no FK dependencies)
-- =====================================================================

\echo 'Loading signal_types...'
\COPY signal_types(signal_type_id, name, description, default_weight, unit, temporal_pattern, variance_factor, is_count_type) 
FROM './data/signal_types.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- =====================================================================
-- 2. Load Spatial Cells (small reference table)
-- =====================================================================

\echo 'Loading spatial_cells...'
\COPY spatial_cells(cell_id, geometry, latitude, longitude, cell_type, population, household_count, building_count, road_length_km, hospital_count, school_count, shelter_count, population_density) 
FROM './data/spatial_cells.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Convert geometry WKT to PostGIS geometry
UPDATE spatial_cells 
SET geometry = ST_GeomFromText(geometry_wkt, 4326) 
WHERE geometry IS NULL;

-- =====================================================================
-- 3. Load Scenarios (reference table)
-- =====================================================================

\echo 'Loading scenarios...'
\COPY scenarios(scenario_id, name, category, start_time, end_time, severity_factor, affected_cell_count, notes) 
FROM './data/scenarios.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- =====================================================================
-- 4. Load Scenario-Cell Mappings
-- =====================================================================

\echo 'Loading scenario_cells...'
\COPY scenario_cells(scenario_id, cell_id) 
FROM './data/scenario_cells.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- =====================================================================
-- 5. Load Expected Signal Profiles (large table)
-- =====================================================================

\echo 'Loading expected_signal_profile...'
\COPY expected_signal_profile(cell_id, window_start, signal_type_id, expected_value, baseline_valid, confidence, baseline_source) 
FROM './data/expected_signal_profile.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- =====================================================================
-- 6. Load Actual Signal Profiles (large table)
-- =====================================================================

\echo 'Loading actual_signal_profile...'
\COPY actual_signal_profile(cell_id, window_start, signal_type_id, actual_value, data_available, source) 
FROM './data/actual_signal_profile.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- =====================================================================
-- 7. Load Ground Truth Labels
-- =====================================================================

\echo 'Loading silence_ground_truth...'
\COPY silence_ground_truth(cell_id, window_start, scenario_id, expected_state, expected_severity_factor, explanation) 
FROM './data/silence_ground_truth.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL 'None');

-- =====================================================================
-- 8. Load Known Test Cases
-- =====================================================================

\echo 'Loading known_scoring_cases...'
\COPY known_scoring_cases(case_id, description, test_cell_id, test_window_start, expected_base_score, score_tolerance, notes) 
FROM './data/known_scoring_cases.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL 'None');

-- =====================================================================
-- 9. Update Metadata
-- =====================================================================

\echo 'Updating dataset metadata...'
UPDATE dataset_metadata 
SET value = (SELECT COUNT(*) FROM spatial_cells)::TEXT 
WHERE key = 'num_cells';

UPDATE dataset_metadata 
SET value = (SELECT COUNT(DISTINCT(DATE(window_start))) FROM expected_signal_profile)::TEXT 
WHERE key = 'num_days';

UPDATE dataset_metadata 
SET value = (SELECT COUNT(*) FROM signal_types)::TEXT 
WHERE key = 'num_signal_types';

UPDATE dataset_metadata 
SET value = (SELECT COUNT(*) FROM expected_signal_profile)::TEXT 
WHERE key = 'total_records';

-- =====================================================================
-- 10. Analyze Tables for Query Optimization
-- =====================================================================

\echo 'Analyzing tables for query optimization...'
ANALYZE spatial_cells;
ANALYZE signal_types;
ANALYZE scenarios;
ANALYZE scenario_cells;
ANALYZE expected_signal_profile;
ANALYZE actual_signal_profile;
ANALYZE silence_ground_truth;
ANALYZE known_scoring_cases;

-- =====================================================================
-- Verification Queries
-- =====================================================================

\echo ''
\echo '========================================================='
\echo 'DATASET LOAD COMPLETE - VERIFICATION'
\echo '========================================================='

\echo 'Spatial Cells:'
SELECT COUNT(*) as count FROM spatial_cells;

\echo 'Signal Types:'
SELECT COUNT(*) as count FROM signal_types;

\echo 'Scenarios:'
SELECT COUNT(*) as count FROM scenarios;

\echo 'Scenario-Cell Mappings:'
SELECT COUNT(DISTINCT scenario_id) as scenarios, 
       COUNT(DISTINCT cell_id) as cells, 
       COUNT(*) as mappings 
FROM scenario_cells;

\echo 'Expected Signal Records:'
SELECT COUNT(*) as count FROM expected_signal_profile;

\echo 'Actual Signal Records:'
SELECT COUNT(*) as count FROM actual_signal_profile;

\echo 'Ground Truth Records:'
SELECT COUNT(*) as count FROM silence_ground_truth;

\echo 'Ground Truth Distribution:'
SELECT expected_state, COUNT(*) as count 
FROM silence_ground_truth 
GROUP BY expected_state 
ORDER BY count DESC;

\echo 'Known Test Cases:'
SELECT COUNT(*) as count FROM known_scoring_cases;

\echo 'Dataset Metadata:'
SELECT key, value FROM dataset_metadata ORDER BY key;

\echo ''
\echo 'All data loaded successfully!'
