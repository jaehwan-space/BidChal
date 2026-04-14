import { Server, Socket } from 'socket.io';
import { prisma } from './prisma';

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] User: ${socket.id}`);

    // 1. 핑 테스트 (연결 확인용)
    socket.on('ping', () => {
      socket.emit('pong', { message: 'pong!', time: new Date().toISOString() });
    });

    // 2. 방 입장
    socket.on('join_room', ({ roomId }) => {
      socket.join(roomId);
      socket.to(roomId).emit('user_joined', { userId: socket.id });
    });

    // 3. 입찰 로직 연동
    socket.on('new_bid', async ({ roomId, itemId, amount, userId }) => {
      try {
        console.log(`[New Bid] Room: ${roomId}, Item: ${itemId}, Amount: ${amount}`);
        
        // 아이템 정보 확인
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            bids: {
              orderBy: { amount: 'desc' },
              take: 1
            }
          }
        });

        if (!item) {
          return socket.emit('bid_error', { message: '존재하지 않는 아이템입니다.' });
        }

        const currentHighest = item.bids?.[0]?.amount ?? item.startingPrice;

        // 입찰가 검증 (무조건 현재 최고가 또는 시작가보다 커야 함)
        if (amount <= currentHighest) {
          return socket.emit('bid_error', { message: `입찰가는 ${currentHighest}P 보다 커야 합니다.` });
        }

        // 블라인드 입찰인 경우엔 중복 입찰을 막거나 허용할 수 있는데, 일단은 모두 기록
        const bid = await prisma.bid.create({
          data: {
            itemId,
            userId,
            amount,
          }
        });

        // 성공하면 현재 방 전체에 알림
        // 만약 경매 타입이 BLIND 이면 금액을 가려서 보낼 수도 있으나, 프론트에서 타입 보고 가리는 것이 유연함.
        io.to(roomId).emit('update_bid', { 
          itemId, 
          newAmount: amount, 
          lastBidder: userId,
          auctionType: item.auctionType,
          totalBids: item.bids.length + 1
        });
        
        // 방금 입찰한 사람에게도 개인 성공 알림
        socket.emit('bid_success', { message: '입찰이 완료되었습니다!' });
      } catch (error) {
        console.error('Bid Socket Error:', error);
        socket.emit('bid_error', { message: '입찰 처리 중 서버 에러가 발생했습니다.' });
      }
    });

    // 접속 해제
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] User: ${socket.id}`);
    });
  });
}
