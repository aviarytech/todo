#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.local}"
TARGET="${2:-dev}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC2046
export $(grep -v '^#' "$ENV_FILE" | grep -E '^(VITE_)?(TURNKEY_API_PUBLIC_KEY|TURNKEY_API_PRIVATE_KEY|TURNKEY_ORGANIZATION_ID|JWT_SECRET|WEBVH_DOMAIN)=' | xargs)

required_vars=(
  TURNKEY_API_PUBLIC_KEY
  TURNKEY_API_PRIVATE_KEY
  TURNKEY_ORGANIZATION_ID
  JWT_SECRET
  WEBVH_DOMAIN
)

for key in "${required_vars[@]}"; do
  vite_key="VITE_${key}"
  if [[ -n "${!key:-}" ]]; then
    continue
  fi
  if [[ -n "${!vite_key:-}" ]]; then
    export "$key=${!vite_key}"
    continue
  fi
  if [[ -z "${!key:-}" ]]; then
    echo "Error: missing required env var in $ENV_FILE: $key (or $vite_key)" >&2
    exit 1
  fi
done

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Error: target must be 'dev' or 'prod', got: $TARGET" >&2
  exit 1
fi

for key in "${required_vars[@]}"; do
  convex_key="${key#VITE_}"
  if [[ "$TARGET" == "prod" ]]; then
    npx convex env set --prod "$convex_key" "${!key}"
  else
    npx convex env set "$convex_key" "${!key}"
  fi
done

echo "Done: synced Turnkey env vars to Convex ($TARGET)"
