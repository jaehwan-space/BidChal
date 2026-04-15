import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';

interface PointTransaction {
  id: string;
  amount: number;
  reason: 'CHARGE' | 'DEPOSIT' | 'REFUND' | 'WINNING_PAY';
  createdAt: string;
}

interface WonItem {
  id: string;
  name: string;
  imageUrl: string | null;
  finalPrice: number;
  room: { title: string };
  updatedAt: string;
}

interface MypageData {
  user: {
    username: string;
    points: number;
    createdAt: string;
  };
  transactions: PointTransaction[];
  wonItems: WonItem[];
}

export function Mypage() {
  const { token, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<MypageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMypage();
  }, [token, navigate]);

  const fetchMypage = async () => {
    try {
      const res = await fetch('/api/users/mypage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      updateUser({ points: json.user.points });
    } catch (error) {
      console.error(error);
      toast.error('정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCharge = async () => {
    const amount = 100000; // 테스트용 10만 포인트 충전
    try {
      const res = await fetch('/api/users/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) throw new Error('Charge failed');
      
      toast.success(`${amount.toLocaleString()} 포인트가 충전되었습니다.`);
      fetchMypage(); // 새로고침
    } catch (error) {
      toast.error('충전에 실패했습니다.');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}><Skeleton height={200} /><Skeleton height={400} style={{ marginTop: '20px' }} /></div>;
  }

  if (!data) return <div style={{ padding: '24px' }}>오류가 발생했습니다.</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. 내 지갑 섹션 */}
      <Card title="내 지갑 💳">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{data.user.username}님의 잔여 포인트</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
              {data.user.points.toLocaleString()} P
            </div>
          </div>
          <Button variant="primary" onClick={handleCharge}>
            💰 10만 P 충전하기
          </Button>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>최근 내역</h4>
          {data.transactions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>포인트 내역이 없습니다.</p>
          ) : (
            data.transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {tx.reason === 'CHARGE' ? '통장 충전' : 
                     tx.reason === 'DEPOSIT' ? '입찰 보증금' : 
                     tx.reason === 'REFUND' ? '입찰 취소 환불' : '결제 내역'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(tx.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: tx.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} P
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 2. 낙찰 내역 섹션 */}
      <Card title="나의 낙찰 내역 🎉">
        {data.wonItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>낙찰 받은 물건이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {data.wonItems.map(item => (
              <div key={item.id} style={{ 
                background: 'var(--panel-bg)', borderRadius: 'var(--border-radius-md)', 
                overflow: 'hidden', border: '1px solid var(--border-color)' 
              }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>📦</div>
                )}
                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{item.room.title}</div>
                  <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.finalPrice.toLocaleString()} P</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button variant="secondary" onClick={() => navigate('/')} style={{ marginTop: '12px' }}>
        🏠 로비로 돌아가기
      </Button>
    </div>
  );
}
