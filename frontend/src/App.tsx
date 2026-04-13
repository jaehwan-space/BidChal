import React, { useEffect, useState } from 'react';
import { useSocketStore } from './store/useSocketStore';
import { Button } from './components/common/Button';
import { Layout } from './components/layout/Layout';
import { Card } from './components/common/Card';

function App() {
  const { connect, disconnect, isConnected, socket } = useSocketStore();
  const [pingLog, setPingLog] = useState<string>('');

  useEffect(() => {
    // 앱 마운트 시 자동 연결
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (!socket) return;
    
    // 서버로부터의 Pong 대기
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

  return (
    <Layout>
      <Card title="실시간 통신 인프라 점검">
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

        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          아래 버튼을 눌러 소켓 서버로 Ping을 보내고 실시간으로 응답을 모니터링합니다.
        </p>

        <Button 
          variant="primary" 
          onClick={handlePing} 
          disabled={!isConnected}
          style={{ marginBottom: '16px' }}
        >
          서버로 Ping 보내기
        </Button>

        {pingLog && (
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
            {pingLog}
          </div>
        )}
      </Card>
    </Layout>
  );
}

export default App;
