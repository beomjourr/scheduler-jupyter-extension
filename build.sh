#!/bin/bash

# Check if tag argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Tag argument is required"
    echo "Usage: $0 <tag>"
    exit 1
fi

TAG=$1

# Build Docker image with --no-cache option
docker build --no-cache -t "sd-jupyter-extension:${TAG}" .

# Save Docker image to tar file
docker save -o "sd-jupyter-extension-${TAG}.tar" "sd-jupyter-extension:${TAG}"

# Set read-only permissions
chmod 444 "sd-jupyter-extension-${TAG}.tar"