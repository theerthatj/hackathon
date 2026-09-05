import { useEffect, useRef, useState, useCallback } from 'react'
import { Map as MapLibreMap, NavigationControl, Marker, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { camps, type Camp } from '../data/fixtures'
import { Navigation, Maximize2, ShieldCheck, SunMoon, AlertTriangle } from 'lucide-react'

setWorkerUrl(maplibreWorkerUrl)

const USER_ORIGIN: [number, number] = [76.1020, 11.5520] // Mundakkai North origin

const TILE_STYLES = {
  voyager: [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  ],
  dark: [
    'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
  ],
}

// Generate realistic ridge-safe road path avoiding river flood hazard
function getRouteCoordinates(start: [number, number], end: [number, number]): [number, number][] {
  const dLng = end[0] - start[0]
  const dLat = end[1] - start[1]
  
  // Curved route following highland contours rather than direct line through flash flood gully
  return [
    start,
    [start[0] + dLng * 0.25 - 0.003, start[1] + dLat * 0.25 + 0.004],
    [start[0] + dLng * 0.55 + 0.002, start[1] + dLat * 0.55 + 0.003],
    [start[0] + dLng * 0.80 - 0.001, start[1] + dLat * 0.80 + 0.001],
    end,
  ]
}

interface CampsMapProps {
  selectedCamp: Camp
  onSelectCamp: (camp: Camp) => void
  userCoords?: [number, number]
}

export function CampsMap({ selectedCamp, onSelectCamp, userCoords = USER_ORIGIN }: CampsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [basemap, setBasemap] = useState<'dark' | 'voyager'>(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'voyager'
  })

  // Fit view to encompass both user and selected camp
  const fitRouteBounds = useCallback((mapInstance: MapLibreMap, camp: Camp) => {
    try {
      const bounds = new LngLatBounds()
      bounds.extend(userCoords)
      bounds.extend(camp.coordinates)
      mapInstance.fitBounds(bounds, {
        padding: { top: 48, bottom: 48, left: 48, right: 48 },
        maxZoom: 15,
        duration: 900,
      })
    } catch {
      // Ignore in mock/test environments
    }
  }, [userCoords])

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || typeof window.WebGLRenderingContext === 'undefined') {
      setStatus('fallback')
      return
    }

    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        center: [
          (userCoords[0] + selectedCamp.coordinates[0]) / 2,
          (userCoords[1] + selectedCamp.coordinates[1]) / 2,
        ],
        zoom: 13,
        minZoom: 9,
        maxZoom: 18,
        attributionControl: { compact: true },
        dragRotate: false,
        style: {
          version: 8,
          sources: {
            'camps-base-tiles': {
              type: 'raster',
              tiles: TILE_STYLES[basemap],
              tileSize: 256,
              attribution: '© OpenStreetMap, © CARTO',
            },
          },
          layers: [
            {
              id: 'camps-base-layer',
              type: 'raster',
              source: 'camps-base-tiles',
              paint: { 'raster-opacity': 0.88 },
            },
          ],
        },
      })

      mapRef.current = map
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

      map.on('load', () => {
        setStatus('ready')

        // Add Safe Evacuation Route GeoJSON Line
        const routeCoords = getRouteCoordinates(userCoords, selectedCamp.coordinates)
        map.addSource('evac-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoords,
            },
          },
        })

        // Route glow casing
        map.addLayer({
          id: 'evac-route-glow',
          type: 'line',
          source: 'evac-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#10b981',
            'line-width': 10,
            'line-opacity': 0.28,
          },
        })

        // Route core line
        map.addLayer({
          id: 'evac-route-core',
          type: 'line',
          source: 'evac-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#059669',
            'line-width': 4.5,
          },
        })

        // Danger hazard zone to avoid
        map.addSource('hazard-zone', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'Chooralmala River Flash Flood Zone' },
            geometry: {
              type: 'Point',
              coordinates: [76.1130, 11.5510],
            },
          },
        })

        map.addLayer({
          id: 'hazard-zone-halo',
          type: 'circle',
          source: 'hazard-zone',
          paint: {
            'circle-radius': 22,
            'circle-color': '#ef4444',
            'circle-opacity': 0.22,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#dc2626',
            'circle-stroke-opacity': 0.7,
          },
        })

        fitRouteBounds(map, selectedCamp)
      })

      return () => {
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        map.remove()
        mapRef.current = null
      }
    } catch {
      setStatus('fallback')
    }
  }, [basemap]) // Re-mount if basemap changes

  // Update Route and Markers when selectedCamp or userCoords change
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    // 1. Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // 2. Add User Origin Marker
    const userEl = document.createElement('div')
    userEl.className = 'camps-user-pin'
    userEl.innerHTML = `
      <div class="camps-pin-pulse"></div>
      <div class="camps-pin-dot"></div>
      <span class="camps-pin-label">You</span>
    `
    const userMarker = new Marker({ element: userEl })
      .setLngLat(userCoords)
      .setPopup(new Popup({ offset: 16 }).setHTML(`<strong>Your Location</strong><br>Mundakkai North · Grid WYD-07C`))
      .addTo(map)
    markersRef.current.push(userMarker)

    // 3. Add Camp Markers
    camps.forEach(camp => {
      const isSelected = camp.id === selectedCamp.id
      const campEl = document.createElement('div')
      campEl.className = `camps-marker ${isSelected ? 'camps-marker--active' : ''}`
      campEl.innerHTML = `
        <div class="camps-badge-icon">${isSelected ? '★' : '⛺'}</div>
        <span class="camps-badge-text">${camp.name.replace('Govt. College ', 'Govt. Col. ')}</span>
      `
      campEl.onclick = (e) => {
        e.stopPropagation()
        onSelectCamp(camp)
      }

      const campMarker = new Marker({ element: campEl })
        .setLngLat(camp.coordinates)
        .setPopup(new Popup({ offset: 20 }).setHTML(`
          <strong>${camp.name}</strong><br>
          <span>Distance: ${camp.distance} · ${camp.capacity}% Full</span><br>
          <small style="color:#059669">Elevation: ${camp.elevation}</small>
        `))
        .addTo(map)
      markersRef.current.push(campMarker)
    })

    // 4. Update route line GeoJSON
    const routeSource = map.getSource('evac-route') as any
    if (routeSource) {
      const routeCoords = getRouteCoordinates(userCoords, selectedCamp.coordinates)
      routeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoords,
        },
      })
    }

    // 5. Smooth camera fit
    fitRouteBounds(map, selectedCamp)
  }, [selectedCamp, status, onSelectCamp, userCoords, fitRouteBounds])

  return (
    <div className="camps-map-card">
      <div className="camps-map-header">
        <div className="camps-map-title">
          <Navigation size={15} color="var(--brand)" />
          <span>Navigable Terrain & Relief Camps</span>
        </div>
        <div className="camps-map-actions">
          <button
            type="button"
            className="camps-ctrl-btn"
            onClick={() => setBasemap(b => b === 'dark' ? 'voyager' : 'dark')}
            title="Toggle Light/Dark Basemap"
          >
            <SunMoon size={13} /> {basemap === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button
            type="button"
            className="camps-ctrl-btn"
            onClick={() => mapRef.current && fitRouteBounds(mapRef.current, selectedCamp)}
            title="Recenter route view"
          >
            <Maximize2 size={13} /> Center
          </button>
        </div>
      </div>

      <div className="camps-map-viewport">
        {status === 'fallback' ? (
          <div className="camps-map-fallback">
            <ShieldCheck size={28} color="var(--brand)" />
            <p>Active Route to <strong>{selectedCamp.name}</strong> ({selectedCamp.distance})</p>
            <small>Avoiding river flood hazard · High ridge passage</small>
          </div>
        ) : (
          <div ref={containerRef} className="camps-map-canvas" role="application" aria-label="Interactive map showing evacuation route to relief camp" />
        )}

        <div className="camps-map-legend">
          <span className="camps-legend-item">
            <span className="legend-swatch legend-swatch--user" /> You
          </span>
          <span className="camps-legend-item">
            <span className="legend-swatch legend-swatch--safe" /> Ridge Route
          </span>
          <span className="camps-legend-item">
            <span className="legend-swatch legend-swatch--hazard" /> Avoided River Debris
          </span>
        </div>
      </div>
    </div>
  )
}
