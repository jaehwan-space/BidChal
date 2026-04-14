import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="경매장 진행 중">
        <p style={{ color: 'var(--text-secondary)' }}>
          방 ID: {id} 에 접속했습니다. 실시간 아이템 목록과 입찰 창이 렌더링될 자리입니다.
        </p>
        <Button variant="secondary" onClick={() => navigate('/')} style={{ marginTop: '24px' }}>
          로비로 나가기
        </Button>
      </Card>
    </div>
  );
}
