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

export default router;
