docker build -t sd-jupyter-extension:v0.0.1-test .
docker save -o sd-jupyter-extension.tar sd-jupyter-extension:v0.0.1-test
chmod 444 sd-jupyter-extension.tar
