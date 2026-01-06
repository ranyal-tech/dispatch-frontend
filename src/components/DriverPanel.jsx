import api from "../api";
import { useState } from "react";

export default function DriverPanel() {
  const [id, setId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const addDriver = async () => {
    await api.post("/drivers", {
      id,
      location: { lat: +lat, lng: +lng },
    });
  };

  const goOnline = async () => {
    await api.patch(`/drivers/${id}/online`);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
        🚗 Driver Management
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Driver ID"
          onChange={(e) => setId(e.target.value)}
        />
        <input
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Latitude"
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Longitude"
          onChange={(e) => setLng(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={addDriver}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Add Driver
        </button>

        <button
          onClick={goOnline}
          className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-lg"
        >
          Go Online
        </button>
      </div>
    </div>
  );
}
