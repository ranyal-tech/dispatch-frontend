import api from "../api";
import { useState } from "react";
import LocationPicker from "./LocationPicker";

export default function RidePanel({ onCreate }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [dropLat, setDropLat] = useState("");
  const [dropLng, setDropLng] = useState("");
  const [position, setPosition] = useState(null);
  
  // Selection mode: 'pickup' | 'dropoff'
  const [mode, setMode] = useState("pickup");
  const [message, setMessage] = useState(null);

  const createRide = async () => {
    setMessage(null);
    const pickup = position
      ? { lat: +position[0], lng: +position[1] }
      : { lat: +lat, lng: +lng };

    const drop = (dropLat && dropLng) 
      ? { lat: +dropLat, lng: +dropLng } 
      : null;

    if ((!pickup.lat || !pickup.lng) && pickup.lat !== 0 && pickup.lng !== 0) {
       setMessage({ type: 'error', text: "Please select a pickup location or enter coordinates." });
       return;
    }
    
    // Optional: Validate drop if entered partially? 
    if ((dropLat && !dropLng) || (!dropLat && dropLng)) {
       setMessage({ type: 'error', text: "Please enter both Latitude and Longitude for drop." });
       return;
    }

    try {
      const res = await api.post("/rides", { pickup, drop });
      const createdRide = res.data?.data || res.data;
      setMessage({ type: "success", text: `Ride created successfully! ID: ${createdRide.id || 'N/A'}` });
      onCreate(createdRide);
      // Optional: clear inputs
      // setPosition(null); setLat(""); setLng("");
    } catch (e) {
      console.error("Create ride error:", e);
      setMessage({ 
        type: "error", 
        text: e?.response?.data?.message || "Failed to create ride" 
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Request New Ride</h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6 max-w-lg">
          Choose a pickup location to create a new ride request.
        </p>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className={`mt-0.5 ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
               {message.type === "success" ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               )}
            </div>
            <div>{message.text}</div>
          </div>
        )}

        <div className="space-y-6">
           {/* Mode Selection Tabs */}
           <div className="flex p-1 bg-gray-100 rounded-lg">
             <button
               onClick={() => setMode("pickup")}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                 mode === "pickup"
                   ? "bg-white text-indigo-700 shadow-sm"
                   : "text-gray-500 hover:text-gray-700"
               }`}
             >
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
               Pickup
             </button>
             <button
               onClick={() => setMode("dropoff")}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                 mode === "dropoff"
                   ? "bg-white text-indigo-700 shadow-sm"
                   : "text-gray-500 hover:text-gray-700"
               }`}
             >
               <span className="w-2 h-2 rounded-full bg-red-500"></span>
               Drop
             </button>
           </div>
           
           {/* Map Area */}
           <div className="bg-gray-50 rounded-lg p-1 border border-gray-200 relative">
              <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-gray-200">
                 Selecting: <span className={mode === "pickup" ? "text-green-600" : "text-red-600"}>{mode.toUpperCase()}</span>
              </div>
              <LocationPicker
                key={mode} // Force remount when switching modes to reset map context
                initialPosition={
                  mode === "pickup" && lat && lng
                    ? [+lat, +lng]
                    : mode === "dropoff" && dropLat && dropLng
                    ? [+dropLat, +dropLng]
                    : undefined
                }
                onChange={(pos) => {
                  if (pos && pos.length === 2) {
                    if (mode === "pickup") {
                      setLat(String(pos[0]));
                      setLng(String(pos[1]));
                    } else {
                      setDropLat(String(pos[0]));
                      setDropLng(String(pos[1]));
                    }
                  }
                }}
              />
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* LEFT: Pickup */}
             <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Pickup
              </h3>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  <input
                    value={lat}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="20.59"
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  <input
                    value={lng}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="78.96"
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Drop */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span>
                 Drop (Optional)
              </h3>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  <input
                    value={dropLat}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="20.60"
                    onChange={(e) => setDropLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  <input
                    value={dropLng}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="78.97"
                    onChange={(e) => setDropLng(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex items-end justify-end pt-4 border-t border-gray-50">
              <button
                onClick={createRide}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md text-white rounded-lg font-medium transition-all active:transform active:scale-95"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Ride
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
