'use client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Report, RelayPoint } from '@/src/types';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const REPORT_COLORS = { reçu: '#E05A1A', en_cours: '#F0C040', traité: '#2A7A3A' };

interface MapViewProps {
  reports?: Report[];
  relays?: RelayPoint[];
  height?: number;
  center?: [number, number];
  zoom?: number;
  singleReport?: Report;
}

export default function MapView({ reports = [], relays = [], height = 400, center = [5.36, -4.01], zoom = 12, singleReport }: MapViewProps) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height, width: '100%', borderRadius: '12px', zIndex: 0 }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {reports.map(r => (
        <Marker key={r.id} position={[r.latitude, r.longitude]} icon={createIcon(REPORT_COLORS[r.status] ?? '#5C5C48')}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{r.trackingNumber}</p>
              <p>{r.commune} · {r.address}</p>
              <p>Statut : {r.status}</p>
              {r.analysis && <p>Poids estimé : {r.analysis.poids_estime_kg} kg</p>}
            </div>
          </Popup>
        </Marker>
      ))}
      {relays.map(rp => (
        <Marker key={rp.id} position={[rp.latitude, rp.longitude]} icon={createIcon('#3B82F6')}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{rp.name}</p>
              <p>{rp.commune} · {rp.hours}</p>
              <p>Remplissage : {rp.currentLoadKg}/{rp.capacityKg} kg</p>
            </div>
          </Popup>
        </Marker>
      ))}
      {singleReport && (
        <Circle center={[singleReport.latitude, singleReport.longitude]} radius={200} color="#2A7A3A" fillOpacity={0.1} />
      )}
    </MapContainer>
  );
}
