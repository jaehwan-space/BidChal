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

  // Drag to close states
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchMoveY, setTouchMoveY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartY(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => setTouchMoveY(e.touches[0].clientY);
  const handleTouchEnd = () => {
    if (touchStartY !== null && touchMoveY !== null) {
      if (touchMoveY - touchStartY > 80) {
        setActiveModal('none');
        setShowQR(false);
      }
    }
    setTouchStartY(null);
    setTouchMoveY(null);
  };

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
      if (!res.ok) throw new Error(resData.error || '실패했어요');
      toast.success(`${giftTarget}님에게 ${Number(giftAmount).toLocaleString()}P를 보냈어요.`);
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
      toast.success(`${resData.points?.toLocaleString() || ''} 포인트 충전이 완료되었어요.`);
      setShowQR(false);
      setActiveModal('none');
      setCouponCode('');
      fetchMypage();
    } catch (error: any) { 
      // 에러 메시지가 구체적이지 않을 경우를 대비해 덧붙임
      const errMsg = error.message;
      if (errMsg.includes('유효하지 않은')) {
        toast.error('유효하지 않은 쿠폰 번호예요. 코드를 다시 확인해주세요.');
      } else if (errMsg.includes('이미 사용된')) {
        toast.error('이미 사용 완료된 쿠폰 번호예요.');
      } else {
        toast.error(`${errMsg}`);
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
            <h2 className="toss-heading-lg" style={{ margin: 0 }}>{data.user.username}</h2>
            {user?.role === 'ADMIN' && (
              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>ADMIN</span>
            )}
          </div>
          <span className="toss-body">{data.user.email}</span>
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
      <Card title="내 자산">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ margin: '8px 0 16px 0' }}>
            <div className="toss-caption" style={{ marginBottom: '4px' }}>이용 가능 잔고</div>
            <div className="toss-amount-display" style={{ color: 'var(--primary)' }}>
              {data.user.points.toLocaleString()} <span className="currency-label">P</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" style={{ flex: 1 }} onClick={() => setActiveModal('charge')}>채우기</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setActiveModal('gift')}>보내기</Button>
          </div>
        </div>

        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <h4 className="toss-subheading" style={{ margin: '0 0 16px 0' }}>최근 사용 내역</h4>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {data.transactions.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p className="toss-body" style={{ margin: '0 0 16px 0' }}>아직 소비 내역이 없어요.</p>
                <Button variant="secondary" size="sm" onClick={() => setActiveModal('charge')}>포인트 채우기</Button>
              </div>
            ) : (
              data.transactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div className="toss-subheading">{tx.reason === 'CHARGE' ? '포인트 충전' : tx.reason === 'DEPOSIT' ? '입찰 참여' : tx.reason === 'REFUND' ? '입찰 환불' : '결제 완료'}</div>
                    <div className="toss-caption" style={{ marginTop: '2px' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="toss-amount" style={{ fontSize: '15px', color: tx.amount > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} <span className="currency-label">P</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* --- 낙찰 내역 섹션 --- */}
      <Card title="나의 경매 낙찰 내역">
        {data.wonItems.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p className="toss-body" style={{ margin: '0 0 16px 0' }}>아직 낙찰받은 물품이 없어요.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}>입찰하러 가기</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.wonItems.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', background: 'var(--toss-grey50)', padding: '16px', borderRadius: 'var(--radius-standard)', border: `1px solid var(--border-color)` }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-compact)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-compact)', background: 'var(--toss-grey200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--toss-grey500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="toss-caption">{item.room.title}</div>
                  <div className="toss-subheading" style={{ marginTop: '2px' }}>{item.name}</div>
                  <div className="toss-amount" style={{ color: 'var(--primary)', marginTop: '8px', fontSize: '15px' }}>결제가 {item.finalPrice.toLocaleString()}<span className="currency-label">P</span></div>
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
            {/* 드래그 핸들 및 제목 영억 */}
            <div 
              style={{ paddingBottom: '12px' }}
              onTouchStart={handleTouchStart} 
              onTouchMove={handleTouchMove} 
              onTouchEnd={handleTouchEnd}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-color)', cursor: 'grab' }} />
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
                <Input label="받을 분의 이메일" value={giftTarget} onChange={e => setGiftTarget(e.target.value)} placeholder="Email" />
                <Input label="보낼 금액" type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="금액 입력" />
                <Button variant="primary" type="submit" size="lg">보내기</Button>
              </form>
            )}

            {/* 포인트 채우기 */}
            {activeModal === 'charge' && (
              <form onSubmit={handleChargeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!showQR ? (
                  <>
                    <Input label="쿠폰 코드" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="BIDCHAL-100 등 입력" />
                    <Button variant="primary" type="submit" disabled={!couponCode} size="lg">쿠폰으로 채우기</Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>또는</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>
                    <Button variant="secondary" type="button" onClick={() => setShowQR(true)} size="lg">QR코드 스캔하기</Button>
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
