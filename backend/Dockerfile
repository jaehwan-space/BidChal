FROM node:20-alpine

WORKDIR /app

# Alpine 리눅스에 Prisma 필수 패키지(OpenSSL) 설치
RUN apk add --no-cache openssl

# pnpm 활성화
RUN corepack enable pnpm

# 워크스페이스 lockfile + backend package.json 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# backend 의존성만 설치
WORKDIR /app/backend
RUN pnpm install --frozen-lockfile

# Prisma Schema 복사 및 생성
COPY backend/prisma ./prisma
RUN pnpm exec prisma generate

# Source 복사 및 빌드
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN pnpm run build

# 포트 노출
EXPOSE 4000

ENV NODE_ENV=production

# 시작 명령어
CMD ["pnpm", "run", "start"]
