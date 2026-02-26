// ===========================================
// SmartProperty - Property Detail Page
// ===========================================

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HomeFooter, Navbar } from "@/components/layout";
import { propertyService } from "@/services/property.service";
import { useAuthStore } from "@/store";
import type { Property, PropertyImage } from "@/types/property";
import { canManageProperties } from "@/utils";
import "./properties.css";

// ===========================================
// Icons
// ===========================================

const LocationIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BedIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
    <path d="M21 7H3l2-4h14l2 4z" />
  </svg>
);

const BathIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
    <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" />
  </svg>
);

const AreaIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const CarIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const FurnitureIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
    <rect x="2" y="11" width="20" height="8" rx="2" />
    <path d="M4 19v2M20 19v2" />
  </svg>
);

const PetIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
    <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
    <path d="M8 14v.5" />
    <path d="M16 14v.5" />
    <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
    <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a13.152 13.152 0 0 0-.42-3.309" />
  </svg>
);

const BackIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ===========================================
// Image Gallery Component
// ===========================================

interface ImageGalleryProps {
  images: PropertyImage[];
}

function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.order || 0) - (b.order || 0);
  });

  const mainImage = sortedImages[selectedIndex] || sortedImages[0];
  const thumbnails = sortedImages.slice(0, 4);

  if (images.length === 0) {
    return (
      <div className="property-gallery">
        <div className="gallery-main">
          <img src="/placeholder-property.svg" alt="Pas d'image" />
        </div>
      </div>
    );
  }

  return (
    <div className="property-gallery">
      <div className="gallery-main">
        <img
          src={mainImage?.url}
          alt={mainImage?.caption || "Image de la propriété"}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-property.svg";
          }}
        />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {thumbnails.slice(1, 3).map((img, index) => (
            <div
              key={img.key || index}
              className="gallery-thumb"
              onClick={() => setSelectedIndex(index + 1)}
            >
              <img
                src={img.url}
                alt={img.caption || `Image ${index + 2}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/placeholder-property.svg";
                }}
              />
              {index === 1 && images.length > 3 && (
                <div className="gallery-more">+{images.length - 3} photos</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Main Property Detail Page
// ===========================================

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = canManageProperties(user);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperty = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await propertyService.getProperty(id);
      setProperty(data);
    } catch (err) {
      console.error("Failed to load property:", err);
      setError("Impossible de charger la propriété. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const handleDelete = async () => {
    if (!property) return;

    const propertyId = property.id || property._id;
    if (!propertyId) return;

    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cette propriété ?")
    ) {
      try {
        await propertyService.deleteProperty(propertyId);
        navigate("/properties");
      } catch (err) {
        console.error("Failed to delete property:", err);
        alert("Impossible de supprimer la propriété. Veuillez réessayer.");
      }
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "rented":
        return "Loué";
      case "maintenance":
        return "En maintenance";
      case "unlisted":
        return "Non listé";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "apartment":
        return "Appartement";
      case "house":
        return "Maison";
      case "villa":
        return "Villa";
      case "studio":
        return "Studio";
      case "condo":
        return "Condo";
      case "land":
        return "Terrain";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="property-detail-page">
        <Navbar />
        <main className="property-detail-container">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Chargement de la propriété...</p>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-page">
        <Navbar />
        <main className="property-detail-container">
          <div className="empty-state">
            <h3>Propriété non trouvée</h3>
            <p>{error || "Cette propriété n'existe pas ou a été supprimée."}</p>
            <Link to="/properties" className="btn-filter primary">
              Retour aux propriétés
            </Link>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <Navbar />

      <main className="property-detail-container">
        {/* Back Button */}
        <Link
          to="/properties"
          className="btn-cancel"
          style={{ marginBottom: "1.5rem" }}
        >
          <BackIcon />
          Retour aux propriétés
        </Link>

        {/* Header */}
        <div className="property-detail-header">
          <div>
            <h1 className="property-detail-title">{property.title}</h1>
            <p className="property-detail-address">
              <LocationIcon />
              {property.address.street}, {property.address.city},{" "}
              {property.address.state} {property.address.zipCode},{" "}
              {property.address.country}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="property-detail-price">
              {property.price.toLocaleString()} {property.currency}
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
            >
              <span
                className={`property-badge ${property.status}`}
                style={{ position: "static" }}
              >
                {getStatusLabel(property.status)}
              </span>
              <span
                className="property-type-badge"
                style={{ position: "static" }}
              >
                {getTypeLabel(property.type)}
              </span>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <ImageGallery images={property.images || []} />

        {/* Content */}
        <div className="property-content">
          {/* Main Info */}
          <div className="property-main-info">
            {/* Features */}
            <div className="features-grid">
              {property.features?.bedrooms !== undefined && (
                <div className="feature-item">
                  <BedIcon />
                  <div>
                    <span className="label">Chambres</span>
                    <span className="value">{property.features.bedrooms}</span>
                  </div>
                </div>
              )}
              {property.features?.bathrooms !== undefined && (
                <div className="feature-item">
                  <BathIcon />
                  <div>
                    <span className="label">Salles de bain</span>
                    <span className="value">{property.features.bathrooms}</span>
                  </div>
                </div>
              )}
              {property.features?.area !== undefined && (
                <div className="feature-item">
                  <AreaIcon />
                  <div>
                    <span className="label">Surface</span>
                    <span className="value">{property.features.area} m²</span>
                  </div>
                </div>
              )}
              {property.features?.parkingSpaces !== undefined && (
                <div className="feature-item">
                  <CarIcon />
                  <div>
                    <span className="label">Parking</span>
                    <span className="value">
                      {property.features.parkingSpaces} place
                      {property.features.parkingSpaces > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
              {property.features?.furnished !== undefined && (
                <div className="feature-item">
                  <FurnitureIcon />
                  <div>
                    <span className="label">Meublé</span>
                    <span className="value">
                      {property.features.furnished ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              )}
              {property.features?.petFriendly !== undefined && (
                <div className="feature-item">
                  <PetIcon />
                  <div>
                    <span className="label">Animaux acceptés</span>
                    <span className="value">
                      {property.features.petFriendly ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div className="property-description">
                <h3>Description</h3>
                <p>{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.features?.amenities &&
              property.features.amenities.length > 0 && (
                <div className="property-description">
                  <h3>Équipements</h3>
                  <div className="amenities-list">
                    {property.features.amenities.map((amenity, index) => (
                      <span key={index} className="amenity-tag">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Sidebar */}
          <div className="property-sidebar">
            {/* Actions Card — hidden for tenants */}
            {canManage && (
              <div className="sidebar-card">
                <h3>Actions</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <Link
                    to={`/properties/${property.id || property._id}/edit`}
                    className="btn-view"
                    style={{ textAlign: "center" }}
                  >
                    <EditIcon />
                    Modifier la propriété
                  </Link>
                  <Link
                    to={`/properties/${property.id || property._id}/images`}
                    className="btn-edit"
                    style={{ textAlign: "center" }}
                  >
                    Gérer les images
                  </Link>
                  <button
                    className="btn-delete"
                    onClick={handleDelete}
                    style={{ width: "100%" }}
                  >
                    <DeleteIcon />
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* Owner Card */}
            {property.owner && (
              <div className="sidebar-card">
                <h3>Propriétaire</h3>
                <div className="owner-info">
                  <div className="owner-avatar">
                    {property.owner.name?.charAt(0) || "P"}
                  </div>
                  <div className="owner-details">
                    <h4>{property.owner.name || "Propriétaire"}</h4>
                    <p>{property.owner.email}</p>
                  </div>
                </div>
                <button className="btn-contact">Contacter</button>
              </div>
            )}

            {/* Informations Card — internal data, hidden for tenants */}
            {canManage && (
              <div className="sidebar-card">
                <h3>Informations</h3>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <p>
                    <strong>ID:</strong> {property.id || property._id}
                  </p>
                  <p>
                    <strong>Créé le:</strong>{" "}
                    {new Date(property.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p>
                    <strong>Mis à jour le:</strong>{" "}
                    {new Date(property.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
