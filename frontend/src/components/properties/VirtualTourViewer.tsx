// ===========================================
// SmartProperty - Virtual Tour Viewer
// ===========================================

import { useTranslation } from "@/i18n";
import { useMemo } from "react";
import Sphere360Viewer from "./Sphere360Viewer";

type VirtualTourProvider =
  | "youtube"
  | "matterport"
  | "three-d-vista"
  | "local-panorama"
  | "external";

interface VirtualTourViewerProps {
  url?: string;
  propertyId?: string;
}

interface TourViewConfig {
  provider: VirtualTourProvider;
  label: string;
  kind: "embed" | "image" | "link";
  sourceUrl: string;
}

function normalizeUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function detectProvider(url: URL): VirtualTourProvider {
  const hostname = url.hostname.toLowerCase();

  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return "youtube";
  }

  if (hostname.includes("matterport.com")) {
    return "matterport";
  }

  if (hostname.includes("3dvista.com")) {
    return "three-d-vista";
  }

  return "external";
}

function buildYoutubeEmbedUrl(url: URL): string {
  const videoIdFromSearch = url.searchParams.get("v") || undefined;
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const videoIdFromPath =
    pathSegments[0] === "watch" || pathSegments[0] === "embed"
      ? undefined
      : pathSegments.pop();
  const videoId = videoIdFromSearch || videoIdFromPath || "";

  if (!videoId) {
    return url.toString();
  }

  return `https://www.youtube.com/embed/${videoId}`;
}

function buildViewConfig(
  rawUrl: string | undefined,
  propertyId: string | undefined,
): TourViewConfig | null {
  const trimmedUrl = rawUrl?.trim();

  if (trimmedUrl) {
    const parsedUrl = normalizeUrl(trimmedUrl);
    if (parsedUrl) {
      const provider = detectProvider(parsedUrl);

      if (provider === "youtube") {
        return {
          provider,
          label: "YouTube",
          kind: "embed",
          sourceUrl: buildYoutubeEmbedUrl(parsedUrl),
        };
      }

      if (provider === "matterport") {
        return {
          provider,
          label: "Matterport",
          kind: "embed",
          sourceUrl: parsedUrl.toString(),
        };
      }

      if (provider === "three-d-vista") {
        return {
          provider,
          label: "3DVista",
          kind: "embed",
          sourceUrl: parsedUrl.toString(),
        };
      }

      return {
        provider,
        label: "External tour",
        kind: "link",
        sourceUrl: parsedUrl.toString(),
      };
    }

    if (propertyId) {
      return {
        provider: "local-panorama",
        label: "Generated panorama",
        kind: "image",
        sourceUrl: `/api/properties/${propertyId}/images/virtual-tour/panorama`,
      };
    }
  }

  return null;
}

export default function VirtualTourViewer({
  url,
  propertyId,
}: VirtualTourViewerProps) {
  const t = useTranslation();

  const viewConfig = useMemo(
    () => buildViewConfig(url, propertyId),
    [url, propertyId],
  );

  if (!viewConfig) {
    return null;
  }

  return (
    <section className="property-virtual-tour">
      <div className="property-virtual-tour-header">
        <div>
          <h3>{t.propertyDetail.virtualTour.title}</h3>
          <p>{t.propertyDetail.virtualTour.subtitle}</p>
        </div>
        <span className="property-virtual-tour-badge">{viewConfig.label}</span>
      </div>

      <div className="property-virtual-tour-card">
        {viewConfig.kind === "embed" ? (
          <iframe
            src={viewConfig.sourceUrl}
            title={t.propertyDetail.virtualTour.iframeTitle}
            className="property-virtual-tour-frame"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-scripts allow-same-origin"
            allow="fullscreen; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : viewConfig.kind === "image" ? (
          <div className="property-virtual-tour-image-wrap">
            <Sphere360Viewer
              src={viewConfig.sourceUrl}
              altText={t.propertyDetail.virtualTour.iframeTitle}
              height="400px"
            />
          </div>
        ) : (
          <div className="property-virtual-tour-fallback">
            <div>
              <p>{t.propertyDetail.virtualTour.fallback}</p>
              <a
                href={viewConfig.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="property-virtual-tour-link"
              >
                {t.propertyDetail.virtualTour.openInNewTab}
              </a>
            </div>
          </div>
        )}
      </div>

      {viewConfig.kind !== "image" && (
        <div className="property-virtual-tour-actions">
          <a
            href={viewConfig.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="property-virtual-tour-link"
          >
            {t.propertyDetail.virtualTour.openInNewTab}
          </a>
        </div>
      )}
    </section>
  );
}
