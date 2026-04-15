import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useRoom, Item } from '../hooks/useRooms';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type BidderPhase = 'waiting' | 'active' | 'sold' | 'passed' | 'ended';

export function Room() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: room, isLoading, isError } = useRoom(roomId);
  const { socket, isConnected, connect } = useSocketStore();

  const [phase, setPhase] = useState<BidderPhase>('waiting');
  const [activeItem, setActiveItem] = useState<(Item & { currentHighest: number; totalBids: number }) | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [soldInfo, setSoldInfo] = useState<{ winnerName: string; finalPrice: number; itemName: string } | null>(null);
  const [maxTime, setMaxTime] = useState(30);

  useEffect(() => { connect(); }, [connect]);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;
    socket.emit('join_room', { roomId });

    const handleRoomState = (data: any) => {
      if (data.roomStatus === 'ACTIVE' && data.activeItem) {
        setActiveItem(data.activeItem);
        setRemainingTime(data.remainingTime);
        setCurrentIndex(data.currentIndex);
        setTotalItems(data.totalItems);
        if (data.activeItem.status === 'SOLD') {
          setPhase('sold');
        } else if (data.activeItem.status === 'PASSED') {
          setPhase('passed');
        } else {
          setPhase('active');
        }
      } else if (data.roomStatus === 'FINISHED') {
        setPhase('ended');
      }
    };

    const handleAuctionStarted = (data: any) => {
      setActiveItem(data.activeItem);
      setRemainingTime(data.remainingTime);
      setCurrentIndex(data.currentIndex);
      setTotalItems(data.totalItems);
      setMaxTime(data.remainingTime);
      setPhase('active');
      setBidAmount(0);
    };

    const handleItemActive = (data: any) => {
      setActiveItem(data.activeItem);
      setRemainingTime(data.remainingTime);
      setCurrentIndex(data.currentIndex);
      setTotalItems(data.totalItems);
      setMaxTime(data.remainingTime);
      setPhase('active');
      setBidAmount(0);
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

    const handleBidSuccess = (_data: { message: string }) => {
      // 간단한 피드백 - alert 대신 나중에 토스트로
    };

    const handleBidError = (data: { message: string }) => {
      alert(`입찰 실패: ${data.message}`);
    };

    const handleItemSold = (data: any) => {
      setSoldInfo(data);
      setPhase('sold');
    };

    const handleItemPassed = () => {
      setPhase('passed');
    };

    const handleAuctionEnded = () => {
      setPhase('ended');
    };

    socket.on('room_state', handleRoomState);
    socket.on('auction_started', handleAuctionStarted);
    socket.on('item_active', handleItemActive);
    socket.on('timer_tick', handleTimerTick);
    socket.on('update_bid', handleUpdateBid);
    socket.on('bid_success', handleBidSuccess);
    socket.on('bid_error', handleBidError);
    socket.on('item_sold', handleItemSold);
    socket.on('item_passed', handleItemPassed);
    socket.on('auction_ended', handleAuctionEnded);

    return () => {
      socket.off('room_state', handleRoomState);
      socket.off('auction_started', handleAuctionStarted);
      socket.off('item_active', handleItemActive);
      socket.off('timer_tick', handleTimerTick);
      socket.off('update_bid', handleUpdateBid);
      socket.off('bid_success', handleBidSuccess);
      socket.off('bid_error', handleBidError);
      socket.off('item_sold', handleItemSold);
      socket.off('item_passed', handleItemPassed);
      socket.off('auction_ended', handleAuctionEnded);
    };
  }, [socket, isConnected, roomId]);

  const handleBid = () => {
    if (!activeItem || !bidAmount || bidAmount <= activeItem.currentHighest) {
      alert(`최소 입찰가(${(activeItem?.currentHighest ?? 0).toLocaleString()}P)보다 높은 금액을 입력해주세요.`);
      return;
    }
    if (socket && isConnected) {
      socket.emit('new_bid', {
        roomId,
        itemId: activeItem.id,
        amount: bidAmount,
        userId: user?.id
      });
      setBidAmount(0);
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}><Skeleton height={400} /></div>;
  if (isError || !room) return <div style={{ padding: '24px', color: 'var(--danger)' }}>방 정보를 불러올 수 없습니다.</div>;

  const timerColor = remainingTime <= 5 ? 'var(--danger)' : remainingTime <= 10 ? 'var(--primary)' : 'var(--success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 상단 헤더 */}
      <Card title={room.title}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>호스트: {room.host.username}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? 'var(--success)' : 'var(--danger)' }} />
            {isConnected ? '연결됨' : '재연결 중'}
          </div>
        </div>
        {room.hostId === user?.id && (
          <Button variant="secondary" onClick={() => navigate(`/room/${roomId}/host`)}
            style={{ width: '100%', marginTop: '12px' }}>
            🎤 호스트 제어판 열기
          </Button>
        )}
      </Card>

      <AnimatePresence mode="wait">
        {/* ─── 대기 중 ─── */}
        {phase === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card title="">
              <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</motion.div>
                <h3 style={{ margin: '0 0 8px 0' }}>경매 시작 대기 중</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  호스트가 경매를 시작할 때까지 기다려주세요
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── 경매 진행 중 ─── */}
        {phase === 'active' && activeItem && (
          <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 타이머 바 */}
            <div style={{ padding: '12px 16px', background: 'var(--panel-bg)', borderRadius: 'var(--border-radius-md)', 
              border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>아이템 {currentIndex}/{totalItems}</span>
                <motion.span key={remainingTime} initial={{ scale: remainingTime <= 5 ? 1.3 : 1 }} animate={{ scale: 1 }}
                  style={{ fontSize: '24px', fontWeight: 800, color: timerColor }}>
                  {remainingTime}초
                </motion.span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${Math.min(100, (remainingTime / maxTime) * 100)}%` }}
                  style={{ height: '100%', background: timerColor, borderRadius: '3px' }} />
              </div>
            </div>

            {/* 아이템 정보 */}
            <Card title={activeItem.name}>
              {activeItem.imageUrl && (
                <div style={{ width: '100%', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', marginBottom: '16px' }}>
                  <img src={activeItem.imageUrl} alt={activeItem.name}
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                </div>
              )}
              {activeItem.description && (
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0', fontSize: '14px' }}>{activeItem.description}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                  background: activeItem.auctionType === 'OPEN' ? 'rgba(49,130,246,0.1)' : 'rgba(240,68,82,0.1)',
                  color: activeItem.auctionType === 'OPEN' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {activeItem.auctionType === 'OPEN' ? '공개 입찰' : '블라인드'}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
                  입찰 {activeItem.totalBids}회
                </span>
              </div>

              {/* 현재 최고가 */}
              <div style={{
                padding: '20px', borderRadius: 'var(--border-radius-sm)',
                background: 'linear-gradient(135deg, rgba(255,111,0,0.08), rgba(255,111,0,0.02))',
                border: '1px solid rgba(255,111,0,0.2)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>현재 최고 입찰가</div>
                <motion.div key={activeItem.currentHighest}
                  initial={{ scale: 1.2, color: '#FF6F00' }} animate={{ scale: 1, color: 'var(--text-primary)' }}
                  style={{ fontSize: '36px', fontWeight: 800 }}>
                  {activeItem.auctionType === 'OPEN'
                    ? `${activeItem.currentHighest.toLocaleString()} P`
                    : '??? P'}
                </motion.div>
              </div>
            </Card>

            {/* 입찰 영역 */}
            <Card title="">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <Input
                  label="희망 입찰가 (P)"
                  type="number"
                  value={bidAmount || ''}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  placeholder={`최소 ${(activeItem.currentHighest + 1).toLocaleString()}P`}
                  style={{ flex: 1 }}
                />
                <Button variant="primary" onClick={handleBid}
                  style={{ height: '48px', padding: '0 24px', fontSize: '16px', fontWeight: 700 }}>
                  🚀 입찰!
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── 낙찰 ─── */}
        {phase === 'sold' && soldInfo && (
          <motion.div key="sold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card title="">
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}
                  style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</motion.div>
                <h2 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>낙찰!</h2>
                <p style={{ fontSize: '20px', margin: '0 0 4px 0' }}>{soldInfo.itemName}</p>
                <p style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0' }}>{soldInfo.finalPrice.toLocaleString()} P</p>
                <p style={{ color: 'var(--text-secondary)' }}>낙찰자: {soldInfo.winnerName}</p>
                {soldInfo.winnerName === user?.username && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,111,0,0.1)', borderRadius: 'var(--border-radius-sm)', color: 'var(--primary)', fontWeight: 600 }}>
                    🏆 축하합니다! 낙찰되었습니다!
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── 유찰 ─── */}
        {phase === 'passed' && (
          <motion.div key="passed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card title="">
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>😔</div>
                <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>유찰</h2>
                <p style={{ color: 'var(--text-secondary)' }}>다음 아이템을 기다려주세요</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── 경매 종료 ─── */}
        {phase === 'ended' && (
          <motion.div key="ended" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card title="">
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏁</div>
                <h2 style={{ margin: '0 0 8px 0' }}>경매 종료</h2>
                <p style={{ color: 'var(--text-secondary)' }}>참여해주셔서 감사합니다!</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="secondary" onClick={() => navigate('/')}>
        로비로 나가기
      </Button>
    </div>
  );
}
