import { Server, Socket } from 'socket.io';
import { prisma } from './prisma';

// 방별 타이머를 관리하는 Map
const roomTimers: Map<string, NodeJS.Timeout> = new Map();
const roomTimerState: Map<string, number> = new Map(); // 남은 초
const roomTimerPaused: Map<string, boolean> = new Map();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ${socket.id}`);

    // ─── 1. 핑 테스트 ───
    socket.on('ping', () => {
      socket.emit('pong', { message: 'pong!', time: new Date().toISOString() });
    });

    // ─── 2. 방 입장 ───
    socket.on('join_room', async ({ roomId }) => {
      socket.join(roomId);
      socket.to(roomId).emit('user_joined', { userId: socket.id });

      // 현재 방 상태를 접속한 유저에게 즉시 보내기 (방이 이미 진행 중이면 현재 아이템 정보)
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
              include: {
                bids: { 
                  orderBy: { amount: 'desc' }, 
                  take: 1, 
                  include: { user: { select: { username: true } } } 
                },
                _count: { select: { bids: true } }
              }
            }
          }
        });

        if (room) {
          const activeItem = room.items.find(i => i.id === room.activeItemId);
          const remainingTime = roomTimerState.get(roomId) ?? 0;

          socket.emit('room_state', {
            roomStatus: room.status,
            activeItem: activeItem ? {
              ...activeItem,
              currentHighest: activeItem.bids?.[0]?.amount ?? activeItem.startingPrice,
              totalBids: activeItem._count?.bids ?? 0
            } : null,
            remainingTime,
            totalItems: room.items.length,
            currentIndex: activeItem ? room.items.findIndex(i => i.id === activeItem.id) + 1 : 0,
            items: room.items // 전체 아이템 정보 (호스트 제어판용)
          });
        }
      } catch (err) {
        console.error('join_room state sync error:', err);
      }
    });

    // ─── 3. 경매 시작 (호스트만) ───
    socket.on('start_auction', async ({ roomId, hostId }) => {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { items: { orderBy: { createdAt: 'asc' } } }
        });

        if (!room || room.hostId !== hostId) {
          return socket.emit('auction_error', { message: '권한이 없습니다.' });
        }
        if (room.items.length === 0) {
          return socket.emit('auction_error', { message: '등록된 아이템이 없습니다.' });
        }

        const firstItem = room.items[0]!

        if (!firstItem) {
          return socket.emit('auction_error', { message: '아이템 로드 실패.' });
        }

        // DB 업데이트
        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'ACTIVE', activeItemId: firstItem.id }
        });
        await prisma.item.update({
          where: { id: firstItem.id },
          data: { status: 'ACTIVE', startTime: new Date() }
        });

        // 타이머 시작
        startItemTimer(io, roomId, firstItem.id, firstItem.timerDuration);

        io.to(roomId).emit('auction_started', {
          activeItem: { ...firstItem, currentHighest: firstItem.startingPrice, totalBids: 0 },
          remainingTime: firstItem.timerDuration,
          totalItems: room.items.length,
          currentIndex: 1
        });
      } catch (err) {
        console.error('start_auction error:', err);
        socket.emit('auction_error', { message: '경매 시작 실패.' });
      }
    });

    // ─── 4. 입찰 (포인트 차감 및 환불 로직 포함) ───
    socket.on('new_bid', async ({ roomId, itemId, amount, userId }) => {
      try {
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }
        });

        if (!item || item.status !== 'ACTIVE') {
          return socket.emit('bid_error', { message: '현재 입찰 가능한 아이템이 아닙니다.' });
        }

        const currentHighest = item.bids?.[0]?.amount ?? item.startingPrice;

        if (amount <= currentHighest) {
          return socket.emit('bid_error', { message: `입찰가는 ${currentHighest.toLocaleString()}P 보다 커야 합니다.` });
        }

        // 트랜잭션으로 잔고 검사, 차감, 환불, 입찰 기록을 원자적으로 처리
        const user = await prisma.$transaction(async (tx) => {
          // 1. 유저 잔고 확인
          const bidder = await tx.user.findUnique({ where: { id: userId } });
          if (!bidder || bidder.points < amount) {
            throw new Error(`INSUFFICIENT_FUNDS`);
          }

          const previousBid = item.bids?.[0];

          // 2. 기존 최고 입찰자가 있다면 환불 (REFUND)
          if (previousBid) {
            await tx.user.update({
              where: { id: previousBid.userId },
              data: { points: { increment: previousBid.amount } }
            });
            await tx.pointTransaction.create({
              data: {
                userId: previousBid.userId,
                amount: previousBid.amount,
                reason: 'REFUND'
              }
            });
          }

          // 3. 현재 입찰자 지갑에서 즉시 차감 (DEPOSIT)
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { points: { decrement: amount } }
          });
          await tx.pointTransaction.create({
            data: {
              userId,
              amount: -amount,
              reason: 'DEPOSIT'
            }
          });

          // 4. 새로운 입찰 기록
          await tx.bid.create({
            data: { itemId, userId, amount }
          });

          return updatedUser;
        });

        // 방 전체에 브로드캐스트
        io.to(roomId).emit('update_bid', {
          itemId,
          newAmount: amount,
          lastBidder: userId,
          lastBidderName: user.username,
          auctionType: item.auctionType,
          totalBids: (item.bids?.length ?? 0) + 1
        });

        socket.emit('bid_success', { message: '입찰 완료!', points: user.points });
      } catch (err: any) {
        if (err.message === 'INSUFFICIENT_FUNDS') {
          return socket.emit('bid_error', { message: '지갑에 포인트가 부족합니다. 마이페이지에서 충전해주세요.' });
        }
        console.error('new_bid error:', err);
        socket.emit('bid_error', { message: '입찰 처리 중 오류가 발생했습니다.' });
      }
    });

    // ─── 5. 다음 아이템으로 이동 (호스트만) ───
    socket.on('next_item', async ({ roomId, hostId }) => {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
              include: { 
                bids: { 
                  orderBy: { amount: 'desc' }, 
                  take: 1, 
                  include: { user: { select: { username: true } } } 
                } 
              }
            }
          }
        });

        if (!room || room.hostId !== hostId) return;

        // 기존 타이머 정리
        clearRoomTimer(roomId);

        // 현재 아이템의 인덱스 찾기
        const currentIdx = room.items.findIndex(i => i.id === room.activeItemId);
        const nextIdx = currentIdx + 1;

        if (nextIdx >= room.items.length) {
          // 모든 아이템 경매 완료
          await prisma.room.update({
            where: { id: roomId },
            data: { status: 'FINISHED', activeItemId: null }
          });
          io.to(roomId).emit('auction_ended', {
            message: '모든 경매가 종료되었습니다!',
            results: room.items.map(item => ({
              id: item.id,
              name: item.name,
              status: item.status,
              finalPrice: item.bids?.[0]?.amount ?? null,
              winnerId: item.bids?.[0]?.userId ?? null
            }))
          });
          return;
        }

        const nextItem = room.items[nextIdx]!

        if (!nextItem) return;

        // DB 업데이트
        await prisma.room.update({
          where: { id: roomId },
          data: { activeItemId: nextItem.id }
        });
        await prisma.item.update({
          where: { id: nextItem.id },
          data: { status: 'ACTIVE', startTime: new Date() }
        });

        // 새 타이머 시작
        startItemTimer(io, roomId, nextItem.id, nextItem.timerDuration);

        io.to(roomId).emit('item_active', {
          activeItem: { ...nextItem, currentHighest: nextItem.startingPrice, totalBids: 0 },
          remainingTime: nextItem.timerDuration,
          totalItems: room.items.length,
          currentIndex: nextIdx + 1
        });
      } catch (err) {
        console.error('next_item error:', err);
      }
    });

    // ─── 6. 타이머 조정 (+/- N초, 호스트만) ───
    socket.on('adjust_timer', async ({ roomId, hostId, delta }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.hostId !== hostId) return;

        const current = roomTimerState.get(roomId) ?? 0;
        const nextTime = Math.max(1, current + delta); // 최소 1초
        roomTimerState.set(roomId, nextTime);

        io.to(roomId).emit('timer_tick', { remainingTime: nextTime });
      } catch (err) {
        console.error('adjust_timer error:', err);
      }
    });

    // ─── 7. 타이머 일시정지 (호스트만) ───
    socket.on('pause_timer', async ({ roomId, hostId }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.hostId !== hostId) return;

        roomTimerPaused.set(roomId, true);
        io.to(roomId).emit('timer_paused', { isPaused: true });
      } catch (err) {
        console.error('pause_timer error:', err);
      }
    });

    // ─── 8. 타이머 재개 (호스트만) ───
    socket.on('resume_timer', async ({ roomId, hostId }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.hostId !== hostId) return;

        roomTimerPaused.set(roomId, false);
        io.to(roomId).emit('timer_paused', { isPaused: false });
      } catch (err) {
        console.error('resume_timer error:', err);
      }
    });

    // ─── 9. 현재 아이템 경매 초기화 (호스트만) ───
    socket.on('reset_item', async ({ roomId, hostId }) => {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { items: true }
        });
        if (!room || room.hostId !== hostId || !room.activeItemId) return;

        const activeItem = room.items.find(i => i.id === room.activeItemId);
        if (!activeItem || activeItem.status !== 'ACTIVE') return;

        // 1. 현재 최고 입찰자 환불
        const previousBid = await prisma.bid.findFirst({
          where: { itemId: activeItem.id },
          orderBy: { amount: 'desc' },
          include: { user: true }
        });

        if (previousBid) {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: previousBid.userId },
              data: { points: { increment: previousBid.amount } }
            });
            await tx.pointTransaction.create({
              data: {
                userId: previousBid.userId,
                amount: previousBid.amount,
                reason: 'REFUND_RESET'
              }
            });
            // 2. 해당 아이템의 모든 입찰 기록 삭제
            await tx.bid.deleteMany({ where: { itemId: activeItem.id } });
            
            // 3. 아이템 시작 시간 갱신
            await tx.item.update({
              where: { id: activeItem.id },
              data: { startTime: new Date() }
            });
          });
        }

        // 4. 타이머 초기화 및 재시작
        roomTimerPaused.set(roomId, false);
        startItemTimer(io, roomId, activeItem.id, activeItem.timerDuration);

        io.to(roomId).emit('item_reset', {
          activeItem: { ...activeItem, currentHighest: activeItem.startingPrice, totalBids: 0 },
          remainingTime: activeItem.timerDuration
        });
      } catch (err) {
        console.error('reset_item error:', err);
      }
    });

    // ─── 접속 해제 ───
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ${socket.id}`);
    });
  });
}

// ────────────────────────────────────────────
// 서버 사이드 타이머 유틸리티
// ────────────────────────────────────────────

function startItemTimer(io: Server, roomId: string, itemId: string, durationSeconds: number) {
  clearRoomTimer(roomId);
  roomTimerState.set(roomId, durationSeconds);

  const interval = setInterval(async () => {
    // 일시정지 상태면 초를 줄이지 않음
    if (roomTimerPaused.get(roomId)) {
      return;
    }

    const remaining = (roomTimerState.get(roomId) ?? 0) - 1;
    roomTimerState.set(roomId, remaining);

    io.to(roomId).emit('timer_tick', { remainingTime: remaining });

    if (remaining <= 0) {
      clearInterval(interval);
      roomTimers.delete(roomId);
      roomTimerState.delete(roomId);
      roomTimerPaused.delete(roomId);

      // 낙찰/유찰 처리
      await finalizeItem(io, roomId, itemId);
    }
  }, 1000);

  roomTimers.set(roomId, interval);
}

function clearRoomTimer(roomId: string) {
  const existing = roomTimers.get(roomId);
  if (existing) {
    clearInterval(existing);
    roomTimers.delete(roomId);
    roomTimerState.delete(roomId);
  }
}

async function finalizeItem(io: Server, roomId: string, itemId: string) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
          include: { user: { select: { username: true } } }
        }
      }
    });

    if (!item) return;

    const topBid = item.bids?.[0];

    if (topBid) {
      // 낙찰!
      await prisma.item.update({
        where: { id: itemId },
        data: {
          status: 'SOLD',
          winnerId: topBid.userId,
          finalPrice: topBid.amount,
          endTime: new Date()
        }
      });

      io.to(roomId).emit('item_sold', {
        itemId,
        itemName: item.name,
        winnerId: topBid.userId,
        winnerName: topBid.user.username,
        finalPrice: topBid.amount
      });
    } else {
      // 유찰
      await prisma.item.update({
        where: { id: itemId },
        data: { status: 'PASSED', endTime: new Date() }
      });

      io.to(roomId).emit('item_passed', {
        itemId,
        itemName: item.name
      });
    }
  } catch (err) {
    console.error('finalizeItem error:', err);
  }
}
