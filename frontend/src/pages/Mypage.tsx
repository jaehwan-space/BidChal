import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';

interface PointTransaction {
  id: string; amount: number; reason: string; createdAt: string;
}
interface WonItem {
  id: string; name: string; imageUrl: string | null; finalPrice: number; room: { title: string }; updatedAt: string;
}
interface MypageData {
  user: { email: string; username: string; points: number; createdAt: string; };
  transactions: PointTransaction[];
  wonItems: WonItem[];
}

export function Mypage() {
  const { token, updateUser, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<MypageData | null>(null);
  const [loading, setLoading] = useState(true);

  // States for Modals/Sheets
  const [activeModal, setActiveModal] = useState<'none' | 'profile' | 'gift' | 'charge'>('none');
  
  // Profile Editor
  const [editName, setEditName] = useState('');
  
  // Gift
  const [giftTarget, setGiftTarget] = useState('');
  const [giftAmount, setGiftAmount] = useState('');

  // Charge / QR
  const [couponCode, setCouponCode] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchMypage();
  }, [token, navigate]);

  const fetchMypage = async () => {
    try {
      const res = await fetch('/api/users/mypage', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setEditName(json.user.username);
      updateUser({ points: json.user.points });
    } catch (error) { toast.error('정보를 불러오는데 실패했습니다.'); } 
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: editName })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed');
      toast.success('프로필이 수정되었습니다.');
      updateUser({ username: resData.username });
      setActiveModal('none');
      fetchMypage();
    } catch (error: any) { toast.error(error.message); }
  };

  const handleGift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetEmail: giftTarget, amount: Number(giftAmount) })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed');
      toast.success(`${giftTarget}님에게 ${Number(giftAmount).toLocaleString()}P를 선물했습니다.`);
      setActiveModal('none');
      setGiftTarget(''); setGiftAmount('');
      fetchMypage();
    } catch (error: any) { toast.error(error.message); }
  };

  const submitCoupon = async (code: string) => {
    if (!code) {
      toast.error('쿠폰 번호를 입력해주세요.');
      return;
    }
    try {
      const res = await fetch('/api/users/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code })
      });
      const resData = await res.json();
      if (!res.ok) {
        // 백엔드에서 전달된 구체적인 에러 메시지 활용
        throw new Error(resData.error || '잘못된 쿠폰 번호이거나 이미 사용된 쿠폰입니다.');
      }
      toast.success(`${resData.points?.toLocaleString() || ''} 포인트가 성공적으로 충전되었습니다! 🎉`);
      setShowQR(false);
      setActiveModal('none');
      setCouponCode('');
      fetchMypage();
    } catch (error: any) { 
      // 에러 메시지가 구체적이지 않을 경우를 대비해 덧붙임
      const errMsg = error.message;
      if (errMsg.includes('유효하지 않은')) {
        toast.error('❌ 유효하지 않은 쿠폰 번호입니다. 코드를 다시 확인해주세요.');
      } else if (errMsg.includes('이미 사용된')) {
        toast.error('⚠️ 이미 사용 완료된 쿠폰 번호입니다.');
      } else {
        toast.error(`❌ ${errMsg}`);
      }
    }
  };

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCoupon(couponCode);
  };

  if (loading) return <div style={{ padding: '24px' }}><Skeleton height={200} /><Skeleton height={400} style={{ marginTop: '20px' }} /></div>;
  if (!data) return <div style={{ padding: '24px' }}>오류가 발생했습니다.</div>;

  return (
    <div style={{ paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* --- 프로필 섹션 --- */}
      <div style={{ padding: '16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>{data.user.username}</h2>
            {user?.role === 'ADMIN' && (
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>ADMIN</span>
            )}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{data.user.email}</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block' }}>가입일: {new Date(data.user.createdAt).toLocaleDateString()}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {user?.role === 'ADMIN' && (
            <Button variant="primary" onClick={() => navigate('/admin')}>관리자 패널</Button>
          )}
          <Button variant="secondary" onClick={() => setActiveModal('profile')}>프로필 수정</Button>
          <Button variant="danger" onClick={() => { logout(); navigate('/login'); }}>로그아웃</Button>
        </div>
      </div>

      {/* --- 지갑 섹션 --- */}
      <Card title="내 지갑 💳">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>이용 가능 잔고</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
              {data.user.points.toLocaleString()} <span style={{ fontSize: '20px' }}>P</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" style={{ flex: 1 }} onClick={() => setActiveModal('charge')}>포인트 충전/쿠폰</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setActiveModal('gift')}>선물하기</Button>
          </div>
        </div>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>최근 사용 내역</h4>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {data.transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>내역이 없습니다.</p> :
              data.transactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{tx.reason === 'CHARGE' ? '포인트 충전' : tx.reason === 'DEPOSIT' ? '입찰 참여' : tx.reason === 'REFUND' ? '입찰 환불' : '결제 완료'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: tx.amount > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} P
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* --- 낙찰 내역 섹션 --- */}
      <Card title="나의 경매 낙찰 내역 🎉">
        {data.wonItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>물건이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.wonItems.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📦</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.room.title}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{item.name}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, marginTop: '4px' }}>결제가: {item.finalPrice.toLocaleString()} P</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- Modals (Toss BottomSheet Style) --- */}
      {activeModal !== 'none' && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.45)', zIndex: 9999, 
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => { setActiveModal('none'); setShowQR(false); }}
        >
          <div 
            style={{ 
              background: 'var(--panel-bg)', 
              padding: '0 24px 24px', 
              borderRadius: '20px 20px 0 0', 
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '20px',
              animation: 'slideUp 0.3s ease-out',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 바 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-color)' }} />
            </div>

            {/* 제목 및 닫기 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                {activeModal === 'profile' ? '프로필 수정' : activeModal === 'gift' ? '포인트 선물하기' : '포인트 충전'}
              </h3>
              <button 
                onClick={() => { setActiveModal('none'); setShowQR(false); }} 
                style={{ background: 'var(--bg-color)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* 프로필 수정 */}
            {activeModal === 'profile' && (
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input label="새 닉네임" value={editName} onChange={e => setEditName(e.target.value)} />
                <Button variant="primary" type="submit">변경 내용 저장</Button>
              </form>
            )}

            {/* 선물하기 */}
            {activeModal === 'gift' && (
              <form onSubmit={handleGift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input label="선물 할 계정(이메일)" value={giftTarget} onChange={e => setGiftTarget(e.target.value)} placeholder="받는 사람 이메일" />
                <Input label="금액" type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="보낼 금액 입력" />
                <Button variant="primary" type="submit">선물 쏘기 💸</Button>
              </form>
            )}

            {/* 포인트 충전 */}
            {activeModal === 'charge' && (
              <form onSubmit={handleChargeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!showQR ? (
                  <>
                    <Input label="쿠폰 코드 입력" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="BIDCHAL-100 등" />
                    <Button variant="primary" type="submit" disabled={!couponCode}>쿠폰 코드 사용</Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>또는</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>
                    <Button variant="secondary" type="button" onClick={() => setShowQR(true)}>📷 QR코드로 스캔하여 충전하기</Button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '100%', height: '280px', overflow: 'hidden', borderRadius: '16px', border: '2px solid var(--border-color)' }}>
                      <Scanner
                        onScan={(result) => submitCoupon(result[0].rawValue)}
                        allowMultiple={false}
                      />
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>QR코드를 카메라에 비춰주세요</p>
                    <Button variant="secondary" type="button" onClick={() => setShowQR(false)}>← 쿠폰 코드 직접 입력</Button>
                  </div>
                )}
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
