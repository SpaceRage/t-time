import { useVehicles } from "@/contexts/VehicleContext"; // Adjust the path as necessary
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";
import { commuterFeatures } from "../data/commuterLines";
import { lineFeatures } from "../data/lines";
import { stopFeatures } from "../data/stations";
import { interpolateLine } from "../lib/utils";

// Define the color mapping based on route IDs
export const routeColorMap: { [key: string]: string } = {
  Red: "#990000",
  "Green-B": "#007700",
  "Green-C": "#007700",
  "Green-D": "#007700",
  "Green-E": "#007700",
  Orange: "#EE8811",
  Blue: "#4444EE",
  // Add other routes and their corresponding colors as needed
};

export const lineColorMap: { [key: string]: string } = {
  SILVER: "#C0C0C0", // Silver line color
  RED: "#990000", // Red line color
  GREEN: "#007700", // Green line color
  ORANGE: "#EE8811", // Orange line color
  BLUE: "#4444EE", // Blue line color
  // Add other lines and their corresponding colors as needed
};

// Function to create an SVG marker
const createMarkerSVG = (color: string) => {
  return `
      <svg width="30" height="30" viewBox="0 0 30 30" style="cursor: pointer;" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="15" r="10" fill="${color}" />
        <polygon points="15,11 19,18 11,18" fill="white" />
      </svg>
    `;
};

// Example of using the function with your GeoJSON data
lineFeatures.features.forEach((feature) => {
  if (feature.geometry.type === "LineString") {
    feature.geometry.coordinates = interpolateLine(
      feature.geometry.coordinates,
      4,
    ); // 10 segments for interpolation
  }
});

type Coord = [number, number];

type RapidLineFeature = (typeof lineFeatures.features)[number];
type CommuterLineFeature = (typeof commuterFeatures.features)[number];

const sqDistance = (a: Coord, b: Coord) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

const nearestPointOnSegment = (p: Coord, a: Coord, b: Coord): Coord => {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return a;
  }

  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

  return [a[0] + t * abx, a[1] + t * aby];
};

const normalizeBearing = (bearing: number) => ((bearing % 360) + 360) % 360;

const angularDistance = (a: number, b: number) => {
  const diff = Math.abs(normalizeBearing(a) - normalizeBearing(b));
  return Math.min(diff, 360 - diff);
};

const getSegmentBearing = (start: Coord, end: Coord) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;

  const startLng = toRadians(start[0]);
  const startLat = toRadians(start[1]);
  const endLng = toRadians(end[0]);
  const endLat = toRadians(end[1]);
  const deltaLng = endLng - startLng;

  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);

  return normalizeBearing(toDegrees(Math.atan2(y, x)));
};

const snapBearingToLineDirection = (
  lineBearing: number,
  receivedBearing?: number,
) => {
  if (
    typeof receivedBearing !== "number" ||
    !Number.isFinite(receivedBearing)
  ) {
    return normalizeBearing(lineBearing);
  }

  const forwardBearing = normalizeBearing(lineBearing);
  const reverseBearing = normalizeBearing(lineBearing + 180);

  return angularDistance(forwardBearing, receivedBearing) <=
    angularDistance(reverseBearing, receivedBearing)
    ? forwardBearing
    : reverseBearing;
};

const getNearestRailPointAndBearing = (
  point: Coord,
  routeId?: string,
): { point: Coord; bearing: number } => {
  const railLineCoordinateSets = routeId
    ? routeId.startsWith("CR")
      ? commuterRailLineCoordinateSets
      : getRapidRailLineCoordinateSetsForRoute(routeId)
    : allRailLineCoordinateSets;

  let bestPoint: Coord = point;
  let bestBearing = 0;
  let bestDistSq = Number.POSITIVE_INFINITY;

  railLineCoordinateSets.forEach((lineCoords) => {
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const segmentStart = lineCoords[i];
      const segmentEnd = lineCoords[i + 1];
      const candidate = nearestPointOnSegment(point, segmentStart, segmentEnd);
      const candidateDistSq = sqDistance(point, candidate);

      if (candidateDistSq < bestDistSq) {
        bestDistSq = candidateDistSq;
        bestPoint = candidate;
        bestBearing = getSegmentBearing(segmentStart, segmentEnd);
      }
    }
  });

  return { point: bestPoint, bearing: bestBearing };
};

const rapidRailLineFeatures: RapidLineFeature[] = lineFeatures.features.filter(
  (feature) => feature.geometry.type === "LineString",
);

const rapidRailLineCoordinateSets: Coord[][] = rapidRailLineFeatures.map(
  (feature) =>
    (feature.geometry as unknown as { coordinates: Coord[] }).coordinates,
);

const commuterRailLineFeatures: CommuterLineFeature[] =
  commuterFeatures.features.filter(
    (feature) => feature.geometry.type === "MultiLineString",
  );

const commuterRailLineCoordinateSets: Coord[][] =
  commuterRailLineFeatures.flatMap(
    (feature) =>
      (feature.geometry as unknown as { coordinates: Coord[][] }).coordinates,
  );

const allRailLineCoordinateSets: Coord[][] = [
  ...rapidRailLineCoordinateSets,
  ...commuterRailLineCoordinateSets,
];

const getRapidRailLineCoordinateSetsForRoute = (
  routeId?: string,
): Coord[][] => {
  if (!routeId) {
    return rapidRailLineCoordinateSets;
  }

  const matchingFeatures = rapidRailLineFeatures.filter((feature) => {
    const properties = feature.properties as {
      LINE?: string;
      ROUTE?: string;
    };

    if (routeId === "Red") {
      return properties.LINE === "RED";
    }

    if (routeId === "Orange") {
      return properties.LINE === "ORANGE";
    }

    if (routeId === "Blue") {
      return properties.LINE === "BLUE";
    }

    if (routeId.startsWith("Green-")) {
      const branch = routeId.split("-")[1]?.[0];
      return (
        properties.LINE === "GREEN" &&
        !!branch &&
        properties.ROUTE?.includes(branch)
      );
    }

    return false;
  });

  return matchingFeatures.length
    ? matchingFeatures.map(
        (feature) =>
          (feature.geometry as unknown as { coordinates: Coord[] }).coordinates,
      )
    : rapidRailLineCoordinateSets;
};

const findNearestPointOnRail = (point: Coord, routeId?: string): Coord => {
  return getNearestRailPointAndBearing(point, routeId).point;
};

const stationLabelGeoJson = {
  type: "FeatureCollection" as const,
  features: stopFeatures.features.map((feature) => {
    const { name } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;
    const [snappedLng, snappedLat] = findNearestPointOnRail([
      longitude,
      latitude,
    ]);

    return {
      type: "Feature" as const,
      properties: { name },
      geometry: {
        type: "Point" as const,
        coordinates: [snappedLng, snappedLat] as Coord,
      },
    };
  }),
};

const haversineDistanceMeters = (a: Coord, b: Coord) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLng = toRadians(b[0] - a[0]);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const aTerm =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const cTerm = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm));

  return earthRadiusMeters * cTerm;
};

const getAnimationDurationMs = (
  startPoint: Coord,
  endPoint: Coord,
  speedMetersPerSecond: number | null,
  fallbackDurationMs: number,
) => {
  if (
    typeof speedMetersPerSecond !== "number" ||
    !Number.isFinite(speedMetersPerSecond) ||
    speedMetersPerSecond <= 0
  ) {
    return fallbackDurationMs;
  }

  const distanceMeters = haversineDistanceMeters(startPoint, endPoint);

  return Math.max((distanceMeters / speedMetersPerSecond) * 1000, 250);
};

interface MarkerAnimationState {
  startLat: number;
  startLng: number;
  targetLat: number;
  targetLng: number;
  startTime: number;
  duration: number; // milliseconds
  routeId: string;
  bearing: number;
  lastSnappedTime: number; // milliseconds
  lastSnappedLng: number;
  lastSnappedLat: number;
  lastSnappedBearing: number;
}

interface MapComponentProps {
  setSelectedVehicleId: React.Dispatch<React.SetStateAction<string | null>>;
}

const MapComponent: React.FC<MapComponentProps> = ({
  setSelectedVehicleId,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { vehicles, motionData, lastUpdated } = useVehicles();
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const animationStateRef = useRef<{ [key: string]: MarkerAnimationState }>({});
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_KEY;
    if (!accessToken) {
      throw new Error("Mapbox API key not found");
    }
    mapboxgl.accessToken = accessToken;

    // Initialize the map only once
    if (mapContainer.current && !mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-71.0989, 42.3399], // Center of the map set to Boston
        zoom: 11, // Zoom level set to 12 for a good view of the city
        attributionControl: false, // Disable default attribution control to add custom one
      });

      // Add custom attribution text
      mapRef.current.addControl(
        new mapboxgl.AttributionControl({
          customAttribution:
            "Notice: Train motion is purely aesthetic - may not reflect actual speed | MBTA data © MBTA",
        }),
        "bottom-right",
      );

      // Add zoom controls
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-left");

      // Add GeoJSON source and line layer after the map is initialized
      mapRef.current.on("load", () => {
        // Add the GeoJSON source
        mapRef.current?.addSource("train-lines", {
          type: "geojson",
          data: lineFeatures,
        });

        // Add a layer to display the train lines
        mapRef.current?.addLayer({
          id: "train-lines",
          type: "line",
          source: "train-lines",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": [
              "match",
              ["get", "LINE"], // Get the LINE property
              ...Object.entries(lineColorMap).flat(), // Flatten the color mapping
              "#000000", // Default color if no match is found
            ],
            "line-opacity": 0.8, // Adjust opacity as needed
            "line-width": 6, // Adjust width as needed
          },
        });

        mapRef.current?.addSource("commuter-rail", {
          type: "geojson",
          data: commuterFeatures,
        });

        // Add a layer to display the commuter lines
        mapRef.current?.addLayer({
          id: "commuter-rail",
          type: "line",
          source: "commuter-rail",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#770077",
            "line-opacity": 0.8,
            "line-width": 6,
          },
        });

        mapRef.current?.addSource("station-labels", {
          type: "geojson",
          data: stationLabelGeoJson,
        });

        mapRef.current?.addLayer({
          id: "station-labels",
          type: "symbol",
          source: "station-labels",
          minzoom: 10,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 13],
            "text-offset": [0.9, 0],
            "text-anchor": "left",
          },
          paint: {
            "text-color": "#E5E7EB",
            "text-halo-color": "#111827",
            "text-halo-width": 1,
            "text-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11.4,
              0,
              13.2,
              1,
            ],
          },
        });
      });
    }

    // Clean up on unmount
    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Run only once on mount

  // Function to add station markers
  const addStationMarkers = () => {
    stopFeatures.features.forEach((feature) => {
      const { name } = feature.properties;
      const [longitude, latitude] = feature.geometry.coordinates;
      const [snappedLng, snappedLat] = findNearestPointOnRail([
        longitude,
        latitude,
      ]);

      // Create a new HTML element for the marker
      const markerElement = document.createElement("div");
      markerElement.style.width = "10px"; // Set the width of the marker
      markerElement.style.height = "10px"; // Set the height of the marker
      markerElement.style.opacity = "0.01"; // Set the opacity of the marker
      markerElement.style.backgroundColor = "white"; // Make the background transparent
      markerElement.style.borderRadius = "50%"; // Make the marker circular
      markerElement.style.border = "2px solid #222"; // Add a border to make it visible on the map
      // markerElement.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/MBTA.svg/960px-MBTA.svg.png')`; // Set the image URL
      markerElement.style.backgroundSize = "contain"; // Make sure the image fits the marker
      markerElement.style.backgroundRepeat = "no-repeat"; // Prevent repeating the image

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([snappedLng, snappedLat])
        .addTo(mapRef.current!); // Use the current map instance

      markersRef.current[name] = marker; // Store marker by name or any unique identifier
    });
  };

  // Function to determine marker color based on route ID
  const getMarkerColor = (routeId: string): string => {
    if (routeId.startsWith("CR")) {
      return "purple"; // Color for route IDs starting with "CR"
    }
    return routeColorMap[routeId] || "gray"; // Default to gray if no color is found
  };

  // Animation loop to smoothly update marker positions
  const updateMarkerPositions = () => {
    const now = Date.now();

    for (const vehicleId in animationStateRef.current) {
      const state = animationStateRef.current[vehicleId];
      const marker = markersRef.current[vehicleId];

      if (!marker) continue;

      // Calculate progress (0 to 1)
      const elapsed = now - state.startTime;
      const progress = Math.min(elapsed / state.duration, 1);

      // Interpolate between pre-snapped start and end positions
      const currentLng =
        state.startLng + (state.targetLng - state.startLng) * progress;
      const currentLat =
        state.startLat + (state.targetLat - state.startLat) * progress;

      marker.setLngLat([currentLng, currentLat]);
      marker.setRotation(state.bearing);

      // Remove animation state when complete
      if (progress >= 1) {
        delete animationStateRef.current[vehicleId];
      }
    }

    // Continue animation loop if there are active animations
    if (Object.keys(animationStateRef.current).length > 0) {
      animationFrameRef.current = requestAnimationFrame(updateMarkerPositions);
    }
  };

  // Function to update markers based on vehicle data
  const updateMarkers = () => {
    vehicles.forEach((vehicle) => {
      const { id, attributes, relationships } = vehicle;
      const { latitude, longitude, bearing, speed } = attributes;
      const routeId = relationships.route.data.id;
      const snappedRailState = getNearestRailPointAndBearing(
        [longitude, latitude],
        routeId,
      );
      const [snappedLng, snappedLat] = snappedRailState.point;
      const snappedBearing = snapBearingToLineDirection(
        snappedRailState.bearing,
        bearing,
      );

      // Determine marker color based on route ID
      const markerColor = getMarkerColor(routeId);
      const markerSVG = createMarkerSVG(markerColor);

      // If marker doesn't exist, create a new one
      if (!markersRef.current[id]) {
        const marker = new mapboxgl.Marker({
          element: new DOMParser().parseFromString(markerSVG, "image/svg+xml")
            .documentElement,
        })
          .setLngLat([snappedLng, snappedLat])
          .setRotation(snappedBearing)
          .addTo(mapRef.current!);

        marker.getElement().addEventListener("click", () => {
          setSelectedVehicleId(id);
          mapRef.current?.easeTo({
            center: [snappedLng, snappedLat],
            zoom: 16,
            duration: 1000,
          });
        });

        markersRef.current[id] = marker;
        const now = Date.now();
        animationStateRef.current[id] = {
          startLat: snappedLat,
          startLng: snappedLng,
          targetLat: snappedLat,
          targetLng: snappedLng,
          startTime: now,
          duration: 0,
          routeId,
          bearing: snappedBearing,
          lastSnappedTime: now,
          lastSnappedLng: snappedLng,
          lastSnappedLat: snappedLat,
          lastSnappedBearing: snappedBearing,
        };
      } else {
        // If marker exists, set up animation to new position
        const marker = markersRef.current[id];
        const motionInfo = motionData[id];

        // Get current marker position
        const currentPos = marker.getLngLat();

        // Snap the current position to ensure both start and end are on the rail
        const snappedStartState = getNearestRailPointAndBearing(
          [currentPos.lng, currentPos.lat],
          routeId,
        );
        const [snappedStartLng, snappedStartLat] = snappedStartState.point;

        // Get time since last update
        const now = Date.now();
        const lastUpdateTime = motionInfo?.lastUpdated?.getTime() ?? now;
        const timeSinceUpdate = now - lastUpdateTime;

        // Estimate the animation duration from the latest reported speed.
        // When speed is unavailable, fall back to the previous timing heuristic.
        const fallbackDuration = Math.min(
          5000,
          Math.max(500, timeSinceUpdate * 0.8),
        );

        // Check if the jump is large (e.g., GPS error, service change, or data issue)
        const distanceToNewLocation = haversineDistanceMeters(
          [snappedStartLng, snappedStartLat],
          [snappedLng, snappedLat],
        );
        const TELEPORT_THRESHOLD_METERS = 500;

        // If jump exceeds threshold, teleport instantly; otherwise animate smoothly
        let animationDuration;
        if (distanceToNewLocation > TELEPORT_THRESHOLD_METERS) {
          animationDuration = 0; // Instant teleport
        } else {
          animationDuration = getAnimationDurationMs(
            [snappedStartLng, snappedStartLat],
            [snappedLng, snappedLat],
            speed,
            fallbackDuration,
          );
        }

        animationStateRef.current[id] = {
          startLat: snappedStartLat,
          startLng: snappedStartLng,
          targetLat: snappedLat,
          targetLng: snappedLng,
          startTime: now,
          duration: animationDuration,
          routeId,
          bearing: snappedBearing,
          lastSnappedTime: now,
          lastSnappedLng: snappedStartLng,
          lastSnappedLat: snappedStartLat,
          lastSnappedBearing: snappedBearing,
        };

        // Update rotation immediately
        marker.setRotation(snappedBearing);

        // Update the marker's SVG if the color has changed
        const currentSVG = marker.getElement();
        const currentColor = currentSVG
          .querySelector("circle")
          ?.getAttribute("fill");

        if (currentColor !== markerColor) {
          currentSVG.querySelector("circle")!.setAttribute("fill", markerColor);
          currentSVG.style.zIndex = "100";
        }

        // Start animation if not already running
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(
            updateMarkerPositions,
          );
        }
      }
    });
  };

  // Effect to add station markers on map load
  useEffect(() => {
    if (mapRef.current) {
      addStationMarkers();
    }
  }, [mapRef.current]);

  // Effect to update markers when vehicles change
  // Use lastUpdated timestamp as dependency to avoid array size issues
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [lastUpdated]);

  return (
    <div
      ref={mapContainer}
      style={{ position: "absolute", top: 0, bottom: 0, width: "100%" }}
    />
  );
};

export default MapComponent;
