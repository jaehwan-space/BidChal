import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

const API_URL = '/api';

export function Signup() {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Focus 벗어날 때 실시간 검증 (토스 스타일)
  const handleBlurPassword = () => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setUsernameError('');
    setPasswordError('');

    if (!username) { setUsernameError('아이디를 입력해주세요.'); return; }
    if (password.length < 4) { setPasswordError('비밀번호는 4자리 이상이어야 합니다.'); return; }
    if (password !== confirmPassword) { setPasswordError('비밀번호가 일치하지 않습니다.'); return; }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '회원가입 실패');

      alert('가입을 환영합니다! 로그인 해주세요.');
      navigate('/login');
    } catch (err: any) {
      setGlobalError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="10초만에 회원가입">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          label="닉네임 (아이디)" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          placeholder="사용할 닉네임을 입력하세요" 
          error={usernameError}
          onBlur={() => !username && setUsernameError('아이디를 입력해주세요.')}
        />
        <Input 
          label="비밀번호" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          placeholder="4자리 이상 규칙" 
          onBlur={() => password && password.length < 4 && setPasswordError('비밀번호는 4자리 이상이어야 합니다.')}
        />
        <Input 
          label="비밀번호 확인" 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="비밀번호 재입력" 
          error={passwordError}
          onBlur={handleBlurPassword}
        />
        
        {globalError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{globalError}</div>}
        
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? '가입 중...' : '시작하기'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/login')}>
            이미 계정이 있나요? 로그인
          </Button>
        </div>
      </form>
    </Card>
  );
}
