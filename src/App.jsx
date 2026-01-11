import { useState, useEffect } from "react";
import api from "./api";
import DriverPanel from "./components/DriverPanel";
import RidePanel from "./components/RidePanel";
import LiveDispatch from "./components/LiveDispatch";
import Home from "./screens/Home";
import AddDriver from "./screens/AddDriver";
import AddRide from "./screens/AddRide";
import DriverPing from "./screens/DriverPing";
import RideStatus from "./screens/RideStatus";
import DriverManager from "./screens/DriverManager";
import { NotificationProvider } from "./components/NotificationProvider";

export default function App() {
  const [ride, setRide] = useState(null);
  const [screen, setScreen] = useState("home");
  const [currentDriverId, setCurrentDriverId] = useState(null);

  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Fetch Drivers to simulate "Login"
        const driversRes = await api.get("/drivers");
        // ADAPTIVE: Check if response has wrapped data structure or direct array
        // User said: "the api is sending response like { data: ... }"
        const drivers = driversRes.data?.data || driversRes.data || [];
        let activeDriverId = null;

        if (drivers.length > 0) {
          // Just pick the first driver as the "Logged In" user for this demo
          // Adjust this logic if you have a specific way to choose (e.g. status='online')
          activeDriverId = drivers[0].id || drivers[0].driverId || drivers[0]._id;
          setCurrentDriverId(activeDriverId);
          console.log("Active Driver set to:", activeDriverId);
        }

        // 2. Fetch Latest Ride and Filter
        const ridesRes = await api.get("/rides");
        const rides = ridesRes.data?.data || ridesRes.data || [];
        
        // Filter for rides relevant to this driver (pending or assigned)
        // If we have an active driver, use that ID. If not, maybe showing nothing or all pending?
        // Let's assume safely:
        const targetId = activeDriverId || "driver-1"; 

        // Filter for rides relevant to this driver
        // User requested: "only show the rides those status is requested"
        // And strictly "in driver's ping screen only show the requestid rides with the latest one"
        // This implies: status === 'REQUESTED' AND assignedDriverId === targetId
        const relevantRides = rides.filter(r => 
          r.assignedDriverId === targetId && r.status === 'REQUESTED'
        );

        if (relevantRides.length > 0) {
           const latest = relevantRides[relevantRides.length - 1];
           setRide(latest);
        }
      } catch (e) {
        console.error("Failed to init data", e);
      }
    };
    initData();
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case "add-driver":
        return <AddDriver />;
      case "add-ride":
        return <AddRide onCreate={setRide} />;
      case "driver-ping":
        return <DriverPing ride={ride} driverId={currentDriverId} />;
      case "ride-status":
        return <RideStatus />;
      case "driver-manager":
        return <DriverManager />;
      default:
        return <Home onNavigate={setScreen} />;
    }
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl fixed left-0 top-0 z-10">
          <div className="px-6 py-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              D
            </div>
            <div>
              <div className="font-bold tracking-tight">Dispatch</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Admin Panel</div>
            </div>
          </div>

          <nav className="flex-1 mt-6 px-3 flex flex-col gap-1">
            <button
              onClick={() => setScreen("home")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "home"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Dashboard
            </button>
            <div className="mt-4 mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Management
            </div>
            <button
              onClick={() => setScreen("add-driver")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "add-driver"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Add Driver
            </button>
            <button
              onClick={() => setScreen("driver-manager")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "driver-manager"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Manage Drivers
            </button>
            <button
              onClick={() => setScreen("add-ride")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "add-ride"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Add Ride
            </button>
            
            <div className="mt-4 mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operations
            </div>
            <button
              onClick={() => setScreen("driver-ping")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "driver-ping"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Driver Ping
            </button>
            <button
              onClick={() => setScreen("ride-status")}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                screen === "ride-status"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Ride Status
            </button>
          </nav>

          <div className="text-xs text-slate-500 px-6 py-6 border-t border-slate-800">
            v1.0.0 • Production
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
          <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dispatch Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your fleet and rides efficiently</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64 shadow-sm transition-all"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <button className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                 <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                  JD
                </div>
                <span className="text-sm font-medium text-gray-700">John Doe</span>
              </button>
            </div>
          </header>

          <div className="max-w-6xl">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
}
