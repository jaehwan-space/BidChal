import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export function RoomSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="경매 방 설정">
        <p style={{ color: 'var(--text-secondary)' }}>
          방 ID: {id} 의 기본 설정을 입력하는 컴포넌트가 들어갈 자리입니다.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={() => navigate('/')}>
            로비로 돌아가기
          </Button>
          <Button variant="primary" onClick={() => navigate(`/room/${id}`)}>
            경매장 입장하기
          </Button>
        </div>
      </Card>
    </div>
  );
}
