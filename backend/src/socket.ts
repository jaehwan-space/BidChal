import { Server, Socket } from 'socket.io';

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] User: ${socket.id}`);

    // 1. 핑 테스트 (연결 확인용)
    socket.on('ping', () => {
      console.log(`[Ping received] from ${socket.id}`);
      socket.emit('pong', { message: 'pong!', time: new Date().toISOString() });
    });

    // 2. 방 입장
    socket.on('join_room', ({ roomId }) => {
      socket.join(roomId);
      console.log(`[Room Joined] User ${socket.id} joined room ${roomId}`);
      // 방에 있는 다른 사람들에게 알림
      socket.to(roomId).emit('user_joined', { userId: socket.id });
    });

    // 3. 입찰 이벤트 뼈대
    socket.on('new_bid', ({ roomId, itemId, amount, userId }) => {
      console.log(`[New Bid] Room: ${roomId}, Item: ${itemId}, Amount: ${amount}`);
      
      // TODO: 데이터베이스(Prisma) 로직으로 실제 입찰 유효성 검증 및 금액 업데이트 필요
      
      // 검증 후, 같은 방에 있는 모두에게 브로드캐스트
      io.to(roomId).emit('update_bid', { itemId, newAmount: amount, lastBidder: userId });
    });

    // 접속 해제
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] User: ${socket.id}`);
    });
  });
}
