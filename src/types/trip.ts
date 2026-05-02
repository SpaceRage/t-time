interface TripRelationship {
  data: {
    id: string;
    type: string;
  };
}

interface TripAttributes {
  headsign: string;
  name: string;
  block_id: string;
  direction_id: 0 | 1;
  revenue: "REVENUE" | "NON_REVENUE";
  bikes_allowed: 0 | 1 | 2;
  wheelchair_accessible: 0 | 1 | 2;
}

interface TripRelationships {
  route: TripRelationship;
  route_pattern: TripRelationship;
  service: TripRelationship;
  shape: TripRelationship;
}

interface TripData {
  id: string;
  type: "trip";
  links: {
    self: string;
  };
  attributes: TripAttributes;
  relationships: TripRelationships;
}

export interface Trip {
  data: TripData;
  jsonapi: {
    version: string;
  };
}
