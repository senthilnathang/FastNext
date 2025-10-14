"use client"

import * as React from "react"

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventDefault?: boolean
  passive?: boolean
}

interface TouchState {
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
  endTime: number
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefault = false,
    passive = true
  } = options

  const touchState = React.useRef<TouchState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    startTime: 0,
    endTime: 0
  })

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    const touch = e.touches[0]
    touchState.current.startX = touch.clientX
    touchState.current.startY = touch.clientY
    touchState.current.startTime = Date.now()
  }, [preventDefault])

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    const touch = e.touches[0]
    touchState.current.endX = touch.clientX
    touchState.current.endY = touch.clientY
  }, [preventDefault])

  const handleTouchEnd = React.useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    touchState.current.endTime = Date.now()

    const deltaX = touchState.current.endX - touchState.current.startX
    const deltaY = touchState.current.endY - touchState.current.startY
    const deltaTime = touchState.current.endTime - touchState.current.startTime

    // Only trigger if gesture is fast enough (< 500ms) and meets threshold
    if (deltaTime > 500) return

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Determine if horizontal or vertical swipe
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, preventDefault])

  const addSwipeListeners = React.useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive })
    element.addEventListener('touchmove', handleTouchMove, { passive })
    element.addEventListener('touchend', handleTouchEnd, { passive })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, passive])

  return { addSwipeListeners }
}

// Hook for mouse/pointer events (desktop fallback)
export function usePointerSwipe(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50
  } = options

  const pointerState = React.useRef({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDown: false
  })

  const handlePointerDown = React.useCallback((e: PointerEvent) => {
    pointerState.current.isDown = true
    pointerState.current.startX = e.clientX
    pointerState.current.startY = e.clientY
  }, [])

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    if (!pointerState.current.isDown) return

    pointerState.current.endX = e.clientX
    pointerState.current.endY = e.clientY
  }, [])

  const handlePointerUp = React.useCallback(() => {
    if (!pointerState.current.isDown) return

    pointerState.current.isDown = false

    const deltaX = pointerState.current.endX - pointerState.current.startX
    const deltaY = pointerState.current.endY - pointerState.current.startY

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  const addPointerListeners = React.useCallback((element: HTMLElement) => {
    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('pointerleave', handlePointerUp)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  return { addPointerListeners }
}

export default useSwipeGesture
