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
