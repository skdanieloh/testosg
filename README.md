# 아케이드 방 경쟁 (Next.js + Redis)

친구와 같은 방에서 **닉네임별 최고 점수·레벨**을 겨룹니다.  
데이터는 **Upstash Redis**에 저장되며, Next.js Route Handler `app/api/room/route.ts`로 접근합니다.

## 왜 Redis인가

- 방·멤버·점수를 **키/JSON**으로 두기에 가볍고, Vercel Serverless와 잘 맞습니다.
- 이미 프로젝트에 Redis(Upstash)를 붙여 두었다면 **그대로 유지**하면 됩니다.
- Supabase(Postgres)는 “DB + 실시간 구독”이 필요할 때 유리하고, 여기서는 **짧은 간격 폴링(4초)** 으로 랭킹을 갱신합니다.

## 환경 변수

Vercel **Environment Variables** (또는 로컬 `.env.local`)에 다음 중 **한 쌍**을 넣습니다.

| 변수 | 설명 |
|------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST 토큰 |

통합 이름으로 `STORAGE_URL` / `STORAGE_TOKEN` 등이 온 경우에도 `app/api/room/route.ts`에서 자동으로 읽습니다.

`.env.local.example`을 참고하세요.

## 로컬 실행

```bash
npm install
# .env.local 작성
npm run dev
```

## Vercel 배포

1. 저장소 연결 후 Deploy.
2. 프로젝트에 Redis(Upstash) 연동 및 위 환경 변수 설정.
3. 재배포.

## API

| 메서드 | 설명 |
|--------|------|
| `POST /api/room` `action: create` | 방 생성 → `roomId` |
| `POST /api/room` `action: join` | 닉네임 입장 (최대 10명) |
| `POST /api/room` `action: score` | 점수·레벨 반영 (더 높은 값만 유지) |
| `GET /api/room?id=...` | 방 JSON 조회 |

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 방 만들기 (서버에 방 등록) |
| `/room/[roomId]` | QR · 닉네임 입장 |
| `/game/[roomId]` | 게임 (터치) |
| `/ranking/[roomId]` | 랭킹 (폴링) |
