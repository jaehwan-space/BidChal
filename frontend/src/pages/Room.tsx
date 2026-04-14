import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useRoom } from '../hooks/useRooms';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';

// 실시간 아이템 상태를 프론트에서 관리하기 위한 타입
interface LiveItemState {
  currentHighest: number;
  totalBids: number;
}

export function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: room, isLoading, isError, refetch } = useRoom(id);
  
  const { socket, isConnected, connect } = useSocketStore();
  
  // 실시간으로 변하는 각 아이템별 입찰가/입찰횟수 캐싱
  const [liveBids, setLiveBids] = useState<Record<string, LiveItemState>>({});
  // 각 아이템별 유저가 적은 입찰액 상태
  const [bidInputs, setBidInputs] = useState<Record<string, number>>({});

  // 1. 방 정보가 최초 로드되면 라이브 상태 동기화 및 소켓 연결
  useEffect(() => {
    if (room && room.items) {
      const initialBids: Record<string, LiveItemState> = {};
      room.items.forEach(item => {
        initialBids[item.id] = {
          currentHighest: item.bids && item.bids.length > 0 ? item.bids[0].amount : item.startingPrice,
          totalBids: item._count?.bids || 0
        };
      });
      setLiveBids(prev => ({ ...initialBids, ...prev })); // 기존 라이브가 있으면 유지
    }
  }, [room]);

  useEffect(() => {
    connect();
  }, [connect]);

  // 2. 소켓 채널 접속 및 이벤트 리스너 세팅
  useEffect(() => {
    if (!socket || !isConnected || !id) return;

    // 방 접속
    socket.emit('join_room', { roomId: id });

    // 실시간 입찰 갱신 이벤트
    const handleUpdateBid = (data: { itemId: string, newAmount: number, lastBidder: string, auctionType: string, totalBids: number }) => {
      setLiveBids(prev => ({
        ...prev,
        [data.itemId]: {
          currentHighest: data.newAmount,
          totalBids: data.totalBids
        }
      }));
    };

    // 개인 피드백
    const handleBidSuccess = (data: { message: string }) => {
      alert(data.message);
      refetch(); // 유저 포인트 등 동기화를 위해 리패치
    };

    const handleBidError = (data: { message: string }) => {
      alert(`입찰 실패: ${data.message}`);
    };

    socket.on('update_bid', handleUpdateBid);
    socket.on('bid_success', handleBidSuccess);
    socket.on('bid_error', handleBidError);

    return () => {
      socket.off('update_bid', handleUpdateBid);
      socket.off('bid_success', handleBidSuccess);
      socket.off('bid_error', handleBidError);
    };
  }, [socket, isConnected, id, refetch]);

  // 3. 입찰하기
  const handleBid = (itemId: string, currentHighest: number) => {
    const amount = bidInputs[itemId];
    
    if (!amount || amount <= currentHighest) {
      alert(`최소 입찰가(${currentHighest.toLocaleString()} P)보다 높은 금액을 입력해주세요.`);
      return;
    }
    
    if (socket && isConnected) {
      socket.emit('new_bid', {
        roomId: id,
        itemId,
        amount,
        userId: user?.id
      });
      // 입력창 초기화
      setBidInputs(prev => ({ ...prev, [itemId]: 0 }));
    } else {
      alert('서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}><Skeleton height={400} /></div>;
  if (isError || !room) return <div style={{ padding: '24px', color: 'var(--danger)' }}>방 정보를 불러올 수 없습니다.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title={`경매장: ${room.title}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            호스트: {room.host.username}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }} />
            {isConnected ? '실시간 통신 중' : '재연결 중...'}
          </div>
        </div>
        
        {room.hostId === user?.id && (
          <Button variant="secondary" onClick={() => navigate(`/room/${id}/settings`)} style={{ width: '100%', marginBottom: '16px' }}>
            ⚙️ 방장 설정장으로 가기
          </Button>
        )}
      </Card>

      {room.items?.length === 0 ? (
        <Card title="">
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
            아직 경매에 올라온 아이템이 없습니다.
          </div>
        </Card>
      ) : (
        room.items?.map(item => {
          const liveState = liveBids[item.id] || { currentHighest: item.startingPrice, totalBids: item._count?.bids || 0 };
          
          return (
            <Card key={item.id} title={item.name}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {item.description && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{item.description}</p>}
                
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600 }}>경매 방식</span>
                    <span style={{ color: item.auctionType === 'OPEN' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {item.auctionType === 'OPEN' ? '🟢 공개 입찰' : '🔴 블라인드 (비공개)'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>시작가</span>
                    <span>{item.startingPrice.toLocaleString()} P</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>참여자 수 (입찰 횟수)</span>
                    <span>{liveState.totalBids}회</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 600, fontSize: '18px' }}>현재 최고가</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                      {item.auctionType === 'OPEN' ? `${liveState.currentHighest.toLocaleString()} P` : '??? P (비공개)'}
                    </span>
                  </div>
                </div>

                {/* 입찰 영역 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <Input 
                    label="희망 입찰가 (P)"
                    type="number"
                    value={bidInputs[item.id] || ''}
                    onChange={(e) => setBidInputs(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                    placeholder={`최소 ${liveState.currentHighest + 1}P 이상`}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    variant="primary" 
                    onClick={() => handleBid(item.id, liveState.currentHighest)}
                    style={{ height: '48px', padding: '0 24px' }}
                  >
                    🚀 입찰!
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      )}

      <Button variant="secondary" onClick={() => navigate('/')} style={{ marginTop: '8px' }}>
        로비로 나가기
      </Button>
    </div>
  );
}
