import api from "../api";
import { useEffect, useState } from "react";
import { useNotification } from "./NotificationProvider";

export default function LiveDispatch({ ride, driverId }) {
  const { showNotification, confirm } = useNotification();
  const TOTAL_TIME = 10;

  const [time, setTime] = useState(TOTAL_TIME);
  const [accepting, setAccepting] = useState(false);
  const [fromAddr, setFromAddr] = useState(null);
  const [toAddr, setToAddr] = useState(null);
  
  // Driver ID passed from parent app logic
  // const [driverId, setDriverId] = useState("driver-1");

  // Determine the target driver for this ping
  // If the ride is assigned/pinged to a specific driver, use that. 
  // Otherwise use the current active driver (assuming broadcast).
  const targetDriverId = ride.assignedDriverId || driverId;

  // ⏱ Timer logic: Sync with server
  useEffect(() => {
    // Support both 'pending' (legacy) and 'REQUESTED' (new)
    if (!ride || (ride.status !== 'pending' && ride.status !== 'REQUESTED')) return;

    let mounted = true;

    const fetchStatus = async () => {
      try {
        // Use the target driver ID to check status
        const res = await api.get(`/rides/${ride.id}/drivers/${targetDriverId}/ping-status`);
        // Wrappped response handling
        const data = res.data?.data || res.data;
        if (mounted && data && typeof data.remainingTime === 'number') {
           setTime(data.remainingTime);
        }
      } catch (e) {
        console.error("Failed to fetch ping status", e);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every second to keep timer synced
    const poller = setInterval(fetchStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(poller);
    };
  }, [ride, targetDriverId]);

  if (!ride) return null;

  // ✅ Accept Ride
  const handleAccept = async () => {
    if (accepting) return;
    if (!driverId) {
       showNotification("No active driver session found.", "error");
       return;
    }

    setAccepting(true);
    // Removed local setAlert(null);

    try {
      // Simulate a driver accepting this ride
      const body = { driverId: driverId.trim() }; 
      await api.post(`/rides/${ride.id}/accept`, body);
      showNotification("Ride accepted successfully.", "success");
    } catch (e) {
      showNotification(e?.response?.data?.message || "Failed to accept ride", "error");
    } finally {
      setAccepting(false);
    }
  };

  // ❌ Cancel Ride
  const handleCancel = async () => {
    const accepted = await confirm("Are you sure you want to cancel this ride?", null, "Cancel Ride");
    if (!accepted) return;

    try {
      await api.post(`/rides/${ride.id}/cancel`);
      showNotification("Ride cancelled.", "success");
    } catch (e) {
      showNotification(e?.response?.data?.message || "Cancel failed", "error");
    }
  };

  const statusBadge = (s) => {
    if (s === "pending") return "bg-yellow-100 text-yellow-800";
    if (s === "accepted") return "bg-green-100 text-green-800";
    if (s === "cancelled" || s === "cancel") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Reverse-geocode pickup/dropoff to human-readable addresses
  useEffect(() => {
    let mounted = true;
    const rev = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.display_name || null;
      } catch (e) {
        return null;
      }
    };

    (async () => {
      if (!ride) return;
      if (ride.pickup?.lat != null && ride.pickup?.lng != null) {
        const addr = await rev(ride.pickup.lat, ride.pickup.lng);
        if (mounted)
          setFromAddr(addr || `${ride.pickup.lat}, ${ride.pickup.lng}`);
      } else {
        setFromAddr(null);
      }

      // attempt drop/destination field if present
      const dest = ride.drop || ride.destination || null;
      if (dest?.lat != null && dest?.lng != null) {
        const addr2 = await rev(dest.lat, dest.lng);
        if (mounted) setToAddr(addr2 || `${dest.lat}, ${dest.lng}`);
      } else {
        if (mounted) setToAddr(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ride]);

  if (ride.status === "accepted") {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden relative">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Ride Active</h3>
                <p className="text-indigo-100 text-xs text-opacity-80">En route to pickup</p>
              </div>
           </div>
           
           <div className="bg-white/10 px-3 py-1 rounded text-xs font-mono text-white tracking-wide">
             #{ride.id.slice(0, 8)}...
           </div>
        </div>

        <div className="p-6">
           {/* Route Visualization */}
           <div className="flex flex-col gap-6 mb-8 relative">
              {/* Vertical line connecting dots */}
              <div className="absolute left-[11px] top-3 bottom-8 w-0.5 bg-gray-200"></div>

              {/* FROM */}
              <div className="flex items-start gap-4 relative z-10">
                 <div className="w-6 h-6 rounded-full border-4 border-white bg-green-500 shadow-sm flex-shrink-0"></div>
                 <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pickup</div>
                    <div className="text-gray-900 font-medium">
                      {fromAddr || (ride.pickup ? `${ride.pickup.lat}, ${ride.pickup.lng}` : "—")}
                    </div>
                 </div>
              </div>

              {/* TO */}
              <div className="flex items-start gap-4 relative z-10">
                 <div className="w-6 h-6 rounded-full border-4 border-white bg-red-500 shadow-sm flex-shrink-0"></div>
                 <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Drop</div>
                    <div className="text-gray-900 font-medium">
                       {toAddr || (ride.drop ? `${ride.drop.lat}, ${ride.drop.lng}` : "—")}
                    </div>
                 </div>
              </div>
           </div>

           {/* Info Grid */}
           <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                 <div className="text-xs text-gray-500 mb-1">Driver</div>
                 <div className="font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    {targetDriverId || "Broadcasting..."}
                 </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                 <div className="text-xs text-gray-500 mb-1">Status</div>
                 <div className="font-semibold text-indigo-600">On the way</div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // PENDING / Cancelled View
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-indigo-50 to-white rounded-full opacity-50 z-0 pointer-events-none"></div>

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-gray-800">New Request</h3>
          <p className="text-sm text-gray-500 mt-1">Incoming ride offer</p>
        </div>
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusBadge(
            ride.status
          )}`}
        >
          {ride.status}
        </div>
      </div>



      <div className="space-y-4 mb-8 relative z-10">
         <div className="flex items-start gap-3">
             <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
             <div>
               <div className="text-xs text-gray-400 font-bold uppercase">From</div>
               <div className="text-gray-800 font-medium">
                 {fromAddr || (ride.pickup ? `${ride.pickup.lat}, ${ride.pickup.lng}` : "Processing...")}
               </div>
             </div>
         </div>
         <div className="flex items-start gap-3">
             <div className="mt-1 w-2 h-2 bg-red-500 rounded-full"></div>
             <div>
               <div className="text-xs text-gray-400 font-bold uppercase">Drop</div>
               <div className="text-gray-800 font-medium">
                 {toAddr || (ride.drop ? `${ride.drop.lat}, ${ride.drop.lng}` : "Not specified")}
               </div>
             </div>
         </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <div className="flex items-center gap-4 w-full">
           <button
             onClick={handleCancel}
             disabled={time <= 0}
             className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Reject
           </button>
           
           <button
             onClick={handleAccept}
             disabled={accepting || !driverId.trim() || time <= 0}
             className="flex-1 bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all transform active:scale-95 flex justify-center items-center gap-2"
           >
             {time <= 0 ? "Request Expired" : accepting ? "Accepting..." : "Accept Ride"}
           </button>
        </div>
        
        {/* Timer floating right or integrated? Let's keep it simple */}
         {/* Timer integrated into the action bar for better visibility */}
         {(ride.status === 'pending' || ride.status === 'REQUESTED') && time > 0 && (
            <div className="flex flex-col items-center justify-center px-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Expires in</span>
              <span className={`font-mono font-bold text-2xl ${time <= 3 ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>
                {time}s
              </span>
            </div>
         )}
      </div>
    </div>

  );
}
