const SEVERITY_TO_REQUIRED_SCHEMES = {
  low: ["slack"],
  medium: ["slack"],
  high: ["slack", "pagerduty"],
  critical: ["slack", "pagerduty"],
};

export function normalizeSeverity(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function requiredSchemesForSeverity(severity) {
  const normalized = normalizeSeverity(severity);
  return SEVERITY_TO_REQUIRED_SCHEMES[normalized] ?? [];
}

export function routeSchemes(routeList) {
  return [...new Set((routeList ?? [])
    .map((route) => String(route).trim())
    .filter(Boolean)
    .map((route) => route.split("://")[0]))].sort();
}

export function validateSeverityRoutePolicy({ name, severity, productionRoutes }) {
  const requiredSchemes = requiredSchemesForSeverity(severity);
  if (requiredSchemes.length === 0) {
    return [`Alert ${name} has unsupported severity: ${severity}`];
  }

  const present = new Set(routeSchemes(productionRoutes));
  const missing = requiredSchemes.filter((scheme) => !present.has(scheme));

  if (missing.length > 0) {
    return [
      `Alert ${name} (${normalizeSeverity(severity)}) missing production route scheme(s): ${missing.join(", ")}`,
    ];
  }

  return [];
}
