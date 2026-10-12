# Board_Project 백엔드 보완 가이드

원격 `main` 브랜치 코드 검토에서 확인한 우선 보완 항목의 수정 예시다. 프로젝트 로컬 사본에서 적용하고 STS4/Maven 테스트를 실행한 뒤 커밋한다.

## 1. 선택 이메일 빈 문자열 정규화

파일: `back/src/main/java/com/example/board/service/UserService.java`

회원가입 메서드 안에서 이메일 중복 확인 전에 이메일 값을 정규화한다.

```java
String email = request.getEmail();
if (email != null) {
    email = email.trim();
    if (email.isEmpty()) {
        email = null;
    }
}

if (email != null && userRepository.existsByEmail(email)) {
    throw new BusinessException(
            "EMAIL_ALREADY_EXISTS",
            "이미 사용 중인 email입니다."
    );
}
```

기존 이메일 중복 확인 블록을 위 코드로 교체하고, 아래 저장 코드도 변경한다.

```java
user.setEmail(email);
```

기존 `user.setEmail(request.getEmail());` 줄을 교체한다.

## 2. 테스트 전용 JWT secret 수정

파일: `back/src/test/resources/application-test.properties`

기존:

```properties
jwt.secret=secret_key
```

변경:

```properties
# Test-only Base64 key; never reuse this value in production.
jwt.secret={테스트할 때 작성함}
```

이 Base64 값은 테스트 전용 32바이트 키다. 운영 환경에서는 반드시 기존 `JWT_SECRET` 환경 변수를 사용한다.

## 3. 모든 Spring context 테스트에 테스트 프로필 명시

아래 세 파일의 클래스 선언에 `@ActiveProfiles("test")`를 추가한다.

- `back/src/test/java/com/example/board/BackApplicationTests.java`
- `back/src/test/java/com/example/board/service/UserServiceTest.java`
- `back/src/test/java/com/example/board/repository/UserRepositoryTest.java`

필요한 import:

```java
import org.springframework.test.context.ActiveProfiles;
```

클래스에 기존 `@SpringBootTest`가 있다면 아래와 같이 설정한다.

```java
@SpringBootTest
@ActiveProfiles("test")
class ExampleTest {
}
```

`UserRepositoryTest`는 전체 사용자 이름/닉네임을 `System.out.println`으로 출력하는 대신, 테스트 데이터를 기준으로 assertion을 수행하도록 정리한다.

## 4. Multipart 요청 전체 용량 제한 조정

파일: `back/src/main/resources/application.properties`

기존:

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

권장:

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=12MB
```

서비스의 `MAX_FILE_SIZE` 제한은 계속 10 MiB로 유지한다. `AttachmentService.validateFile()`에서 실제 파일 크기를 넘긴 경우를 413으로 통일하려면 `HttpStatus.BAD_REQUEST`를 `HttpStatus.PAYLOAD_TOO_LARGE`로 변경한다. 빈 파일 및 잘못된 파일명 오류는 400으로 유지한다.

## 5. 누락된 파라미터/파일 파트의 400 응답 추가

파일: `back/src/main/java/com/example/board/exception/GlobalExceptionHandler.java`

import 추가:

```java
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
```

`@RestControllerAdvice` 안에 핸들러 추가:

```java
@ExceptionHandler(MissingServletRequestParameterException.class)
public ResponseEntity<ErrorResponse> handleMissingParameter(
        MissingServletRequestParameterException e) {
    return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_PARAMETER",
            "필수 요청 파라미터가 없습니다."
    );
}

@ExceptionHandler(MissingServletRequestPartException.class)
public ResponseEntity<ErrorResponse> handleMissingRequestPart(
        MissingServletRequestPartException e) {
    return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_REQUEST_PART",
            "필수 요청 파일이 없습니다."
    );
}
```

## 6. 전체 테스트 실행

Windows 터미널에서 저장소 루트가 아니라 Maven 프로젝트 폴더(`back`)에서 실행한다.

```powershell
cd "C:\Users\chani\OneDrive\바탕 화면\Board_Project\back"
.\mvnw.cmd test
```

확인 기준:

- 빌드/테스트가 종료 코드 0으로 끝나는지
- 테스트 DB가 `board_db_test`인지
- 오류/실패 수가 0인지
- 개발 DB `board_db`에 테스트 데이터가 추가되지 않았는지

테스트 실패가 있다면 첫 번째 실제 오류 메시지와 테스트 클래스 이름부터 해결한다.
