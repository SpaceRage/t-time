type OccupancyStatus =
  | "MANY_SEATS_AVAILABLE"
  | "FEW_SEATS_AVAILABLE"
  | "STANDING_ROOM_ONLY"
  | "CRUSHED_STANDING_ROOM_ONLY"
  | "FULL"
  | "NOT_ACCEPTING_PASSENGERS"
  | "NO_DATA_AVAILABLE";

interface VehicleCarriage {
  label: string;
  occupancy_percentage: number | null;
  occupancy_status: OccupancyStatus;
}

export interface Vehicle {
  id: string;
  type: string;
  attributes: {
    bearing: number;
    carriages: VehicleCarriage[];
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

export interface VehicleMotionData {
  lastLat: number;
  lastLng: number;
  lastUpdated: Date;
}

export interface VehicleState {
  vehicles: Record<string, Vehicle>;
  motionData: Record<string, VehicleMotionData>;
  isInitialized: boolean;
  lastUpdated: Date | null;
}

export interface VehicleContextType {
  vehicles: Vehicle[];
  motionData: Record<string, VehicleMotionData>;
  isInitialized: boolean;
  lastUpdated: Date | null;
  vehicleCount: number;
  getVehiclesByRoute: (routeId: string) => Vehicle[];
  getVehicle: (vehicleId: string) => Vehicle | undefined;
}
