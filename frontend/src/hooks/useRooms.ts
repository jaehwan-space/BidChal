import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api';

export interface Room {
  id: string;
  title: string;
  hostId: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  activeItemId: string | null;
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
  timerDuration: number;
  status: 'PENDING' | 'ACTIVE' | 'SOLD' | 'PASSED';
  winnerId: string | null;
  finalPrice: number | null;
  createdAt: string;
  updatedAt: string;
  bids?: { amount: number; userId: string }[];
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
  timerDuration?: number;
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

// 이미지 업로드
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('이미지 업로드에 실패했습니다.');
      return res.json() as Promise<{ imageUrl: string }>;
    },
  });
}

// 아이템 삭제
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, itemId }: { roomId: string; itemId: string }) => {
      const res = await fetch(`${API_URL}/rooms/${roomId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '아이템을 삭제하지 못했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] });
    },
  });
}

// 아이템 순서 변경
export function useReorderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, itemId, direction }: { roomId: string; itemId: string; direction: 'up' | 'down' }) => {
      const res = await fetch(`${API_URL}/rooms/${roomId}/items/${itemId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error('순서 변경에 실패했습니다.');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] });
    },
  });
}

// 아이템 수정
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, itemId, payload }: { roomId: string; itemId: string; payload: Partial<CreateItemPayload> }) => {
      const res = await fetch(`${API_URL}/rooms/${roomId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '아이템을 수정하지 못했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] });
    },
  });
}
