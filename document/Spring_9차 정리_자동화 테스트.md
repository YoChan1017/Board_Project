# Board Project — 백엔드 자동화 테스트 보고서

- **프로젝트:** Board Project
- **정리 기준일:** 2026-10-11
- **대상:** Spring Boot 백엔드 (`back`)
- **Java:** 21
- **Spring Boot:** 4.1.1
- **테스트 실행 환경:** STS4 / JUnit
- **테스트 DB:** MariaDB `board_db_test` (개발 DB `board_db`와 분리)
- **종합 결과:** 테스트 클래스 4개, 총 테스트 17개 — 사용자가 확인한 실행 결과 기준으로 모두 성공, 오류 0, 실패 0

> 이 문서는 현재까지 작성하고 실행한 자동화 테스트를 기록한다. 결과는 각 테스트 실행 시 STS4의 JUnit 탭에서 성공으로 확인한 내용에 근거한다.

---

## 1. 테스트 요약

| 테스트 클래스 | 테스트 수 | 검증 범위 | 결과 |
|---|---:|---|---|
| `PostServiceTest` | 5 | 서비스 로직, 페이지/크기 검증, 검색어 정규화, 정렬 설정 | 통과 |
| `PostRepositoryIntegrationTest` | 4 | 테스트 DB 연결, Flyway 마이그레이션, 실제 검색 쿼리, 페이지네이션, 소프트 삭제 필터 | 통과 |
| `PostControllerTest` | 3 | HTTP 요청 파라미터, 기본 페이지 설정, 검색 파라미터 전달, 잘못된 숫자 파라미터 | 통과 |
| `SecurityIntegrationTest` | 5 | JWT 누락/오류, 일반 사용자 인증, 관리자 전용 API 권한, 관리자 API 허용 | 통과 |
| **합계** | **17** |  | **전체 통과** |

---

## 2. `PostServiceTest`

**목적:** Mockito로 Repository를 대체해 `PostService`의 분기와 인자 전달, 페이지 요청 구성을 단위 테스트한다. 이 테스트 클래스는 실제 MariaDB 쿼리를 검증하는 통합 테스트가 아니다.

| 테스트 메서드 | 검증 내용 | 기대 결과 | 결과 |
|---|---|---|---|
| `존재하지_않는_게시판이면_예외가_발생한다` | 존재하지 않는 게시판 ID로 목록 조회 | `ResourceNotFoundException` 발생, 게시글 Repository 호출 없음 | 통과 |
| `음수_페이지_번호는_400_오류를_발생시킨다` | `page = -1` | `400 Bad Request`에 해당하는 `ResponseStatusException` | 통과 |
| `페이지_크기가_허용_범위를_벗어나면_400_오류를_발생시킨다` | `size = 0`, `size = 101` | 두 요청 모두 `400 Bad Request` | 통과 |
| `검색어를_공백_제거한_후_페이지와_정렬을_적용한다` | 검색어 앞뒤 공백 제거 및 페이지·정렬 설정 | `" 스프링 "`이 `"스프링"`으로 전달되고 `page = 1`, `size = 2`, `createdAt DESC`, `id DESC` 설정 | 통과 |
| `검색어가_공백뿐이면_일반_게시글_목록을_조회한다` | 검색어가 공백뿐인 경우 | 검색 Repository 대신 일반 활성 게시글 조회 메서드 호출 | 통과 |

### 확인한 서비스 동작

- 게시판 존재 여부를 목록 조회 전에 확인한다.
- 페이지 번호는 0 이상이어야 한다.
- 페이지 크기는 1~100 범위여야 한다.
- `null` 또는 공백뿐인 검색어는 일반 목록 조회로 처리한다.
- 검색어가 있으면 검색 Repository 메서드를 호출하며 앞뒤 공백을 제거한다.
- 정렬은 `createdAt DESC`, 동률일 때 `id DESC`를 사용한다.

---

## 3. `PostRepositoryIntegrationTest`

**목적:** Mockito로 Repository를 대체하지 않고 테스트 전용 MariaDB에서 실제 JPA Repository 메서드와 JPQL 검색 쿼리를 검증한다.

**테스트 설정:**

- 프로파일: `test`
- 설정 파일: `src/test/resources/application-test.properties`
- 데이터베이스: `board_db_test`
- 마이그레이션: `classpath:db/migration`
- 스키마 관리: Flyway 마이그레이션 V1~V7
- `@DataJpaTest`의 트랜잭션 롤백을 이용해 테스트 데이터가 테스트 간 남지 않도록 구성

| 테스트 메서드 | 검증 내용 | 기대 결과 | 결과 |
|---|---|---|---|
| `테스트_DB에_연결되고_Flyway_마이그레이션이_적용되어있다` | 실제 DB 이름과 성공한 마이그레이션 수 확인 | DB가 `board_db_test`, 성공한 마이그레이션이 7개 이상 | 통과 |
| `검색어가_제목이나_본문에_포함된_게시글만_조회한다` | 제목 또는 본문에 `스프링`이 포함된 활성 게시글 검색 | 제목 검색 1개와 본문 검색 1개, 총 2개 반환. 삭제된 게시글과 검색어 불일치 게시글은 제외 | 통과 |
| `검색결과가_페이지별로_나뉜다` | 검색 결과를 페이지 크기 1로 조회 | 두 페이지에 각각 게시글 1개씩 표시되고 전체 결과 수는 2 | 통과 |
| `일반_게시글_목록에서도_삭제된_게시글을_제외한다` | 검색어 없이 활성 게시글 목록 조회 | 테스트 게시글 4개 중 삭제되지 않은 3개만 반환 | 통과 |

### 로그에서 확인된 내용

- `board_db_test`에 연결됨.
- Flyway V1~V7이 검증되었고, 스키마가 버전 7로 최신 상태임을 확인함.
- SQL 검색 쿼리를 실제 MariaDB에서 검증함.

### 테스트 실행 중 표시된 경고

다음 메시지는 실행 로그에 표시되었으나 테스트 실패로 확인되지는 않았다.

- `Unknown system variable 'WSREP_ON'`: MariaDB 드라이버가 해당 시스템 변수를 조회할 때 표시된 경고.
- `Name 'pk_...' ignored for PRIMARY key`: MariaDB가 기본 키 제약조건 이름을 무시했다는 마이그레이션 경고.

이 경고들은 테스트 성공 여부와 별도로 추후 필요할 때 드라이버 호환성 및 마이그레이션 SQL을 점검할 수 있다.

---

## 4. `PostControllerTest`

**목적:** `MockMvc`와 모의 `PostService`를 사용해 컨트롤러의 HTTP 요청 파라미터 처리와 JSON 응답을 테스트한다. 이 테스트는 전체 Spring Security 필터 체인이나 실제 DB를 대상으로 하지 않는 컨트롤러 단위 테스트다.

| 테스트 메서드 | 요청/조건 | 검증 결과 | 결과 |
|---|---|---|---|
| `게시글_목록_조회시_기본_페이지_설정을_적용한다` | `GET /api/boards/1/posts` | 기본 `page = 0`, `size = 10`이 Service에 전달되고, 200 응답 및 페이지 JSON 반환 | 통과 |
| `검색어와_페이지_파라미터를_서비스에_전달한다` | `GET /api/boards/1/posts?page=1&size=2&keyword=스프링` | 해당 파라미터가 Service에 그대로 전달되고 200 응답 | 통과 |
| `숫자가_아닌_페이지_번호는_400을_반환한다` | `GET /api/boards/1/posts?page=abc` | Spring MVC가 파라미터 변환 오류에 대해 400 반환, Service는 호출되지 않음 | 통과 |

### 로그 참고

`MethodArgumentTypeMismatchException` 로그는 `page=abc`가 정수로 변환될 수 없다는 것을 나타낸다. 해당 예외가 400 응답으로 처리되는지를 검사하는 테스트에서 예상된 로그다.

---

## 5. `SecurityIntegrationTest`

**목적:** 실제 Spring Security 구성과 JWT 필터를 포함하는 `MockMvc` 통합 테스트로 인증 및 권한 정책을 검증한다.

**테스트 설정 및 데이터:**

- `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")` 사용
- 테스트 전용 JWT 비밀키를 `application-test.properties`에서 사용
- `board_db_test`에 고유한 사용자와 게시판을 만들고 테스트용 JWT를 생성
- 테스트 클래스의 `@Transactional`로 테스트 트랜잭션을 롤백하도록 구성

| 테스트 메서드 | 요청/조건 | 기대 결과 | 결과 |
|---|---|---|---|
| `토큰없이_보호된_API에_요청하면_401을_반환한다` | 토큰 없이 `GET /api/boards/1/posts` | `401 Unauthorized`, JSON 콘텐츠 유형 | 통과 |
| `잘못된_JWT로_요청하면_401을_반환한다` | `Bearer invalid-token`으로 보호된 API 요청 | `401 Unauthorized`, JSON 콘텐츠 유형 | 통과 |
| `유효한_JWT로_게시글_목록을_조회하면_200을_반환한다` | 유효한 일반 사용자 JWT로 테스트 게시판 조회 | `200 OK`, 빈 콘텐츠 배열 및 페이지 JSON | 통과 |
| `일반_사용자는_관리자_전용_게시판_생성_API에_접근할_수_없다` | 일반 사용자 JWT로 `POST /api/boards` | `403 Forbidden`, 오류 코드 `FORBIDDEN` | 통과 |
| `관리자_JWT로_게시판을_생성하면_201을_반환한다` | 관리자 JWT로 `POST /api/boards` 및 유효한 JSON 요청 | `201 Created`, 응답의 게시판 이름 확인 | 통과 |

### 확인한 보안 동작

- 보호된 API는 인증 토큰이 없으면 접근할 수 없다.
- 유효하지 않은 토큰으로 인증을 우회할 수 없다.
- 유효한 일반 사용자 토큰으로 보호된 목록을 조회할 수 있다.
- 일반 사용자는 관리자 전용 게시판 생성 API에 접근할 수 없다.
- 관리자 토큰으로 게시판 생성이 허용된다.
- 인증·인가 실패 응답은 JSON 형식으로 반환된다.

---

## 6. 테스트 DB 및 설정 메모

### 테스트 전용 DB

테스트는 개발용 `board_db` 대신 `board_db_test`를 사용한다. 테스트 환경에서 실제로 `SELECT DATABASE()` 결과가 `board_db_test`인지 검사한다.

### `application-test.properties`

현재 구성의 주요 설정은 다음과 같다. 민감한 값은 저장소에 하드코딩하지 않고 실행 환경 변수를 통해 관리해야 한다.

```properties
spring.datasource.url=jdbc:mariadb://localhost:3307/board_db_test
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.open-in-view=false

spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration

jwt.secret=<테스트 전용 Base64 비밀키>
jwt.expiration-ms=3600000
```

> `jwt.secret`의 실제 비밀키나 DB 비밀번호는 이 보고서에 기재하지 않는다. 테스트 전용 비밀키를 운영 환경에서 재사용하지 않는다.

---

## 7. 공통 비치명적 경고

테스트 실행 로그에서 다음 메시지가 나타날 수 있다.

- **MariaDB `WSREP_ON` 경고:** 드라이버가 지원되지 않는 시스템 변수를 확인하려 할 때 표시된 로그. 제공된 실행 로그에서는 데이터베이스 연결 및 테스트 실행이 계속 진행되었다.
- **Mockito 동적 Java Agent 경고:** 현재 JDK에서 Mockito의 inline mock maker가 에이전트를 동적으로 로드한다는 경고. 테스트는 실행되었지만 향후 JDK에서 동적 로딩 정책이 바뀔 수 있으므로 필요할 때 Mockito 공식 안내에 따라 별도 설정을 검토할 수 있다.
- **기본 키 제약조건 이름 경고:** Flyway 적용 중 MariaDB가 `pk_users` 등의 기본 키 이름을 무시한다고 표시했다. 마이그레이션은 성공했고 스키마는 V7까지 적용되었다.

이 경고가 나타나는 것 자체가 테스트 실패를 의미하지는 않는다. 최종 성공 판단은 STS4 JUnit 탭의 테스트 수, Errors, Failures를 기준으로 한다.

---

## 8. 테스트 범위 및 아직 검증하지 않은 부분

현재 테스트가 통과한 것은 **작성된 테스트 범위에서의 동작**을 의미하며, 전체 애플리케이션의 모든 경우를 보장하는 것은 아니다.

현재 보고서에 포함되지 않았거나 추가 테스트가 필요한 항목은 다음과 같다.

- 모든 Controller 엔드포인트에 대한 요청·응답 검증
- 유효한 관리자 JWT로 수행하는 모든 관리자 기능(게시판 수정·삭제, 카테고리 관리 등)
- 댓글, 좋아요, 첨부파일 API의 인증·인가 경계 조건 전체
- JWT 만료, 잘못된 서명, 토큰의 형식 및 클레임 예외 케이스 전체
- DB 제약조건 및 실제 검색어의 특수문자·대소문자 관련 경계 조건
- CI 파이프라인에서 전체 테스트 자동 실행

향후 작업에서는 나머지 API 테스트, 오류 케이스 및 GitHub Actions에서의 테스트 자동 실행을 순차적으로 추가할 수 있다.

---

## 9. 최종 결과

사용자가 STS4에서 확인한 결과에 따라 다음 4개 테스트 클래스는 모두 통과했다.

- `PostServiceTest`: 5개
- `PostRepositoryIntegrationTest`: 4개
- `PostControllerTest`: 3개
- `SecurityIntegrationTest`: 5개

**총 17개 테스트 — 성공, Errors 0, Failures 0.**
