FROM node:20-alpine

WORKDIR /app

# Package 설치
COPY package.json package-lock.json ./
RUN npm install

# Prisma Schema 복사 및 생성
COPY prisma ./prisma
RUN npx prisma generate

# Source 복사 및 빌드
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 포트 노출
EXPOSE 4000

# 런타임 환경변수 정의 (docker-compose에서 주입받음)
ENV NODE_ENV=production

# 시작 명령어
CMD ["npm", "run", "start"]
