import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, Popup, type ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { silenceCells, type SilenceCell } from '../data/fixtures'

const west = 76.066
const north = 11.573
const longitudeStep = 0.009
const latitudeStep = 0.007

const cellFeatures = silenceCells.map((cell, index) => {
  const left = west + cell.column * longitudeStep
  const right = left + longitudeStep
  const top = north - cell.row * latitudeStep
  const bottom = top - latitudeStep
  return {
    type: 'Feature' as const,
    id: index,
    properties: { id: cell.id, place: cell.place, score: cell.score },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]]],
    },
  }
})

const cellGeoJson = { type: 'FeatureCollection' as const, features: cellFeatures }
const pointGeoJson = {
  type: 'FeatureCollection' as const,
  features: cellFeatures.map(feature => ({
    type: 'Feature' as const,
    id: feature.id,
    properties: feature.properties,
    geometry: {
      type: 'Point' as const,
      coordinates: [
        (feature.geometry.coordinates[0][0][0] + feature.geometry.coordinates[0][1][0]) / 2,
        (feature.geometry.coordinates[0][0][1] + feature.geometry.coordinates[0][2][1]) / 2,
      ],
    },
  })),
}

function cssColor(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function cellColorExpression(): ExpressionSpecification {
  return ['step', ['get', 'score'], cssColor('--safe'), 45, cssColor('--watch'), 65, cssColor('--warning'), 85, cssColor('--critical')]
}

function heatmapColorExpression(): ExpressionSpecification {
  return ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.18, cssColor('--safe'), 0.42, cssColor('--watch'), 0.68, cssColor('--warning'), 0.9, cssColor('--critical')]
}

type MapStatus = 'loading' | 'ready' | 'error'

export function SilenceMap({ selectedId, onSelect }: { selectedId: string; onSelect: (cell: SilenceCell) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onSelectRef = useRef(onSelect)
  const initialSelectedId = useRef(selectedId)
  const [status, setStatus] = useState<MapStatus>('loading')

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || typeof window.WebGLRenderingContext === 'undefined') return

    const map = new MapLibreMap({
      container: containerRef.current,
      center: [76.102, 11.552],
      zoom: 12,
      minZoom: 9,
      maxZoom: 17,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.85, 'raster-opacity': 0.72 } }],
      },
    })

    const setupLayers = () => {
      if (map.getSource('silence-cells')) return
      map.addSource('silence-points', { type: 'geojson', data: pointGeoJson })
      map.addSource('silence-cells', { type: 'geojson', data: cellGeoJson })
      map.addLayer({
        id: 'silence-heatmap',
        type: 'heatmap',
        source: 'silence-points',
        maxzoom: 17,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1.15, 15, 2.1],
          'heatmap-color': heatmapColorExpression(),
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 24, 13, 54, 16, 82],
          'heatmap-opacity': 0.88,
        },
      })
      map.addLayer({
        id: 'silence-fill',
        type: 'fill',
        source: 'silence-cells',
        paint: {
          'fill-color': cellColorExpression(),
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.42, 0.16],
        },
      })
      map.addLayer({
        id: 'silence-outline',
        type: 'line',
        source: 'silence-cells',
        paint: { 'line-color': cssColor('--surface'), 'line-width': 1.4, 'line-opacity': 0.82 },
      })
      map.addLayer({
        id: 'silence-selected',
        type: 'line',
        source: 'silence-cells',
        filter: ['==', ['get', 'id'], initialSelectedId.current],
        paint: { 'line-color': cssColor('--fg-strong'), 'line-width': 3.5 },
      })

      map.fitBounds([[west, north - latitudeStep * 6], [west + longitudeStep * 8, north]], { padding: 24, duration: 0 })
      setStatus('ready')

      let hoveredId: string | number | null = null
      const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10 })
      map.on('mousemove', 'silence-fill', event => {
        const feature = event.features?.[0]
        if (!feature) return
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-cells', id: hoveredId }, { hover: false })
        hoveredId = feature.id ?? null
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-cells', id: hoveredId }, { hover: true })
        map.getCanvas().style.cursor = 'pointer'
        const content = document.createElement('div')
        const title = document.createElement('strong')
        const score = document.createElement('span')
        title.textContent = String(feature.properties.place)
        score.textContent = `Silence score ${feature.properties.score}/100`
        content.className = 'map-popup'
        content.append(title, score)
        popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map)
      })
      map.on('mouseleave', 'silence-fill', () => {
        if (hoveredId !== null) map.setFeatureState({ source: 'silence-cells', id: hoveredId }, { hover: false })
        hoveredId = null
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
      map.on('click', 'silence-fill', event => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ['silence-fill'] })[0]
        const cell = silenceCells.find(item => item.id === feature?.properties.id)
        if (cell) onSelectRef.current(cell)
      })
    }

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', event => {
      if (!map.getLayer('silence-heatmap')) setStatus('error')
      console.error('MapLibre rendering error', event.error)
    })
    if (map.isStyleLoaded()) setupLayers()
    else map.once('load', setupLayers)

    const themeObserver = new MutationObserver(() => {
      if (!map.getLayer('silence-fill')) return
      map.setPaintProperty('silence-heatmap', 'heatmap-color', heatmapColorExpression())
      map.setPaintProperty('silence-fill', 'fill-color', cellColorExpression())
      map.setPaintProperty('silence-outline', 'line-color', cssColor('--surface'))
      map.setPaintProperty('silence-selected', 'line-color', cssColor('--fg-strong'))
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    mapRef.current = map

    return () => {
      themeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map?.getLayer('silence-selected')) map.setFilter('silence-selected', ['==', ['get', 'id'], selectedId])
  }, [selectedId])

  return <div className="silence-map-wrap">
    <div className="silence-map" ref={containerRef} role="application" aria-label="Interactive map of Wayanad cells colored by silence score" />
    <span className={`map-layer-state map-layer-state--${status}`}>{status === 'ready' ? `${silenceCells.length} score cells active` : status === 'error' ? 'Score layer unavailable' : 'Loading score layer…'}</span>
  </div>
}
