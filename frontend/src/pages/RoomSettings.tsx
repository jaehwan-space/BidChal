import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useRoom, useCreateItem, CreateItemPayload } from '../hooks/useRooms';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';
import { CheckCircle2, Lock } from 'lucide-react';

export function RoomSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { data: room, isLoading, isError } = useRoom(id);
  const createItemMutation = useCreateItem();

  const [formData, setFormData] = useState<Omit<CreateItemPayload, 'roomId'>>({
    name: '',
    description: '',
    startingPrice: 1000,
    auctionType: 'OPEN',
  });

  // 호스트 가드
  useEffect(() => {
    if (room && user && room.hostId !== user.id) {
      alert('방 설정은 개설자만 접근할 수 있습니다.');
      navigate(`/room/${id}`);
    }
  }, [room, user, id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'startingPrice' ? Number(value) : value,
    }));
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createItemMutation.mutateAsync({
        roomId: id,
        ...formData
      });
      setFormData({ name: '', description: '', startingPrice: 1000, auctionType: 'OPEN' });
      alert('아이템이 등록되었습니다!');
    } catch (err) {
      alert('아이템 등록에 실패했습니다.');
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}><Skeleton height={400} /></div>;
  if (isError || !room) return <div style={{ padding: '24px', color: 'var(--danger)' }}>방 정보를 불러올 수 없습니다.</div>;
  if (room.hostId !== user?.id) return null; // 튕기기 전 살짝 보이는 렌더링 방지

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title={`경매 설정: ${room.title}`}>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '24px' }}>
          경매에 부칠 새로운 아이템을 등록하세요.
        </p>
        
        <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input 
            label="아이템 이름" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="예) 한정판 콜라보레이션 운동화" 
            required 
          />
          <Input 
            label="간단한 설명" 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="예) 상자 풀 소장 미개봉품" 
          />
          <Input 
            label="시작 가격(P)" 
            type="number" 
            name="startingPrice" 
            value={formData.startingPrice} 
            onChange={handleChange} 
            min={100} 
            required 
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>경매 방식 선택</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                type="button"
                variant={formData.auctionType === 'OPEN' ? 'primary' : 'secondary'}
                onClick={() => setFormData({ ...formData, auctionType: 'OPEN' })}
                style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
              >
                <CheckCircle2 size={18} /> 일반 공개 입찰
              </Button>
              <Button 
                type="button"
                variant={formData.auctionType === 'BLIND' ? 'primary' : 'secondary'}
                onClick={() => setFormData({ ...formData, auctionType: 'BLIND' })}
                style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
              >
                <Lock size={18} /> 비공개 (블라인드)
              </Button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {formData.auctionType === 'OPEN' 
                ? '최고 입찰가가 갱신될 때마다 참가자 전원에게 알림과 실시간 가격이 공유됩니다.' 
                : '입찰 현황이 숨겨지며 참가자는 치열한 심리전을 펼치게 됩니다.'}
            </span>
          </div>

          <Button type="submit" disabled={createItemMutation.isPending} style={{ marginTop: '16px' }}>
            {createItemMutation.isPending ? '등록 중...' : '아이템 성공적으로 등록하기'}
          </Button>
        </form>
      </Card>

      {/* 등록된 아이템 리스트 */}
      <Card title={`등록된 아이템 목록 (${room.items?.length || 0})`}>
        {room.items?.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>등록된 아이템이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {room.items?.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.name}
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: item.auctionType === 'OPEN' ? 'rgba(49, 130, 246, 0.1)' : 'rgba(240, 68, 82, 0.1)', color: item.auctionType === 'OPEN' ? 'var(--success)' : 'var(--danger)' }}>
                      {item.auctionType === 'OPEN' ? '공개' : '블라인드'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    시작가: {item.startingPrice.toLocaleString()} P | 입찰자: {item._count?.bids || 0} 명
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginTop: '32px' }}>
          <Button variant="primary" onClick={() => navigate(`/room/${id}`)} style={{ width: '100%', padding: '16px' }}>
            🎉 모든 준비 완료! 경매장 입장하기
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')} style={{ width: '100%', marginTop: '12px' }}>
            로비로 나가기
          </Button>
        </div>
      </Card>
    </div>
  );
}
