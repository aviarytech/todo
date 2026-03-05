const ESCALATION_REQUIRED_SEVERITIES = new Set(["high", "critical"]);

function normalizeSeverity(value) {
  return String(value ?? "").trim().toLowerCase();
}

function routeSchemes(routeList) {
  return new Set((routeList ?? [])
    .map((route) => String(route ?? "").trim())
    .filter(Boolean)
    .map((route) => route.split("://")[0]));
}

export function validateEscalationChannelCoverage(routingConfig) {
  const alerts = Array.isArray(routingConfig?.alerts) ? routingConfig.alerts : [];
  const errors = [];

  for (const alert of alerts) {
    const severity = normalizeSeverity(alert?.severity);
    if (!ESCALATION_REQUIRED_SEVERITIES.has(severity)) continue;

    const productionRoutes = alert?.route?.production;
    if (!Array.isArray(productionRoutes) || productionRoutes.length === 0) {
      errors.push(`Alert ${alert?.name ?? "<unnamed>"} missing production routes`);
      continue;
    }

    const schemes = routeSchemes(productionRoutes);
    if (!schemes.has("slack")) {
      errors.push(`Alert ${alert?.name ?? "<unnamed>"} (${severity}) missing Slack production route`);
    }
    if (!schemes.has("pagerduty")) {
      errors.push(`Alert ${alert?.name ?? "<unnamed>"} (${severity}) missing PagerDuty production route`);
    }
  }

  return errors;
}
