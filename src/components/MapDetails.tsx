"use client";

import BottomSheet from "@/components/BottomSheet";
import { Trip } from "@/types/trip";
import { Vehicle } from "@/types/vehicle";
import { useEffect, useState } from "react";

export default function MapDetails({ vehicle }: { vehicle?: Vehicle | null }) {
  const [tripDetails, setTripDetails] = useState<Trip | null>(null);

  useEffect(() => {
    if (!vehicle) {
      setTripDetails(null);
      return;
    }
    fetchTripDetails();
  }, [vehicle]);

  const fetchTripDetails = async () => {
    try {
      const tripId = vehicle?.relationships.trip.data.id;
      const response = await fetch(`/api/trip?tripId=${tripId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trip details: ${response.status}`);
      }
      const data: Trip = await response.json();
      setTripDetails(data);
    } catch (error) {
      console.error("Error fetching trip details:", error);
      setTripDetails(null);
    }
  };

  const routeId = vehicle?.relationships.route.data.id;
  const routeName = routeId?.includes("CR")
    ? routeId + " " + vehicle?.relationships.trip.data.id.split("-").at(-1)
    : routeId;
  const headsign = tripDetails?.data.attributes.headsign;

  return (
    <BottomSheet
      title={routeName ?? "No train selected."}
      subtitle={
        headsign ? `to ${headsign}` : "Click a train on the map for details."
      }
    >
      <p className="text-sm text-gray-600">{JSON.stringify(vehicle)}</p>
    </BottomSheet>
  );
}
