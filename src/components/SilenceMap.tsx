import { useEffect, useRef, useState, useCallback } from 'react'
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl, type ExpressionSpecification } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { geographicSilenceData, type SilenceCell, type SilentZone } from '../data/fixtures'
import { Eye, EyeOff, Layers, MapPin, Maximize2, ShieldAlert, Sparkles, SunMoon } from 'lucide-react'

setWorkerUrl(maplibreWorkerUrl)

const geoData = geographicSilenceData

// Authentic thermal palette matching Image 2
const THERMAL_HEATMAP_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['heatmap-density'],
  0.0, 'rgba(0, 0, 0, 0)',
  0.1, '#0284c7',        // deep azure blue (low silence / nominal)
  0.25, '#06b6d4',       // electric cyan
  0.42, '#10b981',       // emerald / lime
  0.58, '#fbbf24',       // golden amber
  0.72, '#f97316',       // vivid flame orange
  0.86, '#dc2626',       // bright crimson red
  1.0, '#7f1d1d',        // deep maroon thermal core
]

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
  satellite: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
}

type MapStatus = 'loading' | 'ready' | 'error'
type ViewMode = 'thermal' | 'polygons' | 'both'
type BasemapKey = 'voyager' | 'dark' | 'satellite'

interface SilenceMapProps {
  selectedId: string
  onSelect: (cell: SilenceCell) => void
  activeScenario?: string
}

export function SilenceMap({ selectedId, onSelect, activeScenario = 'severe_silence' }: SilenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onSelectRef = useRef(onSelect)
  const initialSelectedId = useRef(selectedId)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [basemap, setBasemap] = useState<BasemapKey>(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'voyager'
  })

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // Build GeoJSON features dynamically for active scenario
  const getGeoJsonForScenario = useCallback((scenarioKey: string) => {
    const pointsFeatures = geoData.cells.map((cell: any) => {
      const score = (cell.scoresByScenario as Record<string, number>)?.[scenarioKey] ?? cell.score ?? 20
      return {
        type: 'Feature' as const,
        id: cell.index,
        properties: {
          id: cell.id,
          cell_code: cell.cell_code,
          place: cell.place,
          score,
          population: cell.population,
          cell_type: cell.cell_type,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [cell.longitude, cell.latitude],
        },
      }
    })

    const polygonFeatures = geoData.polygonsGeoJson.features.map((feature: any) => {
      const cell = geoData.cells.find((c: any) => c.index === feature.id)
      const score = (cell?.scoresByScenario as Record<string, number>)?.[scenarioKey] ?? cell?.score ?? 20
      return {
        ...feature,
        properties: {
          ...feature.properties,
          score,
        },
      }
    })

    const silentZoneFeatures = geoData.silentZones.map((zone: any) => {
      const cell = geoData.cells.find((c: any) => c.id === zone.id)
      const score = (cell?.scoresByScenario as Record<string, number>)?.[scenarioKey] ?? zone.score
      return {
        type: 'Feature' as const,
        id: zone.id,
        properties: {
          id: zone.id,
          place: zone.place,
          score,
          silent: zone.silent,
          severity: score >= 85 ? 'critical' : score >= 65 ? 'warning' : 'watch',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [zone.longitude ?? cell?.longitude, zone.latitude ?? cell?.latitude],
        },
      }
    })

    return {
      points: { type: 'FeatureCollection' as const, features: pointsFeatures },
      polygons: { type: 'FeatureCollection' as const, features: polygonFeatures },
      zones: { type: 'FeatureCollection' as const, features: silentZoneFeatures },
    }
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || typeof window.WebGLRenderingContext === 'undefined') return

    const initialData = getGeoJsonForScenario(activeScenario)

    const map = new MapLibreMap({
      container: containerRef.current,
      center: [geoData.bbox.centerLng, geoData.bbox.centerLat],
      zoom: 11,
      minZoom: 8,
      maxZoom: 18,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: TILE_STYLES[basemap],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO / Esri',
          },
        },
        layers: [
          {
            id: 'base-background',
            type: 'background',
            paint: { 'background-color': '#111827' },
          },
          {
            id: 'base-tiles-layer',
            type: 'raster',
            source: 'base-tiles',
            paint: {
              'raster-opacity': basemap === 'satellite' ? 0.95 : 0.88,
            },
          },
        ],
      },
    })

    const setupLayers = () => {
      if (map.getSource('silence-polygons')) return

      map.addSource('silence-points', { type: 'geojson', data: initialData.points })
      map.addSource('silence-polygons', { type: 'geojson', data: initialData.polygons })
      map.addSource('silent-zones', { type: 'geojson', data: initialData.zones })

      // 1. Thermal Heatmap Layer (Continuous gradient matching Image 2)
      map.addLayer({
        id: 'silence-heatmap',
        type: 'heatmap',
        source: 'silence-points',
        maxzoom: 18,
        paint: {
          // Weight increases sharply for high silence scores
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0, 0.05,
            25, 0.2,
            50, 0.5,
            75, 0.85,
            90, 1.1,
            100, 1.4,
          ],
          // Intensity scales with zoom for rich spatial coverage
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 1.4,
            11, 2.6,
            14, 4.2,
            17, 5.0,
          ],
          'heatmap-color': THERMAL_HEATMAP_EXPRESSION,
          // Broad smooth radius ensures seamless thermal field without isolated circles
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 42,
            10, 85,
            12, 145,
            15, 230,
          ],
          'heatmap-opacity': 0.86,
        },
      })

      // 2. Geographic Cell Polygon Fill Layer (semi-transparent, interactive)
      map.addLayer({
        id: 'silence-fill',
        type: 'fill',
        source: 'silence-polygons',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0, 'rgba(2, 132, 199, 0.08)',
            45, 'rgba(16, 185, 129, 0.12)',
            65, 'rgba(245, 158, 11, 0.20)',
            85, 'rgba(220, 38, 38, 0.32)',
            100, 'rgba(127, 29, 29, 0.45)',
          ],
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.65, 0.28],
        },
      })

      // 3. Geographic Cell Boundary Lines
      map.addLayer({
        id: 'silence-outline',
        type: 'line',
        source: 'silence-polygons',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.4)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 1.5],
          'line-opacity': 0.75,
        },
      })

      // 4. Selected Cell Highlight Ring
      map.addLayer({
        id: 'silence-selected',
        type: 'line',
        source: 'silence-polygons',
        filter: ['==', ['get', 'id'], initialSelectedId.current],
        paint: {
          'line-color': '#ffffff',
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      })

      // 5. Critical Silence Zone Core Markers
      map.addLayer({
        id: 'silent-zone-markers',
        type: 'circle',
        source: 'silent-zones',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 7, 13, 11, 16, 15],
          'circle-color': [
            'step',
            ['get', 'score'],
            '#fbbf24',
            65, '#f97316',
            85, '#dc2626',
            95, '#7f1d1d',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-opacity': 0.95,
        },
      })

      // 6. Zone Labels
      map.addLayer({
        id: 'silent-zone-labels',
        type: 'symbol',
        source: 'silent-zones',
        layout: {
          'text-field': ['concat', ['get', 'place'], '\n', ['get', 'id'], ' · score ', ['get', 'score']],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.9],
          'text-allow-overlap': true,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.85)',
          'text-halo-width': 2.5,
        },
      })

      // Fit map view to exact Kerala cell bounding box
      map.fitBounds(
        [
          [geoData.bbox.minLng, geoData.bbox.minLat],
          [geoData.bbox.maxLng, geoData.bbox.maxLat],
        ],
        { padding: 24, duration: 0 }
      )
      map.resize()
      setStatus('ready')

      // Interactive Hover & Popups
      let hoveredId: string | number | null = null
      const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12 })

      map.on('mousemove', 'silence-fill', event => {
        const feature = event.features?.[0]
        if (!feature) return
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-polygons', id: hoveredId }, { hover: false })
        hoveredId = feature.id ?? null
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-polygons', id: hoveredId }, { hover: true })
        map.getCanvas().style.cursor = 'pointer'

        const props = feature.properties as any
        const content = document.createElement('div')
        content.className = 'map-popup'
        content.innerHTML = `
          <div style="font-weight:700;font-size:12px;color:var(--fg-strong);display:flex;align-items:center;gap:4px;">
            <span>${props.place}</span>
            <small style="opacity:0.75;font-size:10px;">(${props.id})</small>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${
              props.score >= 85 ? '#dc2626' : props.score >= 65 ? '#f97316' : props.score >= 45 ? '#fbbf24' : '#10b981'
            }"></span>
            <span style="font-weight:800;font-size:11px;">Silence Score: ${props.score}/100</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">
            Pop: ${Number(props.population).toLocaleString()} · Type: ${props.cell_type ?? 'sector'}
          </div>
        `
        popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map)
      })

      map.on('mouseleave', 'silence-fill', () => {
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-polygons', id: hoveredId }, { hover: false })
        hoveredId = null
        map.getCanvas().style.cursor = ''
        popup.remove()
      })

      map.on('click', 'silence-fill', event => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ['silence-fill'] })[0]
        if (!feature?.properties) return
        const cell = geoData.cells.find((item: any) => item.id === feature.properties.id || item.cell_code === feature.properties.id)
        if (cell) onSelectRef.current(cell as unknown as SilenceCell)
      })

      map.on('click', 'silent-zone-markers', event => {
        const feature = event.features?.[0]
        if (!feature?.properties) return
        const cell = geoData.cells.find((item: any) => item.id === feature.properties.id || item.cell_code === feature.properties.id)
        if (cell) onSelectRef.current(cell as unknown as SilenceCell)
      })
    }

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', event => {
      if (!map.getLayer('silence-heatmap')) setStatus('error')
      console.warn('MapLibre event note:', event.error?.message)
    })

    if (map.isStyleLoaded()) setupLayers()
    else map.once('load', setupLayers)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update selected cell highlight filter
  useEffect(() => {
    const map = mapRef.current
    if (map?.getLayer('silence-selected')) {
      map.setFilter('silence-selected', ['==', ['get', 'id'], selectedId])
    }
  }, [selectedId])

  // Update GeoJSON sources when active scenario changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const updatedData = getGeoJsonForScenario(activeScenario)
    const pointsSource = map.getSource('silence-points') as any
    const polySource = map.getSource('silence-polygons') as any
    const zonesSource = map.getSource('silent-zones') as any

    if (pointsSource) pointsSource.setData(updatedData.points)
    if (polySource) polySource.setData(updatedData.polygons)
    if (zonesSource) zonesSource.setData(updatedData.zones)
  }, [activeScenario, getGeoJsonForScenario, status])

  // Toggle view modes (Thermal, Polygons, Both)
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const showHeatmap = viewMode === 'thermal' || viewMode === 'both'
    const showPolygons = viewMode === 'polygons' || viewMode === 'both'

    if (map.getLayer('silence-heatmap')) {
      map.setLayoutProperty('silence-heatmap', 'visibility', showHeatmap ? 'visible' : 'none')
    }
    if (map.getLayer('silence-fill')) {
      map.setLayoutProperty('silence-fill', 'visibility', showPolygons ? 'visible' : 'none')
    }
    if (map.getLayer('silence-outline')) {
      map.setLayoutProperty('silence-outline', 'visibility', showPolygons ? 'visible' : 'none')
    }
  }, [viewMode, status])

  // Switch basemap layer dynamically
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const baseSource = map.getSource('base-tiles') as any
    if (baseSource && typeof baseSource.setTiles === 'function') {
      baseSource.setTiles(TILE_STYLES[basemap])
    }
  }, [basemap, status])

  const handleRecenter = () => {
    mapRef.current?.fitBounds(
      [
        [geoData.bbox.minLng, geoData.bbox.minLat],
        [geoData.bbox.maxLng, geoData.bbox.maxLat],
      ],
      { padding: 24, duration: 800 }
    )
  }

  return (
    <div className="silence-map-wrap">
      {/* Interactive Map Header Controls */}
      <div className="silence-map-controls" role="toolbar" aria-label="Map display controls">
        <div className="control-group">
          <span className="control-label"><Sparkles size={13} /> View:</span>
          <button
            type="button"
            className={`map-ctrl-btn ${viewMode === 'thermal' ? 'active' : ''}`}
            onClick={() => setViewMode('thermal')}
            title="Thermal Gradient (Image 2 aesthetic)"
          >
            Thermal
          </button>
          <button
            type="button"
            className={`map-ctrl-btn ${viewMode === 'both' ? 'active' : ''}`}
            onClick={() => setViewMode('both')}
            title="Combined Thermal Heatmap & Sector Boundaries"
          >
            Combined
          </button>
          <button
            type="button"
            className={`map-ctrl-btn ${viewMode === 'polygons' ? 'active' : ''}`}
            onClick={() => setViewMode('polygons')}
            title="Geographic Polygons only"
          >
            Zones
          </button>
        </div>

        <div className="control-group">
          <span className="control-label"><Layers size={13} /> Base:</span>
          <button
            type="button"
            className={`map-ctrl-btn ${basemap === 'voyager' ? 'active' : ''}`}
            onClick={() => setBasemap('voyager')}
            title="Carto Voyager / Street Map"
          >
            Terrain
          </button>
          <button
            type="button"
            className={`map-ctrl-btn ${basemap === 'dark' ? 'active' : ''}`}
            onClick={() => setBasemap('dark')}
            title="Dark Tactical Cartography"
          >
            Dark
          </button>
          <button
            type="button"
            className={`map-ctrl-btn ${basemap === 'satellite' ? 'active' : ''}`}
            onClick={() => setBasemap('satellite')}
            title="Satellite Aerial Imagery"
          >
            Satellite
          </button>
          <button
            type="button"
            className="map-ctrl-btn map-recenter-btn"
            onClick={handleRecenter}
            title="Re-center onto all 100 Kerala sectors"
          >
            <Maximize2 size={12} /> Fit
          </button>
        </div>
      </div>

      {/* MapLibre Canvas Container */}
      <div
        className="silence-map"
        ref={containerRef}
        role="application"
        aria-label="Interactive geographic map of Kerala silence zones with continuous thermal gradient"
      />

      {/* Status Overlay Badge */}
      <span className={`map-layer-state map-layer-state--${status}`}>
        {status === 'ready' ? (
          <>
            <span className="live-indicator-dot" />
            {geoData.cells.length} geographic cells · {geoData.silentZones.length} critical zones
          </>
        ) : status === 'error' ? (
          'Score layer unavailable'
        ) : (
          'Loading geographic tiles…'
        )}
      </span>
    </div>
  )
}
