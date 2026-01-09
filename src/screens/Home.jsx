import React, { useEffect, useState } from "react";
import api from "../api";

export default function Home({ onNavigate }) {
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedRide, setSelectedRide] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
       try {
         const [dRes, rRes] = await Promise.all([
           api.get("/drivers"),
           api.get("/rides")
         ]);
         setDrivers(dRes.data?.data || dRes.data || []);
         setRides(rRes.data?.data || rRes.data || []);
       } catch (e) {
         console.error("Failed to load dashboard data", e);
       }
    };
    fetchData();
  }, []);

  // Compute Statistics
  const totalDrivers = drivers.length;
  // Check for 'ONLINE' string or boolean true/online property
  const onlineDrivers = drivers.filter(d => d.status === 'ONLINE' || d.online === true).length;
  
  const totalRides = rides.length;
  const requestedRides = rides.filter(r => r.status === 'REQUESTED').length;
  const completedRides = rides.filter(r => r.status === 'COMPLETED').length;
  const cancelledRides = rides.filter(r => r.status === 'CANCELLED').length;
  // Fallback for 'on_trip' or others if needed, but these are the requested ones

  const checkStatus = async () => {
    if (!selectedDriver || !selectedRide) return;
    setLoading(true);
    setStatusResult(null);
    try {
      const res = await api.get(`/rides/${selectedRide}/drivers/${selectedDriver}/ping-status`);
      setStatusResult(res.data?.data || res.data);
    } catch (e) {
      setStatusResult({ error: e?.response?.data?.message || "Failed to fetch status" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Platform Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Real-time metrics for your dispatch operations.</p>
        
        {/* Drivers Section */}
        <div className="mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver Fleet</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
               <div className="text-sm text-gray-500 font-medium">Total Drivers</div>
               <div className="text-3xl font-bold text-gray-800 mt-1">{totalDrivers}</div>
             </div>
             <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
               <div className="text-sm text-gray-500 font-medium">Online Drivers</div>
               <div className="text-3xl font-bold text-green-600 mt-1">{onlineDrivers}</div>
             </div>
             <div className="p-3 bg-green-50 rounded-lg text-green-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
             </div>
          </div>
        </div>

        {/* Rides Section */}
        <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ride Activity</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Total Rides */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium">Total Rides</div>
                <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                </div>
             </div>
             <div className="text-3xl font-bold text-gray-800">{totalRides}</div>
           </div>

           {/* Requested */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium">Requested</div>
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
             </div>
             <div className="text-3xl font-bold text-gray-800">{requestedRides}</div>
             <div className="text-xs text-yellow-600 mt-1 font-medium">Pending Action</div>
           </div>

           {/* Completed */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium">Completed</div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
             </div>
             <div className="text-3xl font-bold text-gray-800">{completedRides}</div>
             <div className="text-xs text-green-600 mt-1 font-medium">Successful Trips</div>
           </div>

           {/* Cancelled */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium">Cancelled</div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
             </div>
             <div className="text-3xl font-bold text-gray-800">{cancelledRides}</div>
             <div className="text-xs text-red-500 mt-1 font-medium">Withdrawn/Rejected</div>
           </div>
        </div>
      </div>

      {/* Ping Status Inspector */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-indigo-50">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Ping Status Inspector</h3>
              <p className="text-sm text-gray-500">Debug ping status for specific driver/ride pairs</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Driver</label>
               <select 
                 className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={selectedDriver}
                 onChange={(e) => setSelectedDriver(e.target.value)}
               >
                 <option value="">-- Choose Driver --</option>
                 {drivers.map(d => (
                   <option key={d.id || d.driverId} value={d.id || d.driverId}>
                     {d.name || d.username || d.id || d.driverId}
                   </option>
                 ))}
               </select>
            </div>

            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Ride</label>
               <select 
                 className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={selectedRide}
                 onChange={(e) => setSelectedRide(e.target.value)}
               >
                 <option value="">-- Choose Ride --</option>
                 {rides.slice().reverse().map(r => (
                   <option key={r.id} value={r.id}>
                     #{r.id.slice(0,6)}... ({r.status})
                   </option>
                 ))}
               </select>
            </div>

            <button 
               onClick={checkStatus}
               disabled={!selectedDriver || !selectedRide || loading}
               className="h-[46px] bg-black text-white px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
               {loading ? "Checking..." : "Check Status"}
            </button>
         </div>

         {/* Results Area */}
         {statusResult && (
           <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Inspector Result</h4>
              
              {statusResult.error ? (
                <div className="text-red-600 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {statusResult.error}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Ride Status</div>
                      <div className={`font-mono font-bold ${statusResult.rideStatus === 'PENDING' ? 'text-yellow-600' : 'text-gray-800'}`}>
                        {statusResult.rideStatus || statusResult.status || "Unknown"}
                      </div>
                   </div>
                   <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Pinged?</div>
                      <div className="font-mono font-bold text-gray-800">
                        {statusResult.pinged !== undefined ? (statusResult.pinged ? "YES" : "NO") : "—"}
                      </div>
                   </div>
                   <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Assigned?</div>
                      <div className="font-mono font-bold text-gray-800">
                        {statusResult.currentlyAssigned !== undefined ? (statusResult.currentlyAssigned ? "YES" : "NO") : "—"}
                      </div>
                   </div>

                   {/* Raw JSON dump for deep debugging if needed */}
                   <div className="col-span-2 mt-2">
                     <details className="text-xs text-gray-400 cursor-pointer">
                       <summary className="hover:text-gray-600">View Raw Response</summary>
                       <pre className="mt-2 p-2 bg-slate-900 text-slate-200 rounded overflow-x-auto">
                         {JSON.stringify(statusResult, null, 2)}
                       </pre>
                     </details>
                   </div>
                </div>
              )}
           </div>
         )}
      </div>
    </div>
  );
}
