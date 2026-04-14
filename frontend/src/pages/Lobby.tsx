import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRooms, useCreateRoom } from '../hooks/useRooms';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Skeleton } from '../components/common/Skeleton';
import { BottomSheetModal } from '../components/common/BottomSheetModal';
import { RoomCard } from '../components/lobby/RoomCard';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export function Lobby() {
  const { connect, disconnect, isConnected } = useSocketStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const { data: rooms, isLoading, isError } = useRooms();
  const createRoomMutation = useCreateRoom();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim() || !user) return;

    try {
      const newRoom = await createRoomMutation.mutateAsync({
        title: newRoomTitle.trim(),
        hostId: user.id
      });
      setIsModalOpen(false);
      setNewRoomTitle('');
      // 경매방 설정 페이지로 이동
      navigate(`/room/${newRoom.id}/settings`);
    } catch (error) {
      alert('방 생성에 실패했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingBottom: '80px' }}>
      
      {/* Header Profile */}
      <Card title={`환영합니다, ${user?.username || '게스트'}님!`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '18px', margin: 0 }}>
            {user?.points?.toLocaleString() || 0} P
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }} />
              {isConnected ? '온라인' : '오프라인'}
            </div>
            <Button variant="secondary" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '14px' }}>
              로그아웃
            </Button>
          </div>
        </div>
      </Card>

      {/* Room List Section */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>현재 진행 중인 경매</h2>
        
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height={110} />
            <Skeleton height={110} />
            <Skeleton height={110} />
          </div>
        )}

        {isError && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', backgroundColor: 'rgba(240, 68, 82, 0.1)', borderRadius: 'var(--border-radius-md)' }}>
            경매 방 목록을 불러오지 못했습니다.
          </div>
        )}

        {!isLoading && !isError && rooms?.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
            아직 개설된 경매 방이 없습니다.<br/>첫 번째 경매 방을 만들어보세요!
          </div>
        )}

        {!isLoading && !isError && rooms && rooms.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onClick={(id) => navigate(`/room/${id}`)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB: Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'max(24px, env(safe-area-inset-bottom))',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(255, 111, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <Plus size={28} />
      </motion.button>

      {/* Create Room Bottom Sheet */}
      <BottomSheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="새 경매 방 만들기"
      >
        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="경매 방 제목"
            value={newRoomTitle}
            onChange={(e) => setNewRoomTitle(e.target.value)}
            placeholder="눈길을 끄는 멋진 제목을 입력해주세요"
            required
            autoFocus
          />
          <Button 
            type="submit" 
            variant="primary" 
            disabled={createRoomMutation.isPending || !newRoomTitle.trim()}
          >
            {createRoomMutation.isPending ? '생성 중...' : '방 생성하기'}
          </Button>
        </form>
      </BottomSheetModal>
      
    </div>
  );
}
