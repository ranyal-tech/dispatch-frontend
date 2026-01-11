import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useNotification } from "../components/NotificationProvider";

export default function DriverPing({ ride, driverId, onDriverChange }) {
  const { showNotification } = useNotification();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(driverId || "");
  const [loading, setLoading] = useState(true);
  const [pingedRides, setPingedRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [addresses, setAddresses] = useState({});

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

  // Sync with prop changes from parent
  useEffect(() => {
    if (driverId) {
      setSelectedDriverId(driverId);
    }
  }, [driverId]);

  // Fetch drivers list
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await api.get("/drivers");
        const list = res.data?.data || res.data || [];
        setDrivers(list);
      } catch (e) {
        console.error("Failed to fetch drivers", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  // Fetch rides pinged to selected driver using driver-specific API
  const fetchPingedRides = useCallback(async () => {
    if (!selectedDriverId) {
      setPingedRides([]);
      return;
    }
    setRidesLoading(true);
    try {
      // Use the driver-specific rides API
      const res = await api.get(`/drivers/${selectedDriverId}/rides`);
      const driverRides = res.data?.data || res.data || [];
      // Filter: Show requested/pinged rides OR those that were accepted
      const filtered = driverRides.filter(r => 
        r.rideStatus === 'REQUESTED' || 
        r.rideStatus === 'DRIVER_PINGED' || 
        r.rideStatus === 'ACCEPTED'
      );
      setPingedRides(filtered);

      // Resolve addresses
      filtered.forEach(r => {
        const pLat = r.pickup?.lat || r.pickupLat;
        const pLng = r.pickup?.lng || r.pickupLng;
        const dLat = (r.drop || r.destination)?.lat || r.dropLat;
        const dLng = (r.drop || r.destination)?.lng || r.dropLng;
        
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
    fetchPingedRides();
    // Poll every 2 seconds for new rides
    const poller = setInterval(fetchPingedRides, 2000);
    return () => clearInterval(poller);
  }, [fetchPingedRides]);

  const handleDriverSelect = (id) => {
    setSelectedDriverId(id);
    setPingedRides([]);
    if (onDriverChange) onDriverChange(id);
  };

  const handleAccept = async (rideId) => {
    setActionInProgress(rideId);
    try {
      await api.post(`/rides/${rideId}/accept/driver/${selectedDriverId}`);
      showNotification("Ride accepted successfully!", "success");
      fetchPingedRides();
    } catch (e) {
      console.error("Failed to accept ride", e);
      showNotification(e?.response?.data?.message || "Failed to accept ride", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (rideId) => {
    setActionInProgress(rideId);
    try {
      await api.post(`/rides/${rideId}/cancel/driver/${selectedDriverId}`);
      showNotification("Ride canceled successfully!", "success");
      fetchPingedRides();
    } catch (e) {
      console.error("Failed to cancel ride", e);
      showNotification(e?.response?.data?.message || "Failed to cancel ride", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const [statusUpdating, setStatusUpdating] = useState(null);

  const handleSetOnline = async (driverId) => {
    setStatusUpdating(driverId);
    try {
      await api.patch(`/drivers/${driverId}/online`);
      // Refresh drivers list
      const res = await api.get("/drivers");
      setDrivers(res.data?.data || res.data || []);
      showNotification("Driver is now ONLINE", "success");
    } catch (e) {
      console.error("Failed to set driver online", e);
      showNotification(e?.response?.data?.message || "Failed to set driver online", "error");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSetOffline = async (driverId) => {
    setStatusUpdating(driverId);
    try {
      await api.patch(`/drivers/${driverId}/offline`);
      // Refresh drivers list
      const res = await api.get("/drivers");
      setDrivers(res.data?.data || res.data || []);
      showNotification("Driver is now OFFLINE", "warning");
    } catch (e) {
      console.error("Failed to set driver offline", e);
      showNotification(e?.response?.data?.message || "Failed to set driver offline", "error");
    } finally {
      setStatusUpdating(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Drivers List Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Available Drivers</h3>
            <p className="text-xs text-gray-400 mt-0.5">{drivers.length} registered</p>
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : drivers.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No drivers found</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {drivers.map((d) => {
                const id = d.id || d.driverId;
                const isSelected = selectedDriverId === id;
                // Check for various online status formats
                const statusStr = String(d.status || '').toUpperCase();
                const isOnline = statusStr === 'ONLINE' || 
                  statusStr === 'ACTIVE' ||
                  d.online === true || 
                  d.isOnline === true ||
                  d.available === true;
                return (
                  <li 
                    key={id}
                    onClick={() => handleDriverSelect(id)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-indigo-50 border-l-4 border-indigo-500' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {d.name || id}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{id}</div>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${
                        isOnline ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        {d.status || (isOnline ? 'Online' : 'Offline')}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Main Ping Area */}
      <div className="lg:col-span-3">
        <h2 className="text-lg font-semibold mb-4">
          Pinged Rides
          {selectedDriverId && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              — For <span className="font-mono text-indigo-600">{selectedDriverId}</span>
            </span>
          )}
        </h2>

        {!selectedDriverId ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-500">
            Select a driver from the list to view their pinged rides.
          </div>
        ) : ridesLoading && pingedRides.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-400">Loading rides...</div>
        ) : pingedRides.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-500">
            No rides currently pinged to this driver.
          </div>
        ) : (
          <div className="space-y-4">
            {pingedRides.map((r) => {
              // Only show EXPIRED UI if the ride is still in a pending state
              const isExpiredUI = r.expired === true && (r.rideStatus === 'REQUESTED' || r.rideStatus === 'DRIVER_PINGED');
              const isProcessing = actionInProgress === r.rideId;
              
              return (
                <div 
                  key={r.rideId} 
                  className={`bg-white rounded-xl shadow-sm border p-5 transition-colors ${
                    isExpiredUI ? 'border-red-200 bg-red-50' : 
                    r.rideStatus === 'ACCEPTED' ? 'border-green-200 bg-green-50' :
                    r.rideStatus === 'CANCELLED' ? 'border-orange-200 bg-orange-50' :
                    'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Ride Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {r.rideId}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          isExpiredUI ? 'bg-red-100 text-red-700' : 
                          r.rideStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.rideStatus}
                        </span>
                        {r.currentlyAssigned && (
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                            Assigned
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <span className="text-gray-400">Driver:</span> {r.driverId}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>
                          <div>
                            <div className="text-gray-400 lowercase">Pickup:</div>
                            <div className="font-semibold text-gray-800 break-words line-clamp-2">
                              {addresses[`p-${r.rideId}`] || "Fetching address..."}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {(r.pickup?.lat || r.pickupLat)?.toFixed(4)}, {(r.pickup?.lng || r.pickupLng)?.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1"></div>
                          <div>
                            <div className="text-gray-400 lowercase">Drop:</div>
                            <div className="font-semibold text-gray-800 break-words line-clamp-2">
                              {addresses[`d-${r.rideId}`] || "Fetching address..."}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {((r.drop || r.destination)?.lat || r.dropLat)?.toFixed(4)}, {((r.drop || r.destination)?.lng || r.dropLng)?.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-center gap-3 w-32">
                      <div className={`text-center px-4 py-2 rounded-lg w-full ${
                        isExpiredUI ? 'bg-red-100 text-red-700' : 
                        r.rideStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        r.rideStatus === 'CANCELLED' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        <div className="text-[10px] uppercase tracking-wider font-medium opacity-60">Status</div>
                        <div className="text-sm font-bold truncate">
                          {isExpiredUI ? 'EXPIRED' : r.rideStatus}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(r.rideId)}
                          disabled={isExpiredUI || isProcessing || r.rideStatus === 'ACCEPTED'}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isExpiredUI || isProcessing || r.rideStatus === 'ACCEPTED'
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isProcessing ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(r.rideId)}
                          disabled={isExpiredUI || isProcessing || r.rideStatus === 'ACCEPTED'}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isExpiredUI || isProcessing || r.rideStatus === 'ACCEPTED'
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isProcessing ? '...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
