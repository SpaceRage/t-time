"use client";

import MapComponent from "@/components/MapComponent";
import { useVehicles, Vehicle } from "@/contexts/VehicleContext";
import { useEffect, useRef } from "react";

export default function Home() {
  const { vehicles, isInitialized, lastUpdated, vehicleCount } = useVehicles();
  const updatesRef = useRef<Record<string, HTMLDivElement | undefined>>({});
  const mbInit = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_KEY;
  if (!mbInit) {
    throw new Error("Mapbox API key not found");
  }

  // Highlight updates
  useEffect(() => {
    vehicles.forEach((vehicle: Vehicle) => {
      const element = updatesRef.current[vehicle.id];
      if (element) {
        element.classList.add("bg-yellow-100");
        setTimeout(() => {
          element.classList.remove("bg-yellow-100");
        }, 1000);
      }
    });
  }, [vehicles]);

  return (
    <main>
      <MapComponent />
      {/* <div className="mb-4">
        <h1 className="text-2xl font-bold">MBTA Vehicle Locations</h1>
        <div className="text-sm text-gray-600">
          {isInitialized ? (
            <>
              <p>Tracking {vehicleCount} vehicles</p>
              {lastUpdated && (
                <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
              )}
            </>
          ) : (
            <p>Initializing vehicle tracking...</p>
          )}
        </div>
      </div> */}

      {/* {isInitialized ? ( */}
      {/* <div className="space-y-4">
        {vehicles.map((vehicle: Vehicle) => (
          <div
            key={vehicle.id}
            ref={(el) => (updatesRef.current[vehicle.id] = el ?? undefined)}
            className="border p-4 rounded transition-colors duration-500"
          >
            <h2 className="font-bold">Vehicle {vehicle.attributes.label}</h2>
            <p>Status: {vehicle.attributes.current_status}</p>
            <p>
              Location: {vehicle.attributes.latitude.toFixed(4)},{" "}
              {vehicle.attributes.longitude.toFixed(4)}
            </p>
            <p>
              Updated:{" "}
              {new Date(vehicle.attributes.updated_at).toLocaleString()}
            </p>
            <p>Occupancy: {vehicle.attributes.occupancy_status}</p>
            <p>Route: {vehicle.relationships.route.data.id}</p>
          </div>
        ))}
      </div> */}
      {/* ) : (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )} */}
    </main>
  );
}
