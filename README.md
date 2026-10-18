# Board Project

React와 Spring Boot, MariaDB를 사용해 구현하는 게시판 웹 애플리케이션입니다. 회원 인증부터 게시글·댓글 관리, 첨부파일, 검색, 관리자 기능까지 하나의 저장소에서 관리하는 모노레포(Monorepo) 구조로 구성되어 있습니다.

> **프로젝트 상태:** 주요 게시판 기능과 프론트엔드 연동 코드를 포함하고 있습니다. Docker 기반 배포와 GitHub Actions CI/CD는 프로젝트 계획에 포함된 후속 작업이며, 현재 저장소 구조에 관련 실행 설정이 모두 포함되어 있지는 않습니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 아키텍처](#시스템-아키텍처)
- [저장소 구조](#저장소-구조)
- [실행 환경](#실행-환경)
- [설치 및 실행](#설치-및-실행)
- [API 개요](#api-개요)
- [데이터베이스 및 마이그레이션](#데이터베이스-및-마이그레이션)
- [테스트 및 빌드](#테스트-및-빌드)
- [관련 문서](#관련-문서)
- [보안 및 운영 시 참고 사항](#보안-및-운영-시-참고-사항)

## 프로젝트 개요

이 프로젝트의 목적은 프론트엔드와 백엔드를 REST API로 연결하고, 관계형 데이터 모델 설계부터 인증·인가, 데이터 검증, 자동화 테스트까지 웹 애플리케이션 개발의 주요 흐름을 경험하는 것입니다.

- **Frontend:** React 기반 사용자 인터페이스
- **Backend:** Spring Boot 기반 REST API 및 비즈니스 로직
- **Database:** MariaDB 관계형 데이터 저장소
- **Schema Migration:** Flyway SQL 마이그레이션
- **Repository:** DB 설계 문서, 백엔드, 프론트엔드 및 개발 문서를 한 저장소에서 관리

## 주요 기능

### 사용자 및 인증

- 회원가입 및 로그인
- JWT 기반 인증과 역할(`USER`, `ADMIN`) 구분
- 프로필 조회 및 수정
- 비밀번호 변경 및 기존 JWT 무효화
- 회원 탈퇴 시 소프트 삭제(Soft Delete) 및 계정 정보 익명화

### 게시판 및 게시글

- 게시판 및 카테고리 조회
- 관리자 전용 게시판·카테고리 관리
- 게시글 작성, 상세 조회, 수정 및 삭제
- 제목·본문 검색과 페이지네이션
- 게시글 조회수 및 좋아요 수 표시
- 게시글 삭제 시 레코드를 유지하는 소프트 삭제 방식

### 댓글 및 사용자 활동

- 댓글과 대댓글 작성·조회·수정·삭제
- 삭제된 댓글의 표시를 유지해 대댓글 연결 보존
- 게시글 좋아요 등록, 상태 조회 및 취소
- 내가 작성한 게시글·댓글 조회 및 검색
- 최근 본 게시글 등 프론트엔드 사용자 편의 기능

### 첨부파일

- 게시글 첨부파일 업로드, 목록 조회, 다운로드 및 삭제
- 업로드 파일 크기 제한: 파일당 최대 10 MiB
- 파일 메타데이터는 MariaDB에 저장하고 파일은 로컬 파일 시스템에 저장

### 관리자 기능 및 사용자 경험

- 관리자용 회원 목록 조회
- 게시판·게시글 관리 화면
- 대시보드와 통합 검색
- 반응형 UI 및 로딩·오류 등 상태 피드백

## 기술 스택

| 영역 | 기술 |
|---|---|
| 언어 / 런타임 | Java 21, JavaScript (ES Modules) |
| Backend | Spring Boot 4.1.1, Spring WebMVC, Spring Security, Spring Data JPA, Bean Validation |
| 인증 | JWT, JJWT 0.13.0 |
| 데이터베이스 | MariaDB |
| DB 마이그레이션 | Flyway |
| Backend 빌드 | Maven Wrapper |
| Frontend | React 19, React Router 7 |
| 프론트엔드 개발 서버 / 빌드 | Vite 8 |
| HTTP 통신 | Axios |
| 정적 분석 | Oxlint |
| 테스트 | Spring Boot Test 및 백엔드 단위·통합 테스트 |

## 시스템 아키텍처

```text
┌─────────────────────────────┐
│       Browser / Client      │
│       React + Vite          │
└──────────────┬──────────────┘
               │ HTTP / JSON
               │ /api 요청
               ▼
┌─────────────────────────────┐
│      Spring Boot API        │
│                             │
│ Controller → Service        │
│             → Repository    │
│ Spring Security + JWT       │
│ JPA + Flyway                │
└──────────────┬──────────────┘
               │ JDBC
               ▼
┌─────────────────────────────┐
│           MariaDB           │
│ users, boards, posts, ...   │
└─────────────────────────────┘
```

React 애플리케이션은 데이터베이스에 직접 연결하지 않습니다. 브라우저에서 API 요청을 보내면 Spring Boot가 인증·인가와 비즈니스 규칙을 처리하고 MariaDB에 데이터를 조회하거나 저장합니다.

## 저장소 구조

```text
Board_Project/
├── back/                  # Spring Boot REST API
│   ├── src/main/java/     # Controller, Service, Repository, Entity, DTO 등
│   ├── src/main/resources/
│   │   ├── db/migration/  # Flyway SQL 마이그레이션
│   │   └── application.properties
│   ├── src/test/          # 백엔드 테스트
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
├── front/                 # React + Vite 프론트엔드
│   ├── src/
│   │   ├── api/           # 백엔드 API 클라이언트
│   │   ├── components/    # 공통 UI 컴포넌트
│   │   ├── pages/         # 화면 단위 페이지
│   │   └── auth/          # 인증 상태 관리
│   ├── package.json
│   └── package-lock.json
├── db/                    # DB 요구사항, ERD, 테이블 설계, 참고 SQL
├── document/              # 기능별 개발 기록 및 API 명세
├── .gitignore
└── README.md
```

## 실행 환경

개발 환경에 다음 항목이 필요합니다.

- Java Development Kit (JDK) 21
- MariaDB 서버
- Node.js 및 npm
- Git

## 설치 및 실행

### 1. 저장소 내려받기

```bash
git clone https://github.com/YoChan1017/Board_Project.git
cd Board_Project
```

### 2. MariaDB 데이터베이스 준비

MariaDB에서 프로젝트용 데이터베이스를 생성합니다. 아래는 예시이며, 실제 DB 계정과 호스트 환경에 맞게 조정하세요.

```sql
CREATE DATABASE board_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

애플리케이션은 기본적으로 `board_db`를 사용합니다. 백엔드를 처음 실행하면 Flyway가 `back/src/main/resources/db/migration/`의 마이그레이션을 적용합니다. Hibernate는 테이블을 자동 생성하는 대신(`ddl-auto=validate`) 엔티티와 데이터베이스 스키마가 일치하는지 검증합니다.

### 3. 백엔드 실행

`DB_PASSWORD`와 `JWT_SECRET`은 필수 환경변수입니다. `JWT_SECRET`에는 충분히 긴 무작위 서명 키를 Base64로 인코딩한 값을 사용하세요. 예를 들어 OpenSSL이 설치되어 있으면 `openssl rand -base64 32`로 키를 생성할 수 있습니다.

**Windows PowerShell**

```powershell
cd back
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_NAME = "board_db"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "실제_DB_비밀번호"
$env:JWT_SECRET = "실제_Base64_JWT_서명키"
$env:JWT_EXPIRATION_MS = "3600000"

.\mvnw.cmd spring-boot:run
```

**Linux / macOS (Bash)**

```bash
cd back
export DB_HOST="localhost"
export DB_PORT="3306"
export DB_NAME="board_db"
export DB_USERNAME="root"
export DB_PASSWORD="실제_DB_비밀번호"
export JWT_SECRET="실제_Base64_JWT_서명키"
export JWT_EXPIRATION_MS="3600000"

./mvnw spring-boot:run
```

기본 백엔드 주소는 `http://localhost:8080`입니다.

#### 백엔드 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `DB_HOST` | 아니요 | `localhost` | MariaDB 호스트 |
| `DB_PORT` | 아니요 | `3306` | MariaDB 포트 |
| `DB_NAME` | 아니요 | `board_db` | 데이터베이스 이름 |
| `DB_USERNAME` | 아니요 | `root` | 데이터베이스 사용자 |
| `DB_PASSWORD` | 예 | 없음 | 데이터베이스 비밀번호 |
| `JWT_SECRET` | 예 | 없음 | Base64 형식 JWT 서명 키 |
| `JWT_EXPIRATION_MS` | 아니요 | `3600000` | JWT 유효 시간(ms), 기본 1시간 |

### 4. 프론트엔드 실행

백엔드를 실행한 상태에서 새 터미널을 열어 다음 명령을 실행합니다.

```bash
cd front
npm ci
npm run dev
```

Vite가 출력하는 로컬 주소로 접속합니다. 개발 서버의 `/api` 요청은 `http://localhost:8080`으로 전달되므로 백엔드가 먼저 실행 중이어야 합니다.

## API 개요

로컬 개발 환경의 기본 API 주소는 `http://localhost:8080`입니다. 회원가입과 로그인 외의 API는 기본적으로 JWT 인증이 필요하며, 인증 요청에는 다음 헤더를 전달합니다.

```http
Authorization: Bearer <accessToken>
```

| 영역 | 주요 엔드포인트 | 기능 |
|---|---|---|
| 인증 / 계정 | `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/password` | 회원가입, 로그인, 프로필, 비밀번호 변경, 계정 탈퇴 |
| 게시판 | `/api/boards` | 게시판 조회 및 관리자 관리 |
| 카테고리 | `/api/boards/{boardId}/categories`, `/api/categories/{categoryId}` | 카테고리 조회 및 관리자 관리 |
| 게시글 | `/api/boards/{boardId}/posts`, `/api/posts/{postId}` | 게시글 CRUD, 검색, 페이지네이션 및 조회수 |
| 댓글 | `/api/posts/{postId}/comments`, `/api/comments/{commentId}` | 댓글 및 대댓글 CRUD |
| 좋아요 | `/api/posts/{postId}/likes` | 좋아요 상태, 등록 및 취소 |
| 첨부파일 | `/api/posts/{postId}/attachments`, `/api/attachments/{attachmentId}/download` | 파일 목록, 업로드, 다운로드 및 삭제 |
| 내 활동 | `/api/me/posts`, `/api/me/comments` | 내가 작성한 게시글·댓글 조회 및 검색 |
| 관리자 | `/api/admin/users` | 회원 목록 조회 |

요청 필드, 응답 구조, 성공 코드, 오류 코드 및 접근 정책은 [백엔드 API 명세서](document/BackEnd_API%20명세서%20정리.md)와 [API 요약 명세표](document/BackEnd_API%20명세표.md)를 참고하세요.

## 데이터베이스 및 마이그레이션

주요 테이블은 다음과 같습니다.

| 테이블 | 용도 |
|---|---|
| `users` | 회원 계정, 역할, 탈퇴 및 토큰 버전 정보 |
| `boards` | 게시판 정보 |
| `categories` | 게시판별 카테고리 |
| `posts` | 게시글 본문, 조회수, 좋아요 수 및 삭제 상태 |
| `comments` | 댓글·대댓글과 삭제 상태 |
| `post_likes` | 사용자별 게시글 좋아요 |
| `attachments` | 첨부파일 메타데이터 |

Flyway 마이그레이션은 현재 `V1`부터 `V8`까지 `back/src/main/resources/db/migration/`에서 관리합니다. 적용이 완료된 마이그레이션 파일을 직접 수정하지 말고, 스키마 변경은 새로운 버전의 SQL 파일(예: `V9__add_new_column.sql`)로 추가하세요.

`db/sql/draft_schema.sql` 및 `db/seed/test_data.sql`은 설계·참고용 파일입니다. Flyway로 스키마를 관리하는 환경에서는 초안 스키마를 중복 실행하지 마세요.

## 테스트 및 빌드

### Backend

Windows PowerShell:

```powershell
cd back
.\mvnw.cmd test
.\mvnw.cmd package
```

Linux / macOS:

```bash
cd back
./mvnw test
./mvnw package
```

### Frontend

```bash
cd front
npm run lint
npm run build
npm run preview
```

- `npm run lint`: Oxlint 정적 분석
- `npm run build`: 프로덕션 빌드 생성
- `npm run preview`: 빌드 결과를 로컬에서 미리 보기

## 관련 문서

- [프로젝트 설계 및 개발 계획](document/PROJECT_PLAN.md)
- [DB 설계 안내](db/README.md)
- [DB 요구사항](db/requirements.md)
- [ERD](db/erd/board-erd.md)
- [백엔드 API 명세서](document/BackEnd_API%20명세서%20정리.md)
- [API 요약 명세표](document/BackEnd_API%20명세표.md)
- [Backend 실행 안내](back/README.md)
- [Frontend 실행 안내](front/README.md)

## 보안 및 운영 시 참고 사항

- 실제 DB 비밀번호와 JWT 서명 키 등 비밀정보를 소스 코드나 Git에 커밋하지 마세요.
- 개발 환경에서는 가능하면 `root` 대신 필요한 권한만 가진 별도의 DB 계정을 사용하세요.
- 첨부파일은 기본적으로 `${user.home}/board-project-uploads`에 저장됩니다. 서버 배포 시 디렉터리 권한, 영구 저장 및 백업 정책을 별도로 검토해야 합니다.
- 파일 업로드는 요청 전체 최대 크기와 파일당 최대 크기 제한의 영향을 받습니다. 현재 설정은 파일당 `10MB`, 요청당 `12MB`입니다.
- 프로젝트의 Docker 구성, 운영 서버 배포 및 GitHub Actions CI/CD는 계획 문서를 기준으로 단계적으로 추가할 수 있습니다.
