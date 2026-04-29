// ===========================================
// SmartProperty - True 360° Spherical Viewer
// ===========================================
// Renders equirectangular panoramic images on an inverted sphere
// using Three.js via @react-three/fiber and @react-three/drei.

import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { VirtualTourHotspot } from "../../types/property";
import HotspotMarker, { sphericalToCartesian } from "./HotspotMarker";

// ── Types ──────────────────────────────────────────────────────

export interface Sphere360ViewerProps {
  src: string;
  altText?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  height?: string;
  /** Hotspots to render in this panorama */
  hotspots?: VirtualTourHotspot[];
  /** Called when a hotspot is clicked */
  onHotspotClick?: (hotspot: VirtualTourHotspot) => void;
  /** Enable edit mode for placing hotspots */
  editMode?: boolean;
  /** Called when the sphere is clicked in edit mode with yaw/pitch */
  onSphereClick?: (yaw: number, pitch: number) => void;
  /** Called when a hotspot's delete button is clicked in edit mode */
  onHotspotDelete?: (hotspotId: string) => void;
}

// ── Click mesh for edit mode ──────────────────────────────────

function ClickableSphere({
  onSphereClick,
}: {
  onSphereClick: (yaw: number, pitch: number) => void;
}) {
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const { gl } = useThree();

  const handlePointerDown = useCallback(
    (e: THREE.Event & { clientX?: number; clientY?: number }) => {
      const nativeEvent = (e as unknown as { nativeEvent?: PointerEvent })
        .nativeEvent;
      if (nativeEvent) {
        downPos.current = { x: nativeEvent.clientX, y: nativeEvent.clientY };
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: THREE.Event & { point?: THREE.Vector3 }) => {
      const nativeEvent = (e as unknown as { nativeEvent?: PointerEvent })
        .nativeEvent;
      if (downPos.current && nativeEvent) {
        const dx = nativeEvent.clientX - downPos.current.x;
        const dy = nativeEvent.clientY - downPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Only treat as click if pointer didn't move much (not a drag)
        if (dist < 5 && e.point) {
          const r = e.point.length();
          const pitch = Math.asin(e.point.y / r);
          const yaw = Math.atan2(-e.point.x, -e.point.z);
          onSphereClick(yaw, pitch);
        }
      }
      downPos.current = null;
    },
    [onSphereClick],
  );

  return (
    <mesh onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      <sphereGeometry args={[49, 64, 64]} />
      <meshBasicMaterial
        transparent
        opacity={0}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Inner scene rendered inside the Canvas ─────────────────────

interface SphereSceneProps {
  src: string;
  autoRotate: boolean;
  autoRotateSpeed: number;
  hotspots?: VirtualTourHotspot[];
  onHotspotClick?: (hotspot: VirtualTourHotspot) => void;
  editMode?: boolean;
  onSphereClick?: (yaw: number, pitch: number) => void;
  onHotspotDelete?: (hotspotId: string) => void;
}

function SphereScene({
  src,
  autoRotate,
  autoRotateSpeed,
  hotspots,
  onHotspotClick,
  editMode,
  onSphereClick,
  onHotspotDelete,
}: SphereSceneProps) {
  const texture = useLoader(THREE.TextureLoader, src);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <>
      <OrbitControls
        enableZoom
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={-0.35}
        autoRotate={autoRotate && !editMode}
        autoRotateSpeed={autoRotateSpeed}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
      />

      {/* Panorama sphere */}
      <mesh>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </mesh>

      {/* Edit mode click target */}
      {editMode && onSphereClick && (
        <ClickableSphere onSphereClick={onSphereClick} />
      )}

      {/* Hotspot markers */}
      {hotspots?.map((hs) => (
        <HotspotMarker
          key={hs.id}
          position={sphericalToCartesian(hs.yaw, hs.pitch)}
          label={hs.label}
          onClick={() => onHotspotClick?.(hs)}
          editMode={editMode}
          onDelete={() => onHotspotDelete?.(hs.id)}
        />
      ))}
    </>
  );
}

// ── Loading fallback inside Canvas ─────────────────────────────

function CanvasLoader() {
  return (
    <mesh>
      <sphereGeometry args={[50, 16, 16]} />
      <meshBasicMaterial color="#1a1a2e" side={THREE.BackSide} wireframe />
    </mesh>
  );
}

// ── Main exported component ────────────────────────────────────

export default function Sphere360Viewer({
  src,
  altText,
  autoRotate = true,
  autoRotateSpeed = 0.5,
  height = "100%",
  hotspots,
  onHotspotClick,
  editMode = false,
  onSphereClick,
  onHotspotDelete,
}: Sphere360ViewerProps) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [src]);

  if (loadError) {
    return (
      <div className="sphere360-error" role="alert">
        <p>Failed to load panorama image.</p>
      </div>
    );
  }

  return (
    <div
      className="sphere360-container"
      style={{ width: "100%", height }}
      aria-label={altText || "360° panoramic viewer"}
      role="img"
    >
      <Canvas
        camera={{ fov: 75, position: [0, 0, 0.1], near: 0.1, far: 1000 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0a0e1a");
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <SphereScene
            key={src}
            src={src}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            hotspots={hotspots}
            onHotspotClick={onHotspotClick}
            editMode={editMode}
            onSphereClick={onSphereClick}
            onHotspotDelete={onHotspotDelete}
          />
        </Suspense>
      </Canvas>

      <div className="sphere360-hint">
        {editMode
          ? "Click to place a hotspot \u2022 Drag to look around"
          : "Drag to look around \u2022 Scroll to zoom"}
      </div>
    </div>
  );
}
