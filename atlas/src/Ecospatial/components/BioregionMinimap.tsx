/**
 * BioregionMinimap - Small map showing a bioregion's location
 */
import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl';
import { loadBioregionGeoJSON } from '../../modules/intelligence/bioregionIntelligence';
import type { FillLayer, LineLayer } from 'mapbox-gl';

interface BioregionMinimapProps {
  bioregionCode: string;
  className?: string;
}

export function BioregionMinimap({ bioregionCode, className = '' }: BioregionMinimapProps) {
  const mapRef = useRef<MapRef>(null);
  const [bioregionFeature, setBioregionFeature] = useState<GeoJSON.Feature | null>(null);
  const [centroid, setCentroid] = useState<[number, number] | null>(null);

  useEffect(() => {
    loadBioregionGeoJSON().then((geojson) => {
      const feature = geojson.features.find(
        (f) => f.properties?.code === bioregionCode
      );
      if (feature) {
        setBioregionFeature(feature);
        const c = feature.properties?.centroid;
        if (c) {
          setCentroid(typeof c === 'string' ? JSON.parse(c) : c);
        }
      }
    });
  }, [bioregionCode]);

  // Fly to bioregion when loaded
  useEffect(() => {
    if (mapRef.current && centroid) {
      mapRef.current.flyTo({
        center: centroid,
        zoom: 2,
        duration: 1000,
      });
    }
  }, [centroid]);

  const fillLayer: FillLayer = {
    id: 'bioregion-fill',
    type: 'fill',
    source: 'bioregion',
    paint: {
      'fill-color': bioregionFeature?.properties?.color || '#8B5CF6',
      'fill-opacity': 0.4,
    },
  };

  const outlineLayer: LineLayer = {
    id: 'bioregion-outline',
    type: 'line',
    source: 'bioregion',
    paint: {
      'line-color': bioregionFeature?.properties?.color || '#8B5CF6',
      'line-width': 2,
    },
  };

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string}
        initialViewState={{
          longitude: centroid?.[0] || 0,
          latitude: centroid?.[1] || 20,
          zoom: 1,
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        attributionControl={false}
        interactive={false}
        style={{ width: '100%', height: '100%' }}
      >
        {bioregionFeature && (
          <Source
            id="bioregion"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: [bioregionFeature],
            }}
          >
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}
      </Map>
    </div>
  );
}

export default BioregionMinimap;
