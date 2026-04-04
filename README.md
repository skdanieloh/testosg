# 아케이드 방 경쟁 (Next.js + Redis Cloud)

친구와 같은 방에서 **닉네임별 최고 점수·레벨**을 겨룹니다.  
백엔드 저장소는 **Redis Cloud**(또는 표준 Redis TCP)를 사용합니다.

## Redis 연결 (필수)

서버는 **`ioredis`** 로 TCP 연결합니다. 아래 **한 가지 방식**만 설정하면 됩니다.

### 방법 A: 연결 URL 하나 (권장)

[Redis Cloud](https://cloud.redis.io) → 데이터베이스 선택 → **Connect** → **Public endpoint** 등에서  
`rediss://...` 또는 `redis://...` 형태의 **전체 URL**을 복사합니다.

Vercel / 로컬 `.env.local`:

```env
REDIS_URL=rediss://default:비밀번호@호스트:포트
```

TLS를 쓰는 무료/유료 플랜은 보통 **`rediss://`** 입니다.

### 방법 B: 호스트·비밀번호 분리

```env
REDIS_HOST=xxxx.redis.cloud
REDIS_PORT=6379
REDIS_PASSWORD=비밀번호
REDIS_USERNAME=default
REDIS_TLS=true
```

## 로컬 실행

```bash
npm install
# .env.local 에 REDIS_URL 등 설정
npm run dev
```

## Vercel 배포

1. **Settings → Environment Variables**에 `REDIS_URL`(또는 분리 변수) 추가.
2. **Output Directory**는 비워 두고, Framework는 **Next.js**.
3. 재배포.

### 방 만들기가 안 될 때 (가장 흔한 원인)

1. **`REDIS_URL` 미설정**  
   Vercel 프로젝트에 `REDIS_URL`이 없으면 API가 503을 반환합니다.

2. **Redis Cloud 방화벽**  
   Redis Cloud는 기본적으로 **특정 IP만** 허용할 수 있습니다. Vercel은 **고정 IP가 아닙니다.**  
   Redis Cloud 콘솔 → 해당 DB → **Security / 네트워크 / 접속 제한**에서  
   **모든 IP 허용(0.0.0.0/0)** 또는 Vercel용 설정을 켜야 서버리스에서 붙을 수 있습니다.  
   그렇지 않으면 `ECONNREFUSED`, 타임아웃, `WRONGPASS` 등으로 실패합니다.

3. **TLS**  
   공개 엔드포인트는 보통 `rediss://` 입니다. `redis://`만 쓰면 실패할 수 있습니다.

4. **인증서 검증 오류**  
   드물게 `SELF_SIGNED_CERT_IN_CHAIN` 등이 나오면 Vercel에  
   `REDIS_TLS_REJECT_UNAUTHORIZED=false` 를 추가해 보세요(보안상 가능한 한 URL을 먼저 고치는 편이 좋습니다).

## API

| 메서드 | 설명 |
|--------|------|
| `POST /api/room` `action: create` | 방 생성 |
| `POST /api/room` `action: join` | 닉네임 입장 (최대 10명) |
| `POST /api/room` `action: score` | 점수·레벨 반영 |
| `GET /api/room?id=...` | 방 JSON 조회 |

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 방 만들기 |
| `/room/[roomId]` | QR · 닉네임 입장 |
| `/game/[roomId]` | 게임 |
| `/ranking/[roomId]` | 랭킹 (폴링) |

## 참고

- 이전에 쓰던 **Upstash REST**(`UPSTASH_REDIS_REST_*`)는 사용하지 않습니다. Vercel에 남아 있으면 삭제해도 됩니다.
- Redis Cloud 콘솔의 **Connect** 버튼에서 복사한 URL이 가장 정확합니다.
