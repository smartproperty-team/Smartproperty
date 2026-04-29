// ===========================================
// SmartProperty - Hotspot Editor
// ===========================================
// Fullscreen editor for placing and managing hotspots on 360° rooms.
// Click the panorama to place a hotspot, pick target room, save.

import { useCallback, useEffect, useRef, useState } from "react";
import { propertyService } from "../../services/property.service";
import type {
  PropertyImage,
  VirtualTourConfig,
  VirtualTourHotspot,
} from "../../types/property";
import Sphere360Viewer from "./Sphere360Viewer";

// ── Helpers ────────────────────────────────────────────────────

const PANORAMA_CAPTION_PREFIX = "__VR360__";

const getRoomDisplayName = (image: PropertyImage, index?: number): string => {
  const caption = image.caption?.trim() || "";
  if (caption.startsWith(PANORAMA_CAPTION_PREFIX)) {
    const name = caption.slice(PANORAMA_CAPTION_PREFIX.length).trim();
    if (name) return name;
  }
  if (caption) return caption;
  return `Room ${(index ?? 0) + 1}`;
};

const buildHotspotId = () =>
  `hs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ── Types ──────────────────────────────────────────────────────

interface HotspotEditorProps {
  rooms: PropertyImage[];
  virtualTourConfig?: VirtualTourConfig;
  propertyId: string;
  onClose: () => void;
  onSaved: (config: VirtualTourConfig) => void;
}

interface PendingPlacement {
  yaw: number;
  pitch: number;
}

// ── Custom Room Dropdown ───────────────────────────────────────

interface RoomDropdownProps {
  rooms: PropertyImage[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
}

function RoomDropdown({ rooms, value, onChange, label }: RoomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedRoom = rooms.find((r) => r.key === value);
  const selectedIndex = rooms.findIndex((r) => r.key === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="room-dropdown" ref={ref}>
      {label && <span className="room-dropdown-label">{label}</span>}
      <button
        type="button"
        className="room-dropdown-trigger"
        onClick={() => setOpen((p) => !p)}
      >
        {selectedRoom && (
          <img
            src={selectedRoom.url}
            alt=""
            className="room-dropdown-thumb"
          />
        )}
        <span className="room-dropdown-name">
          {selectedRoom
            ? getRoomDisplayName(selectedRoom, selectedIndex)
            : "Select room"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`room-dropdown-chevron${open ? " is-open" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="room-dropdown-menu">
          {rooms.map((room, index) => (
            <button
              key={room.key || index}
              type="button"
              className={`room-dropdown-item${room.key === value ? " is-active" : ""}`}
              onClick={() => {
                onChange(room.key || "");
                setOpen(false);
              }}
            >
              <img src={room.url} alt="" className="room-dropdown-item-thumb" />
              <span>{getRoomDisplayName(room, index)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────────

export default function HotspotEditor({
  rooms,
  virtualTourConfig,
  propertyId,
  onClose,
  onSaved,
}: HotspotEditorProps) {
  const [hotspots, setHotspots] = useState<VirtualTourHotspot[]>(
    virtualTourConfig?.hotspots ?? [],
  );
  const [activeRoomKey, setActiveRoomKey] = useState<string>(
    rooms[0]?.key || "",
  );
  const [pending, setPending] = useState<PendingPlacement | null>(null);
  const [pendingTargetKey, setPendingTargetKey] = useState<string>("");
  const [pendingLabel, setPendingLabel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeRoom = rooms.find((r) => r.key === activeRoomKey) || rooms[0];
  const roomHotspots = hotspots.filter(
    (hs) => hs.sourceRoomKey === activeRoomKey,
  );
  const otherRooms = rooms.filter((r) => r.key !== activeRoomKey);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pending) {
          setPending(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, onClose]);

  const handleSphereClick = useCallback(
    (yaw: number, pitch: number) => {
      if (otherRooms.length === 0) return;
      const defaultTarget = otherRooms[0];
      setPending({ yaw, pitch });
      setPendingTargetKey(defaultTarget.key || "");
      const idx = rooms.findIndex((r) => r.key === defaultTarget.key);
      setPendingLabel(getRoomDisplayName(defaultTarget, idx));
    },
    [otherRooms, rooms],
  );

  const confirmPlacement = useCallback(() => {
    if (!pending || !pendingTargetKey || !pendingLabel.trim()) return;

    const newHotspot: VirtualTourHotspot = {
      id: buildHotspotId(),
      sourceRoomKey: activeRoomKey,
      targetRoomKey: pendingTargetKey,
      yaw: pending.yaw,
      pitch: pending.pitch,
      label: pendingLabel.trim(),
    };

    setHotspots((prev) => [...prev, newHotspot]);
    setPending(null);
    setPendingTargetKey("");
    setPendingLabel("");
  }, [pending, pendingTargetKey, pendingLabel, activeRoomKey]);

  const cancelPlacement = useCallback(() => {
    setPending(null);
    setPendingTargetKey("");
    setPendingLabel("");
  }, []);

  const deleteHotspot = useCallback((hotspotId: string) => {
    setHotspots((prev) => prev.filter((hs) => hs.id !== hotspotId));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const config: VirtualTourConfig = { hotspots };
      await propertyService.saveVirtualTourConfig(propertyId, config);
      onSaved(config);
    } catch (err) {
      console.error("Failed to save hotspot config:", err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [hotspots, propertyId, onSaved]);

  const handleTargetChange = useCallback(
    (key: string) => {
      setPendingTargetKey(key);
      const idx = rooms.findIndex((r) => r.key === key);
      const targetRoom = rooms[idx];
      if (targetRoom) {
        setPendingLabel(getRoomDisplayName(targetRoom, idx));
      }
    },
    [rooms],
  );

  return (
    <div className="hotspot-editor-modal" role="dialog" aria-modal="true">
      {/* ── Toolbar ── */}
      <div className="hotspot-editor-toolbar">
        <div className="hotspot-editor-toolbar-left">
          <strong>Edit Hotspots</strong>
          <RoomDropdown
            rooms={rooms}
            value={activeRoomKey}
            onChange={(key) => {
              setActiveRoomKey(key);
              setPending(null);
            }}
          />
          <span className="hotspot-editor-count">
            {roomHotspots.length} hotspot(s)
          </span>
        </div>
        <div className="hotspot-editor-toolbar-right">
          {saveError && (
            <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>
              {saveError}
            </span>
          )}
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-submit"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Hotspots"}
          </button>
        </div>
      </div>

      {/* ── Viewer with edit mode ── */}
      <div className="hotspot-editor-body">
        {activeRoom && (
          <Sphere360Viewer
            key={activeRoom.key || activeRoom.url}
            src={activeRoom.url}
            altText={
              getRoomDisplayName(
                activeRoom,
                rooms.findIndex((r) => r.key === activeRoom.key),
              )
            }
            autoRotate={false}
            height="100%"
            hotspots={roomHotspots}
            onHotspotClick={() => {}}
            editMode
            onSphereClick={handleSphereClick}
            onHotspotDelete={deleteHotspot}
          />
        )}

        {/* Placement form popover */}
        {pending && (
          <div className="hotspot-place-form">
            <h4>Place Hotspot</h4>
            <label>
              Target room
              <div style={{ marginTop: "0.25rem" }}>
                <RoomDropdown
                  rooms={otherRooms}
                  value={pendingTargetKey}
                  onChange={handleTargetChange}
                />
              </div>
            </label>
            <label>
              Label
              <input
                type="text"
                value={pendingLabel}
                onChange={(e) => setPendingLabel(e.target.value)}
                placeholder="e.g. Kitchen"
              />
            </label>
            <div className="hotspot-place-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={cancelPlacement}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={confirmPlacement}
                disabled={!pendingLabel.trim() || !pendingTargetKey}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {!pending && (
          <div className="hotspot-editor-info">
            {otherRooms.length > 0
              ? "Click anywhere on the panorama to place a hotspot"
              : "Add more rooms to create hotspots between them"}
          </div>
        )}
      </div>
    </div>
  );
}
