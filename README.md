# My Fit — 운동 · 식단 · 신체 기록 앱

개인용 헬스 트래커 기본 틀입니다. (React + TypeScript + Vite, 모바일 우선 PWA)

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # dist/ 에 정적 파일 생성
```

## 기능

| 탭 | 내용 |
|---|---|
| 홈 | 오늘 칼로리/탄단지 진행률, 이번 주 운동 여부, 최근 체중 |
| 운동 | 날짜별 종목·무게·횟수·세트 기록, 볼륨 계산, 최근 기록 |
| 식단 | 아침/점심/저녁/간식별 음식 + 칼로리·탄단지 기록 |
| 신체 | 체중·체지방·골격근 기록, 체중 추이 그래프 |
| 설정 | 하루 영양 목표, 목표 체중, 주간 운동 목표, JSON 백업/복원 |

데이터는 브라우저 `localStorage`에 저장되고, 원하면 **GitHub Gist로 기기 간 동기화**할 수 있습니다.

## 📷 사진으로 식단 기록 (Claude)

식단 탭에서 음식 사진을 찍으면 Claude(`claude-opus-5-5`)가 음식별 양·열량·탄단지를 추정하고, 확인·수정 후 한 번에 기록합니다.

1. https://platform.claude.com/settings/keys 에서 API 키 생성 (claude.ai 구독과 별도 결제, 사진 1장 약 3~5센트)
2. Console에서 월 사용 한도 설정 권장
3. 앱 **설정 → 📷 사진 분석**에 키 저장 (이 기기 브라우저에만 저장, Gist로 동기화 안 됨)

- 사진은 긴 변 1568px JPEG로 줄여서 전송, 응답은 JSON 스키마로 고정 (structured outputs)
- "정정 메모"(예: 밥 반 공기만 먹음)를 적고 다시 분석 가능
- 코드: `src/ai/foodAnalysis.ts`, `src/components/PhotoMealCard.tsx`

## GitHub Gist 동기화

1. https://github.com/settings/tokens/new?scopes=gist 에서 `gist` 권한만 있는 토큰 생성
2. 앱 **설정 → GitHub Gist 동기화**에 토큰 붙여넣고 연결
3. 다른 기기에서도 같은 토큰을 넣으면 같은 Gist(`my-fit-data.json`)를 자동으로 찾아 연결

- 앱 열 때 / 다시 돌아올 때 / 기록 변경 2초 뒤 자동 동기화
- 한쪽만 바뀌면 그쪽 데이터로 맞추고, 양쪽 다 바뀌면 합칩니다 (다른 기기에서 지운 항목이 되살아날 수 있음)
- Gist는 비공개(secret)지만 URL을 아는 사람은 볼 수 있으니 링크를 공유하지 마세요
- 토큰은 각 기기의 브라우저에만 저장됩니다

## 구조

```
src/
  types.ts              데이터 타입 (WorkoutLog, MealEntry, BodyLog, Goals)
  store/AppStore.tsx    전역 상태 + 저장 로직
  ai/                   Claude 사진 분석
  sync/                 Gist API, 동기화 판단(SyncProvider), 병합 로직
  lib/                  날짜, ID, useLocalStorage 유틸
  components/           NavBar, ProgressBar
  pages/                Dashboard, Workout, Diet, Body, Settings
```

## 다음에 해볼 만한 것

- 자주 먹는 음식 / 운동 루틴 즐겨찾기
- 종목별 1RM·볼륨 그래프
- Service Worker 추가로 오프라인 지원
