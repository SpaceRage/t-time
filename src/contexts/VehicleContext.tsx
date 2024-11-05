"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface Vehicle {
  id: string;
  type: string;
  attributes: {
    bearing: number;
    carriages: any[];
    current_status: string;
    current_stop_sequence: number;
    direction_id: number;
    label: string;
    latitude: number;
    longitude: number;
    occupancy_status: string;
    revenue: string;
    speed: number | null;
    updated_at: string;
  };
  relationships: {
    route: {
      data: {
        id: string;
        type: string;
      };
    };
    stop: {
      data: {
        id: string;
        type: string;
      };
    };
    trip: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

interface VehicleState {
  vehicles: Record<string, Vehicle>;
  isInitialized: boolean;
  lastUpdated: Date | null;
}

interface VehicleContextType {
  vehicles: Vehicle[];
  isInitialized: boolean;
  lastUpdated: Date | null;
  vehicleCount: number;
  getVehiclesByRoute: (routeId: string) => Vehicle[];
  getVehicle: (vehicleId: string) => Vehicle | undefined;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VehicleState>({
    vehicles: {},
    isInitialized: false,
    lastUpdated: null,
  });

  const validRouteIds = new Set([
    "Red",
    "Green-B",
    "Green-C",
    "Green-D",
    "Green-E",
    "Orange",
    "Blue",
  ]);

  useEffect(() => {
    // Function to fetch initial vehicles data
    const fetchInitialVehicles = async () => {
      try {
        const response = await fetch("/api/mbtaInit"); // Use the new proxy API endpoint

        if (!response.ok) {
          throw new Error(
            `Initial vehicles API responded with status: ${response.status}`
          );
        }

        const data = await response.json();
        const vehiclesData: Record<string, Vehicle> = {};

        // Populate vehiclesData with initial data
        data.data.forEach((vehicle: Vehicle) => {
          const routeId = vehicle.relationships.route.data.id;
          if (validRouteIds.has(routeId) || routeId.startsWith("CR")) {
            vehiclesData[vehicle.id] = vehicle;
          }
        });

        setState((prev) => ({
          ...prev,
          vehicles: vehiclesData,
          isInitialized: true,
          lastUpdated: new Date(),
        }));
      } catch (error) {
        console.error("Initial vehicle fetch error:", error);
      }
    };

    // Fetch initial vehicle data
    fetchInitialVehicles();

    const eventSource = new EventSource("/api/mbtaUpdate");
    let initializationTimeout: NodeJS.Timeout;

    const handleVehicleUpdate = (event: MessageEvent) => {
      try {
        const vehicle: Vehicle = JSON.parse(event.data);
        const routeId = vehicle.relationships.route.data.id;

        if (!validRouteIds.has(routeId) && !routeId.startsWith("CR")) {
          console.log(`Ignoring vehicle ${vehicle.id} (route ID is invalid)`);
          return; // Ignore this vehicle
        }

        setState((prev) => {
          const newVehicles = { ...prev.vehicles };
          const isUpdate = vehicle.id in newVehicles;
          if (isUpdate) {
            const previousVehicle = newVehicles[vehicle.id];
            if (
              new Date(vehicle.attributes.updated_at) >
              new Date(previousVehicle.attributes.updated_at)
            ) {
              newVehicles[vehicle.id] = vehicle;
            }
          } else {
            newVehicles[vehicle.id] = vehicle;
          }
          return {
            vehicles: newVehicles,
            isInitialized: true,
            lastUpdated: new Date(),
          };
        });
      } catch (error) {
        console.error("Error parsing vehicle data:", error);
      }
    };

    const startInitializationTimer = () => {
      clearTimeout(initializationTimeout);
      initializationTimeout = setTimeout(() => {
        console.log("Initial state setup completed");
      }, 3000);
    };

    eventSource.addEventListener("update", (event) => {
      handleVehicleUpdate(event);
      startInitializationTimer();
    });

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      clearTimeout(initializationTimeout);
    };
  }, []);

  const getVehiclesByRoute = (routeId: string) => {
    return Object.values(state.vehicles).filter(
      (vehicle) => vehicle.relationships.route.data.id === routeId
    );
  };

  const getVehicle = (vehicleId: string) => {
    return state.vehicles[vehicleId];
  };

  const value = {
    vehicles: Object.values(state.vehicles),
    isInitialized: state.isInitialized,
    lastUpdated: state.lastUpdated,
    vehicleCount: Object.keys(state.vehicles).length,
    getVehiclesByRoute,
    getVehicle,
  };

  return (
    <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>
  );
}

// Custom hook to use the vehicle context
export function useVehicles() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error("useVehicles must be used within a VehicleProvider");
  }
  return context;
}
