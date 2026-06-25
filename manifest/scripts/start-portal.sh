#!/bin/sh
set -eu

TARGET_DIR="/code/portal-web"
TARGET_FILE="${TARGET_DIR}/index.html"
TEMPLATE_FILE="/code/portal-web/index.html.template"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template file $TEMPLATE_FILE not found." >&2
  exit 1
fi

APISIX_HOST="${APISIX_HOST:-}"
if [ -z "$APISIX_HOST" ]; then
  echo "Environment variable APISIX_HOST is required." >&2
  exit 1
fi

APISIX_SITE_PORT="${APISIX_SITE_PORT:-29081}"
APISIX_BASE_PATH="${APISIX_BASE_PATH:-/portal-engine/api}"
# API_PATH="${API_PATH:-/api/}"
MINIO_API_URL="${MINIO_API_URL:-}"
MINIO_API_PATH="${MINIO_API_PATH:-/nanobot/api}"
APP_NAME="${APP_NAME:-}"
VERSION="${VERSION:-}"

APISIX_SCHEME="http"
APISIX_CLEAN_HOST="$APISIX_HOST"

case "$APISIX_CLEAN_HOST" in
  https://*)
    APISIX_SCHEME="https"
    APISIX_CLEAN_HOST="${APISIX_CLEAN_HOST#https://}"
    ;;
  http://*)
    APISIX_SCHEME="http"
    APISIX_CLEAN_HOST="${APISIX_CLEAN_HOST#http://}"
    ;;
esac

APISIX_CLEAN_HOST="${APISIX_CLEAN_HOST%/}"

case "$APISIX_CLEAN_HOST" in
  *:*)
    APISIX_FINAL_PORT="${APISIX_CLEAN_HOST##*:}"
    APISIX_CLEAN_HOST="${APISIX_CLEAN_HOST%:*}"
    ;;
  *)
    APISIX_FINAL_PORT="$APISIX_SITE_PORT"
    ;;
esac

if { [ "$APISIX_SCHEME" = "https" ] && [ "$APISIX_FINAL_PORT" = "443" ]; } || \
   { [ "$APISIX_SCHEME" = "http" ] && [ "$APISIX_FINAL_PORT" = "80" ]; }; then
  APISIX_BASE_URL="${APISIX_SCHEME}://${APISIX_CLEAN_HOST}"
else
  APISIX_BASE_URL="${APISIX_SCHEME}://${APISIX_CLEAN_HOST}:${APISIX_FINAL_PORT}"
fi

case "$APISIX_BASE_PATH" in
  "") ;;
  /*) APISIX_BASE_PATH="${APISIX_BASE_PATH%/}" ;;
  *)  APISIX_BASE_PATH="/${APISIX_BASE_PATH%/}" ;;
esac

API_BASE_URL="${APISIX_BASE_URL}${APISIX_BASE_PATH}"

# case "$API_PATH" in
#   /*) ;;
#   *)  API_PATH="/${API_PATH}" ;;
# esac

# API_BASE_URL="${APISIX_BASE_URL}${API_PATH}"

if [ -z "$MINIO_API_URL" ]; then
  case "$MINIO_API_PATH" in
    /*) ;;
    *)  MINIO_API_PATH="/${MINIO_API_PATH}" ;;
  esac

  MINIO_API_URL="${APISIX_BASE_URL}${MINIO_API_PATH}"
fi

BUILD_TIME="$(date +%s)"

echo "Generating index.html from template..."
echo "  APISIX_BASE_URL = ${APISIX_BASE_URL}"
echo "  API_BASE_URL    = ${API_BASE_URL}"
echo "  MINIO_API_URL = ${MINIO_API_URL}"
echo "  APP_NAME      = ${APP_NAME:-<not set, using frontend default>}"
echo "  VERSION       = ${VERSION:-<not set, using frontend default>}"

awk \
  -v api_base_url="$API_BASE_URL" \
  -v minio_api_url="$MINIO_API_URL" \
  -v app_name="$APP_NAME" \
  -v version="$VERSION" \
  -v build_time="$BUILD_TIME" \
  '{
    gsub("__API_BASE_URL__", api_base_url)
    gsub("__MINIO_API_URL__", minio_api_url)
    gsub("__APP_NAME__", app_name)
    gsub("__VERSION__", version)
    gsub("__BUILD_TIME__", build_time)
  }1' \
  "$TEMPLATE_FILE" > "${TARGET_FILE}.tmp"

mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

echo "index.html generated successfully."
exec nginx -g "daemon off;"
