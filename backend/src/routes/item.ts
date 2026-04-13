import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router({ mergeParams: true });

// 새 아이템 생성 (핵심 비즈니스 로직 - 경매 타입 지정)
router.post('/', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, startingPrice, auctionType, imageUrl } = req.body;

    if (!name || !startingPrice || !auctionType) {
      return res.status(400).json({ error: 'name, startingPrice, auctionType are required' });
    }

    const item = await prisma.item.create({
      data: {
        roomId,
        name,
        description,
        startingPrice,
        auctionType, // 'OPEN' or 'BLIND'
        imageUrl
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// 방에 속한 아이템 목록 조회
router.get('/', async (req, res) => {
  try {
    const { roomId } = req.params;
    const items = await prisma.item.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

export default router;
