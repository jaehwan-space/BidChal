# 🏷️ BidChal (비찰)

모던하고 매끄러운 UX를 제공하는 **실시간 모의 경매 플랫폼**입니다.
사용자가 편리하게 사용할 수 있는 UI/UX 디자인을 반영하여 직관적이고 쾌적한 반응형 환경(모바일, 태블릿, 데스크톱)을 지원합니다.

## ✨ 주요 기능

### 1. ⚡ 실시간 경매 시스템 (Real-time Auction)
* **방 쓰기 및 참여**: 호스트가 경매방을 개설하고 여러 아이템을 등록할 수 있습니다. 이미지가 포함된 아이템 등록이 가능합니다.
* **실시간 입찰**: Socket.io를 활용하여 지연 없는 실시간 입찰 경쟁이 가능합니다.
* **디스플레이 모드**: 스마트 TV나 프로젝터에 띄워둘 수 있는 별도의 관전용 디스플레이 URL이 제공됩니다 (낙찰/입찰 시 효과음 재생).

### 2. 👤 사용자 및 지갑 관리 (My Page)
* **이메일 기반 인증**: 안전하고 관리가 용이한 이메일/비밀번호 기반 로그인 및 회원가입을 지원합니다.
* **포인트 지갑**: 경매에 사용할 수 있는 가상 포인트를 관리합니다.
* **포인트 충전**: 쿠폰 코드를 직접 입력하거나, 기기 카메라를 이용한 **QR 코드 스캔**으로 간편하게 포인트를 충전할 수 있습니다.
* **포인트 선물**: 사용자 닉네임을 통해 다른 사람에게 포인트를 자유롭게 선물(송금)할 수 있습니다.
* **프로필 관리**: 경매방에 표시될 닉네임을 손쉽게 변경할 수 있습니다.

### 3. 🎨 프리미엄 UI/UX (Toss Style)
* **반응형 디자인**: 100dvh 풀스크린 레이아웃, 하단 탭 바(모바일/태블릿), PC용 그리드 및 상단 네비게이션이 매끄럽게 연결됩니다.
* **다크 모드 지원**: 원클릭으로 라이트 ↔ 다크 테마 전환이 가능합니다.
* **바텀 시트 모달**: 팝업이나 설정 화면이 화면 하단에서 부드럽게 올라오는 스마트폰 앱 스타일의 바텀 시트 구조를 채택했습니다.
* **애니메이션 & 글래스모피즘**: Framer Motion을 활용한 트랜지션과 반투명 블러 효과를 글로벌하게 적용했습니다.

---

## 🛠 기술 스택

### Frontend
* **Core**: React, Vite, TypeScript
* **State & Data**: Zustand (전역 상태 및 테마 관리), React Query
* **Styling**: Vanilla CSS Modules (Glassmorphism, CSS Variables)
* **Animation & UI**: Framer Motion
* **Features**: `@yudiel/react-qr-scanner` (QR 스캔)

### Backend
* **Core**: Node.js, Express, TypeScript
* **Real-time**: Socket.io
* **Database**: PostgreSQL
* **ORM**: Prisma
* **Security**: JWT Authentication, bcryptjs

### DevOps & Infrastructure
* **Containerization**: Docker, Docker Compose
* **Proxy**: Nginx (`client_max_body_size 20M` 설정으로 대용량 이미지 업로드 지원)
* **CI/CD**: GitHub Actions (Proxmox 서버 자동 배포, Nginx 설정 동기화 및 Docker 무중단 빌드)

---

## 📂 프로젝트 구조

```text
BidChal/
├── frontend/             # React (Vite) 프론트엔드
│   ├── src/
│   │   ├── components/   # 재사용 가능한 UI 컴포넌트 (공통 컴포넌트 및 레이아웃 등)
│   │   ├── pages/        # 라우팅되는 페이지 컴포넌트 (Lobby, Login, Mypage 등)
│   │   ├── store/        # Zustand 전역 상태 저장소 (Auth, Theme 등)
│   │   └── index.css     # 전역 디자인 시스템 (Design Tokens, Animations)
│   └── ...
├── backend/              # Express + Socket + Prisma 백엔드
│   ├── prisma/           # 스키마(schema.prisma) 정의 및 마이그레이션 폴더
│   ├── src/
│   │   ├── routes/       # API 라우트 (auth.ts, user.ts 등)
│   │   └── index.ts      # 서버 엔트리 및 소켓 초기화 로직
│   └── Dockerfile        # 백엔드 프로덕션용 도커파일 (시작 전 prisma db push 포함)
├── .github/workflows/    # CI/CD 파이프라인 스크립트 (deploy.yml)
├── docker-compose.prod.yml # 운영 서버 배포용 도커 컴포즈 파일
└── nginx_example.conf    # 프로덕션 서버 리버스 프록시 참고 설정 파일
```

---

## 🚀 로컬 환경 실행 가이드

### 사전 요구 사항
* Node.js v20+
* pnpm (패키지 매니저)
* PostgreSQL 데이터베이스

### 백엔드 (API & Socket Server) 실행
1. `backend` 폴더로 이동합니다.
2. 패키지를 설치합니다: `pnpm install`
3. `.env` 파일을 생성하고 다음 환경 변수를 설정합니다.
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/bidchal?schema=public"
   JWT_SECRET="your_jwt_secret"
   ```
4. Prisma DB 스키마를 푸시합니다: `pnpm exec prisma db push`
5. 개발 서버를 시작합니다: `pnpm run dev` (기본 포트: 4000)

### 프론트엔드 (React Web) 실행
1. `frontend` 폴더로 이동합니다.
2. 패키지를 설치합니다: `pnpm install`
3. 개발 서버를 시작합니다: `pnpm run dev`
4. 브라우저에서 제공된 로컬 주소(예: `http://localhost:5173`)로 접속합니다.

---

## 🌎 배포 파이프라인 (Deploy)

* GitHub Repository의 `main` 브랜치에 코드가 푸시되면 **GitHub Actions** 워크플로우(`deploy.yml`)가 자동으로 실행됩니다.
* 프론트엔드는 빌드 후 `dist` 폴더를 Nginx가 서빙할 경로로 SCP 복사합니다.
* 백엔드는 Proxmox 타겟 서버 내에서 최신 코드를 git pull 한 뒤 `docker-compose`를 통해 새 이미지로 리빌드 및 재시작됩니다. 이때, 서버가 켜지면서 자동으로 `prisma db push`를 수행하여 DB 스키마를 동기화합니다.
