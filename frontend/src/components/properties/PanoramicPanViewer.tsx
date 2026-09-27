// ===========================================
// Panoramic Image Panning Viewer
// ===========================================
// Simple left/right scroll viewer for panoramic images (not 360° spheres)
// Allows users to pan across wide panoramic photos

import { useEffect, useRef, useState } from "react";

export default function PanoramicPanViewer({
  src,
  altText,
}: {
  src: string;
  altText?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef(50);
  const [panPosition, setPanPosition] = useState(50);

  useEffect(() => {
    setPanPosition(50);
    panRef.current = 50;
  }, [src]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let startPan = 50;

    const clampPan = (value: number) => Math.min(100, Math.max(0, value));

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      startX = e.clientX;
      startPan = panRef.current;
      container.setPointerCapture(e.pointerId);
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const deltaX = e.clientX - startX;
      const nextPan = clampPan(startPan - deltaX / 6);
      panRef.current = nextPan;
      setPanPosition(nextPan);
    };

    const endDrag = () => {
      isDragging = false;
      container.style.cursor = "grab";
    };

    // Touch support for mobile
    let touchStartX = 0;
    let touchStartPan = 50;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartPan = panRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const deltaX = e.touches[0].clientX - touchStartX;
      const nextPan = clampPan(touchStartPan - deltaX / 6);
      panRef.current = nextPan;
      setPanPosition(nextPan);
    };

    // Keyboard navigation
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const nextPan = clampPan(panRef.current - 8);
        panRef.current = nextPan;
        setPanPosition(nextPan);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextPan = clampPan(panRef.current + 8);
        panRef.current = nextPan;
        setPanPosition(nextPan);
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    container.addEventListener("touchstart", onTouchStart);
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("keydown", onKeyDown);

    // Set initial cursor style
    container.style.cursor = "grab";

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endDrag);
      container.removeEventListener("pointercancel", endDrag);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    panRef.current = panPosition;
  }, [panPosition]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "min(100%, 920px)",
        aspectRatio: "21 / 10",
        maxHeight: "58vh",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#000",
        margin: "0 auto",
      }}
      aria-label={altText}
      tabIndex={0}
      role="slider"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(panPosition)}
    >
      <div
        aria-label={altText || "Panoramic room image"}
        role="img"
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `url(${JSON.stringify(src)})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: `${panPosition}% center`,
          userSelect: "none",
          touchAction: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: "12px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "4px 8px",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      >
        Drag to pan | ← → to navigate
      </div>
    </div>
  );
}
