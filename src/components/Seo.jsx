import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "SFMS — Self Finance Management System";
const DEFAULT_DESCRIPTION =
  "SFMS is a self finance management system that ties your income, expenses, loans, budgets, and savings goals to one ledger — every transaction automatically updates balances, loan status, budget usage, and goal progress.";
// Replace with the real production origin when deploying — used to build
// absolute canonical/OG urls. Falls back to the current origin at runtime
// for local/staging environments so links are still correct there.
const SITE_URL = "https://sfms.app";

function absoluteUrl(path = "/") {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : SITE_URL;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Drop this once near the top of any route component to control that
 * page's <title>, meta description, canonical URL, and social preview
 * tags. Defaults are safe for the public marketing pages; authenticated
 * app pages should pass noindex (AppLayout already does this globally,
 * see components/layout/AppLayout.jsx) since their content requires login
 * and is unique per user — there's nothing there for a crawler to index.
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = typeof window !== "undefined" ? window.location.pathname : "/",
  noindex = false,
  jsonLd = null,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonical = absoluteUrl(path);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
