FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20 \
    JUPYTERLAB_VERSION=4

# Update and install necessary packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js and Yarn in one step to minimize layers
RUN curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && node -v \
    && yarn -v

# Install JupyterLab
RUN pip3 install --no-cache-dir jupyterlab==$JUPYTERLAB_VERSION

# Copy project files to container
WORKDIR /tmp/my_extension
COPY . .

# Install dependencies and build the extension
RUN jlpm install \
    && jlpm build \
    && jupyter labextension install . \
    && jupyter lab build

# Set up a working directory
WORKDIR /workspace

# Expose the JupyterLab default port
EXPOSE 8888

# Start JupyterLab
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--no-browser", "--allow-root"]

