import api from "../api";
import { useState, useEffect } from "react";
import LocationPicker from "./LocationPicker";

export default function DriverPanel() {
  const [id, setId] = useState("");
  const [generatedId, setGeneratedId] = useState(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [position, setPosition] = useState(null);
  const [isOnline, setIsOnline] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // reset known online state when driver id changes
    setIsOnline(null);
  }, [id]);

  const addDriver = async () => {
    // For creation, we don't need ID check anymore as it is backend generated
    // But we might want to ensure we don't double-add if ID is already set?
    if (id) {
       setMessage({ type: "success", text: "Driver already added (ID: " + id + ")" });
       return;
    }

    const location = position
      ? { lat: +position[0], lng: +position[1] }
      : { lat: +lat, lng: +lng };
    try {
      // 406 Fix: Ensure 'Accept' and 'Content-Type' are explicit
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
      
      // Adapt to wrapped response
      // Structure: { success: true, message: "...", data: { id: "...", ... } }
      const responseData = res.data; 
      const createdDriver = responseData.data || responseData; // Fallback for safety
      const driverId = createdDriver.id || createdDriver.driverId;

      if (driverId) {
        setId(driverId); // Set the main ID state
        setGeneratedId(driverId); // Show the ID to user
        setMessage({ type: "success", text: `Driver added! ID: ${driverId}` });
      } else {
        setMessage({ type: "warning", text: "Driver added, but could not retrieve ID from response." });
      }
      // Don't reset isOnline, leave as user choice
    } catch (e) {
      console.error("Add driver error:", e);
      setMessage({
        type: "error",
        text: e?.response?.data?.message || e?.message || "Failed to add driver",
      });
      // Keeping error message persistent too, or long timeout
      setTimeout(() => setMessage(null), 8000); 
    }
  };

  const goOnline = async () => {
    if (!id) return alert("Enter driver ID first");
    try {
      await api.patch(`/drivers/${id}/online`);
      setIsOnline(true);
    } catch (e) {
      setMessage({
        type: "error",
        text: e?.response?.data?.message || "Failed to set online",
      });
      setTimeout(() => setMessage(null), 4500);
    }
  };

  const goOffline = async () => {
    if (!id) return alert("Enter driver ID first");
    try {
      await api.patch(`/drivers/${id}/offline`);
      setIsOnline(false);
    } catch (e) {
      setMessage({
        type: "error",
        text: e?.response?.data?.message || "Failed to set offline",
      });
      setTimeout(() => setMessage(null), 4500);
    }
  };

  const toggleOnline = async () => {
    if (!id) return alert("Enter driver ID first");
    // optimistic update: toggle UI immediately
    const target = !isOnline;
    setIsOnline(target);
    setToggling(true);

    try {
      if (target) {
        const res = await api.patch(`/drivers/${id}/online`);
        console.log("toggleOnline response (online):", res);
        setMessage({ type: "success", text: "Driver set online." });
      } else {
        const res = await api.patch(`/drivers/${id}/offline`);
        console.log("toggleOnline response (offline):", res);
        setMessage({ type: "success", text: "Driver set offline." });
      }
    } catch (e) {
      // revert UI on failure
      setIsOnline(!target);
      console.error("toggleOnline error:", e);
      setMessage({
        type: "error",
        text:
          (e?.response &&
            e.response.status + " " + JSON.stringify(e.response.data)) ||
          e?.message ||
          "Toggle failed",
      });
    } finally {
      setToggling(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const fetchStatus = async () => {
    if (!id) return alert("Enter driver ID first");
    try {
      const res = await api.get(`/drivers/${id}`);
      const data = res.data || {};
      // support different property names
      setIsOnline(
        Boolean(data.online ?? data.isOnline ?? data.status === "online")
      );
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to fetch driver status");
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Manual Coordinates</h3>
               <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-4 flex flex-col justify-end">
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Driver Status</div>
                    <div className="text-xs text-gray-500">{isOnline ? 'Driver is currently online' : 'Driver is offline'}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${!isOnline ? 'text-gray-900' : 'text-gray-400'}`}>Offline</span>
                    <button
                      role="switch"
                      aria-checked={!!isOnline}
                      onClick={() => !toggling && toggleOnline()}
                      disabled={!id}
                      className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        !id ? 'opacity-50 cursor-not-allowed bg-gray-200' : 
                        isOnline ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transform transition-transform ${
                          isOnline ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${isOnline ? 'text-gray-900' : 'text-gray-400'}`}>Online</span>
                  </div>
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
