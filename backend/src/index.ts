import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupSockets } from './socket';

import roomRoutes from './routes/room';
import itemRoutes from './routes/item';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 업로드된 이미지 정적 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API 라우트 연동
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms/:roomId/items', itemRoutes);
app.use('/api/upload', uploadRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 소켓 이벤트 분리 적용
setupSockets(io);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
