# 24차: 비밀번호 변경 및 JWT 세션 무효화

## 목표

23차에서 추가한 프로필 관리 다음 단계로, 로그인한 사용자가 현재 비밀번호를 확인한 뒤 비밀번호를 변경할 수 있게 합니다. 변경 이후에는 이전에 발급된 JWT가 서버 인증 단계에서 거부되도록 `token_version`을 도입합니다.

## 추가 기능

- 보호된 `/security` 화면과 상단 메뉴의 `보안 설정` 링크
- 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인 입력
- 새 비밀번호 8~100자 검사와 확인 일치 검사
- 서버에서 현재 비밀번호의 해시 검증
- 새 비밀번호를 기존 `PasswordEncoder`로 해시하여 저장
- 비밀번호 변경 시 사용자 `token_version`을 1 증가
- 새 JWT에 `tokenVersion` 클레임 포함
- JWT 인증 필터에서 토큰 버전과 DB 사용자 버전을 비교
- 비밀번호가 변경되면 기존 JWT를 사용하는 다른 브라우저/기기 요청도 거부됨
- 변경 성공한 현재 브라우저는 로컬 인증 정보를 지우고 로그인 화면으로 이동
- 이전 버전의 JWT는 `tokenVersion` 클레임이 없어도 버전 0으로 처리해 기존 사용자 업데이트 직후 모든 세션이 강제로 끊기지는 않게 함

## API 명세

### `PUT /api/auth/password`

인증: `Authorization: Bearer <accessToken>` 필요

요청 본문:

```json
{
  "currentPassword": "현재 비밀번호",
  "newPassword": "새 비밀번호"
}
```

정상 처리 시 `204 No Content`를 반환합니다.

주요 오류:

- `400 Bad Request`: 현재 비밀번호 불일치, 새 비밀번호가 현재 비밀번호와 동일, 검증 실패
- `401 Unauthorized`: JWT가 없거나 유효하지 않거나 비밀번호 변경 전 토큰 버전인 경우

## DB 변경

Flyway 마이그레이션 `V8__add_user_token_version.sql`이 `users.token_version INT NOT NULL DEFAULT 0`을 추가합니다. 기존 사용자와 기존 토큰은 버전 0에서 시작합니다. 비밀번호가 변경되면 해당 사용자의 버전이 1씩 증가합니다.

이미 Flyway를 사용 중인 DB라면 마이그레이션 파일을 추가한 후 백엔드를 실행해 자동 적용합니다. V1~V7 파일은 수정하지 않습니다.

## 변경 파일

### 프런트엔드

- `front/src/App.jsx`
- `front/src/components/AppLayout.jsx`
- `front/src/api/authApi.js`
- `front/src/pages/PasswordChangePage.jsx` (신규)
- `front/src/App.css` (추가 CSS)

### 백엔드

- `back/src/main/java/com/example/board/controller/AuthController.java`
- `back/src/main/java/com/example/board/dto/auth/PasswordChangeRequest.java` (신규)
- `back/src/main/java/com/example/board/entity/User.java`
- `back/src/main/java/com/example/board/security/CustomUserDetailsService.java`
- `back/src/main/java/com/example/board/security/JwtAuthenticationFilter.java`
- `back/src/main/java/com/example/board/security/JwtTokenProvider.java`
- `back/src/main/java/com/example/board/security/VersionedUserDetails.java` (신규)
- `back/src/main/java/com/example/board/service/UserService.java`
- `back/src/main/resources/db/migration/V8__add_user_token_version.sql` (신규)
- `back/src/test/java/com/example/board/service/UserServiceTest.java`
- `back/src/test/resources/application-test.properties` (테스트용 JWT 시크릿 수정)

## 테스트

`UserServiceTest`에는 다음 검증을 추가했습니다.

- 로그인 JWT에 `tokenVersion=0`이 기록되는지
- 비밀번호 변경 시 비밀번호가 평문으로 저장되지 않는지
- 비밀번호 변경 후 저장된 토큰 버전이 증가하는지
- 기존 비밀번호 로그인은 실패하고 새 비밀번호 로그인은 성공하는지
- 현재 비밀번호가 틀리면 자격 증명이 바뀌지 않는지
- 현재 비밀번호 재사용을 거부하는지

테스트는 로컬 MariaDB의 `board_db_test`를 사용하도록 되어 있습니다. 아래 명령으로 실행할 수 있습니다.

Windows:

```powershell
cd back
.\mvnw.cmd test
```

macOS/Linux:

```bash
cd back
./mvnw test
```

테스트 설정의 `jwt.secret`은 테스트 실행 문제를 막기 위해 Base64 형식의 32바이트 테스트 키로 수정했습니다. 운영 `JWT_SECRET`은 별도로 강력한 임의 키를 설정해야 합니다.

## 참고 사항

이번 구현은 액세스 JWT에 버전을 기록하고 DB의 현재 버전과 비교합니다. 따라서 비밀번호 변경 이후 이전 토큰은 만료 시점까지 기다리지 않고 서버에서 거부됩니다. 로그아웃은 현재 브라우저의 토큰을 지우는 클라이언트 동작이지만, 비밀번호 변경은 토큰 버전을 바꿔 서버에서도 이전 토큰을 거부한다는 점이 다릅니다.
