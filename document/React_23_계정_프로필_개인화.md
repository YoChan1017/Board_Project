# 23차 — 계정 프로필 조회·수정

## 목표

로그인한 회원이 자신의 프로필 정보를 확인하고 닉네임 및 이메일을 수정할 수 있게 합니다. 기존 JWT 인증 및 로그인 구조를 유지하며, 사용자 ID나 권한은 클라이언트가 변경할 수 없도록 서버가 현재 인증된 사용자 이름을 기준으로 처리합니다.

## 포함된 변경 사항

### 백엔드

- `GET /api/auth/me`: 현재 인증 사용자의 `userId`, `username`, `nickname`, `email`, `role`, `createdAt`, `updatedAt` 반환
- `PUT /api/auth/me`: 현재 사용자의 `nickname`, `email`만 수정하고 수정 결과 반환
- 신규 DTO: `ProfileResponse`, `ProfileUpdateRequest`
- 닉네임·이메일 중복 확인 시 자기 계정은 중복 검사에서 제외
- 빈 이메일은 `null`로 저장해 이메일을 지울 수 있게 처리
- 비밀번호 해시, 삭제 여부 등 민감하거나 내부적인 필드는 응답하지 않음
- 서비스 단위 테스트에 프로필 조회·수정 및 이메일 삭제 케이스 추가

### 프런트엔드

- `/profile` 보호 경로와 상단 내비게이션의 `내 프로필` 링크
- 프로필 요약(아이디, 닉네임, 이메일, 권한, 가입일, 변경일)
- 닉네임·이메일 수정 폼과 로딩/오류/성공 상태
- 수정 후 AuthContext 및 `localStorage`의 사용자 정보를 즉시 동기화
- 추가 CSS는 `front/profile-settings-23.css.txt`에 제공

## API 예시

`GET /api/auth/me` 응답 예시:

```json
{
  "userId": 1,
  "username": "member01",
  "nickname": "게시판회원",
  "email": "member@example.com",
  "role": "USER",
  "createdAt": "2026-10-17T10:00:00",
  "updatedAt": "2026-10-17T10:00:00"
}
```

`PUT /api/auth/me` 요청 본문:

```json
{
  "nickname": "새 닉네임",
  "email": "new@example.com"
}
```

이메일 제거 요청:

```json
{
  "nickname": "새 닉네임",
  "email": null
}
```

인증이 필요하므로 기존 Axios 클라이언트가 `Authorization: Bearer ...` 헤더를 전달합니다. `userId`, `username`, `role`은 수정 요청에서 받지 않습니다.

## 데이터베이스

기존 `users` 테이블의 `nickname`, `email`, `created_at`, `updated_at` 컬럼만 사용하므로 새 Flyway 마이그레이션은 필요하지 않습니다.

## 확인 항목

- 로그인 / 기존 세션 복구에서 `/api/auth/me` 응답에 추가된 필드가 반영되는지
- 닉네임 중복 및 이메일 중복이 API 오류로 반환되는지
- 이메일 생략·공백 입력이 삭제 처리되는지
- 사용자가 URL이나 요청 본문에 다른 사용자 ID를 넣어도 수정 대상이 바뀌지 않는지
- 비로그인 요청은 기존 보안 설정에 의해 거부되는지

이번 패치 생성 시 프런트엔드 구문 및 CSS 구조 검사는 수행합니다. 실제 MariaDB 연결을 포함한 Spring 통합 테스트와 브라우저 E2E 테스트는 실행 환경에서 별도로 확인해야 합니다.
