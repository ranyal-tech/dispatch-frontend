import api from "../api";
import { useState } from "react";

export default function RidePanel({ onCreate }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const createRide = async () => {
    const res = await api.post("/rides", {
      pickup: { lat: +lat, lng: +lng },
    });
    onCreate(res.data);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
        📍 Create Ride
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Pickup Latitude"
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Pickup Longitude"
          onChange={(e) => setLng(e.target.value)}
        />
      </div>

      <button
        onClick={createRide}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg"
      >
        Create Ride
      </button>
    </div>
  );
}
