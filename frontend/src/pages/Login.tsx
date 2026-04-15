import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

// 임시 로컬 API URL (Vite Proxy 세팅 전)
const API_URL = '/api';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '로그인 실패');

      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ maxWidth: '440px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Card title="BidChal 로그인" subtitle="모의 경매 플랫폼에 다시 오신 것을 환영합니다.">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Input 
          label="닉네임 (아이디)" 
          value={username} 
          onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }} 
          placeholder="아이디를 입력하세요" 
        />
        <Input 
          label="비밀번호" 
          type="password" 
          value={password} 
          onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
          placeholder="비밀번호를 입력하세요" 
          error={errorMsg}
        />
        
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/signup')}>
            회원가입하기
          </Button>
        </div>
      </form>
      </Card>
    </motion.div>
  );
}
