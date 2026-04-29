// ===========================================
// SmartProperty - 3D Hotspot Marker
// ===========================================
// Renders a clickable hotspot marker inside the Three.js sphere
// using @react-three/drei's Html component for DOM projection.

import { Html } from "@react-three/drei";
import { useCallback } from "react";

interface HotspotMarkerProps {
  position: [number, number, number];
  label: string;
  onClick: () => void;
  editMode?: boolean;
  onDelete?: () => void;
}

function sphericalToCartesian(
  yaw: number,
  pitch: number,
  r = 48,
): [number, number, number] {
  const x = -r * Math.cos(pitch) * Math.sin(yaw);
  const y = r * Math.sin(pitch);
  const z = -r * Math.cos(pitch) * Math.cos(yaw);
  return [x, y, z];
}

export { sphericalToCartesian };

export default function HotspotMarker({
  position,
  label,
  onClick,
  editMode = false,
  onDelete,
}: HotspotMarkerProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    },
    [onDelete],
  );

  return (
    <group position={position}>
      <Html center zIndexRange={[50, 0]} style={{ pointerEvents: "auto" }}>
        <div className="hotspot-marker" onClick={handleClick}>
          <div className="hotspot-ring" />
          <div className="hotspot-dot">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <span className="hotspot-label">{label}</span>
          {editMode && onDelete && (
            <button
              type="button"
              className="hotspot-delete"
              onClick={handleDelete}
              aria-label={`Delete hotspot: ${label}`}
            >
              &times;
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}
