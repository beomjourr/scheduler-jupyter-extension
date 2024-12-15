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

자동으로 변경사항을 감지하고 싶다면 다음과 같이 실행할 수 있습니다:

```bash
# 터미널 1: 소스 파일 변경 감지
jlpm watch

# 터미널 2: JupyterLab 실행
jupyter lab
```

### 3. 문제 해결

빌드 중 문제가 발생하면 다음 단계를 시도해보세요:

```bash
# 1. 이전 빌드 파일 정리
jlpm clean:all

# 2. node_modules 삭제 후 재설치
rm -rf node_modules
jlpm install

# 3. 확장 프로그램 다시 빌드
jlpm build

# 4. JupyterLab 캐시 정리 및 재빌드
jupyter lab clean
jupyter lab build

# 5. JupyterLab 실행
jupyter lab
```

## 배포 방법

### 1. 버전 업데이트
```bash
npm version patch  # 또는 minor, major
```

### 2. 배포용 빌드
```bash
# 이전 빌드 파일 정리
jlpm clean:all

# 프로덕션 빌드
jlpm build:prod

# Python 배포 패키지 생성
python -m build
```

### 3. 패키지 배포
```bash
# PyPI에 배포
python -m twine upload dist/*
```

### 4. 설치 테스트
```bash
# 새로운 가상환경에서 테스트
python -m venv test_env
source test_env/bin/activate  # Windows: test_env\Scripts\activate
pip install scheduler-jupyter-extension
jupyter lab
```

## 프로젝트 구조

```
.
├── scheduler_jupyter_extension/  # 확장 프로그램 메인 디렉토리
├── src/                         # TypeScript 소스 코드
│   └── index.ts                # 진입점
├── style/                      # CSS 파일
│   ├── base.css
│   └── index.css
├── dist/                       # 빌드된 파일
├── lib/                        # 컴파일된 JavaScript
├── node_modules/              # Node.js 의존성 패키지들
└── package.json               # Node.js 프로젝트 설정 및 의존성 정의
```

## 제거 방법

```bash
pip uninstall scheduler-jupyter-extension
```