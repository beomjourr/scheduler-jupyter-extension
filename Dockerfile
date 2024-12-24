FROM kubeflownotebookswg/jupyter:latest

USER root
#RUN apt-get update && apt-get install -y git nodejs npm && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/my_extension
COPY . .

# Install dependencies and build the extension
RUN jlpm install \
    && jlpm build

RUN pip install -e . \
    && jupyter labextension install . \
    && jupyter lab build

WORKDIR /
USER $NB_UID
