# Base 이미지 사용
#FROM xiilab/sd-jupyter-extension:jupyter-base
FROM jupyter/datascience-notebook:python-3.11.6

# 현재 디렉토리의 모든 파일을 컨테이너로 복사
COPY . /tmp/jupyter-scheduler-extension

# Jupyter Lab Extension 설치 및 빌드
RUN jupyter labextension install /tmp/jupyter-scheduler-extension && \
    jupyter lab build

#RUN rm -rf /tmp/jupyter-scheduler-extension 
