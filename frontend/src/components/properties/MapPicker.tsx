// ===========================================
// SmartProperty - Map Picker Component with Leaflet
// ===========================================
// Interactive map to pick location and get address via reverse geocoding
// Uses Leaflet + OpenStreetMap - 100% FREE
/* eslint-disable @typescript-eslint/no-explicit-any */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';
import type { AddressData } from './AddressInputOSM';

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

// Fix Leaflet default icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: AddressData) => void;
  initialPosition?: { lat: number; lng: number };
}

// Reverse geocode using Nominatim
const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SmartProperty-App',
        },
      },
    );
    if (!response.ok) throw new Error('Reverse geocoding failed');
    return await response.json();
  } catch (error) {
    console.error('❌ Reverse geocoding failed:', formatError(error));
    return null;
  }
};

export default function MapPicker({
  isOpen,
  onClose,
  onSelectAddress,
  initialPosition = { lat: 36.8065, lng: 10.1816 }, // Tunis par défaut
}: MapPickerProps) {
  const t = useTranslation();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string>('');
  const [parsedAddress, setParsedAddress] = useState<AddressData | null>(null);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current).setView(
      [initialPosition.lat, initialPosition.lng],
      13,
    );

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Handle map clicks
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      const marker = L.marker([lat, lng]).addTo(map);
      markerRef.current = marker;

      // Reverse geocode
      setLoading(true);
      setAddressPreview(`🔍 ${t.properties.form.mapPicker.searchingAddress}`);
      setParsedAddress(null);

      const result = await reverseGeocode(lat, lng);
      setLoading(false);

      if (result && result.display_name) {
        setAddressPreview(result.display_name);
        marker.bindPopup(`📍 ${result.display_name}`).openPopup();

        // Parse address immediately for preview
        const addressParts = result.address || {};

        // Extract street
        const streetParts = [];
        if (addressParts.house_number)
          streetParts.push(addressParts.house_number);
        if (addressParts.road) streetParts.push(addressParts.road);
        if (addressParts.street) streetParts.push(addressParts.street);
        let street = streetParts.join(' ').trim();

        // Extract city
        let city = (
          addressParts.city ||
          addressParts.town ||
          addressParts.village ||
          addressParts.municipality ||
          addressParts.hamlet ||
          ''
        ).trim();

        // Extract state
        const state = (
          addressParts.state ||
          addressParts.province ||
          addressParts.region ||
          ''
        ).trim();

        // Extract postal code
        const zipCode = (addressParts.postcode || '').trim();

        // Extract country
        let country = (addressParts.country || '').trim();

        // Fallback: extract from display_name if needed
        if (!street || !city || !country) {
          const displayParts = (result.display_name || '')
            .split(',')
            .map((p: string) => p.trim());

          if (!street && displayParts.length > 0) {
            street = displayParts[0];
          }

          if (!city && displayParts.length > 1) {
            city = displayParts[1];
          }

          if (!country && displayParts.length > 0) {
            country = displayParts[displayParts.length - 1];
          }
        }

        // Create address object
        const parsedAddr: AddressData = {
          street: street || t.properties.form.mapPicker.fallback.streetFromMap,
          city: city || t.properties.form.mapPicker.fallback.cityUnspecified,
          state: state || '',
          zipCode: zipCode || '',
          country:
            country || t.properties.form.mapPicker.fallback.countryUnspecified,
          coordinates: { lat, lng },
        };

        // Store parsed address for preview
        setParsedAddress(parsedAddr);

        // ✨ AUTO-FILL: Send address to form immediately
        console.log('✅ Auto-filling form with address:', parsedAddr);
        onSelectAddress(parsedAddr);
      } else {
        setAddressPreview(`❌ ${t.properties.form.mapPicker.addressNotFound}`);
        setParsedAddress(null);
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    isOpen,
    initialPosition,
    onSelectAddress,
    t.properties.form.mapPicker.addressNotFound,
    t.properties.form.mapPicker.fallback.cityUnspecified,
    t.properties.form.mapPicker.fallback.countryUnspecified,
    t.properties.form.mapPicker.fallback.streetFromMap,
    t.properties.form.mapPicker.searchingAddress,
  ]);

  // Handle close (address already sent to form on click)
  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
              🗺️ {t.properties.form.mapPicker.headerTitle}
            </h2>
            <p
              style={{
                margin: '0.5rem 0 0 0',
                color: '#6b7280',
                fontSize: '0.9rem',
              }}
            >
              {t.properties.form.mapPicker.headerSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.5rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            minHeight: '400px',
            position: 'relative',
          }}
        />

        {/* Address Preview & Confirmation */}
        {addressPreview && (
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: parsedAddress ? '#f0f9ff' : '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              maxHeight: '250px',
              overflowY: 'auto',
            }}
          >
            {parsedAddress ? (
              <div>
                {/* Success Message */}
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#059669',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#d1fae5',
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>✅</span>
                  {t.properties.form.mapPicker.successBanner}
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#4b5563',
                    marginBottom: '0.75rem',
                    marginTop: '0.75rem',
                  }}
                >
                  📋 {t.properties.form.mapPicker.savedInfoTitle}
                </div>

                {/* Address Fields Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <div
                    style={{
                      color: '#6b7280',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    🏠 {t.properties.form.mapPicker.labels.street}
                  </div>
                  <div style={{ color: '#1f2937', fontWeight: 500 }}>
                    {parsedAddress.street}
                  </div>

                  <div
                    style={{
                      color: '#6b7280',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    🌆 {t.properties.form.mapPicker.labels.city}
                  </div>
                  <div style={{ color: '#1f2937', fontWeight: 500 }}>
                    {parsedAddress.city}
                  </div>

                  {parsedAddress.state && (
                    <>
                      <div
                        style={{
                          color: '#6b7280',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        📍 {t.properties.form.mapPicker.labels.state}
                      </div>
                      <div style={{ color: '#1f2937', fontWeight: 500 }}>
                        {parsedAddress.state}
                      </div>
                    </>
                  )}

                  {parsedAddress.zipCode && (
                    <>
                      <div
                        style={{
                          color: '#6b7280',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        📮 {t.properties.form.mapPicker.labels.zipCode}
                      </div>
                      <div style={{ color: '#1f2937', fontWeight: 500 }}>
                        {parsedAddress.zipCode}
                      </div>
                    </>
                  )}

                  <div
                    style={{
                      color: '#6b7280',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    🌍 {t.properties.form.mapPicker.labels.country}
                  </div>
                  <div style={{ color: '#1f2937', fontWeight: 500 }}>
                    {parsedAddress.country}
                  </div>

                  <div
                    style={{
                      color: '#6b7280',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    🧭 {t.properties.form.mapPicker.labels.coordinates}
                  </div>
                  <div
                    style={{
                      color: '#1f2937',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    }}
                  >
                    {parsedAddress.coordinates?.lat.toFixed(6)},{' '}
                    {parsedAddress.coordinates?.lng.toFixed(6)}
                  </div>
                </div>

                {/* Help Text */}
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    borderLeft: '3px solid #f59e0b',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    color: '#92400e',
                  }}
                >
                  💡 <strong>{t.properties.form.mapPicker.tip.title}</strong>{' '}
                  {t.properties.form.mapPicker.tip.description}
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t.properties.form.mapPicker.searchingLabel}
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    color: '#1f2937',
                    fontWeight: 500,
                  }}
                >
                  {addressPreview}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1 }}>
            {parsedAddress ? (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#059669',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                ✅ {t.properties.form.mapPicker.footer.savedHint}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  fontStyle: 'italic',
                }}
              >
                👆 {t.properties.form.mapPicker.footer.clickHint}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor:
                  parsedAddress && !loading ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.target as HTMLElement).style.backgroundColor =
                    parsedAddress ? '#059669' : '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  (e.target as HTMLElement).style.backgroundColor =
                    parsedAddress ? '#10b981' : '#3b82f6';
                }
              }}
            >
              {loading
                ? `⏳ ${t.properties.form.mapPicker.button.loading}`
                : parsedAddress
                  ? `✓ ${t.properties.form.mapPicker.button.done}`
                  : t.properties.form.mapPicker.button.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
