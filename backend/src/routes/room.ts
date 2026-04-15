import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// 호스트가 새로운 방을 생성
router.post('/', async (req, res) => {
  try {
    const { title, hostId } = req.body;
    
    if (!title || !hostId) {
      return res.status(400).json({ error: 'title and hostId are required' });
    }

    const room = await prisma.room.create({
      data: {
        title,
        hostId
      }
    });

    // 방 생성 후 로비 업데이트 브로드캐스트
    const io = req.app.get('io');
    if (io) {
      io.emit('lobby_update');
    }

    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// 전체 방 목록 조회
router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        host: {
          select: { username: true }
        },
        _count: {
          select: { items: true }
        }
      }
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// 단일 방 및 아이템 목록 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        host: {
          select: { username: true }
        },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            bids: {
              orderBy: { amount: 'desc' },
              take: 1
            },
            _count: {
              select: { bids: true }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
});

export default router;
