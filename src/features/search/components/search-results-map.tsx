'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { PropertyPreview } from '@/features/search/hooks/use-property-preview';

type SearchResultsMapProps = {
  hotels: PropertyPreview[];
};

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function SearchResultsMap({ hotels }: SearchResultsMapProps) {
  const markers = hotels.filter(
    (hotel) => isFiniteCoordinate(hotel.latitude) && isFiniteCoordinate(hotel.longitude)
  );

  if (markers.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-secondary px-4 text-sm text-muted-foreground">
        No map coordinates are available for these search results yet.
      </div>
    );
  }

  const center: [number, number] = [markers[0].latitude!, markers[0].longitude!];

  return (
    <MapContainer center={center} zoom={12} className="h-[360px] w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((hotel) => (
        <CircleMarker
          key={hotel.hotelId}
          center={[hotel.latitude!, hotel.longitude!]}
          radius={8}
          pathOptions={{ color: '#133C67', fillColor: '#FF6B57', fillOpacity: 0.86 }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{hotel.name}</p>
              <p className="text-muted-foreground">{hotel.city}</p>
              <a className="text-accent underline" href={`/hotels/${hotel.hotelId}`}>
                View stay
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
