import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useNotification } from "../components/NotificationProvider";

export default function DriverManager() {
  const { showNotification } = useNotification();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [driverRides, setDriverRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [addresses, setAddresses] = useState({});

  const fetchDrivers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get("/drivers");
      const list = res.data?.data || res.data || [];
      setDrivers(list);
    } catch (e) {
      console.error("Failed to fetch drivers", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    // Poll drivers every 10 seconds to keep status in sync
    const driverInterval = setInterval(() => fetchDrivers(false), 10000);
    return () => clearInterval(driverInterval);
  }, []);

  const resolveAddress = async (lat, lon, key) => {
    if (!lat || !lon || addresses[key]) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setAddresses(prev => ({ ...prev, [key]: data.display_name }));
    } catch (e) {
      console.error("Address resolution failed", e);
    }
  };

  const fetchDriverRides = useCallback(async () => {
    if (!selectedDriverId) {
      setDriverRides([]);
      return;
    }
    setRidesLoading(true);
    try {
      const res = await api.get(`/drivers/${selectedDriverId}/rides`);
      const list = res.data?.data || res.data || [];
      
      // Filter: only show rides currently assigned to this driver
      const assignedRides = list.filter(r => r.currentlyAssigned === true);
      setDriverRides(assignedRides);
      
      // Attempt to resolve addresses for assigned rides
      assignedRides.forEach(r => {
        const pLat = r.pickup?.lat || r.pickupLat;
        const pLng = r.pickup?.lng || r.pickupLng;
        const dLat = r.drop?.lat || r.destination?.lat || r.dropLat;
        const dLng = r.drop?.lng || r.dropLng;
        
        if (pLat && pLng) resolveAddress(pLat, pLng, `p-${r.rideId}`);
        if (dLat && dLng) resolveAddress(dLat, dLng, `d-${r.rideId}`);
      });
    } catch (e) {
      console.error("Failed to fetch driver rides", e);
    } finally {
      setRidesLoading(false);
    }
  }, [selectedDriverId, addresses]);

  useEffect(() => {
    fetchDriverRides();
    const interval = setInterval(fetchDriverRides, 5000);
    return () => clearInterval(interval);
  }, [fetchDriverRides]);

  const handleSetOnline = async (id) => {
    setStatusUpdating(id);
    // Optimistic update
    setDrivers(prev => prev.map(d => (d.id === id || d.driverId === id) ? { ...d, status: 'ONLINE' } : d));
    
    try {
      await api.patch(`/drivers/${id}/online`);
      showNotification("Driver is now ONLINE", "success");
      fetchDrivers(false);
    } catch (e) {
      showNotification(e?.response?.data?.message || "Failed to set online", "error");
      fetchDrivers(false); // Revert on failure
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSetOffline = async (id) => {
    setStatusUpdating(id);
    // Optimistic update
    setDrivers(prev => prev.map(d => (d.id === id || d.driverId === id) ? { ...d, status: 'OFFLINE' } : d));

    try {
      await api.patch(`/drivers/${id}/offline`);
      showNotification("Driver is now OFFLINE", "warning");
      fetchDrivers(false);
    } catch (e) {
      showNotification(e?.response?.data?.message || "Failed to set offline", "error");
      fetchDrivers(false); // Revert on failure
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleCancelRide = async (rideId) => {
    setActionInProgress(rideId);
    try {
      await api.post(`/rides/${rideId}/cancel/driver/${selectedDriverId}`);
      showNotification("Ride canceled successfully!", "success");
      fetchDriverRides();
    } catch (e) {
      showNotification(e?.response?.data?.message || "Failed to cancel ride", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Driver List */}
      <div className="lg:col-span-1 border-r pr-6 border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
          Drivers
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-normal">
            {drivers.length}
          </span>
        </h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {drivers.map((d) => {
                const id = d.id || d.driverId;
                const isSelected = selectedDriverId === id;
                const statusStr = String(d.status || "").toUpperCase();
                const isOnline = statusStr === "ONLINE" || statusStr === "ACTIVE" || d.online === true;
                
                return (
                  <li 
                    key={id}
                    className={`p-4 transition-all ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedDriverId(id)}
                      >
                        <div className="font-bold text-gray-900">{d.name || id}</div>
                        <div className="text-[10px] font-mono text-gray-400">{id}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          {d.status || (isOnline ? "Online" : "Offline")}
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSetOnline(id)}
                            disabled={statusUpdating === id || isOnline}
                            className={`px-2 py-1 text-[10px] font-bold rounded ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'}`}
                          >
                            {statusUpdating === id ? "..." : "ON"}
                          </button>
                          <button
                            onClick={() => handleSetOffline(id)}
                            disabled={statusUpdating === id || !isOnline}
                            className={`px-2 py-1 text-[10px] font-bold rounded ${!isOnline ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'}`}
                          >
                            {statusUpdating === id ? "..." : "OFF"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Main Area: Driver Rides */}
      <div className="lg:col-span-3">
        <h2 className="text-lg font-bold mb-4">
          Managed Rides
          {selectedDriverId && (
            <span className="ml-2 text-sm font-normal text-gray-400 font-mono">
              / {selectedDriverId}
            </span>
          )}
        </h2>

        {!selectedDriverId ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             </div>
             <p className="text-gray-500 font-medium">Select a driver on the left to manage their rides.</p>
          </div>
        ) : ridesLoading && driverRides.length === 0 ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : driverRides.length === 0 ? (
          <div className="bg-amber-50 rounded-xl p-8 text-center border border-amber-100">
            <p className="text-amber-700 font-medium">No rides found for this driver.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driverRides.map((r) => {
              const isActive = r.rideStatus === "ACCEPTED" || r.rideStatus === "REQUESTED" || r.rideStatus === "DRIVER_PINGED";
              const isProcessing = actionInProgress === r.rideId;
              
              const pLat = r.pickup?.lat || r.pickupLat;
              const pLng = r.pickup?.lng || r.pickupLng;
              const dLat = r.drop?.lat || r.destination?.lat || r.dropLat;
              const dLng = r.drop?.lng || r.destination?.lng || r.dropLng;

              const pAddr = addresses[`p-${r.rideId}`];
              const dAddr = addresses[`d-${r.rideId}`];

              return (
                <div key={r.rideId} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">{r.rideId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      r.rideStatus === "COMPLETED" ? "bg-green-100 text-green-700" :
                      r.rideStatus === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.rideStatus}
                    </span>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>
                      <div className="flex-1">
                        <div className="text-gray-400 lowercase">Pickup:</div>
                        <div className="font-semibold text-gray-800 break-words">{pAddr || "Fetching address..."}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {pLat?.toFixed(4)}, {pLng?.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1"></div>
                      <div className="flex-1">
                        <div className="text-gray-400 lowercase">Drop:</div>
                        <div className="font-semibold text-gray-800 break-words">{dAddr || "Fetching address..."}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {dLat?.toFixed(4)}, {dLng?.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleCancelRide(r.rideId)}
                      disabled={isProcessing}
                      className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-lg transition-colors border border-red-100"
                    >
                      {isProcessing ? "PROCESSING..." : "CANCEL RIDE"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
