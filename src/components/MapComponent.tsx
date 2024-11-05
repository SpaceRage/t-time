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
      4
    ); // 10 segments for interpolation
  }
});

const MapComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null); // Store the Mapbox map instance
  const { vehicles } = useVehicles(); // Access the vehicles from the context
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({}); // Store markers by vehicle ID

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
    };
  }, []); // Run only once on mount

  // Function to add station markers
  const addStationMarkers = () => {
    stopFeatures.features.forEach((feature) => {
      const { name, lines } = feature.properties;
      const [longitude, latitude] = feature.geometry.coordinates;

      // Create a new HTML element for the marker
      const markerElement = document.createElement("div");
      markerElement.style.width = "6px"; // Set the width of the marker
      markerElement.style.height = "6px"; // Set the height of the marker
      markerElement.style.opacity = "0.01"; // Set the opacity of the marker
      markerElement.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/MBTA.svg/1200px-MBTA.svg.png')`; // Set the image URL
      markerElement.style.backgroundSize = "contain"; // Make sure the image fits the marker
      markerElement.style.backgroundRepeat = "no-repeat"; // Prevent repeating the image

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
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

  // Function to update markers based on vehicle data
  const updateMarkers = () => {
    vehicles.forEach((vehicle) => {
      const { id, attributes, relationships } = vehicle;
      const { latitude, longitude, bearing } = attributes;
      console.log(bearing);
      const routeId = relationships.route.data.id; // Get the route ID

      // Determine marker color based on route ID
      const markerColor = getMarkerColor(routeId); // Get color using the helper function
      const markerSVG = createMarkerSVG(markerColor); // Create SVG for the marker

      // If marker doesn't exist, create a new one
      if (!markersRef.current[id]) {
        const marker = new mapboxgl.Marker({
          element: new DOMParser().parseFromString(markerSVG, "image/svg+xml")
            .documentElement, // Set the SVG as the marker element
        })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup().setText(vehicle.attributes.label)) // Optional popup
          .addTo(mapRef.current!); // Use the current map instance
        markersRef.current[id] = marker; // Store the marker
      } else {
        // If marker exists, update its position
        markersRef.current[id].setLngLat([longitude, latitude]);
        markersRef.current[id].setRotation(bearing);

        // Update the marker's SVG if the color has changed
        const currentSVG = markersRef.current[id].getElement();
        const currentColor = currentSVG
          .querySelector("circle")
          ?.getAttribute("fill");

        if (currentColor !== markerColor) {
          currentSVG.querySelector("circle")!.setAttribute("fill", markerColor);
          // Make z-index higher to make sure the marker is visible
          currentSVG.style.zIndex = "100";
        }
      }
    });
  };

  // Effect to add station markers on map load
  useEffect(() => {
    if (mapRef.current) {
      addStationMarkers(); // Add station markers after the map is loaded
    }
  }, [mapRef.current]); // Re-run only when the map is loaded

  // Effect to update markers when vehicles change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers(); // Update markers based on the latest vehicles
    }
  }, [vehicles]); // Re-run only when vehicles change

  return (
    <div
      ref={mapContainer}
      style={{ position: "absolute", top: 0, bottom: 0, width: "100%" }}
    />
  );
};

export default MapComponent;
