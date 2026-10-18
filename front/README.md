# Board Project Frontend

React 기반 게시판 웹 애플리케이션입니다.

## 기술 스택

- React 19, Vite 8
- React Router, Axios
- Oxlint

## 실행

Node.js와 npm을 설치하고 아래 명령을 실행합니다.

```bash
cd front
npm ci
npm run dev
```

Vite가 출력하는 로컬 주소로 접속합니다. 개발 서버의 `/api` 요청은 `http://localhost:8080`으로 전달되므로 백엔드가 먼저 실행 중이어야 합니다.

## 확인 명령

```bash
npm run lint
npm run build
npm run preview
```

`npm run preview`는 빌드 결과를 로컬에서 확인할 때 사용합니다.
