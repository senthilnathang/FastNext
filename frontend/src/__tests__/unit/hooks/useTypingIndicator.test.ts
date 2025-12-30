/**
 * Tests for useTypingIndicator hook
 *
 * Note: This test file creates tests for a useTypingIndicator hook that
 * manages typing indicator state for real-time messaging.
 */

import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock WebSocket hooks
const mockSendTypingEvent = jest.fn();
const mockTypingUsers = new Map<string, { userId: string; userName: string; timestamp: number }>();

// Mock useTypingIndicator hook implementation
interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface UseTypingIndicatorOptions {
  channelId: string;
  userId: string;
  userName: string;
  debounceMs?: number;
  timeoutMs?: number;
  onTypingChange?: (users: TypingUser[]) => void;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
  setTyping: (isTyping: boolean) => void;
}

function useTypingIndicator(
  options: UseTypingIndicatorOptions
): UseTypingIndicatorReturn {
  const {
    channelId,
    userId,
    userName,
    debounceMs = 500,
    timeoutMs = 5000,
    onTypingChange,
  } = options;

  const [typingUsers, setTypingUsers] = React.useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const stopRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle incoming typing events
  React.useEffect(() => {
    const handleTypingEvent = (event: CustomEvent<{
      channelId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }>) => {
      const { channelId: eventChannelId, userId: eventUserId, userName: eventUserName, isTyping: eventIsTyping } = event.detail;

      if (eventChannelId !== channelId || eventUserId === userId) return;

      setTypingUsers((prev) => {
        if (eventIsTyping) {
          const existing = prev.find((u) => u.userId === eventUserId);
          if (existing) {
            return prev.map((u) =>
              u.userId === eventUserId ? { ...u, timestamp: Date.now() } : u
            );
          }
          return [...prev, { userId: eventUserId, userName: eventUserName, timestamp: Date.now() }];
        } else {
          return prev.filter((u) => u.userId !== eventUserId);
        }
      });
    };

    window.addEventListener('typingEvent' as any, handleTypingEvent as EventListener);
    return () => {
      window.removeEventListener('typingEvent' as any, handleTypingEvent as EventListener);
    };
  }, [channelId, userId]);

  // Clean up stale typing users
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((u) => now - u.timestamp < timeoutMs)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs]);

  // Notify on typing users change
  React.useEffect(() => {
    onTypingChange?.(typingUsers);
  }, [typingUsers, onTypingChange]);

  const sendTypingEvent = React.useCallback(
    (typing: boolean) => {
      mockSendTypingEvent({ channelId, userId, userName, isTyping: typing });
    },
    [channelId, userId, userName]
  );

  const startTyping = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      sendTypingEvent(true);
    }

    // Clear previous stop timeout
    if (stopRef.current) {
      clearTimeout(stopRef.current);
    }

    // Auto-stop after timeout
    stopRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingEvent(false);
    }, timeoutMs);
  }, [isTyping, sendTypingEvent, timeoutMs]);

  const stopTyping = React.useCallback(() => {
    if (stopRef.current) {
      clearTimeout(stopRef.current);
    }

    if (isTyping) {
      debounceRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingEvent(false);
      }, debounceMs);
    }
  }, [isTyping, sendTypingEvent, debounceMs]);

  const setTypingState = React.useCallback(
    (typing: boolean) => {
      if (typing) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (stopRef.current) clearTimeout(stopRef.current);
      if (isTyping) {
        sendTypingEvent(false);
      }
    };
  }, []);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
    setTyping: setTypingState,
  };
}

describe('useTypingIndicator', () => {
  const defaultOptions: UseTypingIndicatorOptions = {
    channelId: 'channel-1',
    userId: 'user-1',
    userName: 'John Doe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('initializes with empty typing users', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    expect(result.current.typingUsers).toEqual([]);
  });

  test('initializes with isTyping as false', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    expect(result.current.isTyping).toBe(false);
  });

  test('sets isTyping to true when startTyping is called', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      result.current.startTyping();
    });

    expect(result.current.isTyping).toBe(true);
  });

  test('sends typing event when startTyping is called', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      result.current.startTyping();
    });

    expect(mockSendTypingEvent).toHaveBeenCalledWith({
      channelId: 'channel-1',
      userId: 'user-1',
      userName: 'John Doe',
      isTyping: true,
    });
  });

  test('debounces stopTyping calls', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, debounceMs: 500 })
    );

    act(() => {
      result.current.startTyping();
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      result.current.stopTyping();
    });

    // Still typing due to debounce
    expect(result.current.isTyping).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('sends stop typing event after debounce', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, debounceMs: 500 })
    );

    act(() => {
      result.current.startTyping();
    });

    mockSendTypingEvent.mockClear();

    act(() => {
      result.current.stopTyping();
      jest.advanceTimersByTime(500);
    });

    expect(mockSendTypingEvent).toHaveBeenCalledWith({
      channelId: 'channel-1',
      userId: 'user-1',
      userName: 'John Doe',
      isTyping: false,
    });
  });

  test('auto-stops typing after timeout', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, timeoutMs: 5000 })
    );

    act(() => {
      result.current.startTyping();
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('resets timeout on repeated startTyping calls', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, timeoutMs: 5000 })
    );

    act(() => {
      result.current.startTyping();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.startTyping();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should still be typing because timeout was reset
    expect(result.current.isTyping).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('does not send duplicate typing events', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      result.current.startTyping();
    });

    const callCount = mockSendTypingEvent.mock.calls.length;

    act(() => {
      result.current.startTyping();
      result.current.startTyping();
      result.current.startTyping();
    });

    // Should only send once
    expect(mockSendTypingEvent.mock.calls.length).toBe(callCount);
  });

  test('setTyping true calls startTyping', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      result.current.setTyping(true);
    });

    expect(result.current.isTyping).toBe(true);
  });

  test('setTyping false calls stopTyping', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, debounceMs: 500 })
    );

    act(() => {
      result.current.setTyping(true);
    });

    act(() => {
      result.current.setTyping(false);
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('handles incoming typing events from other users', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(1);
    expect(result.current.typingUsers[0].userId).toBe('user-2');
  });

  test('ignores typing events from self', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-1',
            userName: 'John Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  test('ignores typing events from other channels', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-2',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  test('removes user when they stop typing', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(1);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: false,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  test('cleans up stale typing users after timeout', () => {
    const { result } = renderHook(() =>
      useTypingIndicator({ ...defaultOptions, timeoutMs: 5000 })
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(6000); // 5 seconds timeout + 1 second interval
    });

    expect(result.current.typingUsers).toHaveLength(0);
  });

  test('calls onTypingChange when typing users change', () => {
    const onTypingChange = jest.fn();
    renderHook(() =>
      useTypingIndicator({ ...defaultOptions, onTypingChange })
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(onTypingChange).toHaveBeenCalled();
  });

  test('updates timestamp for existing typing user', () => {
    const { result } = renderHook(() => useTypingIndicator(defaultOptions));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    const firstTimestamp = result.current.typingUsers[0].timestamp;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('typingEvent', {
          detail: {
            channelId: 'channel-1',
            userId: 'user-2',
            userName: 'Jane Doe',
            isTyping: true,
          },
        })
      );
    });

    expect(result.current.typingUsers[0].timestamp).toBeGreaterThan(firstTimestamp);
  });
});
