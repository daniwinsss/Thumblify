import { createContext, useState, ReactNode, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import type { IUser } from "../assets/assets";

interface AuthContextProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  user: IUser | null;
  setUser: (user: IUser | null) => void;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  user: null,
  setUser: () => {},
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<IUser | null>(null);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Handle specific error messages from backend
        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      setUser(data.user ?? null);
      setIsLoggedIn(true);
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      // Only show toast if it wasn't already shown above
      if (!error.message.includes('credentials')) {
        toast.error(error.message || 'Login failed. Please try again.');
      }
      throw error;
    }
  };

  const signUp = async (payload: { name: string; email: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = data.message || 'Signup failed. Please try again.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      setUser(data.user ?? null);
      setIsLoggedIn(true);
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (!error.message.includes('failed')) {
        toast.error(error.message || 'Signup failed. Please try again.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!res.ok) {
        toast.error('Logout failed. Please try again.');
        throw new Error('Logout failed');
      }
      
      setUser(null);
      setIsLoggedIn(false);
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/verify', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.user) {
          setUser(data.user as IUser);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }, []);

  const value: AuthContextProps = {
    isLoggedIn,
    setIsLoggedIn,
    user,
    setUser,
    login,
    signUp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
