// ===========================================
// SmartProperty - Virtual Staging Panel
// ===========================================
// Modal for AI-powered virtual staging of room images.
// Select an image, pick a style, adjust strength, generate.

import { useCallback, useEffect, useRef, useState } from "react";
import { propertyService } from "../../services/property.service";
import type { PropertyImage, StagingJob, StagingStyle } from "../../types/property";

// ── Types ──────────────────────────────────────────────────────

interface VirtualStagingPanelProps {
  images: PropertyImage[];
  propertyId: string;
  onClose: () => void;
}

const ROOM_TYPES = [
  { id: "", label: "Auto-detect" },
  { id: "living_room", label: "Living Room" },
  { id: "bedroom", label: "Bedroom" },
  { id: "kitchen", label: "Kitchen" },
  { id: "dining_room", label: "Dining Room" },
  { id: "office", label: "Office" },
  { id: "bathroom", label: "Bathroom" },
  { id: "balcony", label: "Balcony" },
];

const POLL_INTERVAL_MS = 2000;

// ── Component ──────────────────────────────────────────────────

export default function VirtualStagingPanel({
  images,
  propertyId,
  onClose,
}: VirtualStagingPanelProps) {
  const [styles, setStyles] = useState<StagingStyle[]>([]);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [roomType, setRoomType] = useState<string>("");
  const [strength, setStrength] = useState(0.35);
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<StagingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<"side" | "slider">("slider");
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load styles on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await propertyService.getStagingStyles(propertyId);
        if (!cancelled) {
          setStyles(data);
          if (data.length > 0) setSelectedStyle(data[0].id);
        }
      } catch {
        if (!cancelled) setError("Failed to load staging styles");
      } finally {
        if (!cancelled) setStylesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Clean up polling
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJobStatus = useCallback(
    (jobId: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const status = await propertyService.getStagingJobStatus(
            propertyId,
            jobId,
          );
          setJob(status);

          if (status.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGenerating(false);
            // Build the result URL through the backend proxy
            const resultUrl = propertyService.getStagingResultUrl(
              propertyId,
              jobId,
            );
            setStagedImageUrl(`/api${resultUrl}`);
          } else if (status.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGenerating(false);
            setError(status.error || "Staging failed");
          }
        } catch {
          // ignore transient poll errors
        }
      }, POLL_INTERVAL_MS);
    },
    [propertyId],
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || !selectedStyle) return;
    setGenerating(true);
    setError(null);
    setStagedImageUrl(null);
    setJob(null);

    try {
      const result = await propertyService.requestStaging(propertyId, {
        imageUrl: selectedImage.url,
        style: selectedStyle,
        roomType: roomType || undefined,
        strength,
      });
      setJob(result);
      pollJobStatus(result.jobId);
    } catch (err: unknown) {
      setGenerating(false);
      const msg =
        err instanceof Error ? err.message : "Failed to start staging";
      setError(msg);
    }
  }, [selectedImage, selectedStyle, roomType, strength, propertyId, pollJobStatus]);

  const handleDownload = useCallback(() => {
    if (!stagedImageUrl) return;
    const a = document.createElement("a");
    a.href = stagedImageUrl;
    a.download = `staged-${selectedStyle}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [stagedImageUrl, selectedStyle]);

  // Slider drag
  const handleSliderMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : e.clientX;
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPos(Math.max(0, Math.min(100, pos)));
    },
    [],
  );

  const handleSliderDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      handleSliderMove(e);
    },
    [handleSliderMove],
  );

  const activeStyle = styles.find((s) => s.id === selectedStyle);

  return (
    <div className="staging-modal" role="dialog" aria-modal="true">
      <div className="staging-modal-content">
        {/* Header */}
        <div className="staging-header">
          <h2>AI Virtual Staging</h2>
          <button type="button" className="staging-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="staging-body">
          {/* Left: Controls */}
          <div className="staging-controls">
            {/* Step 1: Select image */}
            <div className="staging-section">
              <h4>1. Select a Room Image</h4>
              <div className="staging-image-grid">
                {images.map((img, idx) => (
                  <button
                    key={img.key || idx}
                    type="button"
                    className={`staging-image-thumb${selectedImage?.key === img.key && selectedImage?.url === img.url ? " is-selected" : ""}`}
                    onClick={() => {
                      setSelectedImage(img);
                      setStagedImageUrl(null);
                      setJob(null);
                      setError(null);
                    }}
                  >
                    <img src={img.url} alt={img.caption || `Image ${idx + 1}`} />
                    {selectedImage?.key === img.key &&
                      selectedImage?.url === img.url && (
                        <div className="staging-thumb-check">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select style */}
            <div className="staging-section">
              <h4>2. Choose a Style</h4>
              {stylesLoading ? (
                <p className="staging-loading">Loading styles...</p>
              ) : (
                <div className="staging-style-grid">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={`staging-style-card${selectedStyle === style.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      <span className="staging-style-name">{style.name}</span>
                      <span className="staging-style-desc">
                        {style.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Room type + strength */}
            <div className="staging-section">
              <h4>3. Fine-tune</h4>
              <label className="staging-label">
                Room Type
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="staging-select"
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="staging-label">
                Staging Intensity: {Math.round(strength * 100)}%
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={Math.round(strength * 100)}
                  onChange={(e) => setStrength(Number(e.target.value) / 100)}
                  className="staging-slider"
                />
                <span className="staging-slider-labels">
                  <span>Subtle</span>
                  <span>Dramatic</span>
                </span>
              </label>
            </div>

            {/* Generate button */}
            <button
              type="button"
              className="staging-generate-btn"
              disabled={!selectedImage || !selectedStyle || generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <span className="staging-spinner" />
                  {job?.status === "processing"
                    ? "Generating staged image..."
                    : "Starting..."}
                </>
              ) : (
                "Generate Staged Image"
              )}
            </button>

            {error && <p className="staging-error">{error}</p>}
          </div>

          {/* Right: Preview / Result */}
          <div className="staging-preview">
            {stagedImageUrl && selectedImage ? (
              <>
                <div className="staging-compare-toggle">
                  <button
                    type="button"
                    className={compareMode === "slider" ? "is-active" : ""}
                    onClick={() => setCompareMode("slider")}
                  >
                    Slider
                  </button>
                  <button
                    type="button"
                    className={compareMode === "side" ? "is-active" : ""}
                    onClick={() => setCompareMode("side")}
                  >
                    Side by Side
                  </button>
                </div>

                {compareMode === "slider" ? (
                  <div
                    ref={sliderRef}
                    className="staging-slider-compare"
                    onMouseMove={handleSliderDrag}
                    onMouseDown={handleSliderMove}
                    onTouchMove={handleSliderMove}
                  >
                    <img
                      src={stagedImageUrl}
                      alt="Staged"
                      className="staging-compare-img staging-compare-staged"
                    />
                    <div
                      className="staging-compare-clip"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img
                        src={selectedImage.url}
                        alt="Original"
                        className="staging-compare-img staging-compare-original"
                      />
                    </div>
                    <div
                      className="staging-compare-handle"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="staging-compare-handle-line" />
                      <div className="staging-compare-handle-circle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                    <span className="staging-compare-label staging-label-left">
                      Original
                    </span>
                    <span className="staging-compare-label staging-label-right">
                      Staged
                    </span>
                  </div>
                ) : (
                  <div className="staging-side-compare">
                    <div className="staging-side-img">
                      <img src={selectedImage.url} alt="Original" />
                      <span>Original</span>
                    </div>
                    <div className="staging-side-img">
                      <img src={stagedImageUrl} alt="Staged" />
                      <span>Staged ({activeStyle?.name})</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="staging-download-btn"
                  onClick={handleDownload}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Staged Image
                </button>
              </>
            ) : selectedImage ? (
              <div className="staging-preview-placeholder">
                <img
                  src={selectedImage.url}
                  alt="Selected room"
                  className="staging-preview-image"
                />
                <p>
                  {generating
                    ? "Generating staged version..."
                    : "Select a style and click Generate to see the staged result"}
                </p>
                {generating && (
                  <div className="staging-progress">
                    <div className="staging-progress-bar" />
                  </div>
                )}
              </div>
            ) : (
              <div className="staging-preview-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p>Select a room image to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
