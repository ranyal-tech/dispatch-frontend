import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNotification } from "./NotificationProvider";

function ClickHandler({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
function MapController({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom || map.getZoom());
    }
  }, [position, zoom, map]);
  return null;
}

export default function LocationPicker({ initialPosition, onChange }) {
  const { showNotification } = useNotification();
  // Default to center of India if not provided
  const INDIA_CENTER = [20.5937, 78.9629];
  const defaultPos = initialPosition || INDIA_CENTER;

  const [position, setPosition] = useState(defaultPos);
  const [zoom, setZoom] = useState(5);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    // try browser geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const pos = [p.coords.latitude, p.coords.longitude];
          setPosition(pos);
          setZoom(12);
          if (onChange) onChange(pos);
        },
        () => {
          // ignore error, keep default
        }
      );
    }
    // ensure parent knows default
    if (onChange) onChange(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (onChange) onChange(position);
  }, [position]);

  const doSearch = async (q) => {
    if (!q) return setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}`
      );
      const data = await res.json();
      setResults(data.slice(0, 6));
    } catch (e) {
      setResults([]);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation)
      return showNotification("Geolocation not supported by your browser", "error");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setPosition(pos);
        setZoom(12);
        setQuery("");
        setResults([]);
        if (onChange) onChange(pos);
      },
      (err) => {
        showNotification("Unable to retrieve your location: " + (err.message || err.code), "error");
      }
    );
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search place or address..."
            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={() => doSearch(query)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          Search
        </button>
        <button
          onClick={useMyLocation}
          className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Locate Me
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-2 bg-white border border-gray-100 rounded-lg shadow-lg max-h-48 overflow-auto z-10 relative">
          {results.map((r) => (
            <div
              key={r.place_id}
              className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
              onClick={() => {
                const pos = [parseFloat(r.lat), parseFloat(r.lon)];
                setPosition(pos);
                setZoom(12);
                setResults([]);
                setQuery(r.display_name);
              }}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-inner">
        <MapContainer
          center={position}
          zoom={zoom}
          style={{ height: 320, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController position={position} zoom={zoom} />
          <ClickHandler
            setPosition={(pos) => {
              setPosition(pos);
              setZoom(12);
            }}
          />
          {position && (
            <CircleMarker
              center={position}
              pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5" }}
              radius={8}
            />
          )}
        </MapContainer>

        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200 font-mono">
          Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </div>
      </div>
    </div>
  );
}
