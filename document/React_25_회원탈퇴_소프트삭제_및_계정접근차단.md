# 25차 — 회원 탈퇴(소프트 삭제) 및 계정 접근 차단

## 목표

24차 비밀번호 변경 기능 다음 단계로, 사용자가 본인 인증 후 직접 회원 탈퇴를 완료할 수 있게 합니다. 기존 게시글·댓글의 외래 키 이력은 유지하되 계정의 식별 정보 일부를 비식별화하고, 탈퇴 전 발급된 JWT가 탈퇴 후 같은 아이디로 재가입한 계정에 적용되지 않도록 보강합니다.

## 구현 내용

### 프런트엔드

- 보안 설정(`/security`)에 회원 탈퇴 진입 영역을 추가했습니다.
- `/account/withdraw` 탈퇴 화면에서 현재 비밀번호와 `탈퇴합니다` 확인 문구를 모두 입력해야 제출할 수 있습니다.
- 성공하면 로컬 인증 정보를 지우고 로그인 화면으로 이동합니다.
- 탈퇴 영향 범위, 게시글·댓글 보존 여부, 아이디 재사용 정책을 제출 전에 표시합니다.
- `front/account-withdrawal-25.css.txt`는 기존 CSS에 추가할 스타일 조각입니다.

### 백엔드 API

`DELETE /api/auth/me`

요청 본문:

```json
{
  "password": "현재 비밀번호",
  "confirmationText": "탈퇴합니다"
}
```

- 요청자의 인증 이름을 이용해 계정을 찾습니다. 클라이언트가 탈퇴 대상 사용자 ID를 전달하지 않습니다.
- 현재 비밀번호 및 확인 문구가 일치해야 처리합니다.
- 성공 시 `204 No Content`를 반환합니다. 잘못된 비밀번호나 확인 문구는 `400 Bad Request`입니다.

### 탈퇴 데이터 처리

- 물리 삭제 대신 `deleted_at`에 시각을 기록합니다.
- 닉네임을 `탈퇴회원_{사용자ID}` 형태의 고유한 값으로 변경합니다.
- 이메일을 `NULL`로 비웁니다.
- 기존 비밀번호 해시를 임의의 일회성 문자열의 해시로 덮어씁니다. 원문은 저장하거나 반환하지 않습니다.
- `token_version`을 증가시켜 기존 JWT를 폐기합니다.
- `username`은 내부적으로 `withdrawn_{사용자ID}` 형태의 고유한 값으로 변경하여 기존 아이디를 재사용할 수 있도록 합니다.
- 게시글·댓글 레코드는 삭제하지 않습니다. 사용자 ID와의 참조 관계를 유지하므로 기존 작성 기록은 비식별화된 작성자 표시로 남습니다.

## JWT의 사용자 ID 바인딩

기존 필터는 사용자 이름과 `tokenVersion`만 비교했습니다. 탈퇴 후 원래 아이디를 새 계정에서 재사용할 수 있게 되므로, 이 방식만으로는 이론상 예전 토큰의 `sub`가 새 계정을 가리킬 수 있습니다.

이를 방지하기 위해 다음도 반영했습니다.

- `VersionedUserDetails`가 DB 사용자 ID를 보유합니다.
- JWT 필터가 토큰의 `userId` 클레임과 DB에서 조회한 사용자 ID를 함께 비교합니다.
- `userId` 또는 버전이 일치하지 않으면 인증을 거부합니다.
- 기존 앱에서 발급한 토큰에도 `userId` 클레임은 포함되어 있습니다. 과거 `tokenVersion` 클레임이 없는 토큰은 기존 호환 규칙대로 버전 0으로 처리하지만, `userId`는 반드시 확인합니다.

이렇게 하면 탈퇴 계정의 과거 JWT가 같은 아이디로 재가입한 신규 계정으로 연결되는 것을 방지할 수 있습니다.

## 변경 파일

- `back/src/main/java/com/example/board/controller/AuthController.java`
- `back/src/main/java/com/example/board/dto/auth/AccountDeletionRequest.java` (신규)
- `back/src/main/java/com/example/board/service/UserService.java`
- `back/src/main/java/com/example/board/security/VersionedUserDetails.java`
- `back/src/main/java/com/example/board/security/CustomUserDetailsService.java`
- `back/src/main/java/com/example/board/security/JwtAuthenticationFilter.java`
- `back/src/test/java/com/example/board/security/AccountWithdrawalSecurityIntegrationTest.java` (신규)
- `back/src/test/resources/application-test.properties` (테스트 JWT 키 형식 보정)
- `front/src/App.jsx`
- `front/src/api/authApi.js`
- `front/src/pages/PasswordChangePage.jsx`
- `front/src/pages/AccountWithdrawalPage.jsx` (신규)
- `front/src/App.css` (기존 CSS에 추가할 스타일)

## 검증 범위와 제한

- 새 통합 테스트는 정상 탈퇴, 개인정보 비식별화, 동일 아이디 재가입, 구 JWT의 신규 계정 접근 차단, 잘못된 비밀번호의 탈퇴 거부를 검사하도록 작성했습니다.
- 패치 제작 시 JSX/JS 파싱, CSS 구조, Java 파일 구조, 테스트 JWT 키의 Base64 디코딩 및 ZIP 무결성을 확인합니다.
- 실제 MariaDB 기반 Maven 통합 테스트와 브라우저 E2E 테스트는 이 패치 제작 단계에서 실행하지 않았습니다.
- 관리자는 자신의 계정을 탈퇴할 수 있습니다. 운영 배포 환경에서는 마지막 관리자 계정 탈퇴를 별도 정책으로 제한할지 검토하세요.
