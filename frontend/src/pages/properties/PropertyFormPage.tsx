// ===========================================
// SmartProperty - Property Form Page (Create/Edit)
// ===========================================

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HomeFooter, Navbar } from "../../components/layout";
import AddressInput, {
  type AddressData,
} from "../../components/properties/AddressInputOSM";
import { Stepper, type StepperStep } from "../../components/ui";
import { useTranslation } from "../../i18n";
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
  availableFrom: string;
  availableTo: string;
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
  availableFrom: "",
  availableTo: "",
};

const WIZARD_STEP_IDS = [
  "details",
  "address",
  "amenities",
  "pricing",
  "photos",
] as const;

// ===========================================
// Main Property Form Page
// ===========================================

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<
    { url: string; key: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(isEditing);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormData, string>> & {
      street?: string;
      city?: string;
      country?: string;
    }
  >({});

  const wizardSteps: StepperStep[] = [
    { id: "details", label: t.properties.form.steps.details },
    { id: "address", label: t.properties.form.steps.address },
    { id: "amenities", label: t.properties.form.steps.amenities },
    { id: "pricing", label: t.properties.form.steps.pricing },
    { id: "photos", label: t.properties.form.steps.photos },
  ];

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
        availableFrom:
          property.features?.availabilityCalendar?.availableFrom || "",
        availableTo: property.features?.availabilityCalendar?.availableTo || "",
      });
      setExistingImages(
        (property.images || []).map((img) => ({
          url: img.url,
          key: img.key || "",
        })),
      );
    } catch (err) {
      console.error("Failed to load property:", err);
      alert(t.properties.form.messages.loadError);
      navigate("/properties");
    } finally {
      setLoadingProperty(false);
    }
  }, [id, navigate, t.properties.form.messages.loadError]);

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
      alert(t.properties.form.messages.deleteImageError);
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
      newErrors.title = t.properties.form.validation.titleRequired;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = t.properties.form.validation.pricePositive;
    }
    if (!formData.address.street.trim()) {
      newErrors.street = t.properties.form.validation.streetRequired;
    }
    if (!formData.address.city.trim()) {
      newErrors.city = t.properties.form.validation.cityRequired;
    }
    if (!formData.address.country.trim()) {
      newErrors.country = t.properties.form.validation.countryRequired;
    }
    if (
      formData.availableFrom &&
      formData.availableTo &&
      formData.availableTo < formData.availableFrom
    ) {
      newErrors.availableTo = t.properties.form.validation.availableToAfterFrom;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentStep = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> & {
      street?: string;
      city?: string;
      country?: string;
    } = {};

    if (currentStep === 0) {
      if (!formData.title.trim()) {
        nextErrors.title = t.properties.form.validation.titleRequired;
      }
    }

    if (currentStep === 1) {
      if (!formData.address.street.trim()) {
        nextErrors.street = t.properties.form.validation.streetRequired;
      }
      if (!formData.address.city.trim()) {
        nextErrors.city = t.properties.form.validation.cityRequired;
      }
      if (!formData.address.country.trim()) {
        nextErrors.country = t.properties.form.validation.countryRequired;
      }
    }

    if (currentStep === 3) {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        nextErrors.price = t.properties.form.validation.pricePositive;
      }
      if (
        formData.availableFrom &&
        formData.availableTo &&
        formData.availableTo < formData.availableFrom
      ) {
        nextErrors.availableTo =
          t.properties.form.validation.availableToAfterFrom;
      }
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const handleStepChange = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const isPhotosStep = WIZARD_STEP_IDS[currentStep] === "photos";

  // Save is triggered only from the explicit final-step button.
  const handleSaveProperty = async () => {
    if (!isPhotosStep) {
      setCurrentStep(wizardSteps.length - 1);
      return;
    }

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
          availabilityCalendar: {
            availableFrom: formData.availableFrom || undefined,
            availableTo: formData.availableTo || undefined,
          },
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
      alert(t.properties.form.messages.saveError);
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
            <p>{t.properties.form.loadingProperty}</p>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  const renderStepContent = () => {
    switch (WIZARD_STEP_IDS[currentStep]) {
      case "details":
        return (
          <div className="form-section">
            <h3 className="form-section-title">
              <InfoIcon />
              {t.properties.form.sections.basicInfo}
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="title">
                  {t.properties.form.labels.title}{" "}
                  <span className="required">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.title}
                  className={errors.title ? "error" : ""}
                />
                {errors.title && (
                  <span className="error-message">{errors.title}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">
                  {t.properties.form.labels.description}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.description}
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">{t.properties.form.labels.type}</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="apartment">
                    {t.properties.typeApartment}
                  </option>
                  <option value="house">{t.properties.typeHouse}</option>
                  <option value="villa">{t.properties.typeVilla}</option>
                  <option value="studio">{t.properties.typeStudio}</option>
                  <option value="condo">{t.properties.typeCondo}</option>
                  <option value="land">{t.properties.typeLand}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">
                  {t.properties.form.labels.status}
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="available">{t.properties.available}</option>
                  <option value="rented">{t.properties.rented}</option>
                  <option value="maintenance">
                    {t.properties.maintenance}
                  </option>
                  <option value="unlisted">{t.properties.unlisted}</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "address":
        return (
          <div className="form-section">
            <h3 className="form-section-title">
              <LocationIcon />
              {t.properties.form.sections.address}
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
        );

      case "amenities":
        return (
          <div className="form-section">
            <h3 className="form-section-title">
              <FeaturesIcon />
              {t.properties.form.sections.featuresAmenities}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="bedrooms">
                  {t.properties.form.labels.bedrooms}
                </label>
                <input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.bedrooms}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bathrooms">
                  {t.properties.form.labels.bathrooms}
                </label>
                <input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.bathrooms}
                />
              </div>

              <div className="form-group">
                <label htmlFor="area">{t.properties.form.labels.area}</label>
                <input
                  id="area"
                  name="area"
                  type="number"
                  min="0"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.area}
                />
              </div>

              <div className="form-group">
                <label htmlFor="parkingSpaces">
                  {t.properties.form.labels.parkingSpaces}
                </label>
                <input
                  id="parkingSpaces"
                  name="parkingSpaces"
                  type="number"
                  min="0"
                  value={formData.parkingSpaces}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.parkingSpaces}
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
                  <label htmlFor="furnished">
                    {t.properties.form.labels.furnished}
                  </label>
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
                  <label htmlFor="petFriendly">
                    {t.properties.form.labels.petFriendly}
                  </label>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="amenities">
                  {t.properties.form.labels.amenities}
                </label>
                <input
                  id="amenities"
                  name="amenities"
                  type="text"
                  value={formData.amenities}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.amenities}
                />
              </div>
            </div>
          </div>
        );

      case "pricing":
        return (
          <div className="form-section">
            <h3 className="form-section-title">
              <InfoIcon />
              {t.properties.form.sections.pricingAvailability}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="price">
                  {t.properties.form.labels.price}{" "}
                  <span className="required">*</span>
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder={t.properties.form.placeholders.price}
                  className={errors.price ? "error" : ""}
                />
                {errors.price && (
                  <span className="error-message">{errors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="currency">
                  {t.properties.form.labels.currency}
                </label>
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

              <div className="form-group">
                <label htmlFor="availableFrom">
                  {t.properties.form.labels.availableFrom}
                </label>
                <input
                  id="availableFrom"
                  name="availableFrom"
                  type="date"
                  value={formData.availableFrom}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="availableTo">
                  {t.properties.form.labels.availableTo}
                </label>
                <input
                  id="availableTo"
                  name="availableTo"
                  type="date"
                  value={formData.availableTo}
                  onChange={handleChange}
                  className={errors.availableTo ? "error" : ""}
                />
                {errors.availableTo && (
                  <span className="error-message">{errors.availableTo}</span>
                )}
              </div>
            </div>
          </div>
        );

      case "photos":
        return (
          <div className="form-section">
            <h3 className="form-section-title">
              <ImageIcon />
              {t.properties.form.sections.photos}
            </h3>

            {existingImages.length > 0 && (
              <div
                className="image-preview-grid"
                style={{ marginBottom: "1.5rem" }}
              >
                {existingImages.map((img, index) => (
                  <div key={img.key || index} className="image-preview-item">
                    <img
                      src={img.url}
                      alt={`${t.properties.form.image.alt} ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="image-preview-remove"
                      onClick={() => handleRemoveExistingImage(img.key)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <CloseIcon />
                    </button>
                    {index === 0 && (
                      <span className="image-preview-primary">
                        {t.properties.form.image.primary}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              className="image-upload-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("image-input")?.click()}
              role="button"
              tabIndex={0}
              aria-label={t.properties.form.image.uploadAriaLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("image-input")?.click();
                }
              }}
            >
              <ImageIcon />
              <h4>{t.properties.form.image.dropTitle}</h4>
              <p>{t.properties.form.image.dropSubtitle}</p>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((file, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <button
                      type="button"
                      className="image-preview-remove"
                      onClick={() => handleRemoveImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="property-form-page">
      <Navbar />

      <main className="property-form-container">
        {/* Header */}
        <div className="property-form-header">
          <h1>
            {isEditing
              ? t.properties.form.page.editTitle
              : t.properties.form.page.createTitle}
          </h1>
          <p>
            {isEditing
              ? t.properties.form.page.editDescription
              : t.properties.form.page.createDescription}
          </p>
        </div>

        {/* Form */}
        <div className="property-form" role="form">
          <Stepper
            steps={wizardSteps}
            currentStep={currentStep}
            ariaLabel={t.properties.form.stepsAriaLabel}
            allowStepNavigation
            onStepChange={handleStepChange}
            actions={
              <div className="wizard-nav-actions">
                <Link to="/properties" className="btn-cancel">
                  {t.common.cancel}
                </Link>
                <div className="wizard-nav-primary">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handlePreviousStep}
                    disabled={currentStep === 0}
                  >
                    {t.properties.previous}
                  </button>

                  {!isPhotosStep ? (
                    <button
                      type="button"
                      className="btn-submit"
                      onClick={handleNextStep}
                    >
                      {t.properties.next}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-submit"
                      onClick={() => {
                        void handleSaveProperty();
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span
                            className="loading-spinner"
                            style={{ width: 18, height: 18 }}
                          />
                          {t.properties.form.actions.saving}
                        </>
                      ) : isEditing ? (
                        t.properties.form.actions.update
                      ) : (
                        t.properties.form.actions.create
                      )}
                    </button>
                  )}
                </div>
              </div>
            }
          >
            {renderStepContent()}
          </Stepper>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
