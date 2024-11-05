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

  return <MapComponent />;
}
