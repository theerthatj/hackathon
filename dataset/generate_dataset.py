#!/usr/bin/env python3
"""
Sahayam Silence Dataset Generator

Generates a synthetic spatiotemporal dataset for testing the Silence Scoring subsystem.
Includes realistic spatial cells, multi-dimensional signal profiles, disaster scenarios,
and ground truth for validation.

Usage:
    python generate_dataset.py --output-dir ./data --num-cells 100 --num-days 7 --seed 42
"""

import argparse
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import math
import sys

# =====================================================================
# Configuration
# =====================================================================

DEFAULT_CONFIG = {
    'num_cells': 100,
    'num_days': 7,
    'window_minutes': 15,
    'seed': 42,
    'synthetic_city_center_lat': 10.8505,  # Thiruvananthapuram, Kerala
    'synthetic_city_center_lng': 76.2711,
    'synthetic_city_radius_km': 15.0,
}

SIGNAL_TYPES = {
    'sos_reports': {
        'name': 'SOS Reports',
        'description': 'Emergency distress calls',
        'default_weight': 0.25,
        'unit': 'count',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 1.5,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 0.5,
    },
    'incident_reports': {
        'name': 'Incident Reports',
        'description': 'Structural/infrastructure incident reports',
        'default_weight': 0.15,
        'unit': 'count',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 1.3,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 1.2,
    },
    'volunteer_reports': {
        'name': 'Volunteer Reports',
        'description': 'Field volunteers reporting observations',
        'default_weight': 0.10,
        'unit': 'count',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 1.4,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 0.8,
    },
    'medical_requests': {
        'name': 'Medical Requests',
        'description': 'Medical assistance or health service requests',
        'default_weight': 0.20,
        'unit': 'count',
        'temporal_pattern': 'stable',
        'variance_factor': 1.1,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 2.0,
    },
    'shelter_checkins': {
        'name': 'Shelter Check-ins',
        'description': 'People checking into emergency shelters',
        'default_weight': 0.10,
        'unit': 'count',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 1.6,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 0.3,
    },
    'infrastructure_reports': {
        'name': 'Infrastructure Reports',
        'description': 'Road/utility infrastructure status reports',
        'default_weight': 0.08,
        'unit': 'count',
        'temporal_pattern': 'stable',
        'variance_factor': 1.2,
        'is_count_type': True,
        'base_rate_per_10k_per_window': 0.5,
    },
    'mobility_signal': {
        'name': 'Mobility Signal',
        'description': 'Mobile network activity / location pings',
        'default_weight': 0.07,
        'unit': 'pings',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 0.9,
        'is_count_type': False,
        'base_rate_per_10k_per_window': 50.0,
    },
    'communication_signal': {
        'name': 'Communication Signal',
        'description': 'Phone calls, SMS, data communication',
        'default_weight': 0.05,
        'unit': 'events',
        'temporal_pattern': 'time_dependent',
        'variance_factor': 0.8,
        'is_count_type': False,
        'base_rate_per_10k_per_window': 100.0,
    },
}

CELL_TYPES = ['residential', 'commercial', 'industrial', 'hospital', 'shelter', 'school', 'rural', 'mixed']

# =====================================================================
# Time-of-Day Patterns
# =====================================================================

def get_time_of_day_multiplier(hour: int, signal_type: str) -> float:
    """
    Returns a multiplier (0.0 to 2.0) for expected signal based on time of day.
    """
    patterns = {
        'sos_reports': [
            (0, 0.5), (3, 0.3), (6, 0.4), (9, 0.9), (12, 1.2), (15, 1.3), 
            (18, 1.1), (21, 0.8), (23, 0.6)
        ],
        'incident_reports': [
            (0, 0.4), (3, 0.3), (6, 0.5), (9, 1.0), (12, 1.1), (15, 1.2),
            (18, 1.0), (21, 0.7), (23, 0.5)
        ],
        'volunteer_reports': [
            (0, 0.2), (3, 0.1), (6, 0.3), (9, 0.8), (12, 1.0), (15, 1.1),
            (18, 0.9), (21, 0.5), (23, 0.3)
        ],
        'medical_requests': [
            (0, 0.9), (3, 0.8), (6, 0.7), (9, 1.0), (12, 1.1), (15, 1.0),
            (18, 1.1), (21, 1.0), (23, 0.9)
        ],
        'shelter_checkins': [
            (0, 1.5), (3, 1.8), (6, 1.2), (9, 0.5), (12, 0.4), (15, 0.4),
            (18, 1.0), (21, 1.6), (23, 1.7)
        ],
        'infrastructure_reports': [
            (0, 0.5), (3, 0.4), (6, 0.6), (9, 1.0), (12, 1.0), (15, 1.0),
            (18, 0.9), (21, 0.6), (23, 0.5)
        ],
        'mobility_signal': [
            (0, 0.3), (3, 0.2), (6, 0.7), (9, 1.5), (12, 1.4), (15, 1.3),
            (18, 1.6), (21, 0.9), (23, 0.5)
        ],
        'communication_signal': [
            (0, 0.4), (3, 0.3), (6, 0.8), (9, 1.4), (12, 1.3), (15, 1.2),
            (18, 1.5), (21, 1.0), (23, 0.6)
        ],
    }
    
    points = patterns.get(signal_type, [(0, 1.0), (23, 1.0)])
    
    # Linear interpolation
    for i in range(len(points) - 1):
        h1, m1 = points[i]
        h2, m2 = points[i + 1]
        if h1 <= hour < h2:
            alpha = (hour - h1) / (h2 - h1)
            return m1 + alpha * (m2 - m1)
    
    # Wrap around midnight
    h1, m1 = points[-1]
    h2, m2 = points[0]
    if hour >= h1:
        alpha = (hour - h1) / (24 - h1 + h2)
        return m1 + alpha * (m2 - m1)
    
    return 1.0

def get_day_of_week_multiplier(day_of_week: int) -> float:
    """
    Monday=0, Sunday=6. Returns 0.8 to 1.2.
    """
    weekday_factors = [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.9]  # Weekend slightly lower for some signals
    return weekday_factors[day_of_week % 7]

# =====================================================================
# Spatial Cell Generation
# =====================================================================

def generate_spatial_cells(num_cells: int, seed: int, config: dict) -> pd.DataFrame:
    """
    Generate a realistic geographic distribution of cells.
    Uses a synthetic city grid with varied cell types and characteristics.
    """
    rng = np.random.RandomState(seed)
    
    cells = []
    
    # Create a grid-like distribution with some randomness
    grid_size = int(math.ceil(math.sqrt(num_cells)))
    cell_count = 0
    
    center_lat = config['synthetic_city_center_lat']
    center_lng = config['synthetic_city_center_lng']
    radius_km = config['synthetic_city_radius_km']
    
    # Convert radius to degrees (rough approximation)
    lat_offset_deg = radius_km / 111.0
    lng_offset_deg = radius_km / (111.0 * math.cos(math.radians(center_lat)))
    
    for i in range(grid_size):
        for j in range(grid_size):
            if cell_count >= num_cells:
                break
            
            # Grid position with jitter
            x_normalized = (i + 0.5) / grid_size + rng.normal(0, 0.08)
            y_normalized = (j + 0.5) / grid_size + rng.normal(0, 0.08)
            
            # Convert to lat/lng
            lat = center_lat + (x_normalized - 0.5) * 2 * lat_offset_deg
            lng = center_lng + (y_normalized - 0.5) * 2 * lng_offset_deg
            
            # Cell type distribution
            if rng.random() < 0.50:
                cell_type = 'residential'
                pop_multiplier = rng.uniform(0.8, 1.5)
                density_base = 800
            elif rng.random() < 0.60:
                cell_type = 'commercial'
                pop_multiplier = rng.uniform(0.3, 0.8)
                density_base = 600
            elif rng.random() < 0.75:
                cell_type = 'industrial'
                pop_multiplier = rng.uniform(0.1, 0.3)
                density_base = 300
            elif rng.random() < 0.85:
                cell_type = 'rural'
                pop_multiplier = rng.uniform(0.05, 0.2)
                density_base = 100
            elif rng.random() < 0.92:
                cell_type = 'mixed'
                pop_multiplier = rng.uniform(0.5, 1.0)
                density_base = 500
            elif rng.random() < 0.97:
                cell_type = 'hospital'
                pop_multiplier = rng.uniform(0.1, 0.2)
                density_base = 400
            else:
                cell_type = 'shelter'
                pop_multiplier = rng.uniform(0.08, 0.15)
                density_base = 350
            
            # Generate cell properties
            base_population = 50000
            population = int(base_population * pop_multiplier)
            population_density = density_base * rng.uniform(0.8, 1.2)
            
            # Area estimate (km²)
            area_km2 = population / population_density if population_density > 0 else 10.0
            
            households = int(population / 4.5)
            buildings = max(int(population / 150), 5)
            road_length_km = area_km2 * rng.uniform(8, 15)  # Road density
            
            hospital_count = 1 if cell_type == 'hospital' else (1 if rng.random() < 0.05 else 0)
            school_count = max(int(population / 5000), 0)
            shelter_count = 1 if cell_type == 'shelter' else (1 if rng.random() < 0.02 else 0)
            
            # Create polygon (simple square, could be more complex)
            cell_size_deg = 0.01  # ~1 km at equator
            polygon_coords = [
                [lng - cell_size_deg/2, lat - cell_size_deg/2],
                [lng + cell_size_deg/2, lat - cell_size_deg/2],
                [lng + cell_size_deg/2, lat + cell_size_deg/2],
                [lng - cell_size_deg/2, lat + cell_size_deg/2],
                [lng - cell_size_deg/2, lat - cell_size_deg/2],
            ]
            
            cells.append({
                'cell_id': f'C{cell_count + 1:03d}',
                'geometry_wkt': f"SRID=4326;POLYGON(({', '.join([f'{p[0]} {p[1]}' for p in polygon_coords])}))",
                'latitude': lat,
                'longitude': lng,
                'cell_type': cell_type,
                'population': population,
                'household_count': households,
                'building_count': buildings,
                'road_length_km': round(road_length_km, 2),
                'hospital_count': hospital_count,
                'school_count': school_count,
                'shelter_count': shelter_count,
                'population_density': round(population_density, 2),
            })
            
            cell_count += 1
        
        if cell_count >= num_cells:
            break
    
    return pd.DataFrame(cells)

# =====================================================================
# Signal Profile Generation
# =====================================================================

def generate_expected_signal_profile(
    cells_df: pd.DataFrame,
    num_days: int,
    window_minutes: int,
    seed: int,
) -> pd.DataFrame:
    """
    Generate expected signal profiles based on cell characteristics, time-of-day, and day-of-week.
    """
    rng = np.random.RandomState(seed)
    
    records = []
    
    # Time windows
    start_time = datetime(2026, 8, 1, 0, 0)
    total_windows = num_days * (24 * 60 // window_minutes)
    
    for cell_idx, (_, cell_row) in enumerate(cells_df.iterrows()):
        cell_id = cell_row['cell_id']
        population = cell_row['population']
        cell_type = cell_row['cell_type']
        
        for window_idx in range(total_windows):
            window_start = start_time + timedelta(minutes=window_idx * window_minutes)
            
            for signal_type_id, signal_meta in SIGNAL_TYPES.items():
                # Base rate depends on signal and population
                base_rate = signal_meta['base_rate_per_10k_per_window']
                base_expected = (population / 10000.0) * base_rate
                
                # Time-of-day adjustment
                hour = window_start.hour
                tod_mult = get_time_of_day_multiplier(hour, signal_type_id)
                
                # Day-of-week adjustment
                dow_mult = get_day_of_week_multiplier(window_start.weekday())
                
                # Cell-type adjustment (some cell types naturally have more/less of certain signals)
                if signal_type_id == 'medical_requests' and cell_type == 'hospital':
                    cell_mult = 2.5
                elif signal_type_id == 'shelter_checkins' and cell_type == 'shelter':
                    cell_mult = 3.0
                elif signal_type_id == 'shelter_checkins' and cell_type in ('residential', 'mixed'):
                    cell_mult = 1.2
                elif signal_type_id == 'sos_reports' and cell_type in ('industrial', 'commercial'):
                    cell_mult = 1.4
                elif signal_type_id in ('incident_reports', 'infrastructure_reports') and cell_type in ('industrial', 'commercial'):
                    cell_mult = 1.5
                elif signal_type_id == 'volunteer_reports' and cell_type == 'rural':
                    cell_mult = 0.6
                else:
                    cell_mult = 1.0
                
                expected_value = base_expected * tod_mult * dow_mult * cell_mult
                
                # Add small stochastic variation to avoid perfect patterns
                expected_value *= rng.uniform(0.9, 1.1)
                
                # Determine baseline validity
                # Signal is valid if expected > 0.05 (low but meaningful baseline)
                baseline_valid = expected_value > 0.05
                confidence = min(1.0, expected_value / 5.0) if baseline_valid else 0.0
                
                records.append({
                    'cell_id': cell_id,
                    'window_start': window_start,
                    'signal_type_id': signal_type_id,
                    'expected_value': round(expected_value, 4),
                    'baseline_valid': baseline_valid,
                    'confidence': round(confidence, 3),
                    'baseline_source': 'synthetic',
                })
    
    return pd.DataFrame(records)

def generate_actual_signal_profile(
    expected_df: pd.DataFrame,
    seed: int,
    scenario_data: dict,
) -> pd.DataFrame:
    """
    Generate actual signal profiles with realistic noise.
    Actual values normally follow expected values with variance.
    During scenarios, values are reduced based on scenario severity.
    """
    rng = np.random.RandomState(seed)
    
    actual_df = expected_df.copy()
    actual_df['actual_value'] = 0.0
    actual_df['data_available'] = True
    actual_df['source'] = 'simulated'
    
    for idx, row in actual_df.iterrows():
        cell_id = row['cell_id']
        window_start = row['window_start']
        signal_type_id = row['signal_type_id']
        expected_value = row['expected_value']
        
        # Determine if this record is in a scenario
        scenario_id = None
        severity_factor = 1.0
        
        for s_id, s_info in scenario_data.items():
            if cell_id in s_info['affected_cells'] and \
               s_info['start_time'] <= window_start < s_info['end_time']:
                scenario_id = s_id
                severity_factor = s_info['severity_factor']
                
                # Special handling for communication_outage scenario
                if s_info['category'] == 'communication_outage' and \
                   signal_type_id == 'communication_signal':
                    actual_df.at[idx, 'data_available'] = False
                    actual_df.at[idx, 'actual_value'] = 0.0
                    continue
                
                # Special handling for network_failure scenario
                if s_info['category'] == 'network_failure' and \
                   signal_type_id in ('mobility_signal', 'communication_signal'):
                    actual_df.at[idx, 'data_available'] = False
                    actual_df.at[idx, 'actual_value'] = 0.0
                    continue
                
                break
        
        # Generate actual value
        if not actual_df.at[idx, 'data_available']:
            actual_df.at[idx, 'actual_value'] = 0.0
        else:
            # Noise factor depends on signal type
            signal_meta = SIGNAL_TYPES[signal_type_id]
            variance = signal_meta['variance_factor']
            
            # Normal operation: add realistic noise
            noise_factor = rng.normal(1.0, 0.3 * variance)
            noise_factor = max(0.0, noise_factor)  # Can't be negative
            
            # Apply severity factor (reduces actual value during scenarios)
            actual_value = expected_value * noise_factor * severity_factor
            
            # Ensure non-negative
            actual_value = max(0.0, actual_value)
            
            # Round appropriately
            if signal_meta['is_count_type']:
                actual_value = int(round(actual_value))
            else:
                actual_value = round(actual_value, 2)
            
            actual_df.at[idx, 'actual_value'] = actual_value
    
    # Drop expected_value, keep only actual
    actual_df = actual_df[['cell_id', 'window_start', 'signal_type_id', 'actual_value', 'data_available', 'source']]
    
    return actual_df

# =====================================================================
# Scenario Generation
# =====================================================================

def generate_scenarios(cells_df: pd.DataFrame, num_days: int, seed: int) -> tuple:
    """
    Generate 8 different scenarios to test silence detection.
    Returns (scenarios_df, scenario_mapping_dict).
    """
    rng = np.random.RandomState(seed)
    
    start_date = datetime(2026, 8, 1, 0, 0)
    
    scenarios = []
    scenario_mapping = {}
    
    # Scenario A: Normal (no silence, background noise)
    scenario_a = {
        'scenario_id': 'normal',
        'name': 'Normal Operations',
        'category': 'normal',
        'start_time': start_date,
        'end_time': start_date + timedelta(days=2),
        'severity_factor': 1.0,
        'affected_cells': list(cells_df['cell_id'].head(5)),
        'description': 'Normal signal levels with natural variation.',
    }
    scenarios.append(scenario_a)
    scenario_mapping['normal'] = scenario_a
    
    # Scenario B: Partial Silence (some signals down)
    scenario_b = {
        'scenario_id': 'partial_silence',
        'name': 'Partial Silence Event',
        'category': 'partial_silence',
        'start_time': start_date + timedelta(days=1, hours=10),
        'end_time': start_date + timedelta(days=1, hours=14),
        'severity_factor': 0.4,  # 60% reduction
        'affected_cells': list(cells_df[cells_df['cell_type'] == 'residential']['cell_id'].head(8)),
        'description': 'Localized event causing partial reduction in signals.',
    }
    scenarios.append(scenario_b)
    scenario_mapping['partial_silence'] = scenario_b
    
    # Scenario C: Severe Silence (most signals way down)
    scenario_c = {
        'scenario_id': 'severe_silence',
        'name': 'Severe Silence',
        'category': 'severe_silence',
        'start_time': start_date + timedelta(days=2, hours=8),
        'end_time': start_date + timedelta(days=2, hours=13),
        'severity_factor': 0.15,  # 85% reduction
        'affected_cells': list(cells_df[cells_df['cell_type'].isin(['commercial', 'mixed'])]['cell_id'].head(6)),
        'description': 'Major disruption causing severe signal loss.',
    }
    scenarios.append(scenario_c)
    scenario_mapping['severe_silence'] = scenario_c
    
    # Scenario D: Complete Silence (all signals gone)
    scenario_d = {
        'scenario_id': 'complete_silence',
        'name': 'Complete Silence',
        'category': 'complete_silence',
        'start_time': start_date + timedelta(days=3, hours=9),
        'end_time': start_date + timedelta(days=3, hours=12),
        'severity_factor': 0.0,  # Total loss
        'affected_cells': list(cells_df[cells_df['population_density'] > 500]['cell_id'].head(4)),
        'description': 'Total communication loss in affected area.',
    }
    scenarios.append(scenario_d)
    scenario_mapping['complete_silence'] = scenario_d
    
    # Scenario E: False Silence / Low Baseline
    low_baseline_cells = list(cells_df[cells_df['cell_type'] == 'rural']['cell_id'].head(5))
    scenario_e = {
        'scenario_id': 'low_baseline',
        'name': 'Low Baseline (False Silence)',
        'category': 'false_silence',
        'start_time': start_date + timedelta(days=3, hours=15),
        'end_time': start_date + timedelta(days=3, hours=18),
        'severity_factor': 1.0,  # No change; baseline is already low
        'affected_cells': low_baseline_cells,
        'description': 'Rural cells with naturally low signal expectations.',
    }
    scenarios.append(scenario_e)
    scenario_mapping['low_baseline'] = scenario_e
    
    # Scenario F: Communication Outage (only communication_signal disappears)
    scenario_f = {
        'scenario_id': 'communication_outage',
        'name': 'Communication Outage',
        'category': 'communication_outage',
        'start_time': start_date + timedelta(days=4, hours=6),
        'end_time': start_date + timedelta(days=4, hours=9),
        'severity_factor': 1.0,
        'affected_cells': list(cells_df[cells_df['population'] > 40000]['cell_id'].head(7)),
        'description': 'Network/communication system failure. Other signals normal.',
    }
    scenarios.append(scenario_f)
    scenario_mapping['communication_outage'] = scenario_f
    
    # Scenario G: Network Failure (mobility + communication disappear)
    scenario_g = {
        'scenario_id': 'network_failure',
        'name': 'Network/Data Collection Failure',
        'category': 'network_failure',
        'start_time': start_date + timedelta(days=5, hours=12),
        'end_time': start_date + timedelta(days=5, hours=15),
        'severity_factor': 1.0,
        'affected_cells': list(cells_df[cells_df['cell_type'] == 'commercial']['cell_id'].head(5)),
        'description': 'Data collection system failure; mobility & communication unavailable.',
    }
    scenarios.append(scenario_g)
    scenario_mapping['network_failure'] = scenario_g
    
    # Scenario H: Increased Activity (higher than expected)
    scenario_h = {
        'scenario_id': 'increased_activity',
        'name': 'Increased Activity',
        'category': 'increased_activity',
        'start_time': start_date + timedelta(days=6, hours=10),
        'end_time': start_date + timedelta(days=6, hours=13),
        'severity_factor': 1.8,  # 80% increase
        'affected_cells': list(cells_df[cells_df['building_count'] > 100]['cell_id'].head(6)),
        'description': 'High activity period; signals exceed expected levels.',
    }
    scenarios.append(scenario_h)
    scenario_mapping['increased_activity'] = scenario_h
    
    # Disaster progression scenario (evolves over time)
    scenario_prog = {
        'scenario_id': 'disaster_progression',
        'name': 'Disaster Progression',
        'category': 'partial_silence',  # Classify as partial for now
        'start_time': start_date + timedelta(days=4, hours=10),
        'end_time': start_date + timedelta(days=4, hours=16),
        'severity_factor': 0.5,  # Average; will be modified per window
        'affected_cells': list(cells_df[cells_df['population_density'] > 400]['cell_id'].head(8)),
        'description': 'Disaster evolving from onset to peak to recovery.',
        'is_progressive': True,
    }
    scenarios.append(scenario_prog)
    scenario_mapping['disaster_progression'] = scenario_prog
    
    scenarios_df = pd.DataFrame([
        {
            'scenario_id': s['scenario_id'],
            'name': s['name'],
            'category': s['category'],
            'start_time': s['start_time'],
            'end_time': s['end_time'],
            'severity_factor': s['severity_factor'],
            'affected_cell_count': len(s['affected_cells']),
            'notes': s['description'],
        }
        for s in scenarios
    ])
    
    return scenarios_df, scenario_mapping

# =====================================================================
# Ground Truth Generation
# =====================================================================

def generate_ground_truth(
    cells_df: pd.DataFrame,
    expected_df: pd.DataFrame,
    num_days: int,
    window_minutes: int,
    scenario_mapping: dict,
) -> pd.DataFrame:
    """
    Generate ground truth labels for each cell-window combination.
    """
    start_time = datetime(2026, 8, 1, 0, 0)
    total_windows = num_days * (24 * 60 // window_minutes)
    
    records = []
    
    for cell_id in cells_df['cell_id']:
        for window_idx in range(total_windows):
            window_start = start_time + timedelta(minutes=window_idx * window_minutes)
            
            # Find which scenario (if any) applies
            scenario_id = None
            for s_id, s_info in scenario_mapping.items():
                if cell_id in s_info['affected_cells'] and \
                   s_info['start_time'] <= window_start < s_info['end_time']:
                    scenario_id = s_id
                    break
            
            # Determine severity and state
            if scenario_id is None:
                expected_state = 'NORMAL'
                severity_factor = 0.0
            else:
                s_info = scenario_mapping[scenario_id]
                severity_factor = s_info['severity_factor']
                
                if s_info['category'] == 'normal':
                    expected_state = 'NORMAL'
                elif s_info['category'] == 'false_silence':
                    expected_state = 'LOW_SILENCE'  # Naturally low baseline
                elif s_info['category'] == 'communication_outage':
                    expected_state = 'LOW_SILENCE'  # Missing signal, not true silence
                elif s_info['category'] == 'network_failure':
                    expected_state = 'DATA_UNAVAILABLE'
                elif s_info['category'] == 'increased_activity':
                    expected_state = 'NORMAL'  # High activity, but normal for that scenario
                else:
                    # Silence scenarios
                    if severity_factor < 0.05:
                        expected_state = 'CRITICAL_SILENCE'
                    elif severity_factor < 0.20:
                        expected_state = 'HIGH_SILENCE'
                    elif severity_factor < 0.50:
                        expected_state = 'MEDIUM_SILENCE'
                    else:
                        expected_state = 'LOW_SILENCE'
            
            records.append({
                'cell_id': cell_id,
                'window_start': window_start,
                'scenario_id': scenario_id,
                'expected_state': expected_state,
                'expected_severity_factor': severity_factor,
                'explanation': f"Scenario: {scenario_id or 'baseline'}; State: {expected_state}",
            })
    
    return pd.DataFrame(records)

# =====================================================================
# Known Test Cases
# =====================================================================

def generate_known_test_cases(
    cells_df: pd.DataFrame,
    expected_df: pd.DataFrame,
    actual_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Generate mathematically deterministic test cases with known BaseScores.
    """
    start_date = datetime(2026, 8, 1, 0, 0)
    signal_weights = {sig_id: sig_meta['default_weight'] for sig_id, sig_meta in SIGNAL_TYPES.items()}
    
    test_cases = []
    
    # Helper: safely get a cell of a type, fallback to any cell
    def get_cell_by_type(cell_type):
        candidates = cells_df[cells_df['cell_type'] == cell_type]
        if len(candidates) > 0:
            return candidates.iloc[0]['cell_id']
        return cells_df.iloc[0]['cell_id']
    
    # Test Case 1: Deterministic perfect match (all actual = expected)
    # Find a normal cell-window with good data coverage
    test1_cell = get_cell_by_type('residential')
    test1_window = start_date
    test_cases.append({
        'case_id': 'deterministic_match',
        'description': 'All signals match expected values (coverage=1.0)',
        'test_cell_id': test1_cell,
        'test_window_start': test1_window,
        'expected_base_score': 0.0000,
        'score_tolerance': 0.01,
        'notes': 'When actual = expected, all deficits are 0, BaseScore = 0',
    })
    
    # Test Case 2: Complete signal loss
    test2_cell = get_cell_by_type('commercial')
    test2_window = start_date + timedelta(days=3, hours=10)  # During complete_silence scenario
    test_cases.append({
        'case_id': 'complete_signal_loss',
        'description': 'All signal dimensions are zero',
        'test_cell_id': test2_cell,
        'test_window_start': test2_window,
        'expected_base_score': 1.0000,
        'score_tolerance': 0.05,
        'notes': 'When actual=0 and expected>threshold, coverage=0, deficit=1, BaseScore=1',
    })
    
    # Test Case 3: Partial loss (50% deficit)
    test3_cell = get_cell_by_type('mixed')
    test3_window = start_date + timedelta(days=1, hours=12)  # During partial_silence
    test_cases.append({
        'case_id': 'partial_deficit',
        'description': 'Average signal deficit of ~50%',
        'test_cell_id': test3_cell,
        'test_window_start': test3_window,
        'expected_base_score': 0.4000,
        'score_tolerance': 0.15,
        'notes': 'Partial silence scenario with 40% multiplier',
    })
    
    # Test Case 4: Low baseline (expected near zero, should not create high score)
    test4_cell = get_cell_by_type('rural')
    test4_window = start_date + timedelta(days=2, hours=3)  # Off-peak, rural cell
    test_cases.append({
        'case_id': 'low_baseline_normal',
        'description': 'Low baseline; actual matches low expected',
        'test_cell_id': test4_cell,
        'test_window_start': test4_window,
        'expected_base_score': 0.0000,
        'score_tolerance': 0.05,
        'notes': 'Even if signals are low, if expected is also low and baseline_valid=False, dimensions excluded',
    })
    
    # Test Case 5: Increased activity (deficit should be capped at 0)
    high_density_cells = cells_df[cells_df['population_density'] > 500]
    test5_cell = high_density_cells.iloc[0]['cell_id'] if len(high_density_cells) > 0 else cells_df.iloc[0]['cell_id']
    test5_window = start_date + timedelta(days=6, hours=11)  # During increased_activity
    test_cases.append({
        'case_id': 'increased_activity_excess',
        'description': 'Actual > Expected (80% increase)',
        'test_cell_id': test5_cell,
        'test_window_start': test5_window,
        'expected_base_score': 0.0000,
        'score_tolerance': 0.0,
        'notes': 'deficit = max(0, 1 - coverage); excess activity gives deficit=0',
    })
    
    return pd.DataFrame(test_cases)

# =====================================================================
# Main Generation
# =====================================================================

def main():
    parser = argparse.ArgumentParser(description='Generate Sahayam Silence Dataset')
    parser.add_argument('--output-dir', default='./data', help='Output directory')
    parser.add_argument('--num-cells', type=int, default=DEFAULT_CONFIG['num_cells'])
    parser.add_argument('--num-days', type=int, default=DEFAULT_CONFIG['num_days'])
    parser.add_argument('--seed', type=int, default=DEFAULT_CONFIG['seed'])
    parser.add_argument('--format', choices=['csv', 'sql', 'both'], default='both')
    
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    config = DEFAULT_CONFIG.copy()
    config.update({
        'num_cells': args.num_cells,
        'num_days': args.num_days,
    })
    
    print(f"Generating dataset with {args.num_cells} cells, {args.num_days} days, seed={args.seed}")
    
    # 1. Generate spatial cells
    print("1. Generating spatial cells...")
    cells_df = generate_spatial_cells(args.num_cells, args.seed, config)
    
    # 2. Generate signal types metadata
    print("2. Preparing signal types...")
    signal_types_df = pd.DataFrame([
        {
            'signal_type_id': sig_id,
            'name': sig_meta['name'],
            'description': sig_meta['description'],
            'default_weight': sig_meta['default_weight'],
            'unit': sig_meta['unit'],
            'temporal_pattern': sig_meta['temporal_pattern'],
            'variance_factor': sig_meta['variance_factor'],
            'is_count_type': sig_meta['is_count_type'],
        }
        for sig_id, sig_meta in SIGNAL_TYPES.items()
    ])
    
    # 3. Generate scenarios
    print("3. Generating scenarios...")
    scenarios_df, scenario_mapping = generate_scenarios(cells_df, args.num_days, args.seed)
    
    # 4. Generate expected profiles
    print("4. Generating expected signal profiles...")
    expected_df = generate_expected_signal_profile(cells_df, args.num_days, config['window_minutes'], args.seed)
    
    # 5. Generate actual profiles
    print("5. Generating actual signal profiles...")
    actual_df = generate_actual_signal_profile(expected_df, args.seed + 1, scenario_mapping)
    
    # 6. Generate ground truth
    print("6. Generating ground truth...")
    ground_truth_df = generate_ground_truth(cells_df, expected_df, args.num_days, config['window_minutes'], scenario_mapping)
    
    # 7. Generate known test cases
    print("7. Generating known test cases...")
    known_cases_df = generate_known_test_cases(cells_df, expected_df, actual_df)
    
    # 8. Generate scenario-cell mapping
    print("8. Creating scenario-cell mappings...")
    scenario_cells_records = []
    for s_id, s_info in scenario_mapping.items():
        for cell_id in s_info['affected_cells']:
            scenario_cells_records.append({
                'scenario_id': s_id,
                'cell_id': cell_id,
            })
    scenario_cells_df = pd.DataFrame(scenario_cells_records)
    
    # Output to CSV
    if args.format in ('csv', 'both'):
        print("\nWriting CSV files...")
        cells_df.to_csv(output_dir / 'spatial_cells.csv', index=False)
        signal_types_df.to_csv(output_dir / 'signal_types.csv', index=False)
        expected_df.to_csv(output_dir / 'expected_signal_profile.csv', index=False)
        actual_df.to_csv(output_dir / 'actual_signal_profile.csv', index=False)
        scenarios_df.to_csv(output_dir / 'scenarios.csv', index=False)
        scenario_cells_df.to_csv(output_dir / 'scenario_cells.csv', index=False)
        ground_truth_df.to_csv(output_dir / 'silence_ground_truth.csv', index=False)
        known_cases_df.to_csv(output_dir / 'known_scoring_cases.csv', index=False)
    
    # Output known cases as JSON for easy testing
    known_cases_json = []
    for _, row in known_cases_df.iterrows():
        known_cases_json.append(row.to_dict())
    
    with open(output_dir / 'known_scoring_cases.json', 'w') as f:
        json.dump(known_cases_json, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "="*60)
    print("DATASET GENERATION COMPLETE")
    print("="*60)
    print(f"Output directory: {output_dir.absolute()}")
    print(f"\nDataset Statistics:")
    print(f"  Spatial cells: {len(cells_df)}")
    print(f"  Signal types: {len(signal_types_df)}")
    print(f"  Time period: {args.num_days} days x 96 windows/day = {args.num_days * 96} windows")
    print(f"  Expected records: {len(expected_df):,}")
    print(f"  Actual records: {len(actual_df):,}")
    print(f"  Ground truth records: {len(ground_truth_df):,}")
    print(f"  Scenarios: {len(scenarios_df)}")
    print(f"  Known test cases: {len(known_cases_df)}")
    print(f"\nScenarios:")
    for _, s_row in scenarios_df.iterrows():
        print(f"  - {s_row['scenario_id']:20s} ({s_row['category']:20s}): {s_row['affected_cell_count']} cells")
    print(f"\nFiles generated:")
    print(f"  spatial_cells.csv")
    print(f"  signal_types.csv")
    print(f"  expected_signal_profile.csv")
    print(f"  actual_signal_profile.csv")
    print(f"  scenarios.csv")
    print(f"  scenario_cells.csv")
    print(f"  silence_ground_truth.csv")
    print(f"  known_scoring_cases.csv")
    print(f"  known_scoring_cases.json")

if __name__ == '__main__':
    main()
