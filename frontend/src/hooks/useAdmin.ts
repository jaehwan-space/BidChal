import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = '/api';

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// ── Users ──

export function useAdminUsers(filters?: { q?: string; status?: string; role?: string }) {
  const { q, status, role } = filters || {};
  return useQuery({
    queryKey: ['admin_users', q, status, role],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status && status !== 'ALL') params.set('status', status);
      if (role && role !== 'ALL') params.set('role', role);

      const res = await fetch(`${API_URL}/admin/users?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('유저 목록을 불러오지 못했습니다.');
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useAdminUserLogs(userId: string | null) {
  return useQuery({
    queryKey: ['admin_user_logs', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${API_URL}/admin/users/${userId}/logs`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('유저 이력을 불러오지 못했습니다.');
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 3000,
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' }) => {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('유저 상태 변경 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    }
  });
}

export function useBatchChargePoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userIds, amount }: { userIds: string[]; amount: number }) => {
      const res = await fetch(`${API_URL}/admin/users/batch-charge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userIds, amount })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '일괄 포인트 지급 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    }
  });
}

// ── Rooms ──

export function useAdminRooms() {
  return useQuery({
    queryKey: ['admin_rooms'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/rooms`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('경매방 목록을 불러오지 못했습니다.');
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('방 삭제 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_rooms'] });
    }
  });
}

// ── Coupons ──

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin_coupons'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/coupons`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('쿠폰 목록을 불러오지 못했습니다.');
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useCreateCoupons() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { rewardAmount: number; count: number }) => {
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '쿠폰 발행 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_coupons'] });
    }
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (couponId: string) => {
      const res = await fetch(`${API_URL}/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '쿠폰 삭제 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_coupons'] });
    }
  });
}
