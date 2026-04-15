import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocketStore } from '../store/useSocketStore';
import { Item } from '../hooks/useRooms';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveItemState {
  item: Item & { currentHighest: number; totalBids: number };
  remainingTime: number;
  totalItems: number;
  currentIndex: number;
}

type DisplayPhase = 'waiting' | 'active' | 'sold' | 'passed' | 'ended';

export function DisplayView() {
  const { id: roomId } = useParams<{ id: string }>();
  const { socket, isConnected, connect } = useSocketStore();

  const [phase, setPhase] = useState<DisplayPhase>('waiting');
  const [activeState, setActiveState] = useState<ActiveItemState | null>(null);
  const [soldInfo, setSoldInfo] = useState<{ winnerName: string; finalPrice: number; itemName: string } | null>(null);
  const [passedInfo, setPassedInfo] = useState<{ itemName: string } | null>(null);

  useEffect(() => { connect(); }, [connect]);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;
    socket.emit('join_room', { roomId });

    const handleRoomState = (data: any) => {
      if (data.roomStatus === 'ACTIVE' && data.activeItem) {
        setActiveState({
          item: data.activeItem,
          remainingTime: data.remainingTime,
          totalItems: data.totalItems,
          currentIndex: data.currentIndex,
        });
        setPhase('active');
      } else if (data.roomStatus === 'FINISHED') {
        setPhase('ended');
      }
    };

    const handleAuctionStarted = (data: any) => {
      setActiveState({
        item: data.activeItem,
        remainingTime: data.remainingTime,
        totalItems: data.totalItems,
        currentIndex: data.currentIndex,
      });
      setPhase('active');
    };

    const handleItemActive = (data: any) => {
      setActiveState({
        item: data.activeItem,
        remainingTime: data.remainingTime,
        totalItems: data.totalItems,
        currentIndex: data.currentIndex,
      });
      setPhase('active');
    };

    const handleTimerTick = (data: { remainingTime: number }) => {
      setActiveState(prev => prev ? { ...prev, remainingTime: data.remainingTime } : null);
    };

    const handleUpdateBid = (data: { itemId: string; newAmount: number; lastBidderName: string; totalBids: number }) => {
      setActiveState(prev => {
        if (!prev || prev.item.id !== data.itemId) return prev;
        return {
          ...prev,
          item: { ...prev.item, currentHighest: data.newAmount, totalBids: data.totalBids },
        };
      });
    };

    const handleItemSold = (data: { itemName: string; winnerName: string; finalPrice: number }) => {
      setSoldInfo(data);
      setPhase('sold');
    };

    const handleItemPassed = (data: { itemName: string }) => {
      setPassedInfo(data);
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
  }, [socket, isConnected, roomId]);

  // 타이머 비율 계산 (원형 프로그레스용)
  const timerRatio = activeState
    ? activeState.remainingTime / (activeState.item.timerDuration || 30)
    : 1;

  const timerColor = activeState
    ? activeState.remainingTime <= 5 ? '#F04452' : activeState.remainingTime <= 10 ? '#FF6F00' : '#3182F6'
    : '#3182F6';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      color: 'white', overflow: 'hidden', position: 'relative',
    }}>

      {/* ─── 대기 화면 ─── */}
      <AnimatePresence mode="wait">
        {phase === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}>
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              style={{ fontSize: '80px', marginBottom: '24px' }}>🎤</motion.div>
            <h1 style={{ fontSize: '48px', fontWeight: 700, margin: 0, marginBottom: '16px' }}>경매가 곧 시작됩니다</h1>
            <p style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)' }}>호스트가 경매를 시작할 때까지 잠시 기다려주세요</p>
          </motion.div>
        )}

        {/* ─── 경매 진행 화면 ─── */}
        {phase === 'active' && activeState && (
          <motion.div key="active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', width: '90%', maxWidth: '1200px' }}>

            {/* 상단: 아이템 번호 */}
            <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)' }}>
              아이템 {activeState.currentIndex} / {activeState.totalItems}
            </div>

            {/* 메인 영역: 이미지 + 정보 */}
            <div style={{ display: 'flex', gap: '48px', alignItems: 'center', width: '100%' }}>
              {/* 아이템 이미지 */}
              <div style={{
                flex: '0 0 45%', aspectRatio: '1', borderRadius: '24px', overflow: 'hidden',
                background: '#222', display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: '2px solid rgba(255,255,255,0.1)',
              }}>
                {activeState.item.imageUrl ? (
                  <img src={activeState.item.imageUrl} alt={activeState.item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '120px' }}>📦</span>
                )}
              </div>

              {/* 아이템 정보 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '56px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {activeState.item.name}
                </h2>
                {activeState.item.description && (
                  <p style={{ fontSize: '24px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    {activeState.item.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{
                    padding: '8px 20px', borderRadius: '24px', fontSize: '18px', fontWeight: 600,
                    background: activeState.item.auctionType === 'OPEN' ? 'rgba(49,130,246,0.2)' : 'rgba(240,68,82,0.2)',
                    color: activeState.item.auctionType === 'OPEN' ? '#3182F6' : '#F04452'
                  }}>
                    {activeState.item.auctionType === 'OPEN' ? '🟢 공개 입찰' : '🔴 블라인드'}
                  </span>
                  <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)' }}>
                    시작가 {activeState.item.startingPrice.toLocaleString()}P
                  </span>
                </div>

                {/* 현재 최고가 */}
                <div style={{
                  padding: '32px', borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(255,111,0,0.15) 0%, rgba(255,111,0,0.05) 100%)',
                  border: '1px solid rgba(255,111,0,0.3)',
                }}>
                  <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>현재 최고 입찰가</div>
                  <motion.div
                    key={activeState.item.currentHighest}
                    initial={{ scale: 1.3, color: '#FF6F00' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    style={{ fontSize: '72px', fontWeight: 800 }}
                  >
                    {activeState.item.auctionType === 'OPEN'
                      ? `${activeState.item.currentHighest.toLocaleString()} P`
                      : '??? P'}
                  </motion.div>
                  <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                    입찰 {activeState.item.totalBids}회
                  </div>
                </div>
              </div>
            </div>

            {/* 하단: 카운트다운 타이머 */}
            <div style={{ width: '100%', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)' }}>남은 시간</span>
                <motion.span
                  key={activeState.remainingTime}
                  initial={{ scale: activeState.remainingTime <= 5 ? 1.5 : 1 }}
                  animate={{ scale: 1 }}
                  style={{ fontSize: '48px', fontWeight: 800, color: timerColor }}
                >
                  {activeState.remainingTime}초
                </motion.span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${timerRatio * 100}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ height: '100%', background: timerColor, borderRadius: '6px' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── 낙찰 화면 ─── */}
        {phase === 'sold' && soldInfo && (
          <motion.div key="sold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}>
            <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              style={{ fontSize: '120px', marginBottom: '24px' }}>🎉</motion.div>
            <h1 style={{ fontSize: '64px', fontWeight: 800, margin: 0, color: '#FF6F00' }}>낙찰!</h1>
            <p style={{ fontSize: '36px', marginTop: '16px' }}>{soldInfo.itemName}</p>
            <p style={{ fontSize: '48px', fontWeight: 700, margin: '16px 0' }}>{soldInfo.finalPrice.toLocaleString()} P</p>
            <p style={{ fontSize: '28px', color: 'rgba(255,255,255,0.6)' }}>낙찰자: {soldInfo.winnerName}</p>
          </motion.div>
        )}

        {/* ─── 유찰 화면 ─── */}
        {phase === 'passed' && passedInfo && (
          <motion.div key="passed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '120px', marginBottom: '24px' }}>😔</div>
            <h1 style={{ fontSize: '64px', fontWeight: 800, margin: 0, color: '#8B95A1' }}>유찰</h1>
            <p style={{ fontSize: '36px', marginTop: '16px', color: 'rgba(255,255,255,0.5)' }}>
              {passedInfo.itemName} — 입찰자가 없습니다
            </p>
          </motion.div>
        )}

        {/* ─── 경매 종료 화면 ─── */}
        {phase === 'ended' && (
          <motion.div key="ended" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏁</div>
            <h1 style={{ fontSize: '56px', fontWeight: 800, margin: 0 }}>경매가 종료되었습니다</h1>
            <p style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', marginTop: '16px' }}>
              참여해주셔서 감사합니다!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 연결 상태 표시 (좌측 하단) */}
      <div style={{
        position: 'fixed', bottom: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '14px', color: 'rgba(255,255,255,0.3)'
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#10B981' : '#F04452' }} />
        BidChal
      </div>
    </div>
  );
}
