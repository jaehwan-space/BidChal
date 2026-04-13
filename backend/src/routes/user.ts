import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// 임시 게스트 회원가입 API (테스트용)
router.post('/guest', async (req, res) => {
  try {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const username = `Guest_${randomNum}`;

    const user = await prisma.user.create({
      data: {
        username,
        points: 10000 // 가입 시 초기 지급금
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

export default router;
