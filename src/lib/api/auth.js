import api from './client';

export const register = async (email, password) => {
  try {
    const { data } = await api.post('/auth/register', { email, password });
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};