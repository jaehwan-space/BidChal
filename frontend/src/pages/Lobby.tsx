import { useEffect, useState } from 'react';
import { useSocketStore } from '../store/useSocketStore';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export function Lobby() {
  const { connect, disconnect, isConnected, socket } = useSocketStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [pingLog, setPingLog] = useState<string>('');

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (!socket) return;
    const handlePong = (data: { message: string, time: string }) => {
      setPingLog(`Received: ${data.message} at ${new Date(data.time).toLocaleTimeString()}`);
    };
    socket.on('pong', handlePong);
    return () => {
      socket.off('pong', handlePong);
    };
  }, [socket]);

  const handlePing = () => {
    if (socket && isConnected) {
      socket.emit('ping');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title={`환영합니다, ${user?.username || '게스트'}님!`}>
        <p style={{ color: 'var(--text-secondary)' }}>
          보유 포인트: {user?.points?.toLocaleString() || 0} P
        </p>
        <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '16px' }}>
          로그아웃
        </Button>
      </Card>

      <Card title="실시간 통신 점검">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' 
            }} 
          />
          <span style={{ fontWeight: 600 }}>
            {isConnected ? '서버와 연결됨' : '서버와 연결 끊김'}
          </span>
        </div>
        <Button variant="primary" onClick={handlePing} disabled={!isConnected} style={{ marginBottom: '16px' }}>
          서버로 Ping 보내기
        </Button>
        {pingLog && (
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
            {pingLog}
          </div>
        )}
      </Card>
    </div>
  );
}
