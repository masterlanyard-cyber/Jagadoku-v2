import { useState } from 'react';

export interface User {
  id: string;
  name: string;
  pin: string;
  createdAt: string;
}

export function useUser() {
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const saved = localStorage.getItem("jagadoku-active-user");
    return saved ? JSON.parse(saved) : null;
  });
  const isLoaded = true;

  const setUser = (user: User | null) => {
    setUserState(user);
    if (user) {
      localStorage.setItem("jagadoku-active-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("jagadoku-active-user");
    }
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem("jagadoku-active-user");
  };

  const getUserKey = (key: string) => {
    if (!user) return key;
    return `${key}-${user.id}`;
  };

  return { user, setUser, logout, isLoaded, getUserKey };
}