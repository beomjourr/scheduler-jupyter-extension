from setuptools import setup
import os

# 실제 static 파일들을 찾습니다
static_files = []
static_dir = "scheduler_jupyter_extension/labextension/static"
if os.path.exists(static_dir):
    static_files = [
        os.path.join("static", f)
        for f in os.listdir(static_dir)
        if os.path.isfile(os.path.join(static_dir, f))
    ]

setup(
    name="scheduler-jupyter-extension",
    version="0.1.0",
    packages=["scheduler_jupyter_extension"],
    install_requires=[
        "jupyterlab>=4.0.0,<5.0.0",
    ],
    data_files=[
        ("share/jupyter/labextensions/scheduler-jupyter-extension", [
            "install.json",
            "scheduler_jupyter_extension/labextension/package.json",
        ]),
        ("share/jupyter/labextensions/scheduler-jupyter-extension/static", [
            os.path.join("scheduler_jupyter_extension/labextension/static", f)
            for f in static_files
        ]),
    ],
    zip_safe=False,
)