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
REGISTRY ?= docker.io/xiilab
TAG      ?= jupyter-base
IMAGE_NAME := sd-jupyter-extension

# Docker base image
BASE_IMAGE := xiilab/sd-jupyter-extension:base

# Cache settings for Docker build
CACHE_IMAGE ?= ghcr.io/kubeflow/kubeflow/notebook-servers/build-cache
CACHE_TAG   ?= $(image_name)

# Platform settings
ARCH ?= linux/amd64

# include build targets from common
include ../common.mk
