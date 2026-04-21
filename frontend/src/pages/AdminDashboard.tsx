import React, { useState } from 'react';
import { useAdminUsers, useAdminUserLogs, useUpdateUserStatus, useAdminRooms, useDeleteRoom, useAdminCoupons, useCreateCoupons, useDeleteCoupon } from '../hooks/useAdmin';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ShieldAlert, Users, Ticket, LayoutGrid, Trash2, Ban, CheckCircle2 } from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROOMS' | 'COUPONS'>('USERS');

  // 관리자 가드
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
  const { data: users, isLoading } = useAdminUsers();
  const updateStatusMutation = useUpdateUserStatus();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (isLoading) return <div>Loading users...</div>;

  return (
    <Card title="유저 리스트">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px 8px' }}>이름</th>
              <th style={{ padding: '12px 8px' }}>이메일</th>
              <th style={{ padding: '12px 8px' }}>가입일</th>
              <th style={{ padding: '12px 8px' }}>포인트</th>
              <th style={{ padding: '12px 8px' }}>상태</th>
              <th style={{ padding: '12px 8px' }}>롤</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 8px' }}>{u.username}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '12px 8px', fontSize: '14px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{u.points.toLocaleString()}P</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                    backgroundColor: u.status === 'ACTIVE' ? 'rgba(49,130,246,0.1)' : u.status === 'SUSPENDED' ? 'rgba(240,68,82,0.1)' : '#eee',
                    color: u.status === 'ACTIVE' ? 'var(--primary)' : u.status === 'SUSPENDED' ? 'var(--danger)' : '#666'
                  }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>{u.role}</td>
                <td style={{ padding: '12px 8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedUserId(u.id)}>로그 보기</Button>
                  {u.role !== 'ADMIN' && (
                    <>
                      {u.status === 'ACTIVE' ? (
                        <button title="정지 처리" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'SUSPENDED' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Ban size={18} /></button>
                      ) : (
                        <button title="정지 해제" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'ACTIVE' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--success)' }}><CheckCircle2 size={18} /></button>
                      )}
                      <button title="탈퇴 처리 (복구 불가 상태)" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'DELETED' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Trash2 size={18} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <UserLogsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </Card>
  );
}

function UserLogsModal({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { data: logs, isLoading } = useAdminUserLogs(userId);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--bg-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>활동 (포인트 이력)</h3>
          <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
        </div>
        {isLoading ? <p>Loading...</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs?.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>이력이 없습니다.</p>}
            {logs?.map((l: any) => (
              <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{l.reason}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(l.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ color: l.amount > 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 'bold' }}>
                  {l.amount > 0 ? '+' : ''}{l.amount}P
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
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
    if (window.confirm(`포인트 ${rewardAmount}P 쿠폰을 ${count}개 발행하시겠습니까?`)) {
      createCoupons.mutate({ rewardAmount, count });
    }
  }

  if (isLoading) return <div>Loading coupons...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="대량 쿠폰 발급">
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <Input label="쿠폰 리워드 금액 (P)" type="number" value={rewardAmount} onChange={(e) => setRewardAmount(Number(e.target.value))} required />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <Input label="발급 수량 (개)" type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} max={100} required />
          </div>
          <Button type="submit" disabled={createCoupons.isPending}>발급하기</Button>
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
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '12px', backgroundColor: c.isUsed ? '#eee' : 'rgba(49,130,246,0.1)', color: c.isUsed ? '#666' : 'var(--primary)' }}>
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
                      <button onClick={() => deleteCoupon.mutate(c.id)} title="쿠폰 폐기" disabled={deleteCoupon.isPending} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
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

  if (isLoading) return <div>Loading rooms...</div>;

  return (
    <Card title={`개설된 경매방 (${rooms?.length || 0})`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {rooms?.map((r: any) => (
          <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{r.title}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>호스트: {r.host?.username} ({r.host?.email})</div>
              </div>
              <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '8px', background: 'var(--bg-color)' }}>{r.status}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>등록된 아이템: {r._count.items}개</div>
              <button
                onClick={() => {
                  if (window.confirm('이 방과 내부에 포함된 모든 아이템 기록을 영구적으로 삭제합니까?')) deleteRoom.mutate(r.id);
                }}
                disabled={deleteRoom.isPending}
                style={{ padding: '6px', cursor: 'pointer', border: 'none', background: 'rgba(240,68,82,0.1)', color: 'var(--danger)', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={16} /> 삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
