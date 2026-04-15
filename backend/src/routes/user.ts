import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

export const authenticate = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/users/mypage -> 현재 유저의 지갑 잔액, 최근 트랜잭션, 낙찰 받은 아이템 조회
router.get('/mypage', authenticate, async (req: any, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, points: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 트랜잭션 내역 (최근 20개)
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 낙찰 내역 (자신이 winnerId로 기록된 아이템들)
    const wonItems = await prisma.item.findMany({
      where: { winnerId: userId, status: 'SOLD' },
      include: { room: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      user,
      transactions,
      wonItems,
    });
  } catch (error) {
    console.error('Mypage Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch mypage data' });
  }
});

// POST /api/users/charge -> 테스트용 포인트 충전 API
router.post('/charge', authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const { amount } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid charge amount' });
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 포인트 수정
      const user = await tx.user.update({
        where: { id: userId },
        data: { points: { increment: amount } },
      });

      // 내역 기록
      await tx.pointTransaction.create({
        data: {
          userId,
          amount,
          reason: 'CHARGE',
        },
      });

      return user;
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Point Charge Error:', error);
    res.status(500).json({ error: 'Failed to charge points' });
  }
});

// PUT /api/users/profile -> 닉네임 변경
router.put('/profile', authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const { username } = req.body;

  if (!username || username.length < 2) {
    return res.status(400).json({ error: '닉네임은 2글자 이상이어야 합니다.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: { id: true, username: true, points: true }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/gift -> 다른 유저에게 포인트 선물
router.post('/gift', authenticate, async (req: any, res) => {
  const senderId = req.user.userId;
  const { targetUsername, amount } = req.body;

  if (!targetUsername || !amount || amount <= 0) {
    return res.status(400).json({ error: '올바른 수신자와 금액을 입력하세요.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { id: senderId } });
      const receiver = await tx.user.findUnique({ where: { username: targetUsername } });

      if (!sender || sender.points < amount) {
        throw new Error('잔액이 부족합니다.');
      }
      if (!receiver || receiver.id === senderId) {
        throw new Error('올바르지 않은 대상입니다.');
      }

      await tx.user.update({ where: { id: senderId }, data: { points: { decrement: amount } } });
      await tx.user.update({ where: { id: receiver.id }, data: { points: { increment: amount } } });

      await tx.pointTransaction.create({ data: { userId: senderId, amount: -amount, reason: 'CHARGE' } }); // using CHARGE enum as general ledger for now
      await tx.pointTransaction.create({ data: { userId: receiver.id, amount: amount, reason: 'CHARGE' } });
    });

    // Re-fetch user
    const updatedSender = await prisma.user.findUnique({ where: { id: senderId }, select: { points: true } });
    res.json({ success: true, points: updatedSender?.points });
  } catch (error: any) {
    console.error('Point Gift Error:', error);
    res.status(400).json({ error: error.message || '포인트 선물에 실패했습니다.' });
  }
});

// POST /api/users/coupon -> 쿠폰 코드 입력 또는 QR 스캔 텍스트
router.post('/coupon', authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: '쿠폰 코드를 입력하세요.' });

  let rewardAmount = 0;
  // 간단한 Mock 쿠폰 로직
  if (code.toUpperCase().includes('BIDCHAL-100')) rewardAmount = 100000;
  else if (code.toUpperCase().includes('WELCOME')) rewardAmount = 50000;
  else {
    return res.status(400).json({ error: '유효하지 않은 쿠폰입니다.' });
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { points: { increment: rewardAmount } },
      });
      await tx.pointTransaction.create({
        data: { userId, amount: rewardAmount, reason: 'CHARGE' },
      });
      return user;
    });

    res.json({ success: true, amount: rewardAmount, points: updatedUser.points });
  } catch (error) {
    console.error('Coupon Error:', error);
    res.status(500).json({ error: '쿠폰 처리에 실패했습니다.' });
  }
});

export default router;
