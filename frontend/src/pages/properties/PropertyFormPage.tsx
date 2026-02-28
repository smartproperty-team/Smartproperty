// ===========================================
// SmartProperty - Property Form Page (Create/Edit)
// ===========================================

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HomeFooter, Navbar } from "../../components/layout";
import AddressInput, {
  type AddressData,
} from "../../components/properties/AddressInputOSM";
import { propertyService } from "../../services/property.service";
import type {
  CreatePropertyDto,
  Property,
  PropertyStatus,
  PropertyType,
} from "../../types/property";
import "./properties.css";

// ===========================================
// Icons
// ===========================================

const InfoIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const LocationIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const FeaturesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 2 2 7l10 5 10-5-10-5z" />
    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const ImageIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// ===========================================
// Form Data Interface
// ===========================================

interface FormData {
  title: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;
  price: string;
  currency: string;
  address: AddressData;
  bedrooms: string;
  bathrooms: string;
  area: string;
  parkingSpaces: string;
  furnished: boolean;
  petFriendly: boolean;
  amenities: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  type: "apartment",
  status: "available",
  price: "",
  currency: "TND",
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Tunisie",
  },
  bedrooms: "",
  bathrooms: "",
  area: "",
  parkingSpaces: "",
  furnished: false,
  petFriendly: false,
  amenities: "",
};

// ===========================================
// Main Property Form Page
// ===========================================

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<
    { url: string; key: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(isEditing);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormData, string>> & {
      street?: string;
      city?: string;
      country?: string;
    }
  >({});

  // Load existing property for editing
  const loadProperty = useCallback(async () => {
    if (!id) return;

    setLoadingProperty(true);
    try {
      const property = await propertyService.getProperty(id);
      setFormData({
        title: property.title,
        description: property.description || "",
        type: property.type,
        status: property.status,
        price: property.price.toString(),
        currency: property.currency,
        address: {
          street: property.address.street,
          city: property.address.city,
          state: property.address.state,
          zipCode: property.address.zipCode,
          country: property.address.country,
          coordinates: property.address.coordinates,
        },
        bedrooms: property.features?.bedrooms?.toString() || "",
        bathrooms: property.features?.bathrooms?.toString() || "",
        area: property.features?.area?.toString() || "",
        parkingSpaces: property.features?.parkingSpaces?.toString() || "",
        furnished: property.features?.furnished || false,
        petFriendly: property.features?.petFriendly || false,
        amenities: property.features?.amenities?.join(", ") || "",
      });
      setExistingImages(
        (property.images || []).map((img) => ({
          url: img.url,
          key: img.key || "",
        })),
      );
    } catch (err) {
      console.error("Failed to load property:", err);
      alert("Impossible de charger la propriété.");
      navigate("/properties");
    } finally {
      setLoadingProperty(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEditing) {
      loadProperty();
    }
  }, [isEditing, loadProperty]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user types
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isValidSize;
    });
    setImages((prev) => [...prev, ...validFiles]);
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle existing image removal
  const handleRemoveExistingImage = async (key: string) => {
    if (!id) return;

    try {
      await propertyService.deleteImage(id, key);
      setExistingImages((prev) => prev.filter((img) => img.key !== key));
    } catch (err) {
      console.error("Failed to delete image:", err);
      alert("Impossible de supprimer l'image.");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    setImages((prev) => [...prev, ...files]);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> & {
      street?: string;
      city?: string;
      country?: string;
    } = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "Le prix doit être supérieur à 0";
    }
    if (!formData.address.street.trim()) {
      newErrors.street = "La rue est requise";
    }
    if (!formData.address.city.trim()) {
      newErrors.city = "La ville est requise";
    }
    if (!formData.address.country.trim()) {
      newErrors.country = "Le pays est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const propertyData: CreatePropertyDto = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        status: formData.status,
        price: parseFloat(formData.price),
        currency: formData.currency,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode,
          country: formData.address.country,
          coordinates: formData.address.coordinates,
        },
        features: {
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms
            ? parseInt(formData.bathrooms)
            : undefined,
          area: formData.area ? parseInt(formData.area) : undefined,
          parkingSpaces: formData.parkingSpaces
            ? parseInt(formData.parkingSpaces)
            : undefined,
          furnished: formData.furnished,
          petFriendly: formData.petFriendly,
          amenities: formData.amenities
            ? formData.amenities
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean)
            : undefined,
        },
      };

      let property: Property;

      if (isEditing && id) {
        property = await propertyService.updateProperty(id, propertyData);
      } else {
        property = await propertyService.createProperty(propertyData);
      }

      const propertyId = property.id || property._id;

      if (!propertyId) {
        throw new Error("Missing property id in response");
      }

      // Upload new images if any
      if (images.length > 0) {
        await propertyService.uploadImages(propertyId, images);
      }

      navigate(`/properties/${propertyId}`);
    } catch (err) {
      console.error("Failed to save property:", err);
      alert("Impossible de sauvegarder la propriété. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperty) {
    return (
      <div className="property-form-page">
        <Navbar />
        <main className="property-form-container">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Chargement de la propriété...</p>
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
        {/* Header */}
        <div className="property-form-header">
          <h1>
            {isEditing ? "Modifier la propriété" : "Ajouter une propriété"}
          </h1>
          <p>
            {isEditing
              ? "Modifiez les informations de votre propriété ci-dessous."
              : "Remplissez les informations pour créer une nouvelle propriété."}
          </p>
        </div>

        {/* Form */}
        <form className="property-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">
              <InfoIcon />
              Informations de base
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="title">
                  Titre <span className="required">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Appartement moderne au centre-ville"
                  className={errors.title ? "error" : ""}
                />
                {errors.title && (
                  <span className="error-message">{errors.title}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez votre propriété..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Type de propriété</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="apartment">Appartement</option>
                  <option value="house">Maison</option>
                  <option value="villa">Villa</option>
                  <option value="studio">Studio</option>
                  <option value="condo">Condo</option>
                  <option value="land">Terrain</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="available">Disponible</option>
                  <option value="rented">Loué</option>
                  <option value="maintenance">En maintenance</option>
                  <option value="unlisted">Non listé</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price">
                  Prix <span className="required">*</span>
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Prix"
                  className={errors.price ? "error" : ""}
                />
                {errors.price && (
                  <span className="error-message">{errors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="currency">Devise</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="TND">TND</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="form-section">
            <h3 className="form-section-title">
              <LocationIcon />
              Adresse
            </h3>
            <AddressInput
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              errors={{
                street: errors.street,
                city: errors.city,
                country: errors.country,
              }}
              disabled={loading}
            />
          </div>

          {/* Features */}
          <div className="form-section">
            <h3 className="form-section-title">
              <FeaturesIcon />
              Caractéristiques
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="bedrooms">Chambres</label>
                <input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  placeholder="Nombre de chambres"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bathrooms">Salles de bain</label>
                <input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  placeholder="Nombre de salles de bain"
                />
              </div>

              <div className="form-group">
                <label htmlFor="area">Surface (m²)</label>
                <input
                  id="area"
                  name="area"
                  type="number"
                  min="0"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Surface en m²"
                />
              </div>

              <div className="form-group">
                <label htmlFor="parkingSpaces">Places de parking</label>
                <input
                  id="parkingSpaces"
                  name="parkingSpaces"
                  type="number"
                  min="0"
                  value={formData.parkingSpaces}
                  onChange={handleChange}
                  placeholder="Nombre de places"
                />
              </div>

              <div className="form-group">
                <div className="form-checkbox">
                  <input
                    id="furnished"
                    name="furnished"
                    type="checkbox"
                    checked={formData.furnished}
                    onChange={handleChange}
                  />
                  <label htmlFor="furnished">Meublé</label>
                </div>
              </div>

              <div className="form-group">
                <div className="form-checkbox">
                  <input
                    id="petFriendly"
                    name="petFriendly"
                    type="checkbox"
                    checked={formData.petFriendly}
                    onChange={handleChange}
                  />
                  <label htmlFor="petFriendly">Animaux acceptés</label>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="amenities">
                  Équipements (séparés par des virgules)
                </label>
                <input
                  id="amenities"
                  name="amenities"
                  type="text"
                  value={formData.amenities}
                  onChange={handleChange}
                  placeholder="Ex: Piscine, Jardin, Climatisation, Terrasse"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="form-section">
            <h3 className="form-section-title">
              <ImageIcon />
              Photos
            </h3>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div
                className="image-preview-grid"
                style={{ marginBottom: "1.5rem" }}
              >
                {existingImages.map((img, index) => (
                  <div key={img.key || index} className="image-preview-item">
                    <img src={img.url} alt={`Image ${index + 1}`} />
                    <button
                      type="button"
                      className="image-preview-remove"
                      onClick={() => handleRemoveExistingImage(img.key)}
                    >
                      <CloseIcon />
                    </button>
                    {index === 0 && (
                      <span className="image-preview-primary">Principal</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Zone */}
            <div
              className="image-upload-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("image-input")?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload property images"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("image-input")?.click();
                }
              }}
            >
              <ImageIcon />
              <h4>Glissez-déposez vos images ici</h4>
              <p>ou cliquez pour sélectionner (JPEG, PNG, WebP - max 10MB)</p>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            {/* New Images Preview */}
            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((file, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <button
                      type="button"
                      className="image-preview-remove"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <Link to="/properties" className="btn-cancel">
              Annuler
            </Link>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span
                    className="loading-spinner"
                    style={{ width: 18, height: 18 }}
                  />
                  Enregistrement...
                </>
              ) : isEditing ? (
                "Mettre à jour"
              ) : (
                "Créer la propriété"
              )}
            </button>
          </div>
        </form>
      </main>

      <HomeFooter />
    </div>
  );
}
