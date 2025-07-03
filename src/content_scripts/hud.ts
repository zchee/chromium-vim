declare const settings: {
  hud: boolean;
};

declare const Find: {
  matches: any[];
  index: number;
};

declare const Command: {
  onBottom: boolean;
};

interface HUDInterface {
  visible: boolean;
  slideDuration: number;
  element?: HTMLDivElement;
  hideTimeout?: number;
  overflowValue?: string;
  transition?: boolean;

  transitionEvent(): void;
  hide(ignoreSetting?: boolean): boolean | void;
  setMessage(text: string, duration?: number): boolean | void;
  display(text: string | number, duration?: number): boolean | void;
}

export const HUD: HUDInterface = {
  visible: false,
  slideDuration: 40,

  transitionEvent(): void {
    if (this.overflowValue) {
      document.body.style.overflowX = this.overflowValue;
      delete this.overflowValue;
    }

    if (this.element) {
      this.element.removeEventListener('transitionend', this.transitionEvent, true);
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      delete this.element;
    }

    this.visible = false;
    this.transition = false;
  },

  hide(ignoreSetting = false): boolean | void {
    if (!ignoreSetting) {
      if (!settings.hud || this.element === undefined) {
        return false;
      }
      if (Find.matches.length) {
        return this.display(Find.index + 1 + ' / ' + Find.matches.length);
      }
    }

    if (!this.element) {
      return false;
    }

    this.transition = true;
    this.element.addEventListener('transitionend', this.transitionEvent.bind(this), true);
    const width = this.element.offsetWidth;
    this.element.style.right = -width + 'px';
  },

  setMessage(text: string, duration?: number): boolean | void {
    window.clearTimeout(this.hideTimeout);

    if (!settings.hud || this.element === undefined) {
      return false;
    }

    if (this.element.firstElementChild) {
      this.element.firstElementChild.textContent = text;
    }

    if (duration) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, duration * 1000);
    }
  },

  display(text: string | number, duration?: number): boolean | void {
    if (this.visible && this.transition && this.element) {
      this.element.removeEventListener('transitionend', this.transitionEvent.bind(this), true);
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      delete this.element;
    }

    this.visible = true;

    if (!settings.hud) {
      return this.setMessage(text.toString(), duration);
    }

    if (this.element) {
      this.element.removeEventListener('transitionend', this.transitionEvent.bind(this), true);
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      delete this.element;
    }

    window.clearTimeout(this.hideTimeout);

    let span: HTMLSpanElement;
    let pageWidth: number;
    let screenWidth: number;

    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = 'cVim-hud';
      if (Command.onBottom) {
        this.element.style.bottom = 'initial';
        this.element.style.top = '0';
      }
    }

    this.element.innerHTML = '';
    span = document.createElement('span');
    span.textContent = text.toString();
    this.element.appendChild(span);

    try {
      if (document.documentElement.lastElementChild) {
        document.documentElement.lastElementChild.appendChild(this.element);
      } else {
        document.documentElement.appendChild(this.element);
      }
    } catch (e) {
      if (document.body === undefined) {
        return false;
      } else {
        document.body.appendChild(this.element);
      }
    }

    this.element.style.right = -this.element.offsetWidth + 'px';

    screenWidth = document.documentElement.clientWidth;
    pageWidth = document.body.scrollWidth;

    if (screenWidth === pageWidth) {
      this.overflowValue = getComputedStyle(document.body).overflowX;
      document.body.style.overflowX = 'hidden';
    }

    this.element.style.right = '0';

    if (duration) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, duration * 1000);
    }
  }
};

declare global {
  interface Window {
    HUD: HUDInterface;
  }
}

window.HUD = HUD;
