import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

import { motion } from 'framer-motion';

const API_URL = '/api';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function Signup() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = () => {
    if (!email) { setEmailError('이메일을 입력해주세요.'); }
    else if (!isValidEmail(email)) { setEmailError('올바른 이메일 형식이 아닙니다.'); }
    else { setEmailError(''); }
  };

  const validateUsername = () => {
    if (!username) { setUsernameError('닉네임을 입력해주세요.'); }
    else if (username.length < 2) { setUsernameError('닉네임은 2글자 이상이어야 합니다.'); }
    else { setUsernameError(''); }
  };

  const validatePassword = () => {
    if (password && password.length < 4) { setPasswordError('비밀번호는 4자리 이상이어야 합니다.'); }
    else if (confirmPassword && password !== confirmPassword) { setPasswordError('비밀번호가 일치하지 않습니다.'); }
    else { setPasswordError(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    // 전체 유효성 검사
    if (!email) { setEmailError('이메일을 입력해주세요.'); return; }
    if (!isValidEmail(email)) { setEmailError('올바른 이메일 형식이 아닙니다.'); return; }
    if (!username) { setUsernameError('닉네임을 입력해주세요.'); return; }
    if (username.length < 2) { setUsernameError('닉네임은 2글자 이상이어야 합니다.'); return; }
    if (password.length < 4) { setPasswordError('비밀번호는 4자리 이상이어야 합니다.'); return; }
    if (password !== confirmPassword) { setPasswordError('비밀번호가 일치하지 않습니다.'); return; }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ maxWidth: '440px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Card title="빠른 회원가입" subtitle="10초만에 가입하고 경매에 참여해보세요.">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Input 
          label="이메일" 
          type="text"
          value={email} 
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }} 
          placeholder="example@email.com" 
          error={emailError}
          onBlur={validateEmail}
          autoComplete="email"
        />
        <Input 
          label="닉네임 (표시 이름)" 
          value={username} 
          onChange={(e) => { setUsername(e.target.value); setUsernameError(''); }} 
          placeholder="경매에서 사용할 닉네임" 
          error={usernameError}
          onBlur={validateUsername}
        />
        <Input 
          label="비밀번호" 
          type="password" 
          value={password} 
          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
          placeholder="4자리 이상" 
          onBlur={validatePassword}
        />
        <Input 
          label="비밀번호 확인" 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
          placeholder="비밀번호 재입력" 
          error={passwordError}
          onBlur={validatePassword}
        />
        
        {globalError && <div style={{ color: 'var(--danger)', fontSize: '13px', padding: '8px 12px', background: 'rgba(240, 68, 82, 0.08)', borderRadius: '8px' }}>{globalError}</div>}
        
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
    </motion.div>
  );
}
