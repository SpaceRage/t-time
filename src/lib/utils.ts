import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to interpolate line coordinates
export function interpolateLine(coords: number[][], segments = 10) {
  const interpolatedCoords = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const [startX, startY] = coords[i];
    const [endX, endY] = coords[i + 1];

    // Push the starting point
    interpolatedCoords.push([startX, startY]);

    for (let j = 1; j < segments; j++) {
      const t = j / segments;
      const interpolatedX = startX * (1 - t) + endX * t;
      const interpolatedY = startY * (1 - t) + endY * t;
      interpolatedCoords.push([interpolatedX, interpolatedY]);
    }
  }

  // Push the last point
  interpolatedCoords.push(coords[coords.length - 1]);
  return interpolatedCoords;
}
