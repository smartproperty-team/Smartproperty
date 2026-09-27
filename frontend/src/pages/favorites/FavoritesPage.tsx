import { HomeFooter, Navbar } from "@/components/layout";
import { ListingCard } from "@/components/properties/ListingCard";
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
              const busy = busyPropertyId === favorite.propertyId;
              return (
                <ListingCard
                  key={favorite.id}
                  property={favorite.property}
                  actions={
                    <button
                      type="button"
                      className="listing-action listing-action--danger"
                      onClick={() => void handleRemove(favorite.propertyId)}
                      disabled={busy}
                    >
                      {busy ? "Removing..." : "Remove"}
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}
