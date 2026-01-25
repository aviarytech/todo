#!/usr/bin/env bash
#
# Injects environment variables from .env.local into Convex deployment
#
# Usage:
#   ./scripts/inject-convex-env.sh              # dev deployment (default)
#   ./scripts/inject-convex-env.sh --prod       # production deployment
#   ./scripts/inject-convex-env.sh --preview-name my-preview
#
# Environment file precedence:
#   1. .env.local (if exists)
#   2. .env (if exists)
#
# Required in env file:
#   CONVEX_DEPLOYMENT (or run `npx convex dev` first)
#
# Variables injected to Convex:
#   TURNKEY_API_PUBLIC_KEY
#   TURNKEY_API_PRIVATE_KEY
#   TURNKEY_ORGANIZATION_ID
#   JWT_SECRET

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse flags to pass to convex
CONVEX_FLAGS=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            CONVEX_FLAGS="--prod"
            shift
            ;;
        --preview-name)
            CONVEX_FLAGS="--preview-name $2"
            shift 2
            ;;
        --deployment-name)
            CONVEX_FLAGS="--deployment-name $2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Injects environment variables from .env.local into Convex deployment"
            echo ""
            echo "Options:"
            echo "  --prod              Target production deployment"
            echo "  --preview-name NAME Target preview deployment"
            echo "  --deployment-name N Target specific deployment by name"
            echo "  -h, --help          Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Find env file
ENV_FILE=""
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env.local"
elif [[ -f "$PROJECT_ROOT/.env" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -z "$ENV_FILE" ]]; then
    echo -e "${RED}Error: No .env.local or .env file found in project root${NC}"
    echo ""
    echo "Create one with the following variables:"
    echo "  CONVEX_DEPLOYMENT=dev:your-project-name"
    echo "  TURNKEY_API_PUBLIC_KEY=..."
    echo "  TURNKEY_API_PRIVATE_KEY=..."
    echo "  TURNKEY_ORGANIZATION_ID=..."
    echo "  JWT_SECRET=..."
    exit 1
fi

# Function to get value from env file
get_env_value() {
    local var_name="$1"
    local value=""
    
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        
        # Match the specific variable
        if [[ "$line" =~ ^${var_name}=(.*)$ ]]; then
            value="${BASH_REMATCH[1]}"
            # Remove surrounding quotes if present
            value="${value#\"}"
            value="${value%\"}"
            value="${value#\'}"
            value="${value%\'}"
            echo "$value"
            return 0
        fi
    done < "$ENV_FILE"
    
    return 1
}

# Check for CONVEX_DEPLOYMENT
CONVEX_DEPLOYMENT=$(get_env_value "CONVEX_DEPLOYMENT" 2>/dev/null || echo "")

if [[ -z "$CONVEX_DEPLOYMENT" && -z "$CONVEX_FLAGS" ]]; then
    echo -e "${RED}Error: CONVEX_DEPLOYMENT not found in $ENV_FILE${NC}"
    echo ""
    echo "Either:"
    echo "  1. Uncomment/add CONVEX_DEPLOYMENT in .env.local"
    echo "  2. Run 'npx convex dev' first (which creates the deployment)"
    echo "  3. Use --prod or --deployment-name flag"
    echo ""
    echo "Your .env.local has this line commented out:"
    grep -n "CONVEX_DEPLOYMENT" "$ENV_FILE" 2>/dev/null || echo "  (not found)"
    echo ""
    echo "Uncomment it or run: npx convex dev"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Convex Environment Variable Injector${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Source: ${GREEN}$ENV_FILE${NC}"
if [[ -n "$CONVEX_FLAGS" ]]; then
    echo -e "  Target: ${YELLOW}$CONVEX_FLAGS${NC}"
elif [[ -n "$CONVEX_DEPLOYMENT" ]]; then
    echo -e "  Target: ${YELLOW}$CONVEX_DEPLOYMENT${NC}"
fi
echo ""

# Variables to inject (Convex server-side only)
CONVEX_VARS="TURNKEY_API_PUBLIC_KEY TURNKEY_API_PRIVATE_KEY TURNKEY_ORGANIZATION_ID JWT_SECRET"

# Check for required variables
MISSING=""
for var in $CONVEX_VARS; do
    if ! get_env_value "$var" >/dev/null 2>&1; then
        MISSING="$MISSING $var"
    fi
done

if [[ -n "$MISSING" ]]; then
    echo -e "${YELLOW}Warning: Missing variables in $ENV_FILE:${NC}"
    for var in $MISSING; do
        echo -e "  - $var"
    done
    echo ""
    read -p "Continue with available variables? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Inject variables
cd "$PROJECT_ROOT"
SUCCESS=0
FAILED=0

for var in $CONVEX_VARS; do
    value=$(get_env_value "$var" 2>/dev/null || echo "")
    
    if [[ -z "$value" ]]; then
        echo -e "  ${YELLOW}⏭${NC}  $var (not set, skipping)"
        continue
    fi
    
    echo -ne "  ${BLUE}⏳${NC}  $var... "
    
    # Use npx convex env set - capture error output
    # shellcheck disable=SC2086
    if output=$(npx convex env set $CONVEX_FLAGS "$var" "$value" 2>&1); then
        echo -e "\r  ${GREEN}✓${NC}  $var"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "\r  ${RED}✗${NC}  $var"
        echo -e "      ${RED}$output${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ $FAILED -eq 0 && $SUCCESS -gt 0 ]]; then
    echo -e "  ${GREEN}✓ Done!${NC} $SUCCESS variable(s) injected successfully"
elif [[ $SUCCESS -gt 0 ]]; then
    echo -e "  ${YELLOW}⚠${NC} $SUCCESS succeeded, $FAILED failed"
else
    echo -e "  ${RED}✗${NC} All $FAILED variable(s) failed"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show current Convex env vars for verification
if [[ $SUCCESS -gt 0 ]]; then
    echo -e "Current Convex environment variables:"
    echo ""
    # shellcheck disable=SC2086
    npx convex env list $CONVEX_FLAGS 2>&1 || true
    echo ""
fi
