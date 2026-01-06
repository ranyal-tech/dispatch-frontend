import api from "../api";
import { useEffect, useState } from "react";

export default function LiveDispatch({ ride }) {
  const TOTAL_TIME = 10;

  const [time, setTime] = useState(TOTAL_TIME);
  const [accepting, setAccepting] = useState(false);
  const [alert, setAlert] = useState(null);

  // ⏱ Timer logic only
  useEffect(() => {
    if (!ride) return;

    setTime(TOTAL_TIME);

    const timer = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ride]);

  if (!ride) return null;

  // ✅ Accept Ride
  const handleAccept = async () => {
    if (accepting) return;

    setAccepting(true);
    setAlert(null);

    try {
      await api.post(`/rides/${ride.id}/accept`);
      setAlert({ type: "success", text: "Ride accepted successfully." });
    } catch (e) {
      setAlert({
        type: "error",
        text: e?.response?.data?.message || "Failed to accept ride",
      });
    } finally {
      setAccepting(false);
      setTimeout(() => setAlert(null), 4000);
    }
  };

  // ❌ Cancel Ride
  const handleCancel = async () => {
    if (!window.confirm("Cancel this ride?")) return;

    try {
      await api.post(`/rides/${ride.id}/cancel`);
      setAlert({ type: "success", text: "Ride cancelled." });
    } catch (e) {
      setAlert({
        type: "error",
        text: e?.response?.data?.message || "Cancel failed",
      });
    } finally {
      setTimeout(() => setAlert(null), 4000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        🚦 Live Dispatch Status
      </h2>

      {alert && (
        <div
          className={`mb-4 p-3 rounded ${
            alert.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {alert.text}
        </div>
      )}

      <div className="space-y-2 text-gray-800 mb-6">
        <div>
          <strong>Ride ID:</strong> {ride.id}
        </div>
        <div>
          <strong>Status:</strong> {ride.status}
        </div>
        <div>
          <strong>Driver:</strong> {ride.assignedDriverId || "—"}
        </div>
        <div className="text-orange-600 font-semibold">
          ⏳ Retry in {time} seconds
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleAccept}
          disabled={accepting || ride.status !== "pending"}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
        >
          {accepting ? "Accepting..." : "Accept Ride"}
        </button>

        <button
          onClick={handleCancel}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
        >
          Cancel Ride
        </button>
      </div>
    </div>
  );
}
