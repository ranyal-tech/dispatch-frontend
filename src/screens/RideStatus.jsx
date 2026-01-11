import React, { useEffect, useState } from "react";
import api from "../api";
import { useNotification } from "../components/NotificationProvider";

export default function RideStatus() {
  const { showNotification, confirm } = useNotification();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const fetchRides = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
        const res = await api.get("/rides");
        const list = res.data?.data || res.data || [];
        // Show most recent first
        setRides([...list].reverse());
        
        // Resolve addresses
        list.forEach(r => {
          const pLat = r.pickup?.lat || r.pickupLat;
          const pLng = r.pickup?.lng || r.pickupLng;
          const dLat = (r.drop || r.destination)?.lat || r.dropLat;
          const dLng = (r.drop || r.destination)?.lng || r.dropLng;
          
          if (pLat && pLng) resolveAddress(pLat, pLng, `p-${r.id}`);
          if (dLat && dLng) resolveAddress(dLat, dLng, `d-${r.id}`);
        });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCancel = async (rideId) => {
    const accepted = await confirm("Are you sure you want to cancel this ride?", null, "Cancel Ride");
    if (!accepted) return;
    
    try {
      await api.post(`/rides/${rideId}/cancel`);
      showNotification("Ride cancelled successfully", "success");
      fetchRides(false);
    } catch (e) {
      console.error("Failed to cancel ride", e);
      showNotification(e?.response?.data?.message || "Failed to cancel ride", "error");
    }
  };

  useEffect(() => {
    fetchRides();
    
    // Set up polling interval every 5 seconds
    const interval = setInterval(() => {
      fetchRides(false); // background fetch
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatLoc = (loc) => {
    if (!loc || (!loc.lat && !loc.lng)) return "—";
    return `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}`;
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-red-50 text-red-700 border-red-100",
      completed: "bg-blue-50 text-blue-700 border-blue-100",
      default: "bg-gray-100 text-gray-800 border-gray-200"
    };
    const style = styles[status?.toLowerCase()] || styles.default;
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} capitalize`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-bold text-gray-900">Ride Status</h2>
           <p className="text-sm text-gray-500 mt-1">Monitor all active and past dispatch requests.</p>
        </div>
        <button
          onClick={fetchRides}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Ride ID</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">From (Pickup)</th>
                <th className="px-6 py-3 font-semibold">To (Drop)</th>
                <th className="px-6 py-3 font-semibold">Assigned Driver</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && rides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading ride data...
                  </td>
                </tr>
              ) : rides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 italic">
                    No rides found.
                  </td>
                </tr>
              ) : (
                rides.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex flex-col gap-0.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="font-medium truncate">{addresses[`p-${r.id}`] || "Fetching..."}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono ml-3.5">{formatLoc(r.pickup)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex flex-col gap-0.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          <span className="font-medium truncate">{addresses[`d-${r.id}`] || "Fetching..."}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono ml-3.5">{formatLoc(r.drop || r.destination)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       {r.assignedDriverId ? (
                         <div className="flex items-center gap-2 text-indigo-700 font-medium bg-indigo-50 w-fit px-2 py-1 rounded">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {r.assignedDriverId}
                         </div>
                       ) : (
                         <span className="text-gray-400 italic">Unassigned</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'CANCELLED'}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                        }`}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer info/stats could go here */}
        <div className="px-6 py-2 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400">
           Total Rides: {rides.length}
        </div>
      </div>
    </div>
  );
}
