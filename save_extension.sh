docker run --rm -it \
  -u root \
  -v "$PWD":/workspace \
  -v "$PWD/output":/output \
  -w /workspace \
  jupyter/base-notebook:latest \
  bash -c "pip install --no-cache-dir --upgrade jupyterlab && \
           jlpm install && \
           jlpm build && \
           jupyter labextension build . && \
           jlpm pack && \
           cp -r scheduler_jupyter_extension/labextension /output/ && \
           tar -czvf /output/scheduler_jupyter_extension-labextension.tar.gz -C /output labextension"
