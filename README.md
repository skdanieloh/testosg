# 아케이드 · 단일 방 (Next.js + Redis Cloud)

**방은 하나(`room:main`)**만 존재합니다. 방 생성 API는 없고, QR은 **`/room` 입장 링크**입니다.

- 입장 → Redis에 `status: pending` (최대 10명, **동일 닉네임**이면 기존 데이터 유지)
- 관리자 **`/admin`** 에서 승인(`approved`) · 게임 시작(`phase: playing`) · 로비 복귀 · 전체 초기화
- 클라이언트는 **1초 폴링**으로 방 상태 반영
- 점수 제출은 **승인된 유저**이고 **`playing`** 일 때만 허용, **기존 기록보다 나을 때만** 갱신 (레벨 우선, 같은 레벨이면 점수)

## 환경 변수

| 변수 | 설명 |
|------|------|
| `REDIS_URL` | Redis TCP URL (`rediss://...` 권장) 또는 `REDIS_HOST` + `REDIS_PASSWORD` + `REDIS_TLS` 등 |
| `ADMIN_KEY` | 관리자 API 및 `/admin` 페이지에서 사용하는 비밀 키 (미설정 시 관리 API 503) |

## Redis 연결 (필수)

[Redis Cloud](https://cloud.redis.io) 등에서 **Public endpoint** URL을 복사합니다.

```env
REDIS_URL=rediss://default:비밀번호@호스트:포트
ADMIN_KEY=길고_예측하기_어려운_문자열
```

Vercel은 고정 IP가 아니므로 Redis Cloud **네트워크/방화벽**에서 서버리스 접속이 가능하도록 설정해야 합니다.

## 로컬 실행

```bash
npm install
# .env.local
npm run dev
```

## API

### 공개 `GET /api/room`

단일 방 JSON (`phase`, `members[].status`, 점수 등).

### 공개 `POST /api/room`

| `action` | 본문 | 설명 |
|----------|------|------|
| `join` | `{ "name": "닉네임" }` | 입장·대기 (`pending`), 10명 초과 시 거절, 같은 닉네임은 유지 |
| `score` | `{ "name", "score", "level" }` | `approved` + `playing` 일 때만, 기록 개선 시에만 갱신 |

### 관리자 `POST /api/admin`

헤더 **`x-admin-key: <ADMIN_KEY>`** (또는 `Authorization: Bearer <ADMIN_KEY>`).

| `action` | 설명 |
|----------|------|
| `get` | 방 조회 |
| `approve` | `{ "name": "닉네임" }` → `approved` |
| `start` | `phase` → `playing` |
| `stop` | `phase` → `lobby` |
| `reset` | 참가자·점수·상태 전부 초기화 |

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 안내 · 입장/랭킹 링크 |
| `/room` | 초대 QR · 닉네임 입장 · 내 승인/게임 상태 (1초 폴링) |
| `/game` | 승인 + `playing` 일 때만 플레이 |
| `/ranking` | 승인된 멤버 랭킹 (1초 폴링) |
| `/admin` | QR · 대기 승인 · 게임 시작/종료 · 전체 초기화 (`ADMIN_KEY` 입력) |

이전 경로 `/room/:id`, `/game/:id`, `/ranking/:id` 는 각각 `/room`, `/game`, `/ranking` 으로 리다이렉트됩니다.

## 참고

- 관리자 키는 **브라우저에 입력한 값**이 `x-admin-key`로 전송됩니다. 서버의 `ADMIN_KEY`와 일치해야 합니다.
- 구 Redis 문서에 `status`/`phase`가 없으면 마이그레이션 시 멤버는 `approved`, 방은 `lobby` 로 간주합니다.
