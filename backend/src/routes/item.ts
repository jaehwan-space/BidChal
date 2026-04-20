import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router({ mergeParams: true });

// 새 아이템 생성 (핵심 비즈니스 로직 - 경매 타입 지정)
router.post('/', async (req, res) => {
  try {
    const { roomId } = req.params as { roomId: string };
    const { name, description, startingPrice, auctionType, imageUrl, timerDuration } = req.body;

    if (!name || !startingPrice || !auctionType) {
      return res.status(400).json({ error: 'name, startingPrice, auctionType are required' });
    }

    // 기존 아이템 갯수를 파악하여 맨 뒤 요소의 order 결정
    const count = await prisma.item.count({ where: { roomId } });

    const item = await prisma.item.create({
      data: {
        roomId,
        name,
        description,
        startingPrice,
        auctionType, // 'OPEN' or 'BLIND'
        imageUrl,
        timerDuration: timerDuration || 30,
        order: count
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('lobby_update');
    }

    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// 방에 속한 아이템 목록 조회
router.get('/', async (req, res) => {
  try {
    const { roomId } = req.params as { roomId: string };
    const items = await prisma.item.findMany({
      where: { roomId },
      orderBy: [ { order: 'asc' }, { createdAt: 'asc' } ]
    });
    
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// 아이템 삭제
router.delete('/:itemId', async (req, res) => {
  try {
    const { roomId, itemId } = req.params as { roomId: string; itemId: string };
    
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'PENDING') return res.status(400).json({ error: 'Cannot delete an item that already started' });

    await prisma.item.delete({ where: { id: itemId } });

    // 삭제된 아이템 위의 순서들을 당김
    await prisma.item.updateMany({
      where: { roomId, order: { gt: item.order } },
      data: { order: { decrement: 1 } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// 아이템 정보 수정
router.put('/:itemId', async (req, res) => {
  try {
    const { roomId, itemId } = req.params as { roomId: string; itemId: string };
    const { name, description, startingPrice, auctionType, timerDuration, imageUrl } = req.body;

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.roomId !== roomId) return res.status(400).json({ error: 'Invalid room' });
    if (item.status !== 'PENDING') return res.status(400).json({ error: 'Cannot modify an item that already started or finished' });

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: name !== undefined ? name : item.name,
        description: description !== undefined ? description : item.description,
        startingPrice: startingPrice !== undefined ? startingPrice : item.startingPrice,
        auctionType: auctionType !== undefined ? auctionType : item.auctionType,
        timerDuration: timerDuration !== undefined ? timerDuration : item.timerDuration,
        imageUrl: imageUrl !== undefined ? imageUrl : item.imageUrl,
      }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// 아이템 순서 변경
router.put('/:itemId/reorder', async (req, res) => {
  try {
    const { roomId, itemId } = req.params as { roomId: string; itemId: string };
    const { direction } = req.body as { direction: 'up' | 'down' };

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const targetOrder = direction === 'up' ? item.order - 1 : item.order + 1;

    // 자리 바꿀 대상 찾기
    const swapTarget = await prisma.item.findFirst({
      where: { roomId, order: targetOrder }
    });

    if (!swapTarget) return res.status(400).json({ error: 'Invalid move' });

    // 트랜잭션으로 순서 스왑
    await prisma.$transaction([
      prisma.item.update({ where: { id: item.id }, data: { order: targetOrder } }),
      prisma.item.update({ where: { id: swapTarget.id }, data: { order: item.order } })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reorder item' });
  }
});

export default router;
