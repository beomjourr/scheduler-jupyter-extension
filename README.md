# Scheduler Jupyter Extension

JupyterLab의 노트북 실행을 스케줄링하고 관리하기 위한 확장 프로그램입니다.

## 요구사항

* JupyterLab >= 4.0.0,<5.0.0
* Python >= 3.8
* Node.js 16.x 또는 18.x (권장)
  * Node.js 20.x는 호환성 문제가 발생할 수 있음

Node.js 버전 확인:
```bash
node --version
```

Node.js 버전 변경이 필요한 경우 nvm(Node Version Manager) 사용 권장:
```bash
# nvm으로 Node.js 16 설치 및 사용
nvm install 16
nvm use 16

# 또는 Node.js 18 설치 및 사용
nvm install 18
nvm use 18
```

## 설치 방법

```bash
pip install scheduler-jupyter-extension
```

## 개발 환경 설정

### 1. 초기 설정

```bash
# 저장소 복제
git clone <저장소-URL>
cd scheduler-jupyter-extension

# 1. Python 패키지 및 의존성 설치 
pip install -e .

# 2. Node.js 의존성 설치 (node_modules 폴더에 설치됨)
jlpm install
```

### 2. 개발 중 빌드 및 적용

개발하면서 변경사항을 확인하기 위해 다음 순서로 명령어를 실행합니다:

```bash
# 1. 확장 프로그램 빌드
jlpm build

# 2. JupyterLab 빌드
jupyter lab build

# 3. JupyterLab 실행
jupyter lab
```


## 배포 방법

### 1. 배포용 빌드
```bash
# 이전 빌드 파일 정리
jlpm clean:all

# Python 배포 패키지 생성
python -m build
```

### 2. 설치 테스트
```bash
# 새로운 가상환경에서 테스트
python -m venv test_env
source test_env/bin/activate  # Windows: test_env\Scripts\activate
pip install scheduler-jupyter-extension
jupyter lab
```
