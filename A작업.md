# A 개발자 정책 수렴 방안

---

## 1. 기본 방향

A 관점에서는 "기능별 UX"보다 **모든 기능에 공통으로 적용되는 기준 정책**을 먼저 확정해야 한다.

모든 기능(B, C, D)이 이 정책 위에서 동작하도록 **공통 게이트와 규약을 정의하는 역할**이다.

### A 미정책 구현 방안. 신고 접수
-닉네임중복불가, 변경주기제한없음

-탈퇴는hard delete 가아니라withdrawn/ 프로필비노출방식으로처리

-차단기록은탈퇴이후에도유지

-벤된사용자는로그인불가및모든노출제외

- 차단/ 신고는모든관계(프로필/채팅/피드/댓글) 에동일적용
---

## 2. A가 먼저 고정해야 하는 정책

### 2.1 회원 상태 정책

- 상태: `ACTIVE`, `SUSPENDED`, `WITHDRAWN`
- 각 상태별 허용 API 범위 정의 필요
- 탈퇴 정책 결정
  - soft delete vs hard delete
  - 재가입 가능 여부
  - 재가입 대기기간 존재 여부

---

### 2.2 접근 레벨 정책

- 레벨: `FULL`, `QR_LIMITED`
- QR 가입자 기능 제한 범위 정의
  - 추천
  - 호감
  - 채팅
  - 스토리
- → 공통 접근 게이트로 구현

---

### 2.3 인증 정책
- 인증 방식 정의
  - 학번 / 생년월일
- 회원가입 / 로그인 / 로그아웃 / `auth/me`
- 세션 관리
  - 세션 만료 기준
  - 다중 기기 로그인 허용 여부
- 로그아웃 처리
  - 토큰 폐기 방식

---

### 2.4 영향 범위

- 추천
- 채팅
- 스토리 접근

---

### 2.5 온보딩 / 프로필 정책

- `onboarding_completed` 조건 정의
- 필수 입력 필드 정의
- 이미지 정책
  - 최소 / 최대 개수
  - 대표 이미지 규칙
- 닉네임 정책
  - 중복 허용 여부
  - 변경 주기

---

### 2.6 키워드 마스터 정책

- 입력 방식 정의
  - 자유 입력 vs enum/keyword
- 카테고리별 규칙
  - single / multiple 선택
  - 최대 선택 개수
- 적용 범위
  - 프로필
  - 이상형
  - 스토리

---

### 2.7 공통 노출 정책

- 차단된 사용자 처리
  - 추천에서 제외
  - 프로필 비노출
  - 스토리 비노출
  - 채팅 차단
- → 기능별이 아닌 **공통 visibility filter로 강제**

---

### 2.8 공통 응답 / 에러 정책

- API 응답 구조 통일
  - `success / data / error` envelope
- 에러 코드 체계 정의
  - 권한 오류
  - 차단 오류
  - 상태 오류

---

### 2.9 시간 정책

- DB 저장 시간 기준 (예: UTC)
- 만료 계산 기준
- 처리 방식
  - batch 처리
  - write-path 처리

---

## 3. 기능 구현 시 A가 제공해야 하는 공통 게이트

### 3.1 추천 / 호감 접근 조건

- ACTIVE 사용자
- 인증 완료
- 온보딩 완료
- 프로필 최소 조건 충족
- 차단 관계 아님

> 추천 로직은 B 담당, **접근 게이트는 A 담당**

---

### 3.2 채팅 접근 조건

- ACTIVE
- 차단 관계 아님
- 세션 유효
- 필요 시 학교 인증 완료

> 채팅 lifecycle은 C 담당, **진입 권한은 A 규약 사용**

---

### 3.3 스토리 접근 조건

- ACTIVE
- 온보딩 완료
- 프로필 최소 조건 충족
- 차단 관계 아님

> 스토리 기능은 D 담당, **작성/노출 조건은 A 규약 사용**

---

### 3.4 신고 / 차단 후처리

- 차단: 즉시 비노출
- 신고: 상태 유지
- 자동 블라인드: 정책 확정 전까지 보수적 적용

---

## 4. 반드시 먼저 확정해야 할 미정 정책

- 닉네임 중복 허용 여부 및 변경 주기
- 탈퇴 정책 (soft delete vs hard delete)
- 성별 및 추천 대상 모델

---

## 5. API 명세

### A-01. 로그인

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/auth/login` |
| 인증 | 불필요 |
| 목적 | 아이디/비밀번호 로 세션을 생성하고 현재 사용자 정보를 반환한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `users`, `auth_sessions` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| studentId | string | 로그인 학번 |
| password | string | 원문 비밀번호 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| user | object | id, nickname, status, onboardingCompleted 등 최소 사용자 정보 |
| sessionExpiresAt | datetime | 세션 만료 시각 |

**Validation / Policy**

- `users.status`가 `suspended` 또는 `withdrawn`이면 로그인 거부
- 비밀번호는 `password_hash`와 비교
- 성공 시 `auth_sessions` row 생성
- `deleted_at`이 존재하면 로그인 거부 대상으로 해석

**Main error codes**

- `INVALID_CREDENTIALS`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_WITHDRAWN`

---

### A-02. 현재 사용자 조회

| 항목 | 내용 |
|------|------|
| Method | GET |
| Path | `/api/auth/me` |
| 인증 | 필수 |
| 목적 | 프론트 부팅 시 로그인 상태와 최소 사용자 상태를 확인한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `auth_sessions`, `users` |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| user | object | id, nickname, status, onboardingCompleted, university, department 등 |
| sessionExpiresAt | datetime | 현재 세션 만료 시각 |

**Validation / Policy**

- 세션이 없거나 만료되면 `UNAUTHORIZED` 반환
- 프론트의 보호 라우트 진입 기준으로 사용

**Main error codes**

- `UNAUTHORIZED`


### A-05. 내 프로필 조회

| 항목 | 내용 |
|------|------|
| Method | GET |
| Path | `/api/users/me` |
| 인증 | 필수 |
| 목적 | 마이페이지와 프로필 편집의 기본 데이터를 조회한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `users`, `user_profile_images`, `user_keyword_selections`, `categories`, `keyword` |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| profile | object | users 기본 필드 + images + 선택된 키워드 |

**Validation / Policy**

- `real_name`은 기본적으로 본인에게만 제공
- nickname, bio, academic fields, image list, keyword selections를 한 번에 반환

**Main error codes**

- `UNAUTHORIZED`

---

### A-06. 내 프로필 수정

| 항목 | 내용 |
|------|------|
| Method | PATCH |
| Path | `/api/users/me` |
| 인증 | 필수 |
| 목적 | 마이페이지 편집 결과를 저장한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `users`, `user_keyword_selections` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| nickname | string? | 닉네임 |
| bio | string? | 한 줄 소개 |
| gender | string? | 성별 |
| department | string? | 학과 |
| studentYear | number? | 학년 |
| keywordSelections | array? | 카테고리별 선택 키워드 전체 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| updated | boolean | 저장 성공 여부 |

**Validation / Policy**

- `nickname`은 중복 불가
- 키워드 저장 시 `categories.selection_type` / `max_select_count`를 서버에서 최종 검증
- `onboardingCompleted` 변경 규칙은 서비스 로직으로 별도 계산

**Main error codes**

- `NICKNAME_ALREADY_EXISTS`
- `VALIDATION_ERROR`

---

### A-07. 프로필 이미지 업로드

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/users/me/images` |
| 인증 | 필수 |
| 목적 | 프로필 이미지를 추가하고 정렬 순서를 반영한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `user_profile_images` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| file | multipart | 이미지 파일 |
| sortOrder | number | 표시 순서 |
| isPrimary | boolean? | 대표 이미지 여부 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| image | object | 업로드된 이미지 정보 |

**Validation / Policy**

- 사용자당 허용 개수는 서비스 정책으로 제한
- `isPrimary=true`이면 기존 primary 이미지는 `false` 처리

**Main error codes**

- `IMAGE_LIMIT_EXCEEDED`
- `INVALID_FILE`

---

### A-08. 프로필 / 이상형 키워드 메타 조회

| 항목 | 내용 |
|------|------|
| Method | GET |
| Path | `/api/profile-taxonomy` |
| 인증 | 필수 |
| 목적 | 카테고리와 키워드 옵션을 프론트 폼에 내려준다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `categories`, `keyword` |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| categories | array | category + keywords + selectionType + maxSelectCount |

**Validation / Policy**

- 프론트의 키워드 폼은 이 API를 기준으로 렌더링
- 하드코딩된 keyword enum을 제거하는 목적

---

### A-09. 사용자 차단

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/blocks` |
| 인증 | 필수 |
| 목적 | 사용자 간 차단 관계를 생성한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `blocks` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| blockedUserId | number | 차단 대상 사용자 ID |
| reason | string? | 사유 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| blockId | number | 생성된 차단 ID |

**Validation / Policy**

- 중복 차단 요청은 idempotent 처리하거나 기존 row 반환
- 차단 후 추천 / 호감 / 피드 / 채팅 노출 제외에 즉시 반영

**Main error codes**

- `TARGET_NOT_FOUND`
- `BLOCK_ALREADY_EXISTS`

---

### A-10. 전화번호 차단

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/phone-blocks` |
| 인증 | 필수 |
| 목적 | 전화번호 기반으로 보고 싶지 않은 사용자를 차단한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `phone_blocks` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| phoneNumberE164 | string | 국제 표준화 전화번호 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| phoneBlockId | number | 생성된 전화번호 차단 ID |

**Validation / Policy**

- 입력값은 서버에서 hash 후 `phone_blocks.phone_number_hash`로 저장
- 향후 가입 / 재가입 사용자 매칭 시 차단 관계를 적용할 수 있어야 함

**Main error codes**

- `INVALID_PHONE_NUMBER`
- `PHONE_BLOCK_ALREADY_EXISTS`

---

### A-11. 신고 접수

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/reports` |
| 인증 | 필수 |
| 목적 | 프로필 / 피드 / 댓글 / 채팅방 / 메시지 신고를 공통 모델로 저장한다. |
| 범위 | MVP 포함 |
| 영향 테이블 | `reports`, `blocks` |

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| targetType | string | `user` \| `feed` \| `feed_comment` \| `chat_room` \| `message` |
| targetId | number | 신고 대상 ID |
| reasonType | string | 신고 유형 |
| description | string? | 상세 설명 |
| alsoBlock | boolean? | 동시에 차단 처리 여부 |

**Response data**

| 필드 | 타입 | 설명 |
|------|------|------|
| reportId | number | 생성된 신고 ID |

**Validation / Policy**

- 신고는 공통 `reports` 테이블에 저장
- `alsoBlock=true`이면 `blocks` 생성 로직도 함께 실행
- 운영 판정 후 계정 벤 / 기각은 별도 백오피스 프로세스로 처리

**Main error codes**

- `INVALID_REPORT_TARGET`
- `VALIDATION_ERROR`
