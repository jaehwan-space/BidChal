import React, { useState, useMemo } from 'react';
import { useAdminUsers, useAdminUserLogs, useUpdateUserStatus, useBatchChargePoints, useAdminRooms, useDeleteRoom, useAdminCoupons, useCreateCoupons, useDeleteCoupon } from '../hooks/useAdmin';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ShieldAlert, Users, Ticket, LayoutGrid, Trash2, Ban, CheckCircle2, Search, Coins, LogIn, Gavel, Gift, UserX, CreditCard, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROOMS' | 'COUPONS'>('USERS');

  if (!user || user.role !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--danger)' }}>
        <ShieldAlert size={64} style={{ marginBottom: '16px' }} />
        <h2>접근 권한이 없습니다</h2>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
        <Button onClick={() => navigate('/')} style={{ marginTop: '24px' }}>메인으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><ShieldAlert color="var(--primary)" /> 관리자 대시보드</h1>
        <p style={{ color: 'var(--text-secondary)' }}>전체 시스템(유저 관리, 방 관리, 쿠폰 발행)을 제어할 수 있습니다.</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <Button variant={activeTab === 'USERS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('USERS')} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Users size={18} /> 사용자 관리</Button>
        <Button variant={activeTab === 'COUPONS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('COUPONS')} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Ticket size={18} /> 쿠폰 관리</Button>
        <Button variant={activeTab === 'ROOMS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('ROOMS')} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><LayoutGrid size={18} /> 경매방 관리</Button>
      </div>

      {activeTab === 'USERS' && <AdminUsers />}
      {activeTab === 'COUPONS' && <AdminCoupons />}
      {activeTab === 'ROOMS' && <AdminRooms />}
    </div>
  );
}

// ------------------------------------
// Users Component
// ------------------------------------
function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  const { data: users, isLoading } = useAdminUsers({ q: searchQuery, status: filterStatus, role: filterRole });
  const updateStatusMutation = useUpdateUserStatus();
  const batchChargeMutation = useBatchChargePoints();

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [batchAmount, setBatchAmount] = useState(10000);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!users) return;
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u: any) => u.id)));
    }
  };

  const handleBatchCharge = () => {
    if (selectedUserIds.size === 0) return toast.error('유저를 선택해주세요.');
    if (!batchAmount || batchAmount <= 0) return toast.error('올바른 포인트를 입력해주세요.');
    batchChargeMutation.mutate(
      { userIds: Array.from(selectedUserIds), amount: batchAmount },
      {
        onSuccess: (data) => {
          toast.success(`${data.count}명에게 ${batchAmount.toLocaleString()}P 지급 완료!`);
          setSelectedUserIds(new Set());
          setShowBatchModal(false);
        },
        onError: (e: any) => toast.error(e.message)
      }
    );
  };

  if (isLoading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>유저 목록 로딩 중...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 검색 & 필터 바 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'var(--card-bg)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}>
          <option value="ALL">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="SUSPENDED">정지</option>
          <option value="DELETED">탈퇴</option>
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}>
          <option value="ALL">전체 역할</option>
          <option value="USER">일반 유저</option>
          <option value="ADMIN">관리자</option>
        </select>
      </div>

      {/* 선택된 유저 액션 바 */}
      {selectedUserIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
          background: 'rgba(49,130,246,0.08)', border: '1px solid rgba(49,130,246,0.2)',
          borderRadius: '12px', flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
            <Users size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            {selectedUserIds.size}명 선택됨
          </span>
          <Button variant="primary" onClick={() => setShowBatchModal(true)} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Coins size={16} /> 일괄 포인트 지급
          </Button>
          <Button variant="secondary" onClick={() => setSelectedUserIds(new Set())}>선택 해제</Button>
        </div>
      )}

      {/* 유저 테이블 */}
      <Card title={`유저 리스트 (${users?.length ?? 0}명)`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px', width: '40px' }}>
                  <input type="checkbox" checked={users?.length > 0 && selectedUserIds.size === users?.length} onChange={toggleSelectAll} />
                </th>
                <th style={{ padding: '12px 8px' }}>이름</th>
                <th style={{ padding: '12px 8px' }}>이메일</th>
                <th style={{ padding: '12px 8px' }}>가입일</th>
                <th style={{ padding: '12px 8px' }}>포인트</th>
                <th style={{ padding: '12px 8px' }}>상태</th>
                <th style={{ padding: '12px 8px' }}>역할</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedUserIds.has(u.id) ? 'rgba(49,130,246,0.04)' : 'transparent' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleSelectUser(u.id)} />
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '13px' }}>{u.email}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{u.points.toLocaleString()}P</td>
                  <td style={{ padding: '12px 8px' }}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: u.role === 'ADMIN' ? 'var(--primary)' : 'var(--border-color)', color: u.role === 'ADMIN' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button variant="secondary" size="sm" onClick={() => setSelectedUserId(u.id)}>로그</Button>
                      {u.role !== 'ADMIN' && (
                        <>
                          {u.status === 'ACTIVE' ? (
                            <button title="정지" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'SUSPENDED' })} style={iconBtnStyle('var(--danger)')}><Ban size={16} /></button>
                          ) : u.status === 'SUSPENDED' ? (
                            <button title="해제" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'ACTIVE' })} style={iconBtnStyle('var(--success)')}><CheckCircle2 size={16} /></button>
                          ) : null}
                          {u.status !== 'DELETED' && (
                            <button title="탈퇴" onClick={() => { if (window.confirm(`${u.username} 을(를) 탈퇴 처리 하시겠습니까?`)) updateStatusMutation.mutate({ userId: u.id, status: 'DELETED' }); }} style={iconBtnStyle('var(--text-secondary)')}><Trash2 size={16} /></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>검색 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 로그 모달 */}
      {selectedUserId && (
        <UserLogsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {/* 일괄 포인트 모달 */}
      {showBatchModal && (
        <ModalOverlay onClose={() => setShowBatchModal(false)}>
          <h3 style={{ margin: '0 0 16px 0' }}>🪙 일괄 포인트 지급</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>선택된 {selectedUserIds.size}명의 유저에게 포인트를 지급합니다.</p>
          <Input label="지급 포인트 (P)" type="number" value={batchAmount} onChange={e => setBatchAmount(Number(e.target.value))} min={1} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowBatchModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleBatchCharge} disabled={batchChargeMutation.isPending}>
              {batchChargeMutation.isPending ? '처리 중...' : `${selectedUserIds.size}명에게 지급`}
            </Button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ------------------------------------
// Shared Components
// ------------------------------------
const iconBtnStyle = (color: string): React.CSSProperties => ({
  background: 'transparent', border: 'none', cursor: 'pointer', color, padding: '4px', display: 'flex', alignItems: 'center'
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: '활성' },
    SUSPENDED: { bg: 'rgba(240,68,82,0.1)', color: '#f04452', label: '정지' },
    DELETED: { bg: 'rgba(120,120,120,0.1)', color: '#888', label: '탈퇴' },
  };
  const s = map[status] || map['ACTIVE']!;
  return <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>;
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: '90%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------
// Activity Log Modal
// ------------------------------------
const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  LOGIN:        { icon: <LogIn size={14} />,       label: '로그인',      color: '#3b82f6' },
  BID:          { icon: <Gavel size={14} />,       label: '입찰',        color: '#f59e0b' },
  GIFT_SEND:    { icon: <Gift size={14} />,        label: '선물 보냄',   color: '#ef4444' },
  GIFT_RECEIVE: { icon: <Gift size={14} />,        label: '선물 받음',   color: '#22c55e' },
  STATUS_CHANGE:{ icon: <UserX size={14} />,       label: '상태 변경',   color: '#8b5cf6' },
  ADMIN_CHARGE: { icon: <Coins size={14} />,       label: '관리자 지급', color: '#06b6d4' },
  COUPON:       { icon: <CreditCard size={14} />,  label: '쿠폰 사용',   color: '#ec4899' },
};

function UserLogsModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: logs, isLoading } = useAdminUserLogs(userId);
  const [logFilter, setLogFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (logFilter === 'ALL') return logs;
    return logs.filter((l: any) => l.action === logFilter);
  }, [logs, logFilter]);

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>📋 사용자 활동 로그</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
      </div>

      {/* 로그 필터 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[{ key: 'ALL', label: '전체' }, ...Object.entries(ACTION_META).map(([key, v]) => ({ key, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setLogFilter(f.key)}
            style={{
              padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: logFilter === f.key ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              background: logFilter === f.key ? 'rgba(49,130,246,0.1)' : 'transparent',
              color: logFilter === f.key ? 'var(--primary)' : 'var(--text-secondary)',
            }}
          >{f.label}</button>
        ))}
      </div>

      {isLoading ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
          {filteredLogs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>이력이 없습니다.</p>}
          {filteredLogs.map((l: any) => {
            const meta = ACTION_META[l.action] || { icon: null, label: l.action, color: '#888' };
            return (
              <div key={l.id} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: `${meta.color}18`, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{l.details}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalOverlay>
  );
}

// ------------------------------------
// Coupons Component
// ------------------------------------
function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const createCoupons = useCreateCoupons();
  const deleteCoupon = useDeleteCoupon();

  const [rewardAmount, setRewardAmount] = useState(50000);
  const [count, setCount] = useState(10);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.confirm(`포인트 ${rewardAmount.toLocaleString()}P 쿠폰을 ${count}개 발행하시겠습니까?`)) {
      createCoupons.mutate({ rewardAmount, count }, {
        onSuccess: () => toast.success(`${count}개 쿠폰이 발행되었습니다!`),
        onError: (e: any) => toast.error(e.message)
      });
    }
  };

  if (isLoading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>쿠폰 목록 로딩 중...</div>;

  const usedCount = coupons?.filter((c: any) => c.isUsed).length ?? 0;
  const unusedCount = (coupons?.length ?? 0) - usedCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 통계 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '120px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{coupons?.length ?? 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>전체 발급</div>
        </div>
        <div style={{ flex: 1, minWidth: '120px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e' }}>{unusedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>미사용</div>
        </div>
        <div style={{ flex: 1, minWidth: '120px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#888' }}>{usedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>사용됨</div>
        </div>
      </div>

      <Card title="대량 쿠폰 발급">
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <Input label="쿠폰 리워드 금액 (P)" type="number" value={rewardAmount} onChange={(e) => setRewardAmount(Number(e.target.value))} required />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <Input label="발급 수량 (개)" type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} max={100} required />
          </div>
          <Button type="submit" disabled={createCoupons.isPending}>{createCoupons.isPending ? '발급 중...' : '발급하기'}</Button>
        </form>
      </Card>

      <Card title={`쿠폰 발급 내역 (${coupons?.length || 0})`}>
        <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)' }}>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px' }}>쿠폰 코드</th>
                <th style={{ padding: '12px 8px' }}>발급액</th>
                <th style={{ padding: '12px 8px' }}>상태</th>
                <th style={{ padding: '12px 8px' }}>사용 정보</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{c.code}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--primary)' }}>{c.rewardAmount.toLocaleString()}P</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '12px', backgroundColor: c.isUsed ? 'rgba(120,120,120,0.1)' : 'rgba(34,197,94,0.1)', color: c.isUsed ? '#888' : '#22c55e', fontWeight: 600 }}>
                      {c.isUsed ? '사용됨' : '미사용'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                    {c.isUsed ? (
                      <>
                        <div style={{ fontWeight: 'bold' }}>{c.usedBy?.username}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{new Date(c.usedAt).toLocaleString()}</div>
                      </>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {!c.isUsed && (
                      <button onClick={() => deleteCoupon.mutate(c.id, { onSuccess: () => toast.success('쿠폰 폐기 완료'), onError: (e: any) => toast.error(e.message) })} title="쿠폰 폐기" disabled={deleteCoupon.isPending} style={iconBtnStyle('var(--danger)')}><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------
// Rooms Component
// ------------------------------------
function AdminRooms() {
  const { data: rooms, isLoading } = useAdminRooms();
  const deleteRoom = useDeleteRoom();

  if (isLoading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>경매방 목록 로딩 중...</div>;

  return (
    <Card title={`개설된 경매방 (${rooms?.length || 0})`}>
      {rooms?.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>개설된 방이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {rooms?.map((r: any) => (
            <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{r.title}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>호스트: {r.host?.username} ({r.host?.email})</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>아이템: {r._count.items}개</div>
                <button
                  onClick={() => { if (window.confirm('이 방과 내부에 포함된 모든 아이템 기록을 영구적으로 삭제합니까?')) deleteRoom.mutate(r.id, { onSuccess: () => toast.success('방 삭제 완료'), onError: (e: any) => toast.error(e.message) }); }}
                  disabled={deleteRoom.isPending}
                  style={{ padding: '6px 10px', cursor: 'pointer', border: 'none', background: 'rgba(240,68,82,0.1)', color: 'var(--danger)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
