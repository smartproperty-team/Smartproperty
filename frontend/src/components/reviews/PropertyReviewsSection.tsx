import type {
  PropertyReview,
  PropertyReviewSummary,
} from "@/types/reviews-favorites";
import { Clock3, MessageSquareQuote, Sparkles } from "lucide-react";
import {
  useCallback,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

export interface PropertyReviewFormState {
  rating: number;
  title: string;
  comment: string;
}

interface PropertyReviewsSectionProps {
  reviewSummary: PropertyReviewSummary;
  approvedReviews: PropertyReview[];
  reviewError: string | null;
  reviewsLoading: boolean;
  myReview: PropertyReview | null;
  reviewBusy: boolean;
  canLeaveReview: boolean;
  reviewForm: PropertyReviewFormState;
  setReviewForm: Dispatch<SetStateAction<PropertyReviewFormState>>;
  onSubmitReview: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteReview: () => void;
}

function formatReviewDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function StarIcon({
  fill,
  size,
  uid,
}: {
  fill: "full" | "half" | "empty";
  size: number;
  uid?: string;
}) {
  const gradientId = uid ? `half-${uid}` : "half-ro";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {fill === "half" && (
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d={STAR_PATH}
        fill={
          fill === "full"
            ? "#eab308"
            : fill === "half"
              ? `url(#${gradientId})`
              : "none"
        }
        stroke="#eab308"
      />
    </svg>
  );
}

function starFill(
  starIndex: number,
  value: number,
): "full" | "half" | "empty" {
  const threshold = starIndex + 1;
  if (value >= threshold) return "full";
  if (value >= threshold - 0.5) return "half";
  return "empty";
}

function RatingStars({ value, size }: { value: number; size: "sm" | "md" }) {
  const px = size === "sm" ? 14 : 20;
  return (
    <span
      style={{ display: "inline-flex", gap: 2 }}
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} fill={starFill(i, value)} size={px} />
      ))}
    </span>
  );
}

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const resolveValue = useCallback(
    (e: React.MouseEvent, starIndex: number) => {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      return isLeftHalf ? starIndex + 0.5 : starIndex + 1;
    },
    [],
  );

  const display = hoverValue ?? value;

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      style={{ display: "inline-flex", gap: 2 }}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onMouseMove={(e) => {
            if (!disabled) setHoverValue(resolveValue(e, i));
          }}
          onClick={(e) => {
            if (!disabled) onChange(resolveValue(e, i));
          }}
          style={{
            background: "none",
            border: "none",
            padding: 2,
            cursor: disabled ? "default" : "pointer",
            lineHeight: 1,
            transition: "transform 0.15s ease",
            transform:
              hoverValue !== null && starFill(i, display) !== "empty"
                ? "scale(1.18)"
                : "scale(1)",
          }}
          aria-label={`${i + 1} stars`}
        >
          <StarIcon fill={starFill(i, display)} size={28} uid={`input-${i}`} />
        </button>
      ))}
    </div>
  );
}

export default function PropertyReviewsSection({
  reviewSummary,
  approvedReviews,
  reviewError,
  reviewsLoading,
  myReview,
  reviewBusy,
  canLeaveReview,
  reviewForm,
  setReviewForm,
  onSubmitReview,
  onDeleteReview,
}: PropertyReviewsSectionProps) {
  const averageRating = reviewSummary.averageRating.toFixed(1);

  return (
    <section className="property-reviews-panel">
      <div className="property-reviews-hero">
        <div className="property-reviews-hero-copy">
          <span className="property-reviews-eyebrow">
            <Sparkles size={14} />
            Tenant feedback
          </span>
          <h3>Reviews</h3>
          <p>
            A clean summary of tenant experience, response status, and owner
            replies.
          </p>
          <div className="property-reviews-metrics">
            <div className="property-reviews-metric">
              <span className="property-reviews-metric-label">
                Average rating
              </span>
              <strong>{averageRating} / 5</strong>
            </div>
            <div className="property-reviews-metric">
              <span className="property-reviews-metric-label">
                Published reviews
              </span>
              <strong>{reviewSummary.totalReviews}</strong>
            </div>
          </div>
        </div>

        <div className="property-reviews-summary-card">
          <div className="property-reviews-score">{averageRating}</div>
          <RatingStars
            value={reviewSummary.averageRating}
            size="md"
          />
          <p>{reviewSummary.totalReviews} published reviews</p>
        </div>
      </div>

      {reviewError && <p className="reviews-feedback-error">{reviewError}</p>}

      {canLeaveReview && (
        <form className="property-review-composer" onSubmit={onSubmitReview}>
          <div className="property-review-composer-head">
            <div>
              <h4>{myReview ? "Update your review" : "Write a review"}</h4>
              <p>
                Share honest feedback to help the next tenant make a better
                decision.
              </p>
            </div>
            {myReview && (
              <span
                className={`review-status-chip review-status-${myReview.status}`}
              >
                {myReview.status}
              </span>
            )}
          </div>

          <div className="property-review-rating-row">
            <div>
              <span className="property-review-rating-label">Rating</span>
              <StarRatingInput
                value={reviewForm.rating}
                onChange={(v) =>
                  setReviewForm((previous) => ({ ...previous, rating: v }))
                }
                disabled={reviewBusy}
              />
            </div>
            <span className="property-review-rating-value">
              {reviewForm.rating} / 5
            </span>
          </div>

          <div className="review-form-grid property-review-form-grid">
            <label>
              <span>Title (optional)</span>
              <input
                type="text"
                maxLength={120}
                value={reviewForm.title}
                onChange={(event) =>
                  setReviewForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                disabled={reviewBusy}
                placeholder="Short summary"
              />
            </label>
          </div>

          <label className="review-comment-field property-review-comment-field">
            <span>Review</span>
            <textarea
              rows={5}
              maxLength={2000}
              value={reviewForm.comment}
              onChange={(event) =>
                setReviewForm((previous) => ({
                  ...previous,
                  comment: event.target.value,
                }))
              }
              disabled={reviewBusy}
              placeholder="Describe your rental experience"
            />
          </label>

          {myReview && (
            <div
              className={`review-status-note review-status-${myReview.status}`}
            >
              Current status: {myReview.status}
            </div>
          )}

          <div className="review-form-actions property-review-actions">
            <button type="submit" className="btn-view" disabled={reviewBusy}>
              {reviewBusy
                ? "Saving..."
                : myReview
                  ? "Update review"
                  : "Submit review"}
            </button>
            {myReview && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => void onDeleteReview()}
                disabled={reviewBusy}
              >
                Delete review
              </button>
            )}
          </div>
        </form>
      )}

      {reviewsLoading ? (
        <div className="property-review-placeholder">
          <div className="loading-spinner" />
          <p>Loading reviews...</p>
        </div>
      ) : approvedReviews.length === 0 ? (
        <div className="property-review-empty">
          <MessageSquareQuote size={22} />
          <div>
            <h4>No approved reviews yet</h4>
            <p>Be the first to share feedback about this property.</p>
          </div>
        </div>
      ) : (
        <div className="property-reviews-list">
          {approvedReviews.map((review) => (
            <article key={review.id} className="property-review-card">
              <div className="property-review-card-head">
                <div className="property-review-author">
                  <div className="property-review-avatar">
                    {review.author.name?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h4>{review.title || "Tenant feedback"}</h4>
                    <p>{review.author.name}</p>
                  </div>
                </div>

                <div className="property-review-card-meta">
                  <RatingStars value={review.rating} size="sm" />
                  <span className="property-review-date">
                    <Clock3 size={12} />
                    {formatReviewDate(review.createdAt)}
                  </span>
                </div>
              </div>

              <p className="property-review-comment">{review.comment}</p>

              {review.ownerResponse && (
                <div className="review-owner-response property-review-response">
                  <strong>Official response</strong>
                  <p>{review.ownerResponse.message}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
