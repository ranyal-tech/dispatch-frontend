import React, { useEffect, useState, useCallback } from "react";
import api from "../api";

export default function DriverPing({ ride, driverId, onDriverChange }) {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(driverId || "");
  const [loading, setLoading] = useState(true);
  const [pingedRides, setPingedRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

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
      // Filter 
      const filtered = driverRides.filter(r => 
        r.rideStatus === 'REQUESTED' || r.rideStatus === 'DRIVER_PINGED' && r.pinged === true
      );
      setPingedRides(filtered);
    } catch (e) {
      console.error("Failed to fetch driver rides", e);
    } finally {
      setRidesLoading(false);
    }
  }, [selectedDriverId]);

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
      await api.post(`/rides/${rideId}/accept`);
      fetchPingedRides();
    } catch (e) {
      console.error("Failed to accept ride", e);
      alert(e?.response?.data?.message || "Failed to accept ride");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (rideId) => {
    setActionInProgress(rideId);
    try {
      await api.post(`/rides/${rideId}/cancel`);
      fetchPingedRides();
    } catch (e) {
      console.error("Failed to cancel ride", e);
      alert(e?.response?.data?.message || "Failed to cancel ride");
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
    } catch (e) {
      console.error("Failed to set driver online", e);
      alert(e?.response?.data?.message || "Failed to set driver online");
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
    } catch (e) {
      console.error("Failed to set driver offline", e);
      alert(e?.response?.data?.message || "Failed to set driver offline");
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
                    className={`px-4 py-3 transition-colors ${
                      isSelected 
                        ? 'bg-indigo-50 border-l-4 border-indigo-500' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div onClick={() => handleDriverSelect(id)} className="cursor-pointer flex-1">
                        <div className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {d.name || id}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          isOnline ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          {d.status || (isOnline ? 'Online' : 'Offline')}
                        </div>
                        {/* Status Toggle Buttons */}
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetOnline(id); }}
                            disabled={statusUpdating === id || isOnline}
                            className={`px-2 py-1 text-xs rounded ${
                              isOnline 
                                ? 'bg-green-100 text-green-700 cursor-default' 
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            }`}
                            title="Set Online"
                          >
                            {statusUpdating === id ? '...' : 'On'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetOffline(id); }}
                            disabled={statusUpdating === id || !isOnline}
                            className={`px-2 py-1 text-xs rounded ${
                              !isOnline 
                                ? 'bg-gray-200 text-gray-600 cursor-default' 
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                            }`}
                            title="Set Offline"
                          >
                            {statusUpdating === id ? '...' : 'Off'}
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
              // Use expired flag from API response
              const isExpired = r.expired === true;
              const isProcessing = actionInProgress === r.rideId;
              
              return (
                <div 
                  key={r.rideId} 
                  className={`bg-white rounded-xl shadow-sm border p-5 ${
                    isExpired ? 'border-red-200 bg-red-50' : 'border-gray-100'
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
                          isExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.rideStatus}
                        </span>
                        {r.currentlyAssigned && (
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                            Assigned
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-400">Driver:</span> {r.driverId}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-center gap-3">
                      {/* Expired Badge or Active Badge */}
                      {isExpired ? (
                        <div className="text-center px-4 py-2 rounded-lg bg-red-100 text-red-700">
                          <div className="text-xs uppercase tracking-wider font-medium">Status</div>
                          <div className="text-lg font-bold">EXPIRED</div>
                        </div>
                      ) : (
                        <div className="text-center px-4 py-2 rounded-lg bg-green-100 text-green-700">
                          <div className="text-xs uppercase tracking-wider font-medium">Status</div>
                          <div className="text-lg font-bold">ACTIVE</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(r.rideId)}
                          disabled={isExpired || isProcessing}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isExpired || isProcessing
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isProcessing ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(r.rideId)}
                          disabled={isExpired || isProcessing}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isExpired || isProcessing
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
