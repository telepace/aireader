import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from './authStore';
import AuthService from '../services/authService';
import { supabase } from '../services/supabase';
import { AuthUser, AnonymousUser } from '../types/types';

// Mock dependencies
jest.mock('../services/authService');
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock localStorage for Zustand persistence
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isInitialized: false,
      shouldShowUpgradePrompt: false,
      upgradeStats: {
        testCount: 0,
        messageCount: 0,
        conversationCount: 0
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.shouldShowUpgradePrompt).toBe(false);
      expect(result.current.upgradeStats).toEqual({
        testCount: 0,
        messageCount: 0,
        conversationCount: 0
      });
    });
  });

  describe('createAnonymousUser', () => {
    it('should create anonymous user successfully', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-123',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      mockAuthService.createAnonymousUser.mockResolvedValue(mockAnonymousUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.createAnonymousUser();
      });

      expect(result.current.user).toEqual(mockAnonymousUser);
      expect(result.current.isLoading).toBe(false);
      expect(mockAuthService.createAnonymousUser).toHaveBeenCalledTimes(1);
    });

    it('should handle anonymous user creation error', async () => {
      mockAuthService.createAnonymousUser.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.createAnonymousUser();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('initializeAuth', () => {
    it('should initialize with existing user', async () => {
      const mockUser: AuthUser = {
        id: 'auth-123',
        email: 'test@example.com',
        is_anonymous: false,
        created_at: new Date().toISOString()
      };

      let authStateCallback: (event: string, session: any) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initializeAuth();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should create anonymous user when no current user exists', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-456',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      });
      
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      mockAuthService.createAnonymousUser.mockResolvedValue(mockAnonymousUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initializeAuth();
      });

      expect(result.current.user).toEqual(mockAnonymousUser);
      expect(result.current.isInitialized).toBe(true);
      expect(mockAuthService.createAnonymousUser).toHaveBeenCalledTimes(1);
    });

    it('should not initialize twice', async () => {
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      });

      const { result } = renderHook(() => useAuthStore());

      // Set initialized to true
      act(() => {
        useAuthStore.setState({ isInitialized: true });
      });

      await act(async () => {
        await result.current.initializeAuth();
      });

      expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should handle initialization error gracefully', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-fallback',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      mockSupabase.auth.onAuthStateChange.mockImplementation(() => {
        throw new Error('Auth setup failed');
      });
      
      mockAuthService.createAnonymousUser.mockResolvedValue(mockAnonymousUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initializeAuth();
      });

      expect(result.current.user).toEqual(mockAnonymousUser);
      expect(result.current.isInitialized).toBe(true);
      expect(mockAuthService.createAnonymousUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('signInWithProvider', () => {
    it('should sign in with GitHub', async () => {
      mockAuthService.signInWithGitHub.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithProvider('github');
      });

      expect(mockAuthService.signInWithGitHub).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should sign in with Google', async () => {
      mockAuthService.signInWithGoogle.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithProvider('google');
      });

      expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sign in error', async () => {
      mockAuthService.signInWithGitHub.mockRejectedValue(new Error('Sign in failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithProvider('github');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('upgradeAnonymousUser', () => {
    it('should upgrade anonymous user with GitHub', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-789',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      // Set up initial anonymous user
      act(() => {
        useAuthStore.setState({ user: mockAnonymousUser });
      });

      mockAuthService.upgradeAnonymousUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.upgradeAnonymousUser('github');
      });

      expect(mockAuthService.upgradeAnonymousUser).toHaveBeenCalledWith('github');
      expect(result.current.isLoading).toBe(false);
    });

    it('should not upgrade if user is not anonymous', async () => {
      const mockAuthUser: AuthUser = {
        id: 'auth-456',
        email: 'test@example.com',
        is_anonymous: false,
        created_at: new Date().toISOString()
      };

      act(() => {
        useAuthStore.setState({ user: mockAuthUser });
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.upgradeAnonymousUser('github');
      });

      expect(mockAuthService.upgradeAnonymousUser).not.toHaveBeenCalled();
    });

    it('should handle upgrade error', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-999',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      act(() => {
        useAuthStore.setState({ user: mockAnonymousUser });
      });

      mockAuthService.upgradeAnonymousUser.mockRejectedValue(new Error('Upgrade failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.upgradeAnonymousUser('google');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handleAuthCallback', () => {
    it('should handle successful auth callback', async () => {
      const mockSupabaseUser = {
        id: 'supabase-123',
        email: 'callback@example.com'
      };

      const mockAuthUser: AuthUser = {
        id: 'auth-123',
        email: 'callback@example.com',
        is_anonymous: false,
        created_at: new Date().toISOString()
      };

      mockAuthService.handleAuthCallback.mockResolvedValue(mockAuthUser);
      mockAuthService.getUserValueStats.mockResolvedValue({
        testCount: 5,
        messageCount: 10,
        conversationCount: 2
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.handleAuthCallback(mockSupabaseUser as any);
      });

      expect(result.current.user).toEqual(mockAuthUser);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.shouldShowUpgradePrompt).toBe(false);
      expect(mockAuthService.handleAuthCallback).toHaveBeenCalledWith(mockSupabaseUser);
    });

    it('should handle auth callback error', async () => {
      const mockSupabaseUser = {
        id: 'supabase-456',
        email: 'error@example.com'
      };

      mockAuthService.handleAuthCallback.mockRejectedValue(new Error('Callback failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.handleAuthCallback(mockSupabaseUser as any);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockAuthService.signOut.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sign out error', async () => {
      mockAuthService.signOut.mockRejectedValue(new Error('Sign out failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handleSignOut', () => {
    it('should create new anonymous user on sign out', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'new-anon',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      mockAuthService.createAnonymousUser.mockResolvedValue(mockAnonymousUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.handleSignOut();
      });

      expect(result.current.user).toEqual(mockAnonymousUser);
      expect(result.current.shouldShowUpgradePrompt).toBe(false);
      expect(result.current.upgradeStats).toEqual({
        testCount: 0,
        messageCount: 0,
        conversationCount: 0
      });
    });
  });

  describe('checkUpgradePrompt', () => {
    it('should show upgrade prompt for eligible anonymous user', async () => {
      const mockAnonymousUser: AnonymousUser = {
        id: 'anon-eligible',
        is_anonymous: true,
        created_at: new Date().toISOString()
      };

      const mockStats = {
        testCount: 10,
        messageCount: 25,
        conversationCount: 5
      };

      act(() => {
        useAuthStore.setState({ user: mockAnonymousUser });
      });

      mockAuthService.shouldPromptUpgrade.mockResolvedValue(true);
      mockAuthService.getUserValueStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkUpgradePrompt();
      });

      expect(result.current.shouldShowUpgradePrompt).toBe(true);
      expect(result.current.upgradeStats).toEqual(mockStats);
    });

    it('should not show upgrade prompt for non-anonymous user', async () => {
      const mockAuthUser: AuthUser = {
        id: 'auth-user',
        email: 'auth@example.com',
        is_anonymous: false,
        created_at: new Date().toISOString()
      };

      act(() => {
        useAuthStore.setState({ user: mockAuthUser });
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkUpgradePrompt();
      });

      expect(mockAuthService.shouldPromptUpgrade).not.toHaveBeenCalled();
      expect(result.current.shouldShowUpgradePrompt).toBe(false);
    });
  });

  describe('dismissUpgradePrompt', () => {
    it('should dismiss upgrade prompt and set localStorage flag', () => {
      act(() => {
        useAuthStore.setState({ shouldShowUpgradePrompt: true });
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.dismissUpgradePrompt();
      });

      expect(result.current.shouldShowUpgradePrompt).toBe(false);
      expect(localStorage.getItem('upgrade_prompt_dismissed')).toBeTruthy();
    });
  });

  describe('refreshUserStats', () => {
    it('should refresh user stats', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'stats@example.com',
        is_anonymous: false,
        created_at: new Date().toISOString()
      };

      const mockStats = {
        testCount: 15,
        messageCount: 30,
        conversationCount: 8
      };

      act(() => {
        useAuthStore.setState({ user: mockUser });
      });

      mockAuthService.getUserValueStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshUserStats();
      });

      expect(result.current.upgradeStats).toEqual(mockStats);
      expect(mockAuthService.getUserValueStats).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not refresh stats if no user', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshUserStats();
      });

      expect(mockAuthService.getUserValueStats).not.toHaveBeenCalled();
    });
  });
});