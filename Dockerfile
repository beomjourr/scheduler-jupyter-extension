FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20 \
    JUPYTERLAB_VERSION=4

# Update and install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - \
    && apt-get install -y nodejs \
    && node -v \
    && npm -v

# Install Yarn
RUN npm install -g yarn && yarn -v

# Install JupyterLab
RUN pip3 install --no-cache-dir jupyterlab==$JUPYTERLAB_VERSION

# 현재 디렉토리의 모든 파일을 컨테이너로 복사
COPY . /tmp/my_extension

# 의존성 설치 및 빌드
RUN cd /tmp/my_extension \
    && rm -f package-lock.json \
    && yarn install \
    && jlpm run build

# 확장을 JupyterLab에 설치
RUN jupyter labextension install /tmp/my_extension

# Jupyter Lab Extension 설치 및 빌드
RUN jupyter labextension install /tmp/jupyter-scheduler-extension && \
    jupyter lab build

# Set up a working directory
WORKDIR /workspace

# Expose the JupyterLab default port
EXPOSE 8888

# Start JupyterLab
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--no-browser", "--allow-root"]

