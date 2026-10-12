# Board_Project 백엔드 재검토 보고서

- 검토 대상: `YoChan1017/Board_Project` 저장소의 `main` 브랜치
- 검토 기준: 저장소에 커밋된 Java 코드, DTO, 설정, Flyway 마이그레이션, 테스트 소스 및 `document/Spring_9차 정리_자동화 테스트.md`
- 주의: 원격 코드를 읽어 정적 검토한 결과다. 이번 검토에서 GitHub Actions나 전체 테스트를 직접 실행한 것은 아니다.

## 요약

핵심적인 백엔드 구조는 갖춰져 있다. Spring Boot + Spring Data JPA + MariaDB + Flyway, JWT 인증·인가, 게시판/카테고리/게시글/댓글/좋아요/첨부파일 API와 일부 자동화 테스트가 존재한다. 프론트엔드 개발을 막을 정도의 구조적 재작성은 필요하지 않지만, 아래 높은 우선순위 항목은 먼저 정리하는 것을 권장한다.

## 우선순위 높음

### 1. 선택 이메일이 빈 문자열일 때 회원가입 실패 가능

- 파일: `back/src/main/java/com/example/board/service/UserService.java`
- 코드상 이메일 중복 확인은 `email`이 `null` 또는 공백이 아닌 경우에만 실행되지만, 이후 `request.getEmail()`을 그대로 저장한다.
- 이메일 입력을 비워 둔 React 폼이 `"email": ""`을 보내면 빈 문자열이 DB에 저장될 수 있다. `users.email`에 UNIQUE 제약이 있으므로 이후의 빈 이메일 가입이 `DataIntegrityViolationException`으로 실패할 수 있다.
- 권장: 이메일을 저장하기 전에 `trim()`하고, `null` 또는 빈 값이면 `null`로 정규화한다. 중복 확인과 저장 모두 정규화된 값을 사용한다.

### 2. 테스트 프로필의 JWT 키가 `JwtTokenProvider`의 Base64 디코더와 맞지 않음

- 파일: `back/src/test/resources/application-test.properties`
- 현재 `jwt.secret=secret_key` 값에는 표준 Base64에서 허용되지 않는 `_` 문자가 들어 있다.
- 파일이 지정한 `test` 프로필이 적용되고 `JWT_SECRET` 환경 변수로 재정의되지 않으면 `Base64.getDecoder().decode(secret)`에서 초기화 오류가 발생할 수 있다. 환경 변수의 우선순위에 따라 테스트 머신에서는 우연히 가려질 수 있어 재현성이 낮다.
- 권장: 실제 운영 키를 사용하지 말고, 테스트 전용으로 유효한 Base64 인코딩의 32바이트 이상 키를 설정한다. 테스트 전용 설정으로 애플리케이션 컨텍스트가 깨끗한 환경에서 시작되는지 확인한다.

### 3. 모든 Spring 컨텍스트 테스트가 테스트 DB 프로필을 사용하는지 통일 필요

- 일부 테스트에는 `@ActiveProfiles("test")`가 있지만, 현재 저장소의 `BackApplicationTests`, `UserServiceTest`, `UserRepositoryTest`에는 명시되어 있지 않다.
- 이 테스트는 실행 환경의 별도 설정에 의존해 기본 `application.properties`와 기본 DB를 선택할 수 있다. 특히 `UserServiceTest`는 테스트 사용자를 생성하므로 테스트 전용 DB 사용을 보장하는 편이 안전하다.
- 권장: DB를 사용하는 모든 `@SpringBootTest` 클래스에서 `@ActiveProfiles("test")`를 명시하고, 전체 테스트가 `board_db_test`만 대상으로 하는지 실행 로그에서 확인한다.

## 우선순위 보통

### 4. multipart 전체 요청 제한과 파일 크기 제한이 같음

- 파일: `back/src/main/resources/application.properties`
- `spring.servlet.multipart.max-file-size=10MB`와 `spring.servlet.multipart.max-request-size=10MB`가 같다. multipart 요청에는 파일 외의 경계/헤더 데이터도 포함되므로 10 MiB에 가까운 파일이 서비스 검증에 도달하기 전에 전체 요청 제한으로 거부될 수 있다.
- 권장: 파일 제한은 10MB로 유지하고 전체 요청 제한은 11~12MB 정도로 높여 의도한 단일 파일 제한과 일치시킨다. 서비스에서 직접 크기를 초과한 경우와 서블릿에서 거부된 경우의 HTTP 상태 코드도 통일하는 편이 좋다.

### 5. 누락된 요청 파라미터/파일 파트가 일반 예외 처리에서 500으로 처리될 가능성

- 파일: `back/src/main/java/com/example/board/exception/GlobalExceptionHandler.java`
- `@ExceptionHandler(Exception.class)`가 최종 처리기로 존재하지만 `MissingServletRequestParameterException` 및 multipart의 누락된 파일 파트 예외를 구체적으로 처리하지 않는다.
- 예를 들어 `POST /api/posts/{postId}/attachments`에서 `file` 필드를 생략하면 컨트롤러 메서드 진입 전에 예외가 발생하며, 구체 핸들러가 없으면 일반 500 핸들러로 들어갈 수 있다.
- 권장: 누락 파라미터 및 누락 multipart 파트 예외를 400 응답으로 명시 처리하고 `MockMvc` 테스트를 추가한다.

### 6. 기존 JWT를 가진 삭제 사용자에 대한 인증

- 파일: `back/src/main/java/com/example/board/security/CustomUserDetailsService.java`
- 로그인 로직은 `deletedAt`이 존재하는 사용자를 거부하지만, JWT 필터에서 호출하는 `loadUserByUsername`은 `deletedAt`을 검사하지 않는다.
- 사용자 Soft Delete를 실제로 사용하게 되면, 이미 발급된 토큰이 살아 있는 동안 보호 API에 계속 접근할 가능성이 있다.
- 권장: 사용자 Soft Delete가 계정 비활성화를 의미한다면 `CustomUserDetailsService`에서도 삭제된 사용자를 거부한다.

### 7. 임시 `/api/auth/me` 응답이 username 하나뿐임

- 파일: `back/src/main/java/com/example/board/controller/AuthController.java`
- 현재 응답은 `{"username":"..."}`뿐이고 메서드 주석에도 임시라고 표시되어 있다.
- 브라우저 새로고침 후 사용자 정보/역할을 복원하려는 프론트엔드에서는 추가 조회나 토큰 페이로드 해석이 필요하다.
- 권장: `userId`, `username`, `nickname`, `role`을 반환하는 인증 사용자 응답 DTO를 설계하는 것을 고려한다. 서버의 실제 접근 제어는 계속 Spring Security에서 수행한다.

## 우선순위 낮음 / 품질 개선

### 8. 테스트 보고서 범위와 전체 테스트 집합을 구분

- 파일: `document/Spring_9차 정리_자동화 테스트.md`
- 보고서는 `PostServiceTest`, `PostRepositoryIntegrationTest`, `PostControllerTest`, `SecurityIntegrationTest`의 17개 테스트를 기록한다. 저장소에는 이외에도 `BackApplicationTests`, `UserServiceTest`, `UserRepositoryTest`가 있으므로 보고서의 17개는 저장소 전체 테스트 수라기보다 보고서가 다룬 4개 클래스의 수다.
- 권장: 전체 `mvn test` 실행 결과와 각 테스트 클래스의 범위를 보고서에 명확하게 기록한다.

### 9. `UserRepositoryTest`는 데이터 전체를 출력하지만 검증은 거의 없음

- 파일: `back/src/test/java/com/example/board/repository/UserRepositoryTest.java`
- `findAll()` 결과의 username과 nickname을 로그에 출력하고 핵심 assertion이 없다. 테스트 DB가 아닌 곳을 바라보면 실제 사용자 정보를 로그로 남길 수도 있다.
- 권장: 테스트 프로필을 명시하고, 특정 테스트 데이터에 대한 assertion으로 바꾸거나 단순 탐색용 테스트라면 제거한다. `UserServiceTest`의 테스트용 `System.out.println`도 정리할 수 있다.

### 10. 첨부파일 삭제의 파일 시스템/DB 일관성

- 파일: `back/src/main/java/com/example/board/service/AttachmentService.java`
- 삭제 시 파일을 먼저 지운 다음 DB 레코드를 삭제한다. 파일 삭제 후 DB 트랜잭션이 실패하면 DB에는 메타데이터가 남고 파일은 없는 상태가 될 수 있다.
- 권장: MVP에서는 오류 처리 테스트를 추가한다. 운영 수준으로 강화할 때는 삭제 예약 상태나 정리 작업 등 파일 시스템과 DB 간 부분 실패 복구 전략을 고려한다.

## 잘 갖춰진 부분

- `BackApplication`에 `@EnableJpaAuditing`이 있어 `BaseEntity` 및 `Attachment`의 auditing 설정이 활성화되어 있다.
- 데이터 구조 변경이 Flyway `V1`~`V7`로 버전 관리된다.
- JWT API는 stateless security 설정을 사용하며 401/403 JSON 응답을 명시한다.
- 게시글 검색은 제목/본문 대상이며 삭제되지 않은 게시글만 반환하고 페이지/크기/정렬 검증이 구현돼 있다.
- 게시글/댓글 삭제는 `deletedAt`을 기록하는 Soft Delete 방식이다.
- 게시글/댓글/첨부파일의 주요 소유자 권한 확인이 서비스 계층에 존재한다.
- `AttachmentService`의 임시 업로드 debug 출력은 현재 `main`에서 블록 주석 처리된 상태로 확인됐다.

## React로 넘어가기 전 권장 완료 기준

1. 빈 이메일을 `null`로 정규화한다.
2. 테스트 JWT 시크릿을 유효한 테스트 전용 Base64 값으로 바꾼다.
3. 모든 DB 통합 테스트에 테스트 프로필을 명시한다.
4. `max-request-size`를 파일 제한보다 크게 설정하고 업로드 한도 테스트를 추가한다.
5. 누락 multipart 파트 등의 오류가 400 JSON으로 반환되는지 테스트한다.
6. STS4에서 전체 Maven 테스트를 실행하고 결과를 확인한다.

이 작업을 마치면 프론트엔드 개발을 진행하기 위한 백엔드 기반은 충분하다. 나머지 개선 사항은 프론트 연동 중 또는 CI 구성 시 순차적으로 처리할 수 있다.

### 11. 테스트 설정 파일과 `.gitignore`가 서로 모순됨

- 저장소 트리에는 `back/src/test/resources/application-test.properties`가 커밋되어 있지만 루트 `.gitignore`에는 해당 경로가 ignore 대상으로 적혀 있다.
- `.gitignore`는 이미 Git에 추적 중인 파일을 자동으로 저장소에서 제거하지 않으므로, 지금은 원격 저장소에서 파일이 보인다.
- 권장: 이 파일을 팀 공통의 안전한 테스트 설정으로 유지할 것인지, 개인 환경 설정으로 보고 추적 해제할지 결정한다. 공통 파일로 유지한다면 실제 비밀 정보를 넣지 않고 테스트 전용 Base64 키 및 테스트 DB 설정만 포함하도록 한다. 개인 파일이라면 예시 파일(`application-test.properties.example`)만 커밋하고 실제 파일은 추적 해제한다.
