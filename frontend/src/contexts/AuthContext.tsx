import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.string(),
  createdAt: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  registerUser: (username: string, password: string, role: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { api } from '../lib/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      if (user.role === 'admin') {
        fetchUsers();
      }
    } else {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('csrfToken');
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      const { accessToken, csrfToken, user: userData } = response.data;
      
      if (accessToken) {
        sessionStorage.setItem('token', accessToken);
        if (csrfToken) sessionStorage.setItem('csrfToken', csrfToken);
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Invalid credentials');
      }
      throw new Error('An error occurred during login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setUsers([]);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('csrfToken');
    window.location.href = '/login';
  };

  const registerUser = async (username: string, password: string, role: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/register', { username, password, role });
      if (response.data) {
        return true;
      }
      return false;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      }
      throw new Error('An error occurred during registration');
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to delete user');
      }
      throw new Error('An error occurred while deleting the user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      users,
      isAuthenticated: !!user,
      login,
      logout,
      registerUser,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
