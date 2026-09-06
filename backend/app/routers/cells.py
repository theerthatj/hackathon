import json
from typing import Optional
from fastapi import APIRouter, Query
from app.db import get_db

router = APIRouter(prefix="/api/cells", tags=["cells"])


@router.get("")
def get_cells(bbox: Optional[str] = Query(None, description="Bounding box w,s,e,n")):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Check bounding box filter if provided
            where_clause = ""
            params = []
            if bbox:
                try:
                    w, s, e, n = [float(x.strip()) for x in bbox.split(",")]
                    where_clause = "WHERE ST_Intersects(geometry, ST_MakeEnvelope(%s, %s, %s, %s, 4326))"
                    params = [w, s, e, n]
                except Exception:
                    where_clause = ""

            cur.execute(
                f"""
                SELECT 
                    c.cell_id,
                    c.latitude,
                    c.longitude,
                    c.cell_type,
                    c.population,
                    c.household_count,
                    c.building_count,
                    c.road_length_km,
                    c.population_density,
                    ST_AsGeoJSON(c.geometry)::json as polygon_geojson,
                    ST_AsGeoJSON(ST_Centroid(c.geometry))::json as point_geojson
                FROM spatial_cells c
                {where_clause}
                ORDER BY c.cell_id
                """,
                params,
            )
            cells = cur.fetchall()

            # Pre-fetch silence scores grouped by cell_id
            cur.execute(
                """
                SELECT cell_id, scenario_id, score, confidence, breakdown
                FROM silence_scores
                """
            )
            score_rows = cur.fetchall()
            scores_by_cell: dict[str, dict] = {}
            for sr in score_rows:
                cid = sr["cell_id"]
                sc_id = sr["scenario_id"]
                if cid not in scores_by_cell:
                    scores_by_cell[cid] = {"scores": {}, "confidences": {}, "breakdowns": {}}
                scores_by_cell[cid]["scores"][sc_id] = int(round(float(sr["score"]) * 100))
                scores_by_cell[cid]["confidences"][sc_id] = float(sr["confidence"])
                scores_by_cell[cid]["breakdowns"][sc_id] = sr["breakdown"] if isinstance(sr["breakdown"], dict) else json.loads(sr["breakdown"])

            polygon_features = []
            point_features = []
            cells_list = []

            for c in cells:
                cid = c["cell_id"]
                cell_meta = scores_by_cell.get(cid, {"scores": {}, "confidences": {}, "breakdowns": {}})
                props = {
                    "cell_id": cid,
                    "cell_type": c["cell_type"],
                    "population": c["population"],
                    "household_count": c["household_count"],
                    "building_count": c["building_count"],
                    "road_length_km": float(c["road_length_km"]) if c["road_length_km"] else 0.0,
                    "population_density": float(c["population_density"]) if c["population_density"] else 0.0,
                    "scores": cell_meta["scores"],
                    "confidences": cell_meta["confidences"],
                    "breakdowns": cell_meta["breakdowns"],
                }

                cells_list.append({
                    "id": cid,
                    "cell_code": cid,
                    "lat": float(c["latitude"]),
                    "lng": float(c["longitude"]),
                    "type": c["cell_type"],
                    "population": c["population"],
                    "scores": cell_meta["scores"],
                    "confidences": cell_meta["confidences"],
                })

                polygon_features.append({
                    "type": "Feature",
                    "id": cid,
                    "geometry": c["polygon_geojson"],
                    "properties": props,
                })

                point_features.append({
                    "type": "Feature",
                    "id": f"{cid}_point",
                    "geometry": c["point_geojson"],
                    "properties": props,
                })

            return {
                "cells": cells_list,
                "polygons": {
                    "type": "FeatureCollection",
                    "features": polygon_features,
                },
                "points": {
                    "type": "FeatureCollection",
                    "features": point_features,
                },
            }
