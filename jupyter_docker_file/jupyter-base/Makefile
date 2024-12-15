#
# This Makefile is templated, the following targets are provided:
#  - Current Architecture:
#     - docker-build:     build the docker image
#     - docker-build-dep: build the docker image (and any base images)
#     - docker-push:      push the docker image
#     - docker-push-dep:  push the docker image (and any base images)
#  - Multi-Architecture:
#     - docker-build-multi-arch:          build the docker image
#     - docker-build-multi-arch-dep:      build the docker image (and any base images)
#     - docker-build-push-multi-arch:     build AND push the docker image
#     - docker-build-push-multi-arch-dep: build AND push the docker image (and any base images)
#

# Docker registry and image settings
registry ?= docker.io/kubeflownotebookswg
tag      ?= 0.0.9
image_name := base

# Docker base image
base_image := ubuntu:22.04

# Cache settings for Docker build
cache_image ?= ghcr.io/kubeflow/kubeflow/notebook-servers/build-cache
cache_tag   ?= $(image_name)

# Platform settings
arch ?= linux/amd64

# Targets
.PHONY: docker-build docker-push docker-build-multi-arch

docker-build:
	@echo "Building Docker image $(registry)/$(image_name):$(tag)"
	docker build \
		--build-arg BASE_IMG=$(base_image) \
		--tag $(registry)/$(image_name):$(tag) .

docker-push:
	@echo "Pushing Docker image $(registry)/$(image_name):$(tag)"
	docker push $(registry)/$(image_name):$(tag)

docker-build-multi-arch:
	@echo "Building multi-architecture Docker image $(registry)/$(image_name):$(tag)"
	docker buildx build \
		--platform $(arch) \
		--build-arg BASE_IMAGE=$(base_image) \
		--tag $(registry)/$(image_name):$(tag) \
		--push .
