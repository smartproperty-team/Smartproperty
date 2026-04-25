import { HomeFooter, Navbar } from "@/components/layout";
import reviewsFavoritesService from "@/services/reviews-favorites.service";
import type {
  ModerateReviewDto,
  ModerationQueueItem,
  PropertyReviewStatus,
} from "@/types/reviews-favorites";
import { useEffect, useMemo, useState } from "react";
import "../properties/properties.css";

const STATUS_OPTIONS: PropertyReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
  "hidden",
];

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default function ReviewModerationPage() {
  const [selectedStatus, setSelectedStatus] =
    useState<PropertyReviewStatus>("pending");
  const [reviews, setReviews] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  const loadQueue = async (status: PropertyReviewStatus) => {
    setLoading(true);
    setError(null);

    try {
      const response = await reviewsFavoritesService.getModerationQueue(status);
      setReviews(response.reviews);
    } catch {
      setError("Unable to load review moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue(selectedStatus);
  }, [selectedStatus]);

  const summary = useMemo(() => {
    const total = reviews.length;
    const avgRating =
      total > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) / total
            ).toFixed(2),
          )
        : 0;

    return { total, avgRating };
  }, [reviews]);

  const moderate = async (
    review: ModerationQueueItem,
    payload: ModerateReviewDto,
  ) => {
    setBusyReviewId(review.id);

    try {
      await reviewsFavoritesService.moderateReview(review.id, payload);
      await loadQueue(selectedStatus);
    } catch {
      setError("Unable to save moderation action.");
    } finally {
      setBusyReviewId(null);
    }
  };

  const addResponse = async (review: ModerationQueueItem) => {
    const message = window.prompt("Official response to this review:");

    if (!message || !message.trim()) {
      return;
    }

    setBusyReviewId(review.id);

    try {
      await reviewsFavoritesService.respondToReview(review.id, {
        message: message.trim(),
      });
      await loadQueue(selectedStatus);
    } catch {
      setError("Unable to publish review response.");
    } finally {
      setBusyReviewId(null);
    }
  };

  return (
    <div className="properties-page">
      <Navbar />

      <main className="properties-container" id="main-content">
        <div className="properties-header">
          <div className="header-actions">
            <div>
              <h1>Review Moderation</h1>
              <p>
                {summary.total} reviews · average rating {summary.avgRating}
              </p>
            </div>
            <div className="header-cta-group">
              <label className="filter-group" style={{ minWidth: 180 }}>
                <span>Status</span>
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as PropertyReviewStatus,
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading moderation queue...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Moderation queue unavailable</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn-filter primary"
              onClick={() => void loadQueue(selectedStatus)}
            >
              Retry
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <h3>No reviews in this queue</h3>
            <p>Switch status filter or check back later.</p>
          </div>
        ) : (
          <div className="reviews-moderation-grid">
            {reviews.map((review) => {
              const isBusy = busyReviewId === review.id;

              return (
                <article key={review.id} className="review-moderation-card">
                  <div className="review-moderation-head">
                    <div>
                      <h3>{review.property?.title || "Unknown property"}</h3>
                      <p>
                        {review.property?.city || "Unknown city"} ·{" "}
                        {review.author.name}
                      </p>
                    </div>
                    <span
                      className={`review-status-chip review-status-${review.status}`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <p className="review-rating-line">
                    Rating: {review.rating}/5
                  </p>
                  {review.title && (
                    <h4 className="review-title-line">{review.title}</h4>
                  )}
                  <p className="review-comment-line">{review.comment}</p>

                  <p className="review-meta-line">
                    Submitted: {formatDate(review.createdAt)}
                  </p>

                  {review.ownerResponse && (
                    <div className="review-official-response">
                      <strong>Official response</strong>
                      <p>{review.ownerResponse.message}</p>
                    </div>
                  )}

                  <div className="review-moderation-actions">
                    <button
                      type="button"
                      className="btn-view"
                      disabled={isBusy}
                      onClick={() =>
                        void moderate(review, {
                          status: "approved",
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-edit"
                      disabled={isBusy}
                      onClick={() => {
                        const reason =
                          window.prompt("Rejection reason (optional):") ||
                          undefined;
                        void moderate(review, {
                          status: "rejected",
                          reason,
                        });
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      disabled={isBusy}
                      onClick={() => {
                        const reason =
                          window.prompt("Hide reason (optional):") || undefined;
                        void moderate(review, {
                          status: "hidden",
                          reason,
                        });
                      }}
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      className="btn-share"
                      disabled={isBusy || review.status !== "approved"}
                      onClick={() => void addResponse(review)}
                    >
                      Respond
                    </button>
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
