"use client";

import MapComponent from "@/components/MapComponent";
import MapDetails from "@/components/MapDetails";
import { useVehicles } from "@/contexts/VehicleContext";
import { Vehicle } from "@/types/vehicle";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const { vehicles, isInitialized, lastUpdated, vehicleCount } = useVehicles();
  const updatesRef = useRef<Record<string, HTMLDivElement | undefined>>({});
  const mbInit = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_KEY;
  if (!mbInit) {
    throw new Error("Mapbox API key not found");
  }

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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
    <div style={{ position: "relative", height: "100dvh" }}>
      <MapComponent setSelectedVehicle={setSelectedVehicle} />
      <MapDetails vehicle={selectedVehicle} />
    </div>
  );
}
