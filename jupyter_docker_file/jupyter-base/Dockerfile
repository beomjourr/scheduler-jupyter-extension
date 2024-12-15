#
# NOTE: Use the Makefiles to build this image correctly.
#

ARG BASE_IMG=<base>
FROM $BASE_IMG

ARG TARGETARCH

USER root

# args - software versions
# ARG JUPYTERLAB_VERSION=3.6.6
ARG JUPYTERLAB_VERSION=4.1.6
ARG JUPYTER_VERSION=6.5.6
#ARG JUPYTER_VERSION=7.1.2
ARG MINIFORGE_VERSION=23.3.1-1
#ARG MINIFORGE_VERSION=24.3.0-0
ARG NODE_MAJOR_VERSION=18
ARG PIP_VERSION=23.2.1
#ARG PIP_VERSION=24.0
#ARG PYTHON_VERSION=3.11.6
ARG PYTHON_VERSION=3.10.12

# install -- node.js
RUN export DEBIAN_FRONTEND=noninteractive \
   && curl -sL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | apt-key add - \
   && echo "deb https://deb.nodesource.com/node_${NODE_MAJOR_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
   && apt-get -yq update \
   && apt-get -yq install --no-install-recommends \
   nodejs \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

# setup environment for conda
ENV CONDA_DIR /opt/conda
ENV PATH "${CONDA_DIR}/bin:${PATH}"
RUN mkdir -p ${CONDA_DIR} \
   && echo ". /opt/conda/etc/profile.d/conda.sh" >> ${HOME}/.bashrc \
   && echo ". /opt/conda/etc/profile.d/conda.sh" >> /etc/profile \
   && echo "conda activate base" >> ${HOME}/.bashrc \
   && echo "conda activate base" >> /etc/profile \
   && chown -R ${NB_USER}:${NB_GROUP} ${CONDA_DIR} \
   && chown -R ${NB_USER}:${NB_GROUP} ${HOME}

# switch to NB_UID for installs
USER $NB_UID

# install - conda, pip, python, jupyter
RUN case "${TARGETARCH}" in \
   amd64) MINIFORGE_ARCH="x86_64" ;; \
   arm64) MINIFORGE_ARCH="aarch64" ;; \
   ppc64le) MINIFORGE_ARCH="ppc64le" ;; \
   *) echo "Unsupported architecture: ${TARGETARCH}"; exit 1 ;; \
   esac \
   && curl -fsSL "https://github.com/conda-forge/miniforge/releases/download/${MINIFORGE_VERSION}/Miniforge3-${MINIFORGE_VERSION}-Linux-${MINIFORGE_ARCH}.sh" -o /tmp/Miniforge3.sh \
   && curl -fsSL "https://github.com/conda-forge/miniforge/releases/download/${MINIFORGE_VERSION}/Miniforge3-${MINIFORGE_VERSION}-Linux-${MINIFORGE_ARCH}.sh.sha256" -o /tmp/Miniforge3.sh.sha256 \
   && echo "$(cat /tmp/Miniforge3.sh.sha256 | awk '{ print $1; }')  /tmp/Miniforge3.sh" | sha256sum -c - \
   && rm /tmp/Miniforge3.sh.sha256 \
   && /bin/bash /tmp/Miniforge3.sh -b -f -p ${CONDA_DIR} \
   && rm /tmp/Miniforge3.sh \
   && conda config --system --set auto_update_conda false \
   && conda config --system --set show_channel_urls true \
   && echo "conda ==${MINIFORGE_VERSION:0:-2}" >> ${CONDA_DIR}/conda-meta/pinned \
   && echo "python ==${PYTHON_VERSION}" >> ${CONDA_DIR}/conda-meta/pinned \
   && conda install -y -q \
   python=${PYTHON_VERSION} \
   conda=${MINIFORGE_VERSION:0:-2} \
   pip=${PIP_VERSION} \
   ipykernel \
   ipympl \
   ipywidgets \
   qtconsole \
   && conda update -y -q --all \
   && conda clean -a -f -y \
   && chown -R ${NB_USER}:${NB_GROUP} ${CONDA_DIR} \
   && chown -R ${NB_USER}:${NB_GROUP} ${HOME}

# install - jupyter
RUN echo "jupyterlab ==${JUPYTERLAB_VERSION}" >> ${CONDA_DIR}/conda-meta/pinned \
   && echo "notebook ==${JUPYTER_VERSION}" >> ${CONDA_DIR}/conda-meta/pinned \
   && conda install -y -q \
   jupyterlab==${JUPYTERLAB_VERSION} \
   notebook==${JUPYTER_VERSION} \
   && conda update -y -q --all \
   && conda clean -a -f -y

# install - requirements.txt
COPY --chown=${NB_USER}:${NB_GROUP} requirements.txt /tmp
RUN python3 -m pip install -r /tmp/requirements.txt --quiet --no-cache-dir \
   && rm -f /tmp/requirements.txt \
   && jupyter lab --generate-config

RUN conda create -y --name py311 python=3.11
RUN conda install -y -q -n py311 \
   ipykernel \
   ipympl \
   ipywidgets

RUN conda create -y --name py39 python=3.9
RUN conda install -y -q -n py39 \
   ipykernel \
   ipympl \
   ipywidgets



# s6 - copy scripts
COPY --chown=${NB_USER}:${NB_GROUP} --chmod=755 s6/ /etc

# configure - jupyter
RUN jupyter labextension disable "@jupyterlab/apputils-extension:announcements"

# s6 - 01-copy-tmp-home
USER root
RUN mkdir -p /tmp_home \
   && cp -r ${HOME} /tmp_home \
   && chown -R ${NB_USER}:${NB_GROUP} /tmp_home
USER $NB_UID

# copy - pip.conf
COPY --chown=${NB_USER}:${NB_GROUP} pip.conf /etc/pip.conf
COPY --chown=${NB_USER}:${NB_GROUP} sources.list /etc/apt/sources.list

# s6 timeout interval (default=5000(5sec))
ENV S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

EXPOSE 8888
