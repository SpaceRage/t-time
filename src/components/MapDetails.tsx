"use client";

import BottomSheet from "@/components/BottomSheet";
import { Stop } from "@/types/stop";
import { Trip } from "@/types/trip";
import { Vehicle } from "@/types/vehicle";
import { useEffect, useState } from "react";

// Status Map
const statusMap: Record<string, string> = {
  IN_TRANSIT_TO: "In transit to",
  STOPPED_AT: "Stopped at",
  INCOMING_AT: "Arriving at",
};

export default function MapDetails({ vehicle }: { vehicle?: Vehicle | null }) {
  const [tripDetails, setTripDetails] = useState<Trip | null>(null);
  const [stopDetails, setStopDetails] = useState<Stop | null>(null);

  useEffect(() => {
    if (!vehicle) {
      setTripDetails(null);
      setStopDetails(null);
      return;
    }
    fetchTripDetails();
    fetchStopDetails();
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

  const fetchStopDetails = async () => {
    try {
      const stopId = vehicle?.relationships.stop.data.id;
      const response = await fetch(`/api/stop?stopId=${stopId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stop details: ${response.status}`);
      }
      const data: Stop = await response.json();
      setStopDetails(data);
    } catch (error) {
      console.error("Error fetching stop details:", error);
      setStopDetails(null);
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
      <p className="text-sm text-gray-600">
        {statusMap[vehicle?.attributes.current_status ?? "IN_TRANSIT_TO"] ||
          vehicle?.attributes.current_status}{" "}
        <span className="text-gray-400 font-bold">
          {stopDetails?.data.attributes.name}
        </span>
      </p>
      {vehicle?.attributes.speed && (
        <p className="text-sm text-gray-600">
          Speed{" "}
          <span className="text-gray-400 font-bold">
            {Math.round(vehicle?.attributes.speed * 2.23694)} mph
          </span>
        </p>
      )}
      <p className="text-sm text-gray-600">
        Vehicle <span className="text-gray-400 font-bold">{vehicle?.id}</span>
      </p>
      {vehicle?.attributes.carriages &&
        vehicle.attributes.carriages.length > 0 && (
          <div className="text-sm text-gray-600 border-[1px] border-gray-600 rounded-md p-2 mt-2 w-[275px]">
            <p className="font-semibold mb-2">Cars:</p>
            {vehicle.attributes.carriages.map((carriage) => (
              <div
                key={carriage.label}
                className="mb-1 flex flex-row items-center gap-2"
              >
                <p className="w-10">{carriage.label}</p>
                {carriage.occupancy_percentage !== null && (
                  <div className="w-[200px] bg-gray-400 h-3.5">
                    <div
                      className={`${carriage.occupancy_percentage > 75 ? "bg-red-600" : carriage.occupancy_percentage > 50 ? "bg-yellow-600" : "bg-green-600"} h-3.5`}
                      style={{ width: `${carriage.occupancy_percentage}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </BottomSheet>
  );
}
