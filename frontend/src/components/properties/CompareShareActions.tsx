// ===========================================
// SmartProperty - Compare and share actions for a listing card
// ===========================================

import { useTranslation } from "../../i18n";

interface CompareShareActionsProps {
  isCompared: boolean;
  /** The comparison is full; a listing already in it can still leave. */
  compareFull: boolean;
  isSharing: boolean;
  onToggleCompare: () => void;
  onShare: () => void;
}

/** Shared by the listings page and My Properties, via ListingCard's actions. */
export function CompareShareActions({
  isCompared,
  compareFull,
  isSharing,
  onToggleCompare,
  onShare,
}: CompareShareActionsProps) {
  const t = useTranslation();
  return (
    <>
      <button
        type="button"
        className={`listing-action${isCompared ? " listing-action--active" : ""}`}
        aria-pressed={isCompared}
        disabled={!isCompared && compareFull}
        onClick={onToggleCompare}
      >
        {isCompared
          ? t.properties.removeFromCompare
          : t.properties.addToCompare}
      </button>
      <button
        type="button"
        className="listing-action"
        disabled={isSharing}
        onClick={onShare}
      >
        {isSharing ? t.common.loading : t.properties.shareBtn}
      </button>
    </>
  );
}
