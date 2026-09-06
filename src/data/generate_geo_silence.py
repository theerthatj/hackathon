#!/usr/bin/env python3
import json
import math
import re
import numpy as np
import pandas as pd

# Load dataset generated from files.zip
cells_df = pd.read_csv('dataset/data/spatial_cells.csv')
expected_df = pd.read_csv('dataset/data/expected_signal_profile.csv')
actual_df = pd.read_csv('dataset/data/actual_signal_profile.csv')
signals_df = pd.read_csv('dataset/data/signal_types.csv').set_index('signal_type_id')
scenarios_df = pd.read_csv('dataset/data/scenarios.csv')

weights = signals_df['default_weight'].to_dict()

def parse_wkt_polygon(wkt):
    match = re.search(r'POLYGON\s*\(\((.*?)\)\)', wkt)
    if not match:
        return []
    points = []
    for pair in match.group(1).split(','):
        parts = pair.strip().split()
        if len(parts) >= 2:
            lng = float(parts[0])
            lat = float(parts[1])
            points.append([lng, lat])
    return points

# Kerala place names in the Palakkad / Shoranur / Pattambi / Malappuram / Wayanad corridor
place_names = [
    "Shoranur West", "Ottapalam North", "Pattambi Central", "Cherpulassery Sector", "Vallapuzha Valley",
    "Kulukkallur Heights", "Ongallur East", "Mundakkai North", "Chooralmala Ridge", "Attamala East",
    "Punchirimattam", "Perinthalmanna Cross", "Vellinezhi South", "Lakkidi Hills", "Chalissery Plains",
    "Thrithala Riverbank", "Koppam Junction", "Anakkara Valley", "Kuttippuram West", "Thirunavaya South",
    "Valanchery Ridge", "Edappal Central", "Ponnani Port Area", "Tavanur Research Sector", "Melattur Foothills",
    "Alanallur Valley", "Mannarkkad Forest Border", "Attappadi Valley", "Agali Highlands", "Kottathara",
    "Kanjirapuzha Dam Reach", "Karimpuzha Basin", "Sreekrishnapuram", "Kadampazhipuram", "Kongad Sector",
    "Parli Junction", "Palakkad Fort Zone", "Kalpathy Heritage Reach", "Pirayiri North", "Mundur Valley",
    "Puduppariyaram", "Malampuzha Foothills", "Walayar Border Reach", "Kozhinjampara Sector", "Chittur South",
    "Nemmara Valley", "Nelliyampathy Heights", "Alathur Central", "Vadakkencherry Pass", "Kuzhalmannam East",
    "Kottayi River Sector", "Tharur Plains", "Pazhayannur Sector", "Chelakkara North", "Wadakkanchery Junction",
    "Kunnamkulam Market Reach", "Guruvayur East", "Chavakkad Coastal", "Peringottukurissi", "Mankara Riverbank",
    "Pathiripala Central", "Perur Highland", "Kizhur Sector", "Vaniyamkulam Valley", "Kothakurssi",
    "Ambalapara Hills", "Chunangad Reach", "Varode North", "Kanniyampuram Sector", "Panamanna South",
    "Kalladipatta Valley", "Thrikkadeeri", "Cherpalchery Central", "Karalmanna Reach", "Thuvvur Sector",
    "Karuvarakundu Foothills", "Kalikavu Forest Zone", "Wandoor Central", "Nilambur Teak Valley", "Edakkara Sector",
    "Pothukal Riverbank", "Chungathara North", "Vazhikkadavu Ghats", "Munderi Colony", "Meppadi Tea Estate",
    "Vellarimala Peak", "Chembra Peak Foothills", "Kalpetta South", "Vythiri Mist Zone", "Pozhuthana River Basin",
    "Thariode Reservoir", "Padinjarathara Dam Reach", "Banasura Valley", "Mananthavady North", "Panamaram Riverbank",
    "Sulthan Bathery East", "Ambalavayal Ridge", "Muthanga Sanctuary Border", "Meenangadi Central", "Pulpally Plains"
]

scenario_windows = {
    'severe_silence': {'window': '2026-08-03 10:00:00', 'label': 'Disaster Peak (Severe Silence)', 'description': 'Severe multi-sector outage impacting critical communication and mobility'},
    'complete_silence': {'window': '2026-08-04 10:00:00', 'label': 'Catastrophic Outage (Complete Silence)', 'description': 'Total communication blackout in epicenter cells'},
    'partial_silence': {'window': '2026-08-02 12:00:00', 'label': 'Early Incident (Partial Silence)', 'description': 'Localized signal attenuation during early storm impact'},
    'disaster_progression': {'window': '2026-08-05 13:00:00', 'label': 'Disaster Progression (Evolving)', 'description': 'Dynamic hazard movement with partial recovery in outer fringes'},
    'normal': {'window': '2026-08-01 12:00:00', 'label': 'Baseline (Normal Operations)', 'description': 'Nominal telemetry with natural urban-rural variation'}
}

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.scoring import score_cell

scenario_data = {}

for s_key, s_info in scenario_windows.items():
    win = s_info['window']
    exp_w = expected_df[expected_df['window_start'] == win]
    act_w = actual_df[actual_df['window_start'] == win]
    merged = pd.merge(exp_w, act_w, on=['cell_id', 'window_start', 'signal_type_id'])
    merged['weight'] = merged['signal_type_id'].map(weights)
    
    cell_results = {}
    for cell_id, group in merged.groupby('cell_id'):
        rows = group.to_dict('records')
        res = score_cell(rows, weights)
        cell_results[cell_id] = {
            'score': res['score_pct'],
            'breakdown': res['breakdown']
        }
    scenario_data[s_key] = cell_results

features_polygons = []
features_points = []
cells_list = []

for idx, row in cells_df.iterrows():
    cell_code = row['cell_id']
    lat = float(row['latitude'])
    lng = float(row['longitude'])
    wkt = row['geometry_wkt']
    cell_type = row['cell_type']
    population = int(row['population'])
    buildings = int(row['building_count'])
    road_km = float(row['road_length_km'])
    hospitals = int(row['hospital_count'])
    shelters = int(row['shelter_count'])
    schools = int(row['school_count'])
    
    # Align severe silence cells with canonical disaster sectors
    if cell_code == 'C001':
        cell_id = 'WYD-07C'
        place = 'Mundakkai North'
    elif cell_code == 'C006':
        cell_id = 'WYD-09A'
        place = 'Attamala East'
    elif cell_code == 'C014':
        cell_id = 'WYD-04F'
        place = 'Chooralmala Ridge'
    elif cell_code == 'C021':
        cell_id = 'WYD-11B'
        place = 'Punchirimattam'
    else:
        cell_id = cell_code
        place = place_names[idx % len(place_names)]

    poly_coords = parse_wkt_polygon(wkt)
    
    default_scenario = scenario_data['severe_silence'].get(cell_code, {'score': 20, 'breakdown': {}})
    default_score = default_scenario['score']
    
    reports_expected = max(10, int(round(population / 150)))
    reports_observed = max(0, int(round(reports_expected * (1.0 - default_score / 100.0))))
    
    cell_item = {
        'id': cell_id,
        'cell_code': cell_code,
        'index': idx,
        'place': place,
        'latitude': lat,
        'longitude': lng,
        'cell_type': cell_type,
        'population': population,
        'building_count': buildings,
        'road_length_km': round(road_km, 1),
        'hospital_count': hospitals,
        'shelter_count': shelters,
        'school_count': schools,
        'score': default_score,
        'defaultScore': default_score,
        'reportsExpected': reports_expected,
        'reportsObserved': reports_observed,
        'lastSignal': '14m ago' if default_score < 40 else '1h 45m ago' if default_score < 70 else '6h 12m ago' if default_score < 85 else '9h 30m ago',
        'confidence': min(98, max(65, 75 + (idx % 11) * 2)),
        'scoresByScenario': {s: scenario_data[s].get(cell_code, {'score': 0})['score'] for s in scenario_windows},
        'breakdownsByScenario': {s: scenario_data[s].get(cell_code, {'breakdown': {}})['breakdown'] for s in scenario_windows}
    }
    cells_list.append(cell_item)
    
    features_polygons.append({
        'type': 'Feature',
        'id': idx,
        'properties': {
            'id': cell_id,
            'index': idx,
            'place': place,
            'cell_type': cell_type,
            'population': population,
            'score': default_score,
            'hospitals': hospitals,
            'shelters': shelters,
            'road_km': round(road_km, 1)
        },
        'geometry': {
            'type': 'Polygon',
            'coordinates': [poly_coords]
        }
    })
    
    features_points.append({
        'type': 'Feature',
        'id': idx,
        'properties': {
            'id': cell_id,
            'index': idx,
            'place': place,
            'score': default_score,
            'population': population,
            'cell_type': cell_type
        },
        'geometry': {
            'type': 'Point',
            'coordinates': [lng, lat]
        }
    })

ranked = sorted(cells_list, key=lambda c: c['defaultScore'], reverse=True)
silent_zones = []
for z in ranked[:6]:
    score = z['defaultScore']
    sev = 'critical' if score >= 85 else 'warning' if score >= 65 else 'watch'
    silent_duration = '9h 45m' if score >= 90 else '6h 20m' if score >= 80 else '3h 40m'
    silent_zones.append({
        'id': z['id'],
        'place': z['place'],
        'score': score,
        'population': z['population'],
        'silent': silent_duration,
        'confidence': z['confidence'],
        'severity': sev,
        'latitude': z['latitude'],
        'longitude': z['longitude']
    })

all_lats = [c['latitude'] for c in cells_list]
all_lngs = [c['longitude'] for c in cells_list]
bbox = {
    'minLng': min(all_lngs) - 0.02,
    'minLat': min(all_lats) - 0.02,
    'maxLng': max(all_lngs) + 0.02,
    'maxLat': max(all_lats) + 0.02,
    'centerLng': sum(all_lngs) / len(all_lngs),
    'centerLat': sum(all_lats) / len(all_lats)
}

output_data = {
    'bbox': bbox,
    'scenarios': scenario_windows,
    'cells': cells_list,
    'silentZones': silent_zones,
    'polygonsGeoJson': {
        'type': 'FeatureCollection',
        'features': features_polygons
    },
    'pointsGeoJson': {
        'type': 'FeatureCollection',
        'features': features_points
    }
}

with open('src/data/geographicSilenceData.json', 'w') as f:
    json.dump(output_data, f, indent=2)

print('Successfully generated geographicSilenceData.json')
print(f'Total cells: {len(cells_list)}')
print(f'Bounding Box: {bbox}')
print(f'Top silent zones count: {len(silent_zones)}')
for z in silent_zones:
    print(f"  Zone {z['id']}: {z['place']} - Score {z['score']} ({z['severity']})")
