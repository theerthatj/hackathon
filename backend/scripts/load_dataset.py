"""
Fast dataset and seed loader for Sahayam.
Uses COPY ... FROM STDIN via psycopg 3 to ingest 1M+ rows in seconds.
"""

from pathlib import Path
import psycopg
import bcrypt
from app.settings import settings

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "dataset" / "data"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def load_dataset():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    with psycopg.connect(settings.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            print("Truncating existing dataset tables...")
            cur.execute(
                "TRUNCATE TABLE silence_scores, custody_receipts, dtn_bundles, members, households, "
                "silence_ground_truth, known_scoring_cases, actual_signal_profile, expected_signal_profile, "
                "scenario_cells, scenarios, spatial_cells, signal_types CASCADE;"
            )

            # 1. signal_types
            sig_file = DATA_DIR / "signal_types.csv"
            if sig_file.exists():
                print("Loading signal_types.csv...")
                with open(sig_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY signal_types(signal_type_id, name, description, default_weight, unit, temporal_pattern, variance_factor, is_count_type) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        copy.write(f.read())

            # 2. spatial_cells
            cells_file = DATA_DIR / "spatial_cells.csv"
            if cells_file.exists():
                print("Loading spatial_cells.csv...")
                with open(cells_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY spatial_cells(cell_id, geometry, latitude, longitude, cell_type, population, household_count, building_count, road_length_km, hospital_count, school_count, shelter_count, population_density) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        copy.write(f.read())

            # 3. scenarios
            scen_file = DATA_DIR / "scenarios.csv"
            if scen_file.exists():
                print("Loading scenarios.csv...")
                with open(scen_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY scenarios(scenario_id, name, category, start_time, end_time, severity_factor, affected_cell_count, notes) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        copy.write(f.read())

            # 4. scenario_cells
            scen_cells_file = DATA_DIR / "scenario_cells.csv"
            if scen_cells_file.exists():
                print("Loading scenario_cells.csv...")
                with open(scen_cells_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY scenario_cells(scenario_id, cell_id) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        copy.write(f.read())

            # 5. expected_signal_profile (537k rows)
            exp_file = DATA_DIR / "expected_signal_profile.csv"
            if exp_file.exists():
                print("Loading expected_signal_profile.csv (~537k rows)...")
                with open(exp_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY expected_signal_profile(cell_id, window_start, signal_type_id, expected_value, baseline_valid, confidence, baseline_source) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        while chunk := f.read(1024 * 1024):
                            copy.write(chunk)

            # 6. actual_signal_profile (537k rows)
            act_file = DATA_DIR / "actual_signal_profile.csv"
            if act_file.exists():
                print("Loading actual_signal_profile.csv (~537k rows)...")
                with open(act_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY actual_signal_profile(cell_id, window_start, signal_type_id, actual_value, data_available, source) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        while chunk := f.read(1024 * 1024):
                            copy.write(chunk)

            # 7. silence_ground_truth
            gt_file = DATA_DIR / "silence_ground_truth.csv"
            if gt_file.exists():
                print("Loading silence_ground_truth.csv...")
                with open(gt_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY silence_ground_truth(cell_id, window_start, scenario_id, expected_state, expected_severity_factor, explanation) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        while chunk := f.read(1024 * 1024):
                            copy.write(chunk)

            # 8. known_scoring_cases
            cases_file = DATA_DIR / "known_scoring_cases.csv"
            if cases_file.exists():
                print("Loading known_scoring_cases.csv...")
                with open(cases_file, "r", encoding="utf-8") as f:
                    with cur.copy(
                        "COPY known_scoring_cases(case_id, description, test_cell_id, test_window_start, expected_base_score, score_tolerance, notes) "
                        "FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '')"
                    ) as copy:
                        copy.write(f.read())

            # 9. Seed Prototype Users and Initial Household
            print("Seeding prototype users and Kuruvilla House...")
            users = [
                ("usr-kuru-1", "user@gmail.com", hash_password("user"), "user", "Ammini Kuruvilla", "usr-kuru-1"),
                ("vol-ravi-1", "volunteer@gmail.com", hash_password("volunteer"), "volunteer", "Ravi Kumar", None),
                ("admin-cmd-1", "admin@gmail.com", hash_password("admin"), "admin", "DEOC District Commander", None),
            ]
            cur.executemany(
                "INSERT INTO users (id, email, password_hash, role, name, member_id) "
                "VALUES (%s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, name = EXCLUDED.name",
                users,
            )

            # Households & Members
            cur.execute(
                "INSERT INTO households (id, name, head, ward, cell_id, contact) "
                "VALUES (%s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (id) DO NOTHING",
                ("hh-kuru", "Kuruvilla House", "Thomas Kuruvilla", "Ward 7 - Mundakkai North", "C001", "+91 94471 23456"),
            )

            members = [
                (
                    "usr-kuru-1", "hh-kuru", "Ammini Kuruvilla", 68, "Female", "B+",
                    "Type 2 Diabetes, Hypertension", "Insulin glargine (20 units hs), Amlodipine 5mg OD",
                    "Mobility impairment (Cane)", True, False, False, False,
                    "+91 94471 23456", "sahayam:user:usr-kuru-1", "CHECKED_IN", "St. Thomas HSS Kalpetta",
                ),
                (
                    "usr-kuru-2", "hh-kuru", "Thomas Kuruvilla", 72, "Male", "O+",
                    "Chronic Bronchial Asthma, Post-MI", "Salbutamol MDI PRN, Atorvastatin 20mg OD",
                    "Mild breathlessness", True, False, False, False,
                    "+91 94471 23456", "sahayam:user:usr-kuru-2", "EVACUATING", None,
                ),
                (
                    "usr-kuru-3", "hh-kuru", "Maria Kuruvilla", 34, "Female", "A+",
                    "None reported", "Prenatal supplements, Folic Acid",
                    "None", False, True, False, False,
                    "+91 94471 23456", "sahayam:user:usr-kuru-3", "ACTIVE", None,
                ),
            ]
            cur.executemany(
                "INSERT INTO members ("
                "id, household_id, name, age, gender, blood_group, conditions, medication, "
                "disability, is_elderly, is_pregnant, is_infant, is_bedridden, emergency_contact, qr_token, status, camp_name"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (id) DO NOTHING",
                members,
            )

        conn.commit()
    print("Dataset and prototype users successfully loaded!")


if __name__ == "__main__":
    load_dataset()
