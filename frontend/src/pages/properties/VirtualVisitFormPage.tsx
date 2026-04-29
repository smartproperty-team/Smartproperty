import { Suspense, useCallback, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HomeFooter, Navbar } from "../../components/layout";
import Sphere360Viewer from "../../components/properties/Sphere360Viewer";
import { useTranslation } from "../../i18n";
import { propertyService } from "../../services/property.service";

interface RoomEntry {
  id: string;
  title: string;
  file: File | null;
  previewUrl: string | null;
  showPreview: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;
const PANORAMA_CAPTION_PREFIX = "__VR360__";

const buildRoomId = () =>
  `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const extractApiErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "Upload failed";
  }

  const maybeError = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };

  const apiMessage = maybeError.response?.data?.message;
  if (Array.isArray(apiMessage) && apiMessage.length > 0) {
    return apiMessage.join(", ");
  }
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }
  if (maybeError.message) {
    return maybeError.message;
  }

  return "Upload failed";
};

export default function VirtualVisitFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const virtualVisitText = t.properties?.virtualVisit;

  const [rooms, setRooms] = useState<RoomEntry[]>([
    {
      id: buildRoomId(),
      title: "",
      file: null,
      previewUrl: null,
      showPreview: false,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const revokePreview = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  const validateAndSetFile = (roomId: string, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitError("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setSubmitError("Each image must be 50MB or smaller.");
      return;
    }

    setSubmitError(null);
    const previewUrl = URL.createObjectURL(file);

    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;
        revokePreview(room.previewUrl);
        return { ...room, file, previewUrl, showPreview: false };
      }),
    );
  };

  const addRoom = () => {
    setRooms((prev) => [
      ...prev,
      {
        id: buildRoomId(),
        title: "",
        file: null,
        previewUrl: null,
        showPreview: false,
      },
    ]);
  };

  const updateRoomTitle = (roomId: string, title: string) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === roomId ? { ...room, title } : room)),
    );
  };

  const removeRoom = (roomId: string) => {
    setRooms((prev) => {
      const removed = prev.find((r) => r.id === roomId);
      revokePreview(removed?.previewUrl ?? null);
      return prev.filter((room) => room.id !== roomId);
    });
  };

  const togglePreview = (roomId: string) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? { ...room, showPreview: !room.showPreview }
          : room,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitError(null);

    const completedRooms = rooms.filter(
      (room) => Boolean(room.title.trim()) && Boolean(room.file),
    );
    const hasIncompleteRoom = rooms.some(
      (room) => Boolean(room.title.trim()) !== Boolean(room.file),
    );

    if (completedRooms.length === 0) {
      alert(
        t.properties?.form?.image?.virtualTour?.noImages ||
          "Please add at least one room with a title and panoramic image.",
      );
      return;
    }

    if (hasIncompleteRoom) {
      setSubmitError("Each room needs both a title and a panoramic image.");
      return;
    }

    setLoading(true);
    try {
      const uploadResult = await propertyService.uploadImages(
        id,
        completedRooms
          .map((room) => room.file)
          .filter((file): file is File => Boolean(file)),
      );

      await Promise.allSettled(
        uploadResult.addedImages.map((uploadedImage, index) => {
          const roomTitle = completedRooms[index]?.title?.trim();
          const caption = roomTitle
            ? `${PANORAMA_CAPTION_PREFIX}${roomTitle}`
            : "";
          if (!caption || !uploadedImage.key) return Promise.resolve();
          return propertyService.updateImageCaption(
            id,
            uploadedImage.key,
            caption,
          );
        }),
      );

      navigate(`/properties/${id}`);
    } catch (err) {
      console.error("Failed uploading virtual visit images", err);
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="property-form-page">
        <Navbar />
        <main className="property-form-container">
          <div className="property-form-header">
            <h1>Add Virtual Visit</h1>
            <p>Property id is missing in the URL.</p>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="property-form-page">
      <Navbar />
      <main className="property-form-container">
        <div className="property-form-header">
          <h1>{virtualVisitText?.page?.title || "Add Virtual Visit"}</h1>
          <p>
            {virtualVisitText?.page?.description ||
              "Add rooms with a title and one panoramic image for each room."}
          </p>
        </div>

        <div className="property-form virtual-visit-builder" role="form">
          <section className="form-section virtual-visit-intro">
            <h3 className="form-section-title">Room panorama builder</h3>
            <p>
              Add one panoramic image per room with a clear title. Visitors will
              browse these rooms in your fullscreen 360° tour.
            </p>
            <div className="virtual-visit-stats">
              <span>{rooms.length} room(s)</span>
              <span>
                {rooms.filter((room) => room.title.trim() && room.file).length}{" "}
                complete
              </span>
            </div>
          </section>

          <section className="form-section virtual-visit-rooms">
            {rooms.map((room, index) => (
              <RoomCard
                key={room.id}
                room={room}
                index={index}
                canRemove={rooms.length > 1}
                onTitleChange={(title) => updateRoomTitle(room.id, title)}
                onFileChange={(file) => validateAndSetFile(room.id, file)}
                onRemove={() => removeRoom(room.id)}
                onTogglePreview={() => togglePreview(room.id)}
              />
            ))}

            <button
              type="button"
              className="btn-edit virtual-visit-add-room"
              onClick={addRoom}
            >
              + Add another room
            </button>

            {submitError && (
              <p
                role="alert"
                style={{ color: "#b42318", marginTop: "0.75rem" }}
              >
                {submitError}
              </p>
            )}

            <div className="virtual-visit-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate(-1)}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? "Uploading..."
                  : virtualVisitText?.page?.actions?.upload ||
                    "Upload virtual visit"}
              </button>
            </div>
          </section>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}

// ── Room card with drag & drop and 360° preview ──────────────

interface RoomCardProps {
  room: RoomEntry;
  index: number;
  canRemove: boolean;
  onTitleChange: (title: string) => void;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  onTogglePreview: () => void;
}

function RoomCard({
  room,
  index,
  canRemove,
  onTitleChange,
  onFileChange,
  onRemove,
  onTogglePreview,
}: RoomCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      if (file) onFileChange(file);
    },
    [onFileChange],
  );

  return (
    <article
      className={`virtual-visit-room-card${dragOver ? " is-drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="virtual-visit-room-head">
        <strong>Room {index + 1}</strong>
        <button
          type="button"
          className="btn-cancel"
          onClick={onRemove}
          disabled={!canRemove}
        >
          Remove
        </button>
      </div>

      <div className="virtual-visit-room-grid">
        <label>
          Room title
          <input
            type="text"
            value={room.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Kitchen, Bedroom 1, Living room..."
          />
        </label>

        <label>
          Panoramic image
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* Drop zone hint */}
      {!room.file && (
        <div
          className={`virtual-visit-dropzone${dragOver ? " is-active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="virtual-visit-dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>
          <span>Drag & drop a panoramic image here, or click to browse</span>
        </div>
      )}

      {/* Image preview + 360° toggle */}
      {room.file && room.previewUrl && (
        <div className="virtual-visit-room-preview">
          {room.showPreview ? (
            <div className="virtual-visit-360-preview">
              <Suspense
                fallback={
                  <div className="virtual-visit-360-loading">
                    Loading 360° preview...
                  </div>
                }
              >
                <Sphere360Viewer
                  src={room.previewUrl}
                  altText={room.title || `Room ${index + 1}`}
                  autoRotate
                  autoRotateSpeed={0.6}
                  height="280px"
                />
              </Suspense>
            </div>
          ) : (
            <img
              src={room.previewUrl}
              alt={room.title || `Room ${index + 1}`}
            />
          )}
          <button
            type="button"
            className="virtual-visit-preview-toggle"
            onClick={onTogglePreview}
          >
            {room.showPreview ? "Show flat preview" : "Preview in 360°"}
          </button>
        </div>
      )}
    </article>
  );
}
