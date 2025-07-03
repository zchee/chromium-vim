// Scroll functionality for cVim Chrome Extension
// Handles scrolling behavior, smooth scrolling, and scroll history

// External dependencies
declare const settings: {
  scrollstep?: number;
  smoothscroll?: boolean;
  scrollduration?: number;
  fullpagescrollpercent?: number;
};

// Type definitions for scroll functionality
interface ScrollHistoryState {
  0: Element; // scroll element
  1: number;  // scrollLeft
  2: number;  // scrollTop
}

interface ScrollAnimationState {
  x0: number;    // starting x position
  x1: number;    // ending x position
  xc: number;    // delta-x during scroll
  tx: number;    // delta-t
  txo: number;   // last time measurement
  dx: number;    // x-duration
  y0: number;    // starting y position
  y1: number;    // ending y position
  yc: number;    // delta-y during scroll
  ty: number;    // delta-t
  tyo: number;   // last time measurement
  dy: number;    // y-duration
  callback: (() => void) | null;
}

interface ScrollInterface {
  positions: Record<string, any>;
  history: ScrollHistoryState[];
  historyIndex: number;
  lastPosition?: [number, number];

  historyStateEquals(s1: ScrollHistoryState | null, s2: ScrollHistoryState | null): boolean;
  scrollToHistoryState(index?: number): void;
  previousHistoryState(): void;
  nextHistoryState(): void;
  currentState(): ScrollHistoryState | null;
  lastState(): ScrollHistoryState | null;
  addHistoryState(): boolean;
  scroll(type: ScrollType, repeats: number): void;
}

// Note: SmoothScrollContext interface removed as it's now handled via global Window interface

type ScrollType =
  | 'up' | 'down' | 'left' | 'right'
  | 'pageUp' | 'pageDown' | 'fullPageUp' | 'fullPageDown'
  | 'top' | 'bottom' | 'leftmost' | 'rightmost';

type ScrollDirection = number;
type EaseFunction = (t: number, b: number, c: number, d: number) => number;

// Scroll direction constants
const NON_SCROLLABLE: ScrollDirection = 0;
const SCROLLABLE_Y_DOWN: ScrollDirection = 1;
const SCROLLABLE_Y_UP: ScrollDirection = 2;
const SCROLLABLE_X_RIGHT: ScrollDirection = 4;
const SCROLLABLE_X_LEFT: ScrollDirection = 8;
// Note: SCROLLABLE constant available for future use if needed
// const SCROLLABLE: ScrollDirection = SCROLLABLE_X_LEFT | SCROLLABLE_X_RIGHT |
//                                   SCROLLABLE_Y_UP | SCROLLABLE_Y_DOWN;

// Global window extensions for scroll functionality
declare global {
  interface Window {
    resetScrollFocus(): void;
    smoothScrollBy(elem: Element, x: number, y: number, d: number, callback?: () => void): void;
    smoothScrollTo(elem: Element, x: number, y: number, d: number, callback?: () => void): void;
    setSmoothScrollEaseFN(fn: EaseFunction): void;
    scrollKeyUp: boolean;
  }
}

// Helper functions for scrolling
function $scrollBy(elem: Element, x: number, y: number): void {
  elem.scrollLeft += x;
  elem.scrollTop += y;
}

function $scrollTo(elem: Element, x: number | null, y: number | null): void {
  if (x !== null) {
    elem.scrollLeft = x;
  }
  if (y !== null) {
    elem.scrollTop = y;
  }
}

// Scrolling element detection with proper typing
const scrollingElement = (function() {
  function getScrollType(elem: Element): ScrollDirection {
    const cs = getComputedStyle(elem);
    let st: ScrollDirection = NON_SCROLLABLE;

    if (cs.overflow === 'hidden') {
      return st;
    }

    if (cs.overflowX !== 'hidden' &&
      (elem as HTMLElement).offsetHeight > elem.clientHeight &&
      elem.scrollWidth > elem.clientWidth) {
      if (elem.scrollLeft > 0) {
        st |= SCROLLABLE_X_LEFT;
      }
      if (elem.scrollLeft + elem.clientWidth < elem.scrollWidth) {
        st |= SCROLLABLE_X_RIGHT;
      }
    }

    if (cs.overflowY !== 'hidden' &&
      (elem as HTMLElement).offsetWidth > elem.clientWidth &&
      elem.scrollHeight > elem.clientHeight) {
      if (elem.scrollTop > 0) {
        st |= SCROLLABLE_Y_UP;
      }
      if (elem.scrollTop + elem.clientHeight < elem.scrollHeight) {
        st |= SCROLLABLE_Y_DOWN;
      }
    }

    return st;
  }

  let lastActiveElem: Element | null = null;
  let lastScrollElem: Element | null = null;
  let clickFocus = false;

  // Reset scroll focus function
  window.resetScrollFocus = function(): void {
    clickFocus = false;
  };

  // Mouse event handling for scroll focus
  document.addEventListener('mousedown', function(event: MouseEvent): boolean {
    if (!event.isTrusted) {
      return true;
    }
    clickFocus = true;
    lastActiveElem = event.srcElement as Element;
    return true;
  });

  return function scrollingElement(dir: ScrollDirection): Element {
    let elem: Element | null;

    if (clickFocus) {
      elem = lastActiveElem;
    } else {
      elem = lastActiveElem = document.activeElement;
    }

    if (elem === null) {
      return document.scrollingElement || document.documentElement;
    }

    return (function climb(elem: Element | null): Element {
      if (elem === null) {
        return lastScrollElem || document.scrollingElement || document.documentElement;
      }
      if (elem === document.scrollingElement) {
        return elem;
      }

      const st = getScrollType(elem);
      return (st & dir) ? elem : climb(elem.parentElement);
    })(elem);
  };
})();

// Smooth scrolling implementation with animation frames
(function() {
  let animationYFrame: number | null = null;
  let animationXFrame: number | null = null;
  let scrollXFunction: FrameRequestCallback;
  let scrollYFunction: FrameRequestCallback;
  let scrollElem: Element;
  let scrollXElem: Element;
  let lastX: number;
  let lastY: number;
  let holdKeyScroll = false;

  // Default easing function
  let easeFn: EaseFunction = function(t: number, b: number, c: number, d: number): number {
    return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
  };

  // High-resolution time function
  const timeFn = typeof window.performance === 'undefined' ?
    Date.now : performance.now.bind(performance);

  // Animation state objects
  const scroll: ScrollAnimationState = {
    x0: 0, x1: 0, xc: 0, tx: 0, txo: 0, dx: 0,
    y0: 0, y1: 0, yc: 0, ty: 0, tyo: 0, dy: 0,
    callback: null,
  };
  const scrollx: ScrollAnimationState = Object.clone(scroll);

  // Y-axis scroll animation function
  scrollYFunction = function(): void {
    const delta = easeFn(scroll.ty, scroll.y0, scroll.y1 - scroll.y0, scroll.dy);
    const time = timeFn();
    scroll.yc = delta;
    scroll.ty += time - scroll.tyo;
    scroll.tyo = time;
    $scrollTo(scrollElem, null, delta);

    if (!holdKeyScroll && scroll.ty <= scroll.dy) {
      animationYFrame = requestAnimationFrame(scrollYFunction);
    } else {
      if (animationYFrame !== null) {
        cancelAnimationFrame(animationYFrame);
      }
      animationYFrame = null;
      $scrollTo(scrollElem, null, scroll.y1);
      scroll.y0 = scroll.y1 = scroll.yc = scroll.ty = 0;
      if (scroll.callback) {
        scroll.callback();
      }
    }
  };

  // X-axis scroll animation function
  scrollXFunction = function(): void {
    const delta = easeFn(scrollx.tx, scrollx.x0, scrollx.x1 - scrollx.x0, scrollx.dx);
    const time = timeFn();
    scrollx.xc = delta;
    scrollx.tx += time - scrollx.txo;
    scrollx.txo = time;
    $scrollTo(scrollXElem, delta, null);

    if (!holdKeyScroll && scrollx.tx <= scrollx.dx) {
      animationXFrame = requestAnimationFrame(scrollXFunction);
    } else {
      if (animationXFrame !== null) {
        cancelAnimationFrame(animationXFrame);
      }
      animationXFrame = null;
      $scrollTo(scrollXElem, scrollx.x1, null);
      scrollx.x0 = scrollx.x1 = scrollx.xc = scrollx.tx = 0;
      if (scroll.callback) {
        scroll.callback();
      }
    }
  };

  // Set custom easing function
  window.setSmoothScrollEaseFN = function(fn: EaseFunction): void {
    easeFn = fn;
  };

  // Smooth scroll to absolute position
  window.smoothScrollTo = function(elem: Element, x: number, y: number, d: number, callback?: () => void): void {
    scrollElem = elem;
    if (animationXFrame !== null) {
      cancelAnimationFrame(animationXFrame);
    }
    if (animationYFrame !== null) {
      cancelAnimationFrame(animationYFrame);
    }

    scroll.dx = scroll.dy = d;
    scrollx.dx = scrollx.dy = d;
    scroll.callback = callback || function() { };

    if (x !== scrollElem.scrollLeft) {
      scrollXElem = elem;
      scrollx.x0 = scrollXElem.scrollLeft;
      scrollx.x1 = x;
      scrollx.tx = 0;
      scrollx.txo = timeFn();
      scrollXFunction(0);
    }

    if (y !== scrollElem.scrollTop) {
      scroll.y0 = scrollElem.scrollTop;
      scroll.y1 = y;
      scroll.ty = 0;
      scroll.tyo = timeFn();
      scrollYFunction(0);
    }
  };

  // Hold key scroll function for continuous scrolling
  const holdFunction = function(dx: number, dy: number): void {
    const se = dx ? scrollXElem : scrollElem;

    (function animationLoop(): void {
      if (window.scrollKeyUp) {
        holdKeyScroll = false;
        return;
      }
      $scrollBy(se, dx, dy);
      requestAnimationFrame(animationLoop);
    })();
  };

  // Smooth scroll by relative amount
  window.smoothScrollBy = function(elem: Element, x: number, y: number, d: number, callback?: () => void): void {
    if (x) {
      scrollXElem = elem;
    } else {
      scrollElem = elem;
    }

    if (!window.scrollKeyUp && x === lastX && y === lastY) {
      if (!holdKeyScroll) {
        holdKeyScroll = true;
        holdFunction(x * 0.25, y * 0.25);
      }
      return;
    }

    scroll.callback = callback || function() { };
    lastX = x;
    lastY = y;
    window.scrollKeyUp = false;
    holdKeyScroll = false;

    if (x) {
      const oldDx = scrollx.x1 - scrollx.xc;
      if (animationXFrame !== null) {
        cancelAnimationFrame(animationXFrame);
      }
      scrollx.dx = d;
      scrollx.x0 = scrollXElem.scrollLeft;
      scrollx.x1 = oldDx + scrollx.x0 + x;
      scrollx.tx = 0;
      scrollx.txo = timeFn();
      scrollXFunction(0);
    }

    if (y) {
      const oldDy = scroll.y1 - scroll.yc;
      scroll.dy = d;
      scroll.y0 = scrollElem.scrollTop;
      scroll.y1 = oldDy + scroll.y0 + y;
      scroll.ty = 0;
      scroll.tyo = timeFn();
      if (animationYFrame !== null) {
        cancelAnimationFrame(animationYFrame);
      }
      scrollYFunction(0);
    }
  };

  window.scrollKeyUp = true;
})();

// Main Scroll object with history and scrolling functionality
export const Scroll: ScrollInterface = {
  positions: {},
  history: [],
  historyIndex: 0,

  // Compare two scroll history states for equality
  historyStateEquals(s1: ScrollHistoryState | null, s2: ScrollHistoryState | null): boolean {
    if (!s1 || !s2) {
      return false;
    }
    return s1[0] === s2[0] &&
      s1[1] === s2[1] &&
      s1[2] === s2[2];
  },

  // Scroll to a specific history state by index
  scrollToHistoryState(index?: number): void {
    index = index ?? this.historyIndex;
    const state = this.history[index];
    if (!state) {
      return;
    }
    const scrollElem = state[0];
    scrollElem.scrollLeft = state[1];
    scrollElem.scrollTop = state[2];
    this.historyIndex = index;
  },

  // Navigate to previous scroll position in history
  previousHistoryState(): void {
    if (!this.historyStateEquals(this.lastState(), this.currentState())) {
      this.addHistoryState();
    }
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.scrollToHistoryState(this.historyIndex);
    }
  },

  // Navigate to next scroll position in history
  nextHistoryState(): void {
    if (this.historyIndex + 1 < this.history.length) {
      this.historyIndex++;
      this.scrollToHistoryState(this.historyIndex);
    }
  },

  // Get current scroll state
  currentState(): ScrollHistoryState | null {
    // TODO: make work with nested scrolling elements
    // const scrollElem = scrollingElement(SCROLLABLE);

    const scrollElem = document.scrollingElement;
    if (!scrollElem) {
      return null;
    }
    return [scrollElem, scrollElem.scrollLeft, scrollElem.scrollTop];
  },

  // Get the last recorded scroll state
  lastState(): ScrollHistoryState | null {
    if (this.historyIndex >= this.history.length) {
      return null;
    }
    return this.history[this.historyIndex] || null;
  },

  // Add current scroll position to history
  addHistoryState(): boolean {
    const nextState = this.currentState();
    if (!nextState) {
      return false;
    }

    if (this.historyIndex + 1 < this.history.length) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    if (this.history.length) {
      if (this.historyStateEquals(this.lastState(), nextState)) {
        return false;
      }
    }

    this.history.push(nextState);
    this.historyIndex = this.history.length - 1;
    return true;
  },

  // Main scroll function with different scroll types
  scroll(type: ScrollType, repeats: number): void {
    const stepSize = settings?.scrollstep ?? 60;

    const shouldLogPosition = !/^(up|down|left|right|pageUp|pageDown)$/.test(type);
    if (document.body && shouldLogPosition && document.scrollingElement) {
      this.lastPosition = [document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop];
      Scroll.addHistoryState();
    }

    // Determine scroll direction based on type
    const direction: ScrollDirection = (function(): ScrollDirection {
      switch (type) {
        case 'up': case 'pageUp': case 'fullPageUp': case 'top':
          return SCROLLABLE_Y_UP;
        case 'left': case 'leftmost':
          return SCROLLABLE_X_LEFT;
        case 'right': case 'rightmost':
          return SCROLLABLE_X_RIGHT;
        default:
          return SCROLLABLE_Y_DOWN;
      }
    })();

    const scrollElem = scrollingElement(direction);
    const hy = scrollElem === document.body ? innerHeight : scrollElem.clientHeight;
    const hw = scrollElem === document.body ? innerWidth : scrollElem.clientWidth;
    let x = 0;
    let y = 0;

    // Calculate scroll amount based on type
    switch (type) {
      case 'down':
        y = repeats * stepSize;
        break;
      case 'up':
        y -= repeats * stepSize;
        break;
      case 'pageDown':
        y = repeats * hy >> 1;
        break;
      case 'fullPageDown':
        y = repeats * hy * ((settings?.fullpagescrollpercent ?? 100) / 100);
        break;
      case 'pageUp':
        y -= repeats * hy >> 1;
        break;
      case 'fullPageUp':
        y -= repeats * hy * ((settings?.fullpagescrollpercent ?? 100) / 100);
        break;
      case 'top':
        y -= scrollElem.scrollTop;
        break;
      case 'bottom':
        y = scrollElem.scrollHeight - scrollElem.scrollTop - hy + 20;
        break;
      case 'left':
        x -= repeats * stepSize >> 1;
        break;
      case 'right':
        x = repeats * stepSize >> 1;
        break;
      case 'leftmost':
        x -= scrollElem.scrollLeft;
        break;
      case 'rightmost':
        x = scrollElem.scrollWidth - scrollElem.scrollLeft - hw + 20;
        break;
    }

    // Execute scroll with smooth scrolling if enabled
    if (settings?.smoothscroll) {
      window.smoothScrollBy(scrollElem, x, y, settings.scrollduration ?? 200);
    } else {
      $scrollBy(scrollElem, x, y);
    }
  }
};

// Make Scroll globally available
(window as any).Scroll = Scroll;
