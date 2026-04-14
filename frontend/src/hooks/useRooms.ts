import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api';

export interface Room {
  id: string;
  title: string;
  hostId: string;
  createdAt: string;
  updatedAt: string;
  host: {
    username: string;
  };
  _count: {
    items: number;
  };
  items?: Item[];
}

export interface Item {
  id: string;
  roomId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  startingPrice: number;
  auctionType: 'OPEN' | 'BLIND';
  status: 'PENDING' | 'ACTIVE' | 'SOLD' | 'PASSED';
  createdAt: string;
  updatedAt: string;
  bids?: { amount: number }[];
  _count?: {
    bids: number;
  };
}

// 전체 방 목록 조회
export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/rooms`);
      if (!res.ok) throw new Error('방 목록을 불러오지 못했습니다.');
      return res.json();
    },
  });
}

// 새로운 방 생성
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, hostId }: { title: string; hostId: string }) => {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, hostId }),
      });
      if (!res.ok) throw new Error('방을 생성하지 못했습니다.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

// 특정 방 및 아이템 목록 상세 조회
export function useRoom(roomId: string | undefined) {
  return useQuery<Room>({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/rooms/${roomId}`);
      if (!res.ok) throw new Error('방 상세 정보를 불러오지 못했습니다.');
      return res.json();
    },
    enabled: !!roomId,
  });
}

export interface CreateItemPayload {
  roomId: string;
  name: string;
  description?: string;
  startingPrice: number;
  auctionType: 'OPEN' | 'BLIND';
  imageUrl?: string;
}

// 방에 새로운 아이템 추가
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateItemPayload) => {
      const res = await fetch(`${API_URL}/rooms/${payload.roomId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('아이템을 등록하지 못했습니다.');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] });
    },
  });
}
