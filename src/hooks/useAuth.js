import { useState, useEffect } from 'react';
import { register, login } from '../api/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const handleRegister = async (email, password) => {
    try {
      setLoading(true);
      const data = await register(email, password);
      localStorage.setItem('token', data.token);
      setUser({ token: data.token });
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      const data = await login(email, password);
      localStorage.setItem('token', data.token);
      setUser({ token: data.token });
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    register: handleRegister,
    login: handleLogin,
    logout: handleLogout
  };
};

