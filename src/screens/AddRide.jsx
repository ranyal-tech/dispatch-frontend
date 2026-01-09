import React from "react";
import RidePanel from "../components/RidePanel";

export default function AddRide({ onCreate }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Create Ride</h2>
      <RidePanel onCreate={onCreate} />
    </div>
  );
}
