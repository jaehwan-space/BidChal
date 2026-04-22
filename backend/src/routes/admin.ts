import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

// 어드민 검증 미들웨어
const authorizeAdmin = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
        return res.status(403).json({ error: 'Invalid or suspended account' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    
    req.user = { userId, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ------------------------------------
// User Management
// ------------------------------------

// 1. 유저 전체 목록 조회 (검색 및 필터링)
router.get('/users', authorizeAdmin, async (req, res) => {
  try {
    const { q, status, role } = req.query as { q?: string; status?: string; role?: string };
    
    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (role && role !== 'ALL') {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        points: true,
        role: true,
        status: true,
        createdAt: true,
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 1-1. 일괄 포인트 지급 (신규)
router.post('/users/batch-charge', authorizeAdmin, async (req, res) => {
  try {
    const { userIds, amount } = req.body as { userIds: string[]; amount: number };
    
    if (!userIds || userIds.length === 0 || !amount || amount <= 0) {
      return res.status(400).json({ error: '올바른 유저 목록과 지급 포인트를 입력하세요.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. 선택된 각 유저 정보 가져오기 및 포인트 증가, 거래 로그 작성
      for (const uid of userIds) {
        await tx.user.update({
          where: { id: uid },
          data: { points: { increment: amount } }
        });

        // 2. PointTransaction 기록
        await tx.pointTransaction.create({
          data: {
            userId: uid,
            amount: amount,
            reason: 'CHARGE'
          }
        });

        // 3. UserActivityLog 상세 기록
        await tx.userActivityLog.create({
          data: {
            userId: uid,
            action: 'ADMIN_CHARGE',
            details: `관리자에 의해 ${amount.toLocaleString()}P 일괄 지급됨`
          }
        });
      }
    });

    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to batch charge' });
  }
});

// 2. 유저 상세 활동 내역 (통합 세분화 로그)
router.get('/users/:id/logs', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.userActivityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 200 // 최근 200건
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// 3. 유저 상태 변경 (정지/탈퇴)
router.put('/users/:id/status', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' };
    
    // 자기 자신은 정지/삭제 못하게 방어
    if ((req as any).user.userId === id) {
      return res.status(400).json({ error: '자신의 상태는 변경할 수 없습니다.' });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { status }
      });

      await tx.userActivityLog.create({
        data: {
          userId: id,
          action: 'STATUS_CHANGE',
          details: `계정 상태가 [${status}](으)로 변경됨`
        }
      });
      return u;
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change user status' });
  }
});

// ------------------------------------
// Room Management
// ------------------------------------

// 1. 개설된 전체 방 모니터링
router.get('/rooms', authorizeAdmin, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: { username: true, email: true } },
        _count: { select: { items: true } }
      }
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// 2. 불건전한 방/아이템 강제 삭제
router.delete('/rooms/:roomId', authorizeAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Cascade 삭제를 위한 직접 삭제 처리 (또는 Room status 변경)
    // 현재 스키마에 방 강제 삭제를 위해 items 및 bids 를 먼저 지워줘야 할 수 있음
    await prisma.$transaction(async (tx) => {
      // 해당 방의 입찰 내역 삭제
      const items = await tx.item.findMany({ where: { roomId }, select: { id: true } });
      for (const item of items) {
         await tx.bid.deleteMany({ where: { itemId: item.id } });
      }
      // 아이템 삭제
      await tx.item.deleteMany({ where: { roomId } });
      // 방 삭제
      await tx.room.delete({ where: { id: roomId } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ------------------------------------
// Coupon Management
// ------------------------------------

// 1. 발급된 쿠폰 조회
router.get('/coupons', authorizeAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: { select: { username: true, email: true } }
      }
    });
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// 2. 대량 쿠폰 생성
router.post('/coupons', authorizeAdmin, async (req, res) => {
  try {
    const { rewardAmount, count } = req.body as { rewardAmount: number, count: number };
    
    if (!rewardAmount || !count || count <= 0 || count > 100) {
      return res.status(400).json({ error: '유효한 금액과 개수(최대 100개)를 입력하세요.' });
    }

    const newCoupons = [];
    for (let i = 0; i < count; i++) {
      // 12자리 영문대소숫자 무작위 생성
      const code = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      newCoupons.push({
        code,
        rewardAmount
      });
    }

    await prisma.coupon.createMany({
      data: newCoupons
    });

    res.status(201).json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create coupons' });
  }
});

// 3. 사용되지 않은 쿠폰 폐기
router.delete('/coupons/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (coupon.isUsed) return res.status(400).json({ error: 'Cannot delete an already used coupon.' });

    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
