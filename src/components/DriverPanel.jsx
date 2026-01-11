import api from "../api";
import { useState, useEffect } from "react";
import LocationPicker from "./LocationPicker";
import { useNotification } from "./NotificationProvider";

export default function DriverPanel() {
  const { showNotification } = useNotification();
  const [id, setId] = useState("");
  const [generatedId, setGeneratedId] = useState(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [position, setPosition] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // reset message when id changes
    setMessage(null);
  }, [id]);

  const addDriver = async () => {
    if (id) {
       showNotification("Driver already added", "warning");
       return;
    }

    const location = position
      ? { lat: +position[0], lng: +position[1] }
      : { lat: +lat, lng: +lng };
    try {
      const res = await api.post("/drivers", {
        location: {
          lat: location.lat,
          lng: location.lng
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const responseData = res.data; 
      const createdDriver = responseData.data || responseData;
      const driverId = createdDriver.id || createdDriver.driverId;

      if (driverId) {
        setId(driverId);
        setGeneratedId(driverId);
        showNotification(`Driver successfully registered! ID: ${driverId}`, "success");
      } else {
        showNotification("Driver added, but could not retrieve ID.", "warning");
      }
    } catch (e) {
      console.error("Add driver error:", e);
      showNotification(e?.response?.data?.message || e?.message || "Failed to add driver", "error");
    }
  };



  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Register New Driver
        </h2>
        {id && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            ID: {id}
          </div>
        )}
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6 max-w-lg">
          Select the initial location for the new driver. The Driver ID will be generated automatically upon registration.
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
          <div className="bg-gray-50 rounded-lg p-1 border border-gray-200">
            <LocationPicker
              onChange={(pos) => {
                setPosition(pos);
                if (pos && pos.length === 2) {
                  setLat(String(pos[0]));
                  setLng(String(pos[1]));
                }
              }}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Manual Coordinates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                <input
                  value={lat}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="20.5937"
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                <input
                  value={lng}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="78.9629"
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={addDriver}
              disabled={id}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all ${
                 id 
                 ? "bg-green-600 hover:bg-green-700 cursor-default"
                 : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:transform active:scale-95"
              }`}
            >
              {id ? (
                 <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   Registered
                 </>
              ) : (
                 <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   Add Driver
                 </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
