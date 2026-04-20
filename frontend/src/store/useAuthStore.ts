import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  username: string;
  points: number;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 초기 로드 시 localStorage 확인
  const storedToken = localStorage.getItem('bidchal_token');
  const storedUser = localStorage.getItem('bidchal_user');
  
  return {
    token: storedToken,
    user: storedUser ? JSON.parse(storedUser) : null,
    isAuthenticated: !!storedToken,
    
    login: (token, user) => {
      localStorage.setItem('bidchal_token', token);
      localStorage.setItem('bidchal_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    
    logout: () => {
      localStorage.removeItem('bidchal_token');
      localStorage.removeItem('bidchal_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
    
    updateUser: (data) => {
      set((state) => {
        if (!state.user) return state;
        const updatedUser = { ...state.user, ...data };
        localStorage.setItem('bidchal_user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      });
    }
  };
});
