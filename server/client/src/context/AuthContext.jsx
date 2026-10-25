import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('dept_lib_user');

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.warn('Invalid saved user data');
      localStorage.removeItem('dept_lib_user');
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('dept_lib_token');
  });

  const [loading, setLoading] = useState(true);

  // Check whether the saved login session is still valid
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('dept_lib_token');

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');

        if (res?.user) {
          setUser(res.user);
          setToken(savedToken);

          localStorage.setItem(
            'dept_lib_user',
            JSON.stringify(res.user)
          );
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('dept_lib_token');
          localStorage.removeItem('dept_lib_user');
        }
      } catch (error) {
        console.warn(
          'Session expired or invalid token:',
          error.message
        );

        setUser(null);
        setToken(null);
        localStorage.removeItem('dept_lib_token');
        localStorage.removeItem('dept_lib_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (identifier, password, role = '') => {
    try {
      const data = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        role: role || undefined,
      });

      if (data?.token && data?.user) {
        setToken(data.token);
        setUser(data.user);

        localStorage.setItem(
          'dept_lib_token',
          data.token
        );

        localStorage.setItem(
          'dept_lib_user',
          JSON.stringify(data.user)
        );

        return {
          success: true,
          user: data.user,
        };
      }

      return {
        success: false,
        message: 'Invalid response from server',
      };
    } catch (error) {
      console.error('Login error:', error);

      return {
        success: false,
        message:
          error?.message || 'Invalid login credentials.',
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const currentToken = localStorage.getItem('dept_lib_token');

      if (currentToken) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.warn(
        'Logout error ignored:',
        error.message
      );
    } finally {
      setUser(null);
      setToken(null);

      localStorage.removeItem('dept_lib_token');
      localStorage.removeItem('dept_lib_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

export default AuthContext;