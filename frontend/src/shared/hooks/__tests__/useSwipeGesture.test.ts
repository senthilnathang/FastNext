import { act, renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from "vitest";
import { usePointerSwipe, useSwipeGesture } from "../useSwipeGesture";

// Mock touch events
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
) => {
  const event = new Event(type) as any;
  event.touches = touches;
  event.preventDefault = vi.fn();
  return event;
};

// Mock pointer events
const createPointerEvent = (type: string, clientX: number, clientY: number) => {
  const event = new Event(type) as any;
  event.clientX = clientX;
  event.clientY = clientY;
  return event;
};

describe("useSwipeGesture", () => {
  let mockElement: HTMLElement;
  let addEventListenerSpy: MockInstance;
  let removeEventListenerSpy: MockInstance;

  beforeEach(() => {
    mockElement = document.createElement("div");
    addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");
    removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Setup", () => {
    it("returns addSwipeListeners function", () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.addSwipeListeners).toBeDefined();
      expect(typeof result.current.addSwipeListeners).toBe("function");
    });

    it("adds touch event listeners to element", () => {
      const { result } = renderHook(() => useSwipeGesture());

      result.current.addSwipeListeners(mockElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchend",
        expect.any(Function),
        { passive: true },
      );
    });

    it("removes event listeners when cleanup function is called", () => {
      const { result } = renderHook(() => useSwipeGesture());

      const cleanup = result.current.addSwipeListeners(mockElement);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchend",
        expect.any(Function),
      );
    });
  });

  describe("Swipe Detection", () => {
    it("detects right swipe", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, threshold: 50 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate swipe right
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 180, clientY: 100 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeRight).toHaveBeenCalled();
    });

    it("detects left swipe", () => {
      const onSwipeLeft = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeLeft, threshold: 50 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate swipe left
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 200, clientY: 100 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 120, clientY: 100 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeLeft).toHaveBeenCalled();
    });

    it("detects up swipe", () => {
      const onSwipeUp = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeUp, threshold: 50 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate swipe up
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 200 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 100, clientY: 120 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeUp).toHaveBeenCalled();
    });

    it("detects down swipe", () => {
      const onSwipeDown = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeDown, threshold: 50 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate swipe down
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 100, clientY: 180 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeDown).toHaveBeenCalled();
    });
  });

  describe("Threshold Handling", () => {
    it("does not trigger swipe when distance is below threshold", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, threshold: 100 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate small swipe (below threshold)
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 130, clientY: 100 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("uses custom threshold", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, threshold: 30 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Simulate swipe that meets custom threshold
      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);
      const moveEvent = createTouchEvent("touchmove", [
        { clientX: 135, clientY: 100 },
      ]);
      const endEvent = createTouchEvent("touchend", []);

      act(() => {
        mockElement.dispatchEvent(startEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(endEvent);
      });

      expect(onSwipeRight).toHaveBeenCalled();
    });
  });

  describe("Time Constraint", () => {
    it("does not trigger swipe when gesture is too slow", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight, threshold: 50 }),
      );

      result.current.addSwipeListeners(mockElement);

      // Mock Date.now to simulate slow gesture
      const originalNow = Date.now;
      let timeCounter = 0;
      Date.now = vi.fn(() => {
        timeCounter += 600; // Simulate 600ms delay (too slow)
        return timeCounter;
      });

      try {
        const startEvent = createTouchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
        ]);
        const moveEvent = createTouchEvent("touchmove", [
          { clientX: 180, clientY: 100 },
        ]);
        const endEvent = createTouchEvent("touchend", []);

        act(() => {
          mockElement.dispatchEvent(startEvent);
          mockElement.dispatchEvent(moveEvent);
          mockElement.dispatchEvent(endEvent);
        });

        expect(onSwipeRight).not.toHaveBeenCalled();
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe("preventDefault Option", () => {
    it("calls preventDefault when option is enabled", () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ preventDefault: true }),
      );

      result.current.addSwipeListeners(mockElement);

      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);

      act(() => {
        mockElement.dispatchEvent(startEvent);
      });

      expect(startEvent.preventDefault).toHaveBeenCalled();
    });

    it("does not call preventDefault when option is disabled", () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ preventDefault: false }),
      );

      result.current.addSwipeListeners(mockElement);

      const startEvent = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100 },
      ]);

      act(() => {
        mockElement.dispatchEvent(startEvent);
      });

      expect(startEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Passive Option", () => {
    it("uses passive option when adding event listeners", () => {
      const { result } = renderHook(() => useSwipeGesture({ passive: false }));

      result.current.addSwipeListeners(mockElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { passive: false },
      );
    });
  });
});

describe("usePointerSwipe", () => {
  let mockElement: HTMLElement;
  let addEventListenerSpy: MockInstance;

  beforeEach(() => {
    mockElement = document.createElement("div");
    addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Setup", () => {
    it("returns addPointerListeners function", () => {
      const { result } = renderHook(() => usePointerSwipe());

      expect(result.current.addPointerListeners).toBeDefined();
      expect(typeof result.current.addPointerListeners).toBe("function");
    });

    it("adds pointer event listeners to element", () => {
      const { result } = renderHook(() => usePointerSwipe());

      result.current.addPointerListeners(mockElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointerdown",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointerup",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointerleave",
        expect.any(Function),
      );
    });
  });

  describe("Pointer Swipe Detection", () => {
    it("detects right pointer swipe", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        usePointerSwipe({ onSwipeRight, threshold: 50 }),
      );

      result.current.addPointerListeners(mockElement);

      // Simulate pointer swipe right
      const downEvent = createPointerEvent("pointerdown", 100, 100);
      const moveEvent = createPointerEvent("pointermove", 180, 100);
      const upEvent = createPointerEvent("pointerup", 180, 100);

      act(() => {
        mockElement.dispatchEvent(downEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(upEvent);
      });

      expect(onSwipeRight).toHaveBeenCalled();
    });

    it("does not trigger swipe when pointer is not down", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        usePointerSwipe({ onSwipeRight, threshold: 50 }),
      );

      result.current.addPointerListeners(mockElement);

      // Simulate pointer move without down
      const moveEvent = createPointerEvent("pointermove", 180, 100);
      const upEvent = createPointerEvent("pointerup", 180, 100);

      act(() => {
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(upEvent);
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("handles pointerleave as pointerup", () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        usePointerSwipe({ onSwipeRight, threshold: 50 }),
      );

      result.current.addPointerListeners(mockElement);

      // Simulate pointer swipe with leave
      const downEvent = createPointerEvent("pointerdown", 100, 100);
      const moveEvent = createPointerEvent("pointermove", 180, 100);
      const leaveEvent = createPointerEvent("pointerleave", 180, 100);

      act(() => {
        mockElement.dispatchEvent(downEvent);
        mockElement.dispatchEvent(moveEvent);
        mockElement.dispatchEvent(leaveEvent);
      });

      expect(onSwipeRight).toHaveBeenCalled();
    });
  });
});
