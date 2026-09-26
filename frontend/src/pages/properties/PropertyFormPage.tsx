// ===========================================
// SmartProperty - Property Form Page (Create/Edit)
// ===========================================

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HomeFooter, Navbar } from "../../components/layout";
import AddressInput, {
  type AddressData,
} from "../../components/properties/AddressInputOSM";
import AiDescriptionPanel from "../../components/properties/AiDescriptionPanel";
import { Stepper, type StepperStep } from "../../components/ui";
import { useTranslation } from "../../i18n";
import {
  propertyService,
  type AiPropertySnapshot,
  type PriceSuggestionResponse,
} from "../../services/property.service";
import type {
  CreatePropertyDto,
  Property,
  PropertyCategory,
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
  category: PropertyCategory;
  status: PropertyStatus;
  price: string;
  currency: string;
  virtualTour: string;
  generateVirtualTourFromPhotos: boolean;
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

interface PendingImage {
  file: File;
}

// Virtual tour constraints
const VIRTUAL_TOUR_MIN_IMAGES = 8;
const VIRTUAL_TOUR_MIN_WIDTH = 1024;
const VIRTUAL_TOUR_MIN_HEIGHT = 768;

const initialFormData: FormData = {
  title: "",
  description: "",
  type: "apartment",
  category: "rental",
  status: "available",
  price: "",
  currency: "TND",
  virtualTour: "",
  generateVirtualTourFromPhotos: false,
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

const PRICING_STEP_INDEX = WIZARD_STEP_IDS.indexOf("pricing");

/**
 * Every field the form validates. Address fields live inside AddressInput but
 * are validated here, so they are part of the same key space; each key also
 * matches the corresponding input's DOM id, which is what lets focus
 * management find the field that failed.
 */
type ErrorKey =
  | "title"
  | "price"
  | "availableTo"
  | "street"
  | "city"
  | "country";

// ===========================================
// Main Property Form Page
// ===========================================

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [existingImages, setExistingImages] = useState<
    { url: string; key: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(isEditing);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [priceSuggestion, setPriceSuggestion] =
    useState<PriceSuggestionResponse | null>(null);
  const [priceSuggestLoading, setPriceSuggestLoading] = useState(false);
  const [priceSuggestError, setPriceSuggestError] = useState<string | null>(
    null,
  );

  const buildAiSnapshot = useCallback((): AiPropertySnapshot => {
    const amenitiesList = formData.amenities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return {
      title: formData.title || undefined,
      propertyType: formData.type,
      city: formData.address.city || undefined,
      state: formData.address.state || undefined,
      country: formData.address.country || undefined,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
      areaSqft: formData.area ? Number(formData.area) : undefined,
      parkingSpaces: formData.parkingSpaces
        ? Number(formData.parkingSpaces)
        : undefined,
      furnished: formData.furnished,
      petFriendly: formData.petFriendly,
      amenities: amenitiesList.length ? amenitiesList : undefined,
      price: formData.price ? Number(formData.price) : undefined,
      currency: formData.currency || undefined,
    };
  }, [formData]);

  // A part-completed property is several minutes of work. Warn before a
  // refresh or tab close discards it.
  const isDirty =
    JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
    images.length > 0;

  useEffect(() => {
    if (!isDirty || loading) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, loading]);

  const handleSuggestPrice = async () => {
    if (!formData.address.city) {
      setPriceSuggestError("Please fill in the city first.");
      return;
    }
    if (!formData.area || Number(formData.area) < 10) {
      setPriceSuggestError("Please enter the area (min 10 m\u00b2).");
      return;
    }

    setPriceSuggestLoading(true);
    setPriceSuggestError(null);
    setPriceSuggestion(null);

    try {
      const amenitiesList = formData.amenities
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const result = await propertyService.suggestPrice({
        propertyType: formData.type,
        city: formData.address.city,
        areaSqm: Number(formData.area),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        parkingSpaces: formData.parkingSpaces
          ? Number(formData.parkingSpaces)
          : undefined,
        furnished: formData.furnished,
        petFriendly: formData.petFriendly,
        amenities: amenitiesList.length ? amenitiesList : undefined,
      });

      setPriceSuggestion(result);

      // Auto-fill with rental estimate by default.
      setFormData((prev) => ({
        ...prev,
        price: (result.rentalPrice ?? result.predictedPrice).toString(),
        currency: result.currency,
      }));
    } catch (err: unknown) {
      const typedError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setPriceSuggestError(
        typedError.response?.data?.message ||
          typedError.message ||
          "AI service unavailable",
      );
    } finally {
      setPriceSuggestLoading(false);
    }
  };

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
        category: property.category || "rental",
        status: property.status,
        price: property.price.toString(),
        currency: property.currency,
        virtualTour: property.virtualTour || "",
        generateVirtualTourFromPhotos: false,
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

    // Clear the error as soon as the user edits the field, so the message
    // disappears on the keystroke that fixes it rather than on the next submit.
    const key = name as ErrorKey;
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
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
    setImages((prev) => [...prev, ...validFiles.map((f) => ({ file: f }))]);
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
    setImages((prev) => [...prev, ...files.map((f) => ({ file: f }))]);
  };

  // Validate form
  // Field keys validated on each wizard step. Used by blur, Next and Submit
  // so all three agree on what a step requires.
  const STEP_FIELD_KEYS: Record<number, ErrorKey[]> = {
    0: ["title"],
    1: ["street", "city", "country"],
    3: ["price", "availableTo"],
  };

  const ALL_VALIDATED_KEYS: ErrorKey[] = [
    "title",
    "street",
    "city",
    "country",
    "price",
    "availableTo",
  ];

  // Single source of truth for the rules. Previously the same checks were
  // written twice - once for the step and once for submit - which let them
  // drift apart.
  const computeErrors = (): Partial<Record<ErrorKey, string>> => {
    const e: Partial<Record<ErrorKey, string>> = {};

    if (!formData.title.trim()) {
      e.title = t.properties.form.validation.titleRequired;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      e.price = t.properties.form.validation.pricePositive;
    }
    if (!formData.address.street.trim()) {
      e.street = t.properties.form.validation.streetRequired;
    }
    if (!formData.address.city.trim()) {
      e.city = t.properties.form.validation.cityRequired;
    }
    if (!formData.address.country.trim()) {
      e.country = t.properties.form.validation.countryRequired;
    }
    if (
      formData.availableFrom &&
      formData.availableTo &&
      formData.availableTo < formData.availableFrom
    ) {
      e.availableTo = t.properties.form.validation.availableToAfterFrom;
    }

    return e;
  };

  // Move focus to the first field that failed. Without this, pressing Next on
  // a long step appears to do nothing whenever the offending field has
  // scrolled out of view.
  const focusFirstInvalid = (keys: ErrorKey[]) => {
    window.requestAnimationFrame(() => {
      for (const key of keys) {
        const el = document.getElementById(key);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus({ preventScroll: true });
          return;
        }
      }
    });
  };

  /**
   * Validate a specific set of fields, replacing any previous errors for those
   * same fields rather than merging - stale errors used to persist and block
   * navigation with no visible cause.
   */
  const validateFields = (keys: ErrorKey[], focus = true): boolean => {
    const all = computeErrors();
    const failed = keys.filter((k) => all[k]);

    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      failed.forEach((k) => {
        next[k] = all[k];
      });
      return next;
    });

    if (failed.length && focus) {
      focusFirstInvalid(failed);
    }
    return failed.length === 0;
  };

  const validate = (): boolean => validateFields(ALL_VALIDATED_KEYS);

  const validateCurrentStep = (): boolean =>
    validateFields(STEP_FIELD_KEYS[currentStep] ?? []);

  // Validate one field once the user leaves it, so problems surface where the
  // user already is instead of only when they press Next.
  const handleFieldBlur = (key: ErrorKey) => {
    validateFields([key], false);
  };

  const describedBy = (key: ErrorKey) =>
    errors[key] ? `${key}-error` : undefined;

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const jumpToPricingStep = () => {
    setCurrentStep(PRICING_STEP_INDEX);
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, wizardSteps.length - 1);
      setFurthestStep((f) => Math.max(f, next));
      return next;
    });
  };

  const [furthestStep, setFurthestStep] = useState(0);

  // Allow jumping back, and forward again to any step already reached, so the
  // stepper works as navigation rather than a one-way ratchet.
  const handleStepChange = (stepIndex: number) => {
    if (stepIndex <= furthestStep) {
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
        category: formData.category,
        status: formData.status,
        price: parseFloat(formData.price),
        currency: formData.currency,
        virtualTour: formData.virtualTour.trim() || undefined,
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
        await propertyService.uploadImages(
          propertyId,
          images.map((i) => i.file),
        );
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
                  onBlur={() => handleFieldBlur("title")}
                  placeholder={t.properties.form.placeholders.title}
                  className={errors.title ? "error" : ""}
                  required
                  aria-required="true"
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={describedBy("title")}
                  maxLength={120}
                />
                {errors.title && (
                  <span
                    id="title-error"
                    className="error-message"
                    role="alert"
                  >
                    {errors.title}
                  </span>
                )}
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

              <div className="form-group">
                <label htmlFor="category">
                  {t.properties.form.labels.category}
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="rental">
                    {t.properties.form.labels.rent}
                  </option>
                  <option value="sale">{t.properties.form.labels.sale}</option>
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
                  inputMode="numeric"
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
                  inputMode="numeric"
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
                  inputMode="numeric"
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
                  inputMode="numeric"
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
                  inputMode="decimal"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("price")}
                  placeholder={t.properties.form.placeholders.price}
                  className={errors.price ? "error" : ""}
                  required
                  aria-required="true"
                  aria-invalid={errors.price ? true : undefined}
                  aria-describedby={describedBy("price")}
                />
                {errors.price && (
                  <span
                    id="price-error"
                    className="error-message"
                    role="alert"
                  >
                    {errors.price}
                  </span>
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

              {/* AI Price Suggestion */}
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="button"
                  onClick={handleSuggestPrice}
                  disabled={priceSuggestLoading}
                  className="btn-ai-trigger"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {priceSuggestLoading ? (
                    <>
                      <span
                        className="spinner"
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid currentColor",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                      Analyzing...
                    </>
                  ) : (
                    <>Predict price (AI)</>
                  )}
                </button>

                {priceSuggestError && (
                  <span
                    className="error-message"
                    style={{ display: "block", marginTop: "0.5rem" }}
                  >
                    {priceSuggestError}
                  </span>
                )}

                {priceSuggestion && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "var(--bg-secondary, #f4f6fa)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <strong
                          style={{ fontSize: "1.25rem", display: "block" }}
                        >
                          Rent:{" "}
                          {(
                            priceSuggestion.rentalPrice ??
                            priceSuggestion.predictedPrice
                          ).toLocaleString()}{" "}
                          {priceSuggestion.currency}/mo
                        </strong>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "1.05rem",
                            marginTop: "0.2rem",
                          }}
                        >
                          Sale: {priceSuggestion.salePrice.toLocaleString()}{" "}
                          {priceSuggestion.currency}
                        </strong>
                      </div>
                      <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                        Confidence:{" "}
                        {Math.round(priceSuggestion.confidence * 100)}%
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "0.35rem",
                        opacity: 0.7,
                      }}
                    >
                      Range: {priceSuggestion.priceRange.low.toLocaleString()} -{" "}
                      {priceSuggestion.priceRange.high.toLocaleString()}{" "}
                      {priceSuggestion.currency}/mo | Sale range:{" "}
                      {priceSuggestion.salePriceRange.low.toLocaleString()} -{" "}
                      {priceSuggestion.salePriceRange.high.toLocaleString()}{" "}
                      {priceSuggestion.currency} | Base rate:{" "}
                      {priceSuggestion.baseRatePerSqm} TND/m&sup2;
                    </div>

                    <div
                      style={{
                        marginTop: "0.6rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            category: "rental",
                            price: (
                              priceSuggestion.rentalPrice ??
                              priceSuggestion.predictedPrice
                            ).toString(),
                            currency: priceSuggestion.currency,
                          }))
                        }
                      >
                        Use rent price
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            category: "sale",
                            price: priceSuggestion.salePrice.toString(),
                            currency: priceSuggestion.currency,
                          }))
                        }
                      >
                        Use sale price
                      </button>
                    </div>
                    {priceSuggestion.factors.length > 0 && (
                      <ul
                        style={{
                          margin: "0.5rem 0 0",
                          paddingLeft: "1.25rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {priceSuggestion.factors.map((f, i) => (
                          <li key={i}>
                            <strong>{f.factor}</strong>: {f.description} (
                            {f.impact})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
                  onBlur={() => handleFieldBlur("availableTo")}
                  className={errors.availableTo ? "error" : ""}
                  aria-invalid={errors.availableTo ? true : undefined}
                  aria-describedby={describedBy("availableTo")}
                />
                {errors.availableTo && (
                  <span
                    id="availableTo-error"
                    className="error-message"
                    role="alert"
                  >
                    {errors.availableTo}
                  </span>
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

            <div className="virtual-tour-owner-guide">
              <h4>{t.properties.form.image.virtualTour.captureGuideTitle}</h4>
              <p>{t.properties.form.image.virtualTour.captureGuideIntro}</p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <img
                  src="/images/virtual-tour-diagram.svg"
                  alt={t.properties.form.image.virtualTour.diagramAlt}
                  className="virtual-tour-diagram"
                  style={{ maxWidth: 320, width: "100%", height: "auto" }}
                />
                <ol>
                  <li>
                    {t.properties.form.image.virtualTour.guideStep1.replace(
                      "{{count}}",
                      String(VIRTUAL_TOUR_MIN_IMAGES),
                    )}
                  </li>
                  <li>
                    {t.properties.form.image.virtualTour.guideStep2
                      .replace("{{width}}", String(VIRTUAL_TOUR_MIN_WIDTH))
                      .replace("{{height}}", String(VIRTUAL_TOUR_MIN_HEIGHT))}
                  </li>
                  <li>{t.properties.form.image.virtualTour.guideStep3}</li>
                  <li>{t.properties.form.image.virtualTour.guideStep4}</li>
                </ol>
              </div>
            </div>

            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((img, index) => (
                  <div
                    key={`${img.file.name}-${index}`}
                    className="image-preview-item"
                  >
                    <img
                      src={URL.createObjectURL(img.file)}
                      alt={`Preview ${index + 1}`}
                    />
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

            {/* Description (final step) - generated from the data entered in
                the previous wizard steps. */}
            <div
              className="form-group full-width"
              style={{ marginTop: "1.5rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <label htmlFor="description">
                  {t.properties.form.labels.description}
                </label>
                <button
                  type="button"
                  className="btn-ai-trigger"
                  onClick={() => setAiPanelOpen(true)}
                  data-testid="ai-description-cta"
                >
                  {t.properties.form.aiDescription.cta}
                </button>
              </div>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t.properties.form.placeholders.description}
                rows={6}
              />
            </div>

            <AiDescriptionPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              snapshot={buildAiSnapshot()}
              propertyId={id}
              onApply={(text) => {
                setFormData((prev) => ({ ...prev, description: text }));
                setAiPanelOpen(false);
              }}
            />
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
        <div className="wizard">
          <Stepper
            steps={wizardSteps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            actions={
              <div className="wizard-nav-primary">
                {currentStep !== PRICING_STEP_INDEX && (
                  <button
                    type="button"
                    className="btn-ai-trigger"
                    onClick={jumpToPricingStep}
                  >
                    Predict price (AI)
                  </button>
                )}
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
