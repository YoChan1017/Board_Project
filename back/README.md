# Board Project Backend

React 프론트엔드에 게시판 기능을 제공하는 Spring Boot REST API입니다.

## 기술 스택

- Java 21, Spring Boot 4.1.1, Maven
- Spring WebMVC, Spring Security, JWT
- Spring Data JPA, MariaDB, Flyway

## 주요 기능

- 회원가입·로그인 및 JWT 인증
- 프로필 수정, 비밀번호 변경, 회원 탈퇴
- 게시판·카테고리·게시글 CRUD, 검색·페이지네이션
- 댓글·대댓글, 좋아요, 첨부파일
- 내 활동 조회 및 관리자용 게시판·게시글·회원 관리

## 실행 준비

Java 21과 MariaDB를 준비하고 `board_db` 데이터베이스를 생성한 뒤 아래 환경변수를 설정합니다.

| 환경변수 | 설명 | 기본값 |
|---|---|---|
| `DB_HOST` | MariaDB 호스트 | `localhost` |
| `DB_PORT` | MariaDB 포트 | `3306` |
| `DB_NAME` | 데이터베이스 이름 | `board_db` |
| `DB_USERNAME` | DB 계정 | `root` |
| `DB_PASSWORD` | DB 비밀번호 | 필수 |
| `JWT_SECRET` | Base64로 인코딩한 충분히 긴 서명 키 | 필수 |
| `JWT_EXPIRATION_MS` | JWT 유효 시간(ms) | `3600000` |

Windows PowerShell에서 환경변수를 설정한 같은 터미널에서 실행합니다.

```powershell
cd back
$env:DB_PASSWORD = "실제_DB_비밀번호"
$env:JWT_SECRET = "실제_Base64_서명키"
.\mvnw.cmd spring-boot:run
```

앱 시작 시 Flyway가 `src/main/resources/db/migration/`의 마이그레이션을 적용합니다. JPA는 스키마를 자동 생성하지 않고(`ddl-auto=validate`) 엔티티와 DB 스키마를 검증합니다.

## 테스트

```powershell
.\mvnw.cmd test
```

첨부파일 기본 저장 위치는 `${user.home}/board-project-uploads`입니다. 실제 실행에 사용하는 DB 계정과 JWT 서명 키는 저장소에 커밋하지 마세요.
