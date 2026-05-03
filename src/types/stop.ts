interface StopLinks {
  self: string;
  related?: string;
}

interface StopRelationshipData {
  type: string;
  id: string;
}

interface StopRelationship {
  links: StopLinks;
  data: StopRelationshipData;
}

interface StopRelationships {
  parent_station: StopRelationship;
}

interface StopAttributes {
  wheelchair_boarding: 0 | 1 | 2;
  vehicle_type: 0 | 1 | 2 | 3 | 4;
  platform_name: string;
  platform_code: string;
  on_street: string;
  name: string;
  municipality: string;
  longitude: number;
  location_type: 0 | 1 | 2 | 3 | 4;
  latitude: number;
  description: string;
  at_street: string;
  address: string;
}

interface StopData {
  type: string;
  id: string;
  links: Record<string, string>;
  attributes: StopAttributes;
  relationships: StopRelationships;
}

interface StopIncluded {
  type: string;
  id: string;
}

export interface Stop {
  links: {
    self: string;
  };
  included: StopIncluded[];
  data: StopData;
}
