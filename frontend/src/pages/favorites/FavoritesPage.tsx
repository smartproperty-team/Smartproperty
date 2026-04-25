import { HomeFooter, Navbar } from "@/components/layout";
import reviewsFavoritesService from "@/services/reviews-favorites.service";
import type { FavoriteItem } from "@/types/reviews-favorites";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../properties/properties.css";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPropertyId, setBusyPropertyId] = useState<string | null>(null);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await reviewsFavoritesService.listMyFavorites();
      setFavorites(response.favorites);
    } catch {
      setError("Unable to load favorites right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFavorites();
  }, []);

  const handleRemove = async (propertyId: string) => {
    setBusyPropertyId(propertyId);

    try {
      await reviewsFavoritesService.removeFavorite(propertyId);
      setFavorites((prev) =>
        prev.filter((item) => item.propertyId !== propertyId),
      );
    } catch {
      setError("Unable to remove this favorite right now.");
    } finally {
      setBusyPropertyId(null);
    }
  };

  return (
    <div className="properties-page">
      <Navbar />

      <main className="properties-container" id="main-content">
        <div className="properties-header">
          <div className="header-actions">
            <div>
              <h1>My Favorites</h1>
              <p>{favorites.length} saved properties</p>
            </div>
            <div className="header-cta-group">
              <Link to="/properties" className="btn-my-properties">
                Browse Listings
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading your favorites...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load favorites</h3>
            <p>{error}</p>
            <button
              className="btn-filter primary"
              onClick={() => void loadFavorites()}
            >
              Retry
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-state">
            <h3>No favorite properties yet</h3>
            <p>Save properties you like and they will appear here.</p>
            <Link to="/properties" className="btn-filter primary">
              Explore properties
            </Link>
          </div>
        ) : (
          <div className="properties-grid">
            {favorites.map((favorite) => {
              const property = favorite.property;
              const image =
                property.images?.[0]?.url || "/placeholder-property.svg";

              return (
                <article
                  key={favorite.id}
                  className="property-card"
                  aria-label={property.title}
                >
                  <div className="property-card-image">
                    <img
                      src={image}
                      alt={property.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/placeholder-property.svg";
                      }}
                    />
                    <span className={`property-badge ${property.status}`}>
                      {property.status}
                    </span>
                  </div>

                  <div className="property-card-content">
                    <h3 className="property-title">{property.title}</h3>
                    <p className="property-address">
                      {property.address.city}, {property.address.country}
                    </p>

                    <div className="property-price">
                      <span className="price">
                        {property.price.toLocaleString()}
                      </span>
                      <span className="currency">{property.currency}</span>
                    </div>

                    <div className="property-card-actions">
                      <Link
                        to={`/properties/${property.id || property._id}`}
                        className="btn-view"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => void handleRemove(favorite.propertyId)}
                        disabled={busyPropertyId === favorite.propertyId}
                      >
                        {busyPropertyId === favorite.propertyId
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}
