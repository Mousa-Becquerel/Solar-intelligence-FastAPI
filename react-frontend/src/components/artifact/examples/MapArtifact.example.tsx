/**
 * Map Artifact Example
 *
 * Example of how to display interactive maps in the artifact panel
 * Can be used with Leaflet, Mapbox, Google Maps, etc.
 */

import { useUIStore } from '../../../stores';

// Example map data
interface MapLocation {
  lat: number;
  lng: number;
  label: string;
  data?: Record<string, unknown>;
}

/**
 * Map component (replace with your actual map library)
 */
function MapComponent({ locations }: { locations: MapLocation[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Solar Installations Map
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {locations.length} locations
        </p>
      </div>

      {/* Map container */}
      <div style={{
        flex: 1,
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <p style={{ color: '#64748b' }}>
          Map would render here
        </p>
        {/*
          Replace with actual map library, e.g.:

          Leaflet:
          <MapContainer center={[51.505, -0.09]} zoom={5}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {locations.map((loc, idx) => (
              <Marker key={idx} position={[loc.lat, loc.lng]}>
                <Popup>{loc.label}</Popup>
              </Marker>
            ))}
          </MapContainer>

          or Mapbox:
          <Map
            initialViewState={{ latitude: 51.5, longitude: 0, zoom: 5 }}
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {locations.map((loc, idx) => (
              <Marker key={idx} latitude={loc.lat} longitude={loc.lng} />
            ))}
          </Map>
        */}
      </div>

      {/* Location list */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {locations.map((loc, idx) => (
          <div key={idx} style={{
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            background: '#f9fafb',
          }}>
            <div style={{ fontWeight: 500 }}>{loc.label}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: How to open a map artifact
 */
export function openMapArtifact(locations: MapLocation[]) {
  const { openArtifact } = useUIStore.getState();

  openArtifact(
    <MapComponent locations={locations} />,
    'map'
  );
}

// Export the component type for external use
export type { MapLocation };
