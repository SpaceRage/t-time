import { useVehicles } from "@/contexts/VehicleContext"; // Adjust the path as necessary
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";
import { commuterFeatures } from "../data/commuterLines";
import { lineFeatures } from "../data/lines";
import { stopFeatures } from "../data/stations";
import { interpolateLine } from "../lib/utils";

// Define the color mapping based on route IDs
const routeColorMap: { [key: string]: string } = {
  Red: "#990000",
  "Green-B": "#007700",
  "Green-C": "#007700",
  "Green-D": "#007700",
  "Green-E": "#007700",
  Orange: "#EE8811",
  Blue: "#4444EE",
  // Add other routes and their corresponding colors as needed
};

const lineColorMap: { [key: string]: string } = {
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
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
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

const rapidRailLineCoordinateSets: Coord[][] = lineFeatures.features
  .filter((feature) => feature.geometry.type === "LineString")
  .map(
    (feature) =>
      (feature.geometry as unknown as { coordinates: Coord[] }).coordinates,
  );

const commuterRailLineCoordinateSets: Coord[][] = commuterFeatures.features
  .filter((feature) => feature.geometry.type === "MultiLineString")
  .flatMap(
    (feature) =>
      (feature.geometry as unknown as { coordinates: Coord[][] }).coordinates,
  );

const allRailLineCoordinateSets: Coord[][] = [
  ...rapidRailLineCoordinateSets,
  ...commuterRailLineCoordinateSets,
];

const findNearestPointOnRail = (point: Coord, routeId?: string): Coord => {
  const railLineCoordinateSets = routeId
    ? routeId.startsWith("CR")
      ? commuterRailLineCoordinateSets
      : rapidRailLineCoordinateSets
    : allRailLineCoordinateSets;

  let bestPoint: Coord = point;
  let bestDistSq = Number.POSITIVE_INFINITY;

  railLineCoordinateSets.forEach((lineCoords) => {
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const candidate = nearestPointOnSegment(
        point,
        lineCoords[i],
        lineCoords[i + 1],
      );
      const candidateDistSq = sqDistance(point, candidate);
      if (candidateDistSq < bestDistSq) {
        bestDistSq = candidateDistSq;
        bestPoint = candidate;
      }
    }
  });

  return bestPoint;
};

interface MarkerAnimationState {
  startLat: number;
  startLng: number;
  targetLat: number;
  targetLng: number;
  startTime: number;
  duration: number; // milliseconds
}

const MapComponent: React.FC = () => {
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
      });

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
            "line-width": 4, // Adjust width as needed
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
            "line-width": 4,
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
      markerElement.style.width = "8px"; // Set the width of the marker
      markerElement.style.height = "8px"; // Set the height of the marker
      markerElement.style.opacity = "0.01"; // Set the opacity of the marker
      markerElement.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/MBTA.svg/960px-MBTA.svg.png')`; // Set the image URL
      markerElement.style.backgroundSize = "contain"; // Make sure the image fits the marker
      markerElement.style.backgroundRepeat = "no-repeat"; // Prevent repeating the image

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([snappedLng, snappedLat])
        .setPopup(new mapboxgl.Popup().setText(name)) // Optional popup
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

      // Interpolate position
      const currentLng =
        state.startLng + (state.targetLng - state.startLng) * progress;
      const currentLat =
        state.startLat + (state.targetLat - state.startLat) * progress;
      marker.setLngLat([currentLng, currentLat]);

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
      const { latitude, longitude, bearing } = attributes;
      const routeId = relationships.route.data.id;
      const [snappedLng, snappedLat] = findNearestPointOnRail(
        [longitude, latitude],
        routeId,
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
          .setPopup(new mapboxgl.Popup().setText(vehicle.attributes.label))
          .addTo(mapRef.current!);
        markersRef.current[id] = marker;
        const now = Date.now();
        animationStateRef.current[id] = {
          startLat: snappedLat,
          startLng: snappedLng,
          targetLat: snappedLat,
          targetLng: snappedLng,
          startTime: now,
          duration: 0,
        };
      } else {
        // If marker exists, set up animation to new position
        const marker = markersRef.current[id];
        const motionInfo = motionData[id];

        // Get current marker position
        const currentPos = marker.getLngLat();

        // Get time since last update
        const now = Date.now();
        const lastUpdateTime = motionInfo?.lastUpdated?.getTime() ?? now;
        const timeSinceUpdate = now - lastUpdateTime;

        // Estimate the animation duration based on time since last update
        // We'll animate over the expected time until the next update
        // Assuming updates come roughly every 4-5 seconds
        const expectedUpdateInterval = 5000; // 5 seconds
        const animationDuration = Math.min(
          expectedUpdateInterval,
          Math.max(500, timeSinceUpdate * 0.8),
        ); // Animate over 80% of the expected update interval

        // Set up animation state
        animationStateRef.current[id] = {
          startLat: currentPos.lat,
          startLng: currentPos.lng,
          targetLat: snappedLat,
          targetLng: snappedLng,
          startTime: now,
          duration: animationDuration,
        };

        // Update rotation immediately
        marker.setRotation(bearing);

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
