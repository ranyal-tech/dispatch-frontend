import { useState } from "react";
import DriverPanel from "./components/DriverPanel";
import RidePanel from "./components/RidePanel";
import LiveDispatch from "./components/LiveDispatch";

export default function App() {
  const [ride, setRide] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-6xl px-8 py-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-10 flex items-center gap-3">
          🚕 Driver Dispatch System
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <DriverPanel />
          <RidePanel onCreate={setRide} />
        </div>

        <LiveDispatch ride={ride} />
      </div>
    </div>
  );
}
