// ===========================================
// SmartProperty - Address Input Component with Google Maps
// ===========================================

import { useEffect, useId, useRef, useState } from 'react';

// Declare Google Maps on window
// ESLint disable for external API types
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AddressInputProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  errors?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  disabled?: boolean;
}

// Load Google Maps API script with improved error handling
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      console.log('✅ Google Maps already loaded');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]',
    );
    if (existingScript) {
      console.log('⏳ Google Maps script already being loaded');
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load existing Google Maps script'));
      });
      return;
    }

    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      const errorMsg = 'Google Maps API key is not configured or is invalid';
      console.error('❌', errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    console.log('🔄 Loading Google Maps API...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // Global callback for successful load
    window.initGoogleMaps = () => {
      console.log('✅ Google Maps API loaded successfully');
      resolve();
    };

    script.onerror = () => {
      console.error(
        '❌ Failed to load Google Maps API - Check API key validity and permissions',
      );
      reject(
        new Error(
          'Failed to load Google Maps API. Check your API key and ensure it has the required permissions (Places API, Geocoding API, Maps JavaScript API).',
        ),
      );
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!window.google?.maps?.places) {
        console.error('❌ Google Maps API loading timed out');
        reject(new Error('Google Maps API loading timed out'));
      }
    }, 10000);

    // Clear timeout on resolve
    Promise.resolve()
      .then(() => resolve())
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
  });
};

export default function AddressInput({
  value,
  onChange,
  errors,
  disabled = false,
}: AddressInputProps) {
  const baseId = useId();
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const baseId = useId();
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;

  // Log API key status on mount
  useEffect(() => {
    if (
      !googleMapsApiKey ||
      googleMapsApiKey === 'your_google_maps_api_key_here'
    ) {
      console.warn(
        '⚠️ Google Maps API key not found or not configured in VITE_GOOGLE_MAPS_API_KEY',
      );
    } else {
      console.log(
        '✅ Google Maps API key found:',
        googleMapsApiKey.substring(0, 10) + '...',
      );
    }
  }, [googleMapsApiKey]);

  // Load Google Maps API when toggle is enabled
  useEffect(() => {
    const formatError = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    };

    if (useGoogleMaps && googleMapsApiKey && !mapsLoaded) {
      console.log(
        '🔄 Attempting to load Google Maps with API key:',
        googleMapsApiKey.substring(0, 10) + '...',
      );
      loadGoogleMapsScript(googleMapsApiKey)
        .then(() => {
          console.log('✅ Google Maps loaded successfully');
          setMapsLoaded(true);
          setLoadError(null);
        })
        .catch((error) => {
          const message = formatError(error);
          console.error('❌ Failed to load Google Maps:', message);
          setLoadError(
            message ||
              'Failed to load Google Maps. Please check your API key and permissions.',
          );
        });
    }
  }, [useGoogleMaps, googleMapsApiKey, mapsLoaded]);

  // Initialize autocomplete when maps are loaded
  useEffect(() => {
    if (
      !mapsLoaded ||
      !autocompleteInputRef.current ||
      !window.google?.maps?.places
    ) {
      return;
    }

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      autocompleteInputRef.current,
      {
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'geometry'],
      },
    );

    // Listen for place selection
    const listener = autocompleteRef.current.addListener(
      'place_changed',
      () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place || !place.address_components) return;

        // Parse address components
        const addressData: AddressData = {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        };

        let streetNumber = '';
        let route = '';

        place.address_components.forEach((component: any) => {
          const types = component.types as string[];

          if (types.includes('street_number')) {
            streetNumber = component.long_name as string;
          } else if (types.includes('route')) {
            route = component.long_name as string;
          } else if (types.includes('locality')) {
            addressData.city = component.long_name as string;
          } else if (types.includes('administrative_area_level_1')) {
            addressData.state = component.long_name as string;
          } else if (types.includes('postal_code')) {
            addressData.zipCode = component.long_name as string;
          } else if (types.includes('country')) {
            addressData.country = component.long_name as string;
          }
        });

        // Combine street number and route
        addressData.street = `${streetNumber} ${route}`.trim();

        // Add coordinates if available
        if (place.geometry?.location) {
          addressData.coordinates = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
        }

        onChange(addressData);
      },
    );

    return () => {
      if (listener) {
        window.google?.maps?.event?.removeListener(listener);
      }
    };
  }, [mapsLoaded, onChange]);

  const handleManualChange = (field: keyof AddressData, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', val: string) => {
    const numValue = parseFloat(val);
    if (isNaN(numValue)) return;

    onChange({
      ...value,
      coordinates: {
        lat: field === 'lat' ? numValue : value.coordinates?.lat || 0,
        lng: field === 'lng' ? numValue : value.coordinates?.lng || 0,
      },
    });
  };

  const toggleAddressMode = () => {
    if (!googleMapsApiKey) {
      alert(
        'Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.',
      );
      return;
    }
    setUseGoogleMaps(!useGoogleMaps);
  };

  return (
    <div className="address-input-container">
      {/* Toggle Between Manual and Google Maps */}
      <div className="form-group full-width" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={useGoogleMaps}
            onChange={toggleAddressMode}
            disabled={disabled || !googleMapsApiKey}
          />
          <span>Use Google Maps for address search</span>
        </label>
        {!googleMapsApiKey && (
          <div
            style={{
              color: '#d4a574',
              backgroundColor: '#fff3cd',
              padding: '0.5rem',
              borderRadius: '4px',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              border: '1px solid #ffc107',
            }}
          >
            <strong>⚠️ Google Maps not configured</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your{' '}
              <code>.env</code> file to enable address search.
            </p>
          </div>
        )}
        {loadError && (
          <div
            style={{
              color: '#721c24',
              backgroundColor: '#f8d7da',
              padding: '0.5rem',
              borderRadius: '4px',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              border: '1px solid #f5c6cb',
            }}
          >
            <strong>❌ Google Maps Error:</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>{loadError}</p>
            <details style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold' }}>How to fix this?</summary>
              <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>
                  Verify your API key is correct in{' '}
                  <code style={{ backgroundColor: '#fff' }}>.env</code>
                </li>
                <li>
                  Ensure these APIs are enabled in Google Cloud Console:
                  <ul style={{ marginTop: '0.25rem' }}>
                    <li>Maps JavaScript API</li>
                    <li>Places API</li>
                    <li>Geocoding API</li>
                  </ul>
                </li>
                <li>
                  Check that HTTP referrers are configured for{' '}
                  <code style={{ backgroundColor: '#fff' }}>localhost</code>
                </li>
                <li>Try using manual address entry instead</li>
              </ol>
            </details>
          </div>
        )}
      </div>

      {/* Google Maps Autocomplete */}
      {useGoogleMaps && mapsLoaded && (
        <div className="form-group full-width">
          <label htmlFor={`${baseId}-autocomplete-address`}>
            Search Address with Google Maps
          </label>
          <input
            ref={autocompleteInputRef}
            id={`${baseId}-autocomplete-address`}
            type="text"
            placeholder="Start typing an address..."
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <small
            style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}
          >
            Select an address from the dropdown to auto-fill the fields below
          </small>
        </div>
      )}

      {/* Manual Address Fields */}
      <div className="form-grid">
        <div className="form-group full-width">
          <label htmlFor={`${baseId}-street`}>
            Rue <span className="required">*</span>
          </label>
          <input
            id={`${baseId}-street`}
            name="street"
            type="text"
            value={value.street}
            onChange={(e) => handleManualChange('street', e.target.value)}
            placeholder="Numéro et nom de rue"
            disabled={disabled}
            className={errors?.street ? 'error' : ''}
          />
          {errors?.street && (
            <span className="error-message">{errors.street}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={`${baseId}-city`}>
            Ville <span className="required">*</span>
          </label>
          <input
            id={`${baseId}-city`}
            name="city"
            type="text"
            value={value.city}
            onChange={(e) => handleManualChange('city', e.target.value)}
            placeholder="Ville"
            disabled={disabled}
            className={errors?.city ? 'error' : ''}
          />
          {errors?.city && <span className="error-message">{errors.city}</span>}
        </div>

        <div className="form-group">
          <label htmlFor={`${baseId}-state`}>Région / État</label>
          <input
            id={`${baseId}-state`}
            name="state"
            type="text"
            value={value.state}
            onChange={(e) => handleManualChange('state', e.target.value)}
            placeholder="Région"
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${baseId}-zipCode`}>Code postal</label>
          <input
            id={`${baseId}-zipCode`}
            name="zipCode"
            type="text"
            value={value.zipCode}
            onChange={(e) => handleManualChange('zipCode', e.target.value)}
            placeholder="Code postal"
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${baseId}-country`}>
            Pays <span className="required">*</span>
          </label>
          <input
            id={`${baseId}-country`}
            name="country"
            type="text"
            value={value.country}
            onChange={(e) => handleManualChange('country', e.target.value)}
            placeholder="Pays"
            disabled={disabled}
            className={errors?.country ? 'error' : ''}
          />
          {errors?.country && (
            <span className="error-message">{errors.country}</span>
          )}
        </div>
      </div>

      {/* Coordinates (Optional) */}
      <div className="form-group full-width" style={{ marginTop: '1rem' }}>
        <details>
          <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
            <strong>Advanced: Coordinates (Optional)</strong>
          </summary>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor={`${baseId}-latitude`}>Latitude</label>
              <input
                id={`${baseId}-latitude`}
                name="latitude"
                type="number"
                step="any"
                value={value.coordinates?.lat || ''}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                placeholder="e.g., 40.7128"
                disabled={disabled}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`${baseId}-longitude`}>Longitude</label>
              <input
                id={`${baseId}-longitude`}
                name="longitude"
                type="number"
                step="any"
                value={value.coordinates?.lng || ''}
                onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                placeholder="e.g., -74.0060"
                disabled={disabled}
              />
            </div>
          </div>
          <small
            style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}
          >
            Coordinates are automatically set when using Google Maps
            autocomplete
          </small>
        </details>
      </div>
    </div>
  );
}
