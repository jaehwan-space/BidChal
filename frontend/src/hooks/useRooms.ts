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
