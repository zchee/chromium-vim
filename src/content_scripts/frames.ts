// Import messaging functions from messenger module
import { RUNTIME, PORT } from './messenger';

declare global {
  interface Window {
    portDestroyed?: boolean;
    isCommandFrame?: boolean;
  }
}

interface FramesInterface {
  frameId: number | null;
  focus(disableAnimation?: boolean): void;
  frameIsVisible(element: Element): boolean;
  markAsActive(): void;
  init(frameId: number): void;
}

export const Frames: FramesInterface = {
  frameId: null,

  focus(disableAnimation = false): void {
    window.focus();
    if (!disableAnimation) {
      const outline = document.createElement('div');
      outline.id = 'cVim-frames-outline';
      document.body.appendChild(outline);
      window.setTimeout(() => {
        if (outline.parentNode) {
          document.body.removeChild(outline);
        }
      }, 500);
    }
  },

  frameIsVisible(element: Element): boolean {
    if (element.getAttribute('aria-hidden') === 'true' ||
      element.getAttribute('height') === '0' ||
      element.getAttribute('width') === '0') {
      return false;
    }

    const style = getComputedStyle(element, null);
    if (style.display === 'none' ||
      style.opacity === '0' ||
      style.width === '0' ||
      style.height === '0' ||
      style.visibility === 'hidden') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      return false;
    }

    return true;
  },

  markAsActive(): void {
    RUNTIME('markActiveFrame', {
      frameId: this.frameId,
    });
  },

  init(frameId: number): void {
    Frames.frameId = frameId;
    PORT('addFrame', {
      isCommandFrame: !!window.isCommandFrame
    });
  }
};

declare global {
  interface Window {
    Frames: FramesInterface;
  }
}

window.Frames = Frames;

((): void => {
  const focusListener = (): void => {
    if (window.portDestroyed) {
      window.removeEventListener('focus', focusListener);
      return;
    }
    if (!window.isCommandFrame) {
      Frames.markAsActive();
    }
  };
  window.addEventListener('focus', focusListener);
})();
