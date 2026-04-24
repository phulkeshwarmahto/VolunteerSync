import { startTransition, useEffect, useState } from 'react';
import api, { getApiError } from '../api/axios';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('volunteersync_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function hydrateUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (!ignore) {
          startTransition(() => {
            setUser(data.user);
          });
        }
      } catch {
        if (!ignore) {
          localStorage.removeItem('volunteersync_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    hydrateUser();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('volunteersync_token', data.token);
    setToken(data.token);
    startTransition(() => {
      setUser(data.user);
    });
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('volunteersync_token', data.token);
    setToken(data.token);
    startTransition(() => {
      setUser(data.user);
    });
    return data.user;
  }

  function logout() {
    localStorage.removeItem('volunteersync_token');
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) {
      return null;
    }

    const { data } = await api.get('/auth/me');
    startTransition(() => {
      setUser(data.user);
    });
    return data.user;
  }

  function mergeUser(nextUser) {
    startTransition(() => {
      setUser(nextUser);
    });
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        mergeUser,
        getApiError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
