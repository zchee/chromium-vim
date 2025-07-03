interface DOMRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface DOM {
  isSubmittable(element: Element | null): boolean;
  isEditable(element: Element | null): boolean;
  isTextElement(element: Element | null): boolean;
  onTitleChange(callback: (title: string) => void): void;
  getVisibleBoundingRect(node: Element): DOMRect | null;
  cloneRect(rect: DOMRect): DOMRect;
  getVisibleBoundingAreaRect(node: Element): DOMRect | null;
  isVisible(element: Element): boolean;
  mouseEvent(type: 'hover' | 'unhover' | 'click', element: Element): void;
}

declare global {
  interface Window {
    DOM: DOM;
  }

  function waitForLoad(callback: () => void, constructor?: any): void;
}

export const DOM: DOM = {

  isSubmittable(element: Element | null): boolean {
    if (!element) {
      return false;
    }
    if (element.localName !== 'input')
      return false;
    if (element.hasAttribute('submit'))
      return true;
    let currentElement: Element | null = element;
    while (currentElement = currentElement.parentElement) {
      if (currentElement.localName === 'form')
        return true;
    }
    return false;
  },

  isEditable(element: Element | null): boolean {
    if (!element) {
      return false;
    }
    if (element.localName === 'textarea' ||
      element.localName === 'select' ||
      element.hasAttribute('contenteditable'))
      return true;
    if (element.localName !== 'input')
      return false;
    const type = element.getAttribute('type');
    switch (type) {
      case 'button':
      case 'checkbox':
      case 'color':
      case 'file':
      case 'hidden':
      case 'image':
      case 'radio':
      case 'reset':
      case 'submit':
      case 'week':
        return false;
    }
    return true;
  },

  isTextElement(element: Element | null): boolean {
    if (!element) {
      return false;
    }
    if (element.localName === 'input' || element.localName === 'textarea') {
      return true;
    }
    let currentElement: Element | null = element;
    while (currentElement) {
      if ((currentElement as HTMLElement).isContentEditable) {
        return true;
      }
      currentElement = currentElement.parentElement;
    }
    return false;
  },

  onTitleChange(callback: (title: string) => void): void {
    waitForLoad(() => {
      const title = (document.getElementsByTagName('title') || [])[0];
      if (!title) {
        return;
      }
      new MutationObserver(() => {
        callback(title.textContent || '');
      }).observe(title, {
        childList: true
      });
    });
  },

  getVisibleBoundingRect(node: Element): DOMRect | null {
    const style = getComputedStyle(node, null);
    if (style.visibility !== 'visible' ||
      style.display === 'none') {
      return null;
    }

    const rects = node.getClientRects();
    if (rects.length === 0)
      return null;

    let result: DOMRect | null = null;

    outer:
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;

      if (r.height <= 1 || r.width <= 1) {
        const children = (node as HTMLElement).children;
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          if (child) {
            const childRect = this.getVisibleBoundingRect(child);
            if (childRect !== null) {
              result = childRect;
              break outer;
            }
          }
        }
      } else {
        if (r.left + r.width < 5 || r.top + r.height < 5)
          continue;
        if (window.innerWidth - r.left < 5 || window.innerHeight - r.top < 5)
          continue;

        result = this.cloneRect(r);
        break;
      }
    }
    if (result !== null) {
      result.left = Math.max(0, result.left);
      result.top = Math.max(0, result.top);
      result.right = Math.min(result.right, window.innerWidth);
      result.bottom = Math.min(result.bottom, window.innerHeight);
    }

    return result;
  },

  cloneRect(rect: DOMRect): DOMRect {
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  },

  getVisibleBoundingAreaRect(node: Element): DOMRect | null {
    const map = node.parentElement;
    if (!map || map.localName.toLowerCase() !== 'map')
      return null;
    const mapName = map.getAttribute('name');
    if (!mapName)
      return null;
    const mapImg = document.querySelector(`*[usemap="#${mapName}"]`) as HTMLImageElement;
    if (!mapImg)
      return null;
    const mapImgRect = DOM.getVisibleBoundingRect(mapImg);
    if (mapImgRect === null)
      return null;
    const coords = (node as HTMLAreaElement).coords.split(',').map((coord) => {
      return parseInt(coord, 10);
    });
    return {
      left: mapImgRect.left + coords[0]!,
      right: mapImgRect.left + coords[2]!,
      top: mapImgRect.top + coords[1]!,
      bottom: mapImgRect.top + coords[3]!,
      width: coords[2]! - coords[0]!,
      height: coords[3]! - coords[1]!,
    };
  },

  isVisible(element: Element): boolean {
    if (!(element instanceof Element))
      return false;
    const htmlElement = element as HTMLElement;
    return !!(htmlElement.offsetParent &&
      !(htmlElement as any).disabled &&
      element.getAttribute('type') !== 'hidden' &&
      getComputedStyle(element).visibility !== 'hidden' &&
      element.getAttribute('display') !== 'none');
  },

  mouseEvent(type: 'hover' | 'unhover' | 'click', element: Element): void {
    let events: string[];
    switch (type) {
      case 'hover': events = ['mouseover', 'mouseenter']; break;
      case 'unhover': events = ['mouseout', 'mouseleave']; break;
      case 'click': events = ['mouseover', 'mousedown', 'mouseup', 'click']; break;
    }
    events.forEach((eventName) => {
      const event = document.createEvent('MouseEvents');
      event.initMouseEvent(eventName, true, true, window, 1, 0, 0, 0, 0, false,
        false, false, false, 0, null);
      element.dispatchEvent(event);
    });
  }

};

window.DOM = DOM;
