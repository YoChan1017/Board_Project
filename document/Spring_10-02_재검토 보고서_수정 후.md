# Board_Project 백엔드 재검토 보고서

- 검토 기준: GitHub `YoChan1017/Board_Project` 저장소의 `main` 브랜치
- 검토 시점: 2026-10-12
- 검토 범위: Spring Boot 소스, Controller/Service/Repository/DTO, 보안 설정, 예외 처리, application 설정, Flyway V1~V7, 테스트 파일/보고서
- 제한: 이번 검토는 원격 저장소의 소스를 읽어 수행한 정적 검토다. 원격 코드를 대상으로 Maven 테스트를 직접 실행하지 않았으며, 테스트 통과는 저장소에 기록된 기존 실행 결과와 구분한다.

## 요약

백엔드의 기본 구조는 갖춰져 있다. BCrypt 비밀번호 해시, stateless JWT 인증, 역할 기반 인가, Bean Validation, Flyway 마이그레이션, 공통 JSON 오류 응답, 게시글 검색/페이지네이션, 첨부파일 경로 검증이 구현되어 있다. 수정 가이드의 이메일 정규화, 테스트 프로필 적용, multipart 요청 크기, 누락 파라미터/파일 오류 처리, 첨부파일 디버그 출력 비활성화는 원격 `main`에서 확인했다.

다만 테스트 재현성과 몇 가지 도메인 동작의 일관성은 더 확인해야 한다. 기본 구조를 다시 만들 필요는 없지만, 아래 P1 확인을 마치고 로컬 전체 테스트를 실행한 뒤 API를 연결하는 것을 권장한다.

## 수정 가이드 적용 확인

| 항목 | 현재 원격 코드 확인 결과 | 판단 |
|---|---|---|
| 선택 이메일의 공백 정규화 | `UserService.signup()`에서 trim 후 빈 문자열을 `null`로 저장 | 적용 확인 |
| Spring 컨텍스트 테스트의 `test` 프로필 | `BackApplicationTests`, `UserServiceTest`, `UserRepositoryTest`, `SecurityIntegrationTest`, `PostRepositoryIntegrationTest`에 적용 확인 | 적용 확인 |
| multipart 최대 요청 크기 12MB | `max-file-size=10MB`, `max-request-size=12MB` | 적용 확인 |
| 누락된 요청 파라미터/파일 응답 | `GlobalExceptionHandler`에 `MissingServletRequestParameterException` 및 `MissingServletRequestPartException` 핸들러 추가 | 적용 확인 |
| 첨부파일 디버그 출력 | `AttachmentService`의 출력 블록이 주석 처리되어 실행되지 않음 | 적용 확인 |
| 서비스에서 파일 크기 초과 시 상태 코드 | 서비스 검증은 여전히 `400`; 프레임워크 multipart 제한 초과는 `413` | 선택적 응답 일관성 개선 |
| 테스트용 JWT 설정 | 의도한 고정 테스트 값이 남아 있음. 다만 실제 코드의 Base64 디코딩과 호환되는지 확인 필요 | 실행 조건 확인 필요 |

## P1 — 테스트 실행 재현성 확인

### 테스트 JWT 설정의 형식 호환성

`JwtTokenProvider`는 JWT secret을 다음 방식으로 읽는다.

```java
Base64.getDecoder().decode(secret)
```

원격 `application-test.properties`의 현재 `jwt.secret` 값에는 기본 Base64 알파벳에 없는 `_` 문자가 포함되어 있다. 이 값이 실제로 사용되면 `IllegalArgumentException: Illegal base64 character 5f`가 발생한다. 이는 테스트 키가 운영 비밀값인지에 대한 지적이 아니라 **설정값 형식과 코드가 맞는지**의 문제다.

환경변수 `JWT_SECRET` 등이 Spring의 속성 우선순위에 따라 테스트 설정을 덮어쓰고 있다면 로컬에서는 테스트가 통과할 수 있다. 그러나 그런 경우 실제로는 테스트 전용 속성값을 사용하지 않을 수 있다. 클린 환경에서도 테스트가 재현되도록 아래 중 하나를 명확히 선택한다.

1. 테스트 설정값을 Base64로 디코딩 가능한 테스트 전용 32바이트 키로 둔다.
2. 또는 `JwtTokenProvider`의 키 계약을 일반 문자열 기반으로 바꾸고, 운영·테스트 설정이 같은 계약을 따르도록 한다.

수정 후에는 테스트용 환경변수가 설정을 덮어쓰지 않는 깨끗한 환경에서 `back` 폴더 기준 `mvnw.cmd test`가 종료 코드 0으로 끝나는지 확인한다. 운영 JWT 키는 계속 환경변수로 관리한다.

## P2 — 동작 일관성 및 데이터 무결성

### 삭제된 회원의 기존 JWT

`UserService.login()`은 `deletedAt != null`인 회원의 로그인을 거부한다. 그러나 `CustomUserDetailsService.loadUserByUsername()`는 `deletedAt`을 검사하지 않는다. 현재 회원 삭제 API가 없어 즉시 노출되는 흐름은 제한적이지만, 계정 비활성화/삭제를 추가할 때는 기존 JWT로 계속 인증되지 않도록 해당 사용자도 차단해야 한다.

### 삭제된 게시글에 속한 댓글의 직접 조회/수정

댓글 목록 조회는 게시글이 활성 상태인지 확인한다. 반면 `CommentService.findById()`, `update()`, `delete()`는 댓글의 `deletedAt`만 검사하고 부모 게시글의 `deletedAt`은 확인하지 않는다. 따라서 게시글이 soft delete된 뒤에도 댓글 ID를 알고 있는 인증 사용자가 댓글을 직접 조회할 수 있고, 작성자/관리자는 댓글을 수정·삭제할 수도 있다. 삭제된 게시글에 속한 댓글을 모두 숨길 의도라면 댓글 상세·수정·삭제에서도 부모 게시글의 활성 상태를 확인하도록 통일한다.

### 첨부파일 파일 시스템과 DB 트랜잭션

첨부파일 삭제는 파일 시스템의 파일을 먼저 지운 다음 DB 엔티티를 삭제한다. DB 트랜잭션이 실패하거나 롤백되면 DB 레코드는 남아 있는데 파일이 없어질 수 있다. 소규모 로컬 프로젝트에서는 우선순위가 낮지만, 운영 수준으로 개선할 때는 삭제 예약/사후 커밋 처리나 정합성 복구 작업을 고려한다.

게시글은 soft delete되지만 첨부파일의 물리 파일과 DB 메타데이터는 자동 정리되지 않는다. 목록/다운로드 접근은 차단되지만 파일은 디스크를 계속 차지할 수 있으므로, 게시글 삭제 시 첨부파일 보존 정책을 정하고 정리 절차를 추가하는 것이 좋다.

## P3 — 테스트/문서 품질

### `UserRepositoryTest`

`UserRepositoryTest`는 `findAll()` 결과의 사용자 ID·로그인명·닉네임을 `System.out.println`으로 출력하지만, 기대 결과를 검증하는 assertion은 없다. 테스트 로그에 사용자 식별 정보가 찍힐 수 있고 테스트 목적도 모호하다. 고유한 테스트 데이터를 만든 뒤 필요한 레코드를 assertion으로 검증하도록 변경한다.

### 테스트 보고서 숫자 갱신

`document/Spring_9차 정리_자동화 테스트.md`는 테스트 클래스 4개, 테스트 17개를 요약한다. 현재 소스 트리에는 테스트 클래스 7개가 있고, `BackApplicationTests` 1개, `UserServiceTest` 3개, `UserRepositoryTest` 1개가 추가되어 소스에 선언된 테스트 메서드는 총 22개다. 실제 최신 Maven 실행 결과와 대조해 보고서를 갱신한다. 이 숫자는 현재 소스 선언을 센 값이지, 이번 검토에서 재실행해 통과를 확인한 결과는 아니다.

### `.gitignore`와 테스트 속성 파일

루트 `.gitignore`에 `back/src/test/resources/application-test.properties`가 적혀 있지만 파일은 이미 저장소에서 추적되고 원격 브랜치에서 읽힌다. `.gitignore`는 이미 추적 중인 파일을 자동으로 제거하지 않는다. 테스트 설정을 공유하기 위해 계속 커밋할 의도라면 해당 ignore 규칙을 제거하고, 로컬 전용으로 둘 의도라면 예제 설정 파일을 별도로 두고 실제 파일을 추적 대상에서 제거한다. 테스트 전용 고정값 자체를 운영 비밀값 노출과 동일시할 필요는 없지만, 저장소 정책은 명확히 해 두는 것이 좋다.

### 첨부파일 크기 초과 상태 코드

Spring multipart 제한을 넘으면 `MaxUploadSizeExceededException` 핸들러가 413을 반환하지만, `AttachmentService.validateFile()`에서 10 MiB 초과를 감지하면 400을 반환한다. 프레임워크가 먼저 요청을 거절해 이 코드가 실행되지 않을 수 있지만, 서비스 단위 테스트 등에서는 상태 코드가 달라질 수 있다. 용량 초과를 일관되게 413으로 취급하려면 서비스 예외도 `PAYLOAD_TOO_LARGE`로 맞춘다.

## 이미 잘 갖춰진 부분

- 비밀번호는 BCrypt로 인코딩한다.
- JWT는 서명 검증 및 만료 검사를 수행하고, 요청마다 사용자 정보를 조회한다.
- 인증되지 않은 요청과 권한 부족 요청은 JSON 형식의 401/403으로 응답한다.
- 요청 DTO에 Bean Validation이 적용되어 있다.
- 게시글 검색은 제목/본문에 수행되고 삭제된 게시글을 제외하며, 앞뒤 공백 검색어를 정규화한다.
- 페이지 크기는 1~100, 페이지는 0 이상으로 검증하며 정렬은 생성일시 내림차순 후 ID 내림차순이다.
- 첨부파일 저장명은 UUID이며, 원본 파일명을 정리하고 업로드 루트 밖의 저장 경로를 차단한다.
- Flyway V1~V7 및 JPA `ddl-auto=validate` 설정이 있다.
- `@EnableJpaAuditing`이 있어 감사 필드 자동 기록 구성이 확인된다.
- Vite 개발 프록시가 `/api` 요청을 로컬 Spring Boot 서버로 전달한다.

## 프론트엔드 본격 연결 전 완료 기준

1. 테스트 JWT 설정의 형식/우선순위 문제를 해결하고, 환경변수에 의존하지 않는 테스트 컨텍스트 기동을 확인한다.
2. `back` 폴더에서 전체 Maven 테스트를 실행해 종료 코드 0, Errors 0, Failures 0을 확인한다.
3. 테스트 전용 DB만 사용했는지 확인한다.
4. 댓글과 게시글 soft-delete의 접근 정책을 의도에 맞게 통일한다. 이 부분은 UI 연결 전에 정리하는 것이 좋다.
5. 테스트 보고서와 `UserRepositoryTest`를 정리한다. 첨부파일 파일 시스템/DB 원자성은 프론트 작업과 병행하거나 배포 전에 보완해도 된다.

## 최종 판단

현재 백엔드는 프론트엔드 개발에 연결할 수 있는 단계에 가깝다. 다만 이번 검토에서는 원격 테스트를 재실행하지 않았으며, 테스트 키 형식과 soft-deleted 게시글 댓글 접근 동작은 먼저 확인하는 것을 권장한다. 그 밖의 첨부파일 트랜잭션 일관성, 테스트 로그 정리, 보고서 갱신은 우선순위를 나누어 점진적으로 개선할 수 있다.
