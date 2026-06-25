# Makefile for portal-engine-frontend
# Usage: make [target] TAG=version

APP_NAME := portal-engine-frontend
VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || sed 's/^v//' release 2>/dev/null || echo unknown)
IMAGES_DIR := images
DOCKERFILE := manifest/Dockerfile

REGISTRY ?=
IMAGE_REPO ?= $(if $(strip $(REGISTRY)),$(REGISTRY)/$(APP_NAME),$(APP_NAME))
PLATFORMS ?= linux/amd64,linux/arm64
PLATFORM ?= linux/amd64
BUILDER ?= codex-builder
NPM_REGISTRY ?= https://repo.huaweicloud.com/repository/npm/
HTTP_PROXY ?= http://192.168.16.5:7777
HTTPS_PROXY ?= http://192.168.16.5:7777
NO_PROXY ?= 127.0.0.1,localhost,192.168.0.0/16
MULTI_PUSH ?= false
MULTI_OUTPUT_DIR ?= $(IMAGES_DIR)
NO_CACHE ?= false
NO_CACHE_FLAG := $(if $(filter true,$(NO_CACHE)),--no-cache,)

TAG ?= $(VERSION)
IMAGE_FULL := $(IMAGE_REPO):$(TAG)

CONTAINER_NAME ?= $(APP_NAME)
PORT ?= 8080
APISIX_HOST ?=
APISIX_SITE_PORT ?= 29081
API_PATH ?= /canglan-trial/api/
MINIO_API_URL ?=
MINIO_API_PATH ?= /nanobot/api
FRONTEND_APP_NAME ?=

SUPPORTED_PLATFORMS := linux/amd64 linux/arm64 linux/386 linux/arm/v7 linux/ppc64le linux/s390x

RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m

.PHONY: help install package build docker-build build-no-cache buildx-prepare build-multi buildx-load save load run docker-run stop docker-stop logs clean images-clean info

help: ## Show help
	@printf "$(BLUE)portal-engine-frontend Makefile$(NC)\n\n"
	@printf "$(GREEN)Defaults:$(NC)\n"
	@printf "  APP_NAME=$(APP_NAME)  VERSION=$(VERSION)  DOCKERFILE=$(DOCKERFILE)\n"
	@printf "  IMAGE_FULL=$(IMAGE_FULL)\n"
	@printf "  PLATFORMS=$(PLATFORMS)  PLATFORM=$(PLATFORM)  BUILDER=$(BUILDER)\n"
	@printf "  NPM_REGISTRY=$(NPM_REGISTRY)\n"
	@printf "  HTTP_PROXY=$(HTTP_PROXY)\n"
	@printf "  MULTI_PUSH=$(MULTI_PUSH)  MULTI_OUTPUT_DIR=$(MULTI_OUTPUT_DIR)  NO_CACHE=$(NO_CACHE)\n\n"
	@printf "$(GREEN)Runtime defaults:$(NC)\n"
	@printf "  PORT=$(PORT)  APISIX_SITE_PORT=$(APISIX_SITE_PORT)  API_PATH=$(API_PATH)\n"
	@printf "  MINIO_API_PATH=$(MINIO_API_PATH)\n\n"
	@printf "$(GREEN)Targets:$(NC)\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n$(GREEN)Examples:$(NC)\n"
	@printf "  make install\n"
	@printf "  make package\n"
	@printf "  make build TAG=1.0.1\n"
	@printf "  make buildx-load TAG=1.0.1 PLATFORM=linux/amd64\n"
	@printf "  make build-multi TAG=1.0.1\n"
	@printf "  make build-multi TAG=1.0.1 MULTI_PUSH=true REGISTRY=192.168.7.52:8083/public\n"
	@printf "  make run APISIX_HOST=192.168.7.52\n"

install: ## Install frontend dependencies
	HTTP_PROXY=$(HTTP_PROXY) HTTPS_PROXY=$(HTTPS_PROXY) NO_PROXY=$(NO_PROXY) \
		npm install --registry=$(NPM_REGISTRY)

package: ## Build frontend dist files
	npm run build:release

build: ## Build Docker image for current Docker platform
	@printf "$(YELLOW)Building Docker image...$(NC)\n"
	@printf "$(BLUE)Image: $(IMAGE_FULL)$(NC)\n"
	docker build \
		$(NO_CACHE_FLAG) \
		--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
		--build-arg HTTP_PROXY=$(HTTP_PROXY) \
		--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
		--build-arg NO_PROXY=$(NO_PROXY) \
		-f $(DOCKERFILE) \
		-t $(IMAGE_FULL) .
	@printf "$(GREEN)Done: $(IMAGE_FULL)$(NC)\n"

docker-build: build ## Alias of build

build-no-cache: ## Build Docker image without cache
	$(MAKE) build NO_CACHE=true

buildx-prepare: ## Prepare buildx builder
	@printf "$(YELLOW)Preparing buildx builder...$(NC)\n"
	@if ! docker buildx inspect $(BUILDER) >/dev/null 2>&1; then \
		docker buildx create --name $(BUILDER) --use; \
	else \
		docker buildx use $(BUILDER); \
	fi
	@docker buildx inspect --bootstrap >/dev/null
	@printf "$(GREEN)Builder ready: $(BUILDER)$(NC)\n"

build-multi: buildx-prepare ## Build multi-platform image; MULTI_PUSH=true pushes, otherwise exports tar.gz files
	@printf "$(YELLOW)Building multi-platform Docker image...$(NC)\n"
	@printf "$(BLUE)Image: $(IMAGE_FULL)$(NC)\n"
	@printf "$(BLUE)Platforms: $(PLATFORMS)$(NC)\n"
	@printf "$(BLUE)Push: $(MULTI_PUSH)$(NC)\n"
	@if [ -z "$(strip $(PLATFORMS))" ]; then \
		printf "$(RED)PLATFORMS cannot be empty$(NC)\n"; \
		exit 1; \
	fi
	@for p in $$(printf "%s" "$(PLATFORMS)" | tr ',' ' '); do \
		case $$p in \
			linux/amd64|linux/arm64|linux/386|linux/arm/v7|linux/ppc64le|linux/s390x) ;; \
			*) printf "$(RED)Unsupported platform: $$p. Supported: $(SUPPORTED_PLATFORMS)$(NC)\n"; exit 1 ;; \
		esac; \
	done
	@if [ "$(MULTI_PUSH)" = "true" ]; then \
		docker buildx build \
			--builder $(BUILDER) \
			--platform $(PLATFORMS) \
			$(NO_CACHE_FLAG) \
			--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
			--build-arg HTTP_PROXY=$(HTTP_PROXY) \
			--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
			--build-arg NO_PROXY=$(NO_PROXY) \
			-f $(DOCKERFILE) \
			-t $(IMAGE_FULL) \
			--push . && \
		printf "$(GREEN)Pushed multi-platform image: $(IMAGE_FULL)$(NC)\n"; \
	else \
		mkdir -p $(MULTI_OUTPUT_DIR); \
		set -e; \
		for platform in $$(printf '%s' "$(PLATFORMS)" | tr ',' ' '); do \
			platform_file=$$(printf '%s' "$$platform" | tr '/' '-'); \
			output_file="$(MULTI_OUTPUT_DIR)/$(APP_NAME)-$(TAG)-$${platform_file}.tar.gz"; \
			tmp_file="$${output_file%.gz}"; \
			printf "$(YELLOW)Exporting platform image: $$platform$(NC)\n"; \
			docker buildx build \
				--builder $(BUILDER) \
				--platform $$platform \
				$(NO_CACHE_FLAG) \
				--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
				--build-arg HTTP_PROXY=$(HTTP_PROXY) \
				--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
				--build-arg NO_PROXY=$(NO_PROXY) \
				-f $(DOCKERFILE) \
				-t $(IMAGE_FULL) \
				--output type=docker,dest=$$tmp_file .; \
			gzip -f $$tmp_file; \
			printf "$(GREEN)Exported: $$output_file$(NC)\n"; \
		done; \
		printf "$(GREEN)Multi-platform tar.gz files exported to: $(MULTI_OUTPUT_DIR)$(NC)\n"; \
	fi

buildx-load: buildx-prepare ## Build a single platform image with buildx and load it locally
	@printf "$(YELLOW)Building and loading single platform image...$(NC)\n"
	@printf "$(BLUE)Image: $(IMAGE_FULL)$(NC)\n"
	@printf "$(BLUE)Platform: $(PLATFORM)$(NC)\n"
	docker buildx build \
		--builder $(BUILDER) \
		--platform $(PLATFORM) \
		$(NO_CACHE_FLAG) \
		--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
		--build-arg HTTP_PROXY=$(HTTP_PROXY) \
		--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
		--build-arg NO_PROXY=$(NO_PROXY) \
		-f $(DOCKERFILE) \
		-t $(IMAGE_FULL) \
		--load .
	@printf "$(GREEN)Loaded image: $(IMAGE_FULL)$(NC)\n"

save: ## Save Docker image to images directory as tar.gz
	@mkdir -p $(IMAGES_DIR)
	@if ! docker image inspect $(IMAGE_FULL) >/dev/null 2>&1; then \
		printf "$(RED)Image not found: $(IMAGE_FULL). Run make build TAG=$(TAG) first.$(NC)\n"; \
		exit 1; \
	fi
	docker save $(IMAGE_FULL) | gzip -c > $(IMAGES_DIR)/$(APP_NAME)-$(TAG).tar.gz
	@ls -lh $(IMAGES_DIR)/$(APP_NAME)-$(TAG).tar.gz

load: ## Load Docker image from images directory tar.gz
	@if [ ! -f "$(IMAGES_DIR)/$(APP_NAME)-$(TAG).tar.gz" ]; then \
		printf "$(RED)Image tar.gz not found: $(IMAGES_DIR)/$(APP_NAME)-$(TAG).tar.gz$(NC)\n"; \
		exit 1; \
	fi
	gzip -dc $(IMAGES_DIR)/$(APP_NAME)-$(TAG).tar.gz | docker load

run: ## Run Docker container
	@if [ -z "$(APISIX_HOST)" ]; then \
		printf "$(RED)APISIX_HOST is required, for example: make run APISIX_HOST=192.168.7.52$(NC)\n"; \
		exit 1; \
	fi
	docker run --rm -d --name $(CONTAINER_NAME) -p $(PORT):80 \
		-e APISIX_HOST=$(APISIX_HOST) \
		-e APISIX_SITE_PORT=$(APISIX_SITE_PORT) \
		-e API_PATH=$(API_PATH) \
		-e MINIO_API_URL=$(MINIO_API_URL) \
		-e MINIO_API_PATH=$(MINIO_API_PATH) \
		-e APP_NAME=$(FRONTEND_APP_NAME) \
		-e VERSION=$(TAG) \
		$(IMAGE_FULL)

docker-run: run ## Alias of run

stop: ## Stop Docker container
	-docker stop $(CONTAINER_NAME)

docker-stop: stop ## Alias of stop

logs: ## Tail Docker container logs
	docker logs -f $(CONTAINER_NAME)

clean: ## Clean frontend dist files
	rm -rf dist dist-runtime

images-clean: ## Clean exported image tar/tar.gz files
	rm -rf $(IMAGES_DIR)/*.tar $(IMAGES_DIR)/*.tar.gz

info: ## Show current build config
	@printf "$(BLUE)portal-engine-frontend build config$(NC)\n"
	@printf "APP_NAME:          $(APP_NAME)\n"
	@printf "VERSION:           $(VERSION)\n"
	@printf "TAG:               $(TAG)\n"
	@printf "IMAGE_REPO:        $(IMAGE_REPO)\n"
	@printf "IMAGE_FULL:        $(IMAGE_FULL)\n"
	@printf "PLATFORMS:         $(PLATFORMS)\n"
	@printf "PLATFORM:          $(PLATFORM)\n"
	@printf "BUILDER:           $(BUILDER)\n"
	@printf "NPM_REGISTRY:      $(NPM_REGISTRY)\n"
	@printf "APISIX_HOST:       $(APISIX_HOST)\n"
	@printf "APISIX_SITE_PORT:  $(APISIX_SITE_PORT)\n"
	@printf "API_PATH:          $(API_PATH)\n"
	@printf "MINIO_API_URL:     $(MINIO_API_URL)\n"
	@printf "MINIO_API_PATH:    $(MINIO_API_PATH)\n"
	@printf "HTTP_PROXY:        $(HTTP_PROXY)\n"
	@printf "HTTPS_PROXY:       $(HTTPS_PROXY)\n"
	@printf "NO_PROXY:          $(NO_PROXY)\n"
	@printf "MULTI_PUSH:        $(MULTI_PUSH)\n"
	@printf "MULTI_OUTPUT_DIR:  $(MULTI_OUTPUT_DIR)\n"
	@printf "NO_CACHE:          $(NO_CACHE)\n"
	@printf "DOCKERFILE:        $(DOCKERFILE)\n"

.DEFAULT_GOAL := help
