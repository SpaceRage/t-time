"use client";

import { routeColorMap } from "@/components/MapComponent";
import { useCallback, useEffect, useRef, useState } from "react";

const SNAP = {
  collapsed: 100,
  half: 320,
  full: typeof window !== "undefined" ? window.innerHeight - 60 : 720,
};

const SNAP_POINTS = [SNAP.collapsed, SNAP.half, SNAP.full];

function snapTo(y: number) {
  return SNAP_POINTS.reduce((a, b) =>
    Math.abs(b - y) < Math.abs(a - y) ? b : a,
  );
}

const styles = {
  sheet: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "#1C1C1E",
    borderRadius: "16px 16px 0 0",
    borderTop: "1px solid #2C2C2E",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    zIndex: 100,
    touchAction: "none" as const,
  },
  handleArea: {
    padding: "12px 0 24px",
    cursor: "grab" as const,
    flexShrink: 0,
    userSelect: "none" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid #2C2C2E",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: "#48484A",
  },
  mbtaBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 16px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  mbtaLogo: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#DA291C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: 800,
    fontSize: 14,
    color: "#fff",
    letterSpacing: "-0.5px",
    fontFamily: "system-ui, sans-serif",
  },
  mbtaLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#8E8E93",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    fontFamily: "system-ui, sans-serif",
  },
  content: {
    flex: 1,
    padding: "16px 16px 24px",
    color: "#F2F2F7",
    fontFamily: "system-ui, sans-serif",
  },
};

// Function to determine marker color based on route ID
const getMarkerColor = (routeId: string): string => {
  if (routeId.startsWith("CR")) {
    return "purple"; // Color for route IDs starting with "CR"
  }
  return routeColorMap[routeId] || "gray"; // Default to gray if no color is found
};

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function BottomSheet({
  children,
  title,
  subtitle,
}: BottomSheetProps) {
  const [height, setHeight] = useState(SNAP.collapsed);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const sheetRef = useRef(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setDragging(true);
      startY.current = e.clientY;
      startH.current = height;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [height],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = startY.current - e.clientY;
      const next = Math.max(
        SNAP.collapsed,
        Math.min(SNAP.full, startH.current + delta),
      );
      setHeight(next);
    },
    [dragging],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      setHeight((h) => snapTo(h));
    },
    [dragging],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) =>
      onPointerMove(e as unknown as React.PointerEvent<HTMLDivElement>);
    const handleUp = (e: PointerEvent) =>
      onPointerUp(e as unknown as React.PointerEvent<HTMLDivElement>);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  const cycle = () => {
    setHeight((h) => {
      if (h <= SNAP.collapsed + 10) return SNAP.half;
      if (h <= SNAP.half + 10) return SNAP.full;
      return SNAP.collapsed;
    });
  };

  return (
    <div
      ref={sheetRef}
      style={{
        ...styles.sheet,
        height: `${height}px`,
        transition: dragging
          ? "none"
          : "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onClick={cycle}
        style={styles.handleArea}
      >
        <div style={styles.handle} />
        {(title || subtitle) && (
          <div style={styles.mbtaBar}>
            <div
              style={{
                ...styles.mbtaLogo,
                backgroundColor: title ? getMarkerColor(title) : "gray",
              }}
            >
              T
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {title && (
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#F2F2F7",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {title}
                </span>
              )}
              {subtitle && (
                <span
                  style={{
                    fontSize: 14,
                    color: "#8E8E93",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          ...styles.content,
          overflowY: height >= SNAP.full - 40 ? "auto" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
