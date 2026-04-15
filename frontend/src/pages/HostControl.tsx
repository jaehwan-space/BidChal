import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, Item } from '../hooks/useRooms';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';

type AuctionPhase = 'waiting' | 'active' | 'sold' | 'passed' | 'ended';

export function HostControl() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: room, isLoading, isError, refetch } = useRoom(roomId);
  const { socket, isConnected, connect } = useSocketStore();

  const [phase, setPhase] = useState<AuctionPhase>('waiting');
  const [activeItem, setActiveItem] = useState<(Item & { currentHighest: number; totalBids: number }) | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => { connect(); }, [connect]);

  // 호스트 가드
  useEffect(() => {
    if (room && user && room.hostId !== user.id) {
      alert('호스트만 접근할 수 있습니다.');
      navigate(`/room/${roomId}`);
    }
  }, [room, user, roomId, navigate]);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;
    socket.emit('join_room', { roomId });

    const handleRoomState = (data: any) => {
      if (data.roomStatus === 'ACTIVE' && data.activeItem) {
        setActiveItem(data.activeItem);
        setRemainingTime(data.remainingTime);
        setCurrentIndex(data.currentIndex);
        setTotalItems(data.totalItems);
        setPhase('active');
      } else if (data.roomStatus === 'FINISHED') {
        setPhase('ended');
      } else {
        setTotalItems(data.totalItems);
      }
    };

    const handleAuctionStarted = (data: any) => {
      setActiveItem(data.activeItem);
      setRemainingTime(data.remainingTime);
      setCurrentIndex(data.currentIndex);
      setTotalItems(data.totalItems);
      setPhase('active');
    };

    const handleItemActive = (data: any) => {
      setActiveItem(data.activeItem);
      setRemainingTime(data.remainingTime);
      setCurrentIndex(data.currentIndex);
      setTotalItems(data.totalItems);
      setPhase('active');
    };

    const handleTimerTick = (data: { remainingTime: number }) => {
      setRemainingTime(data.remainingTime);
    };

    const handleUpdateBid = (data: any) => {
      setActiveItem(prev => {
        if (!prev || prev.id !== data.itemId) return prev;
        return { ...prev, currentHighest: data.newAmount, totalBids: data.totalBids };
      });
    };

    const handleItemSold = () => {
      setPhase('sold');
    };

    const handleItemPassed = () => {
      setPhase('passed');
    };

    const handleAuctionEnded = () => {
      setPhase('ended');
      refetch();
    };

    socket.on('room_state', handleRoomState);
    socket.on('auction_started', handleAuctionStarted);
    socket.on('item_active', handleItemActive);
    socket.on('timer_tick', handleTimerTick);
    socket.on('update_bid', handleUpdateBid);
    socket.on('item_sold', handleItemSold);
    socket.on('item_passed', handleItemPassed);
    socket.on('auction_ended', handleAuctionEnded);

    return () => {
      socket.off('room_state', handleRoomState);
      socket.off('auction_started', handleAuctionStarted);
      socket.off('item_active', handleItemActive);
      socket.off('timer_tick', handleTimerTick);
      socket.off('update_bid', handleUpdateBid);
      socket.off('item_sold', handleItemSold);
      socket.off('item_passed', handleItemPassed);
      socket.off('auction_ended', handleAuctionEnded);
    };
  }, [socket, isConnected, roomId, refetch]);

  const handleStartAuction = () => {
    if (socket && isConnected) {
      socket.emit('start_auction', { roomId, hostId: user?.id });
    }
  };

  const handleNextItem = () => {
    if (socket && isConnected) {
      socket.emit('next_item', { roomId, hostId: user?.id });
    }
  };

  const handleExtendTimer = () => {
    if (socket && isConnected) {
      socket.emit('extend_timer', { roomId, hostId: user?.id });
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}><Skeleton height={400} /></div>;
  if (isError || !room) return <div style={{ padding: '24px', color: 'var(--danger)' }}>방 정보를 불러올 수 없습니다.</div>;
  if (room.hostId !== user?.id) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 헤더 */}
      <Card title={`🎤 호스트 제어판: ${room.title}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? 'var(--success)' : 'var(--danger)' }} />
            {isConnected ? '실시간 통신 중' : '재연결 중...'}
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            등록 아이템: {room.items?.length || 0}개
          </span>
        </div>
      </Card>

      {/* 디스플레이 URL 안내 */}
      <Card title="📺 디스플레이 화면">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
          TV/프로젝터에 아래 URL을 띄워주세요:
        </p>
        <div style={{
          padding: '12px 16px', background: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '14px',
          wordBreak: 'break-all'
        }}>
          {window.location.origin}/room/{roomId}/display
        </div>
      </Card>

      {/* 대기 중 */}
      {phase === 'waiting' && (
        <Card title="경매 준비 완료">
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            등록된 아이템 {totalItems || room.items?.length || 0}개가 경매를 기다리고 있습니다.
          </p>
          <Button variant="primary" onClick={handleStartAuction}
            disabled={!isConnected || (room.items?.length || 0) === 0}
            style={{ width: '100%', padding: '16px', fontSize: '18px' }}>
            🎬 경매 시작!
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/room/${roomId}/settings`)}
            style={{ width: '100%', marginTop: '12px' }}>
            ⚙️ 아이템 추가 등록하기
          </Button>
        </Card>
      )}

      {/* 경매 진행 중 */}
      {phase === 'active' && activeItem && (
        <>
          <Card title={`아이템 ${currentIndex}/${totalItems}: ${activeItem.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>경매 유형</span>
                <span style={{ fontWeight: 600, color: activeItem.auctionType === 'OPEN' ? 'var(--success)' : 'var(--danger)' }}>
                  {activeItem.auctionType === 'OPEN' ? '공개' : '블라인드'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>시작가</span>
                <span>{activeItem.startingPrice.toLocaleString()} P</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>현재 최고가</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '20px' }}>
                  {activeItem.currentHighest.toLocaleString()} P
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>입찰 횟수</span>
                <span>{activeItem.totalBids}회</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '16px', fontSize: '32px', fontWeight: 800,
                color: remainingTime <= 5 ? 'var(--danger)' : remainingTime <= 10 ? 'var(--primary)' : 'var(--success)',
              }}>
                ⏱️ {remainingTime}초
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={handleExtendTimer} style={{ flex: 1, padding: '14px' }}>
              ⏱️ +10초 연장
            </Button>
          </div>
        </>
      )}

      {/* 낙찰/유찰 후 */}
      {(phase === 'sold' || phase === 'passed') && (
        <Card title={phase === 'sold' ? '🎉 낙찰 완료!' : '😔 유찰'}>
          <Button variant="primary" onClick={handleNextItem}
            style={{ width: '100%', padding: '16px', fontSize: '18px', marginTop: '12px' }}>
            ⏭️ 다음 아이템으로
          </Button>
        </Card>
      )}

      {/* 경매 종료 */}
      {phase === 'ended' && (
        <Card title="🏁 경매 종료">
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>모든 아이템의 경매가 완료되었습니다.</p>
          <Button variant="secondary" onClick={() => navigate('/')} style={{ width: '100%' }}>
            로비로 돌아가기
          </Button>
        </Card>
      )}

      {/* 하단 */}
      <Button variant="secondary" onClick={() => navigate('/')}>
        로비로 나가기
      </Button>
    </div>
  );
}
