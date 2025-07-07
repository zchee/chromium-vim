// Import messaging functions from messenger module
import { RUNTIME, PORT } from './messenger';

// Global variables - matches original keys.js behavior
var insertMode: boolean, commandMode: boolean, settings: any;

// Trie data structure from utils.ts
declare class Trie {
  find(key: string): any;
}

declare const Hints: {
  active: boolean;
  changeFocus(): void;
  shouldShowLinkInfo: boolean;
  acceptLink?: (shift?: boolean) => void;
  keyDelay: boolean;
};

declare const Visual: {
  visualModeActive: boolean;
  caretModeActive: boolean;
  lineMode: boolean;
  selection: Selection | null;
  exit(): void;
  collapse(): void;
  action(key: string): void;
};

declare const Mappings: {
  keyPassesLeft: number;
  handleEscapeKey(): void;
  queue: string;
  splitMapping: (queue: string) => string;
  actions: {
    inputFocused: boolean;
    inputElements: HTMLElement[];
    inputElementsIndex: number;
    nextCompletionResult(): void;
    previousCompletionResult(): void;
  };
  convertToAction(key: string): boolean;
  insertCommand(key: string, callback: () => void): void;
  validMatch: boolean;
  shouldPrevent(key: string): boolean;
  defaults: { [key: string]: string[] };
};

declare const DOM: {
  isEditable(element: Element | null): boolean;
  isTextElement(element: Element | null): boolean;
};

declare const Cursor: {
  overlay: HTMLElement | null;
  wiggleWindow(): void;
};

declare const HUD: {
  setMessage(message: string): void;
};

// mappingTrie instance
declare const mappingTrie: Trie;

// Extension to Object for compare function used in KeyEvents.keyup
declare global {
  interface ObjectConstructor {
    compare(obj1: any, obj2: any, properties: string[]): boolean;
  }
}


const HAS_EVENT_KEY_SUPPORT = KeyboardEvent.prototype.hasOwnProperty('key');

interface KeyListenerCallbacks {
  keydown: ((key: string, event: KeyboardEvent) => boolean | void)[];
  keyup: ((key: string, event: KeyboardEvent) => boolean | void)[];
}

interface KeyListener {
  eventCallbacks: KeyListenerCallbacks;
  addListener(type: 'keydown' | 'keyup', callback: (key: string, event: KeyboardEvent) => boolean | void): void;
  removeListener(type: 'keydown' | 'keyup', callback: (key: string, event: KeyboardEvent) => boolean | void): boolean;
  isActive: boolean;
  langMap: { [key: string]: string };
  activate(): void;
  deactivate(): void;
  setLangMap(map: string | { [key: string]: string }): void;
  createListener?(type: 'keydown' | 'keyup'): (event: KeyboardEvent) => boolean;
  parseLangMap?(mapStr: string): { [key: string]: string };
  keyMap?: { [key: string]: string };
  lowerCaseMap?: { [key: string]: string };
  overrides?: { [keyCode: number]: string };
  convertLang?(key: string): string;
  eventToCode?(event: KeyboardEvent, listener: any): string;
}

type KeyListenerConstructor = new (onKeyDown: (key: string, event: KeyboardEvent) => boolean | void, onKeyUp?: (key: string, event: KeyboardEvent) => boolean | void) => KeyListener;

let KeyListener: KeyListenerConstructor;

if (HAS_EVENT_KEY_SUPPORT) {
  KeyListener = function(this: KeyListener, onKeyDown: (key: string, event: KeyboardEvent) => boolean | void, onKeyUp?: (key: string, event: KeyboardEvent) => boolean | void) {
    this.eventCallbacks = { keydown: [], keyup: [] };
    this.addListener('keydown', onKeyDown);
    if (onKeyUp) this.addListener('keyup', onKeyUp);
    this.isActive = false;
    this.langMap = {};
    window.addEventListener('keydown', this.createListener!('keydown'), true);
    window.addEventListener('keyup', this.createListener!('keyup'), true);
  } as any;

  KeyListener.prototype.addListener = function(type: 'keydown' | 'keyup', callback: (key: string, event: KeyboardEvent) => boolean | void) {
    if (typeof callback !== 'function' || ['keydown', 'keyup'].indexOf(type) === -1)
      return;
    this.eventCallbacks[type] = this.eventCallbacks[type] || [];
    this.eventCallbacks[type].push(callback);
  };

  KeyListener.prototype.removeListener = function(type: 'keydown' | 'keyup', callback: (key: string, event: KeyboardEvent) => boolean | void) {
    if (!this.eventCallbacks.hasOwnProperty(type) || typeof callback !== 'function')
      return false;
    const listeners = this.eventCallbacks[type];
    const origLen = listeners.length;
    this.eventCallbacks[type] = listeners.filter(function(e: any) {
      return e !== callback;
    });
    return origLen !== this.eventCallbacks[type].length;
  };

  (KeyListener as any).keyEquals = function(a: string, b: string): boolean {
    function normalizeKey(key: string): string {
      if (!/^<.*>$/.test(key))
        return key;
      key = key.slice(1, -1).toLowerCase();
      const mods = key.split('-').filter(function(e) { return e; }).sort();
      let char: string;
      if (key.charAt(key.length - 1) === '-')
        char = '-';
      else
        char = mods.pop()!;
      return '<' +
        mods.sort().join('-') + '-' + char +
        '>';
    }

    a = normalizeKey(a);
    b = normalizeKey(b);

    return a === b;
  };

  KeyListener.prototype.keyMap = {
    'Backspace': 'BS',
    'Numlock': 'Num',
    'Escape': 'Esc',
    ' ': 'Space',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'Print': 'PrintScreen',
  };

  KeyListener.prototype.lowerCaseMap = {
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    '{': '[',
    '}': ']',
    '<': ',',
    '>': '.',
    '|': '\\',
    '"': '\\',
    '?': '/',
  };

  KeyListener.prototype.overrides = {
    17: 'Control',
    18: 'Alt',
    91: 'Meta',
    16: 'Shift',
    123: 'F12'
  };

  KeyListener.prototype.convertLang = function(key: string): string {
    if (this.langMap.hasOwnProperty(key))
      return this.langMap[key];
    return key;
  };

  KeyListener.prototype.eventToCode = function(event: KeyboardEvent, _super: any): string {
    let key = event.key;
    if (_super.overrides.hasOwnProperty(event.which)) {
      key = _super.overrides[event.which];
    }
    const isSpecial = event.ctrlKey || event.altKey || event.metaKey;
    if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(key) !== -1)
      return key;
    if (isSpecial) {
      const code = '<' + ((event.ctrlKey ? 'C' : '') +
        (event.shiftKey ? 'S' : '') +
        (event.altKey ? 'A' : '') +
        (event.metaKey ? 'M' : '')).split('').join('-');
      let keyPart = '-';
      if (event.shiftKey && _super.lowerCaseMap.hasOwnProperty(key)) {
        keyPart += _super.convertLang(_super.lowerCaseMap[key]);
      } else if (_super.keyMap.hasOwnProperty(key)) {
        keyPart += _super.convertLang(_super.keyMap[key]);
      } else {
        keyPart += key.length > 1 ? key : _super.convertLang(key.toLowerCase());
      }
      return code + keyPart + '>';
    }

    if (_super.keyMap.hasOwnProperty(key) || key.length > 1) {
      key = _super.convertLang(_super.keyMap[key] || key);
      if (event.shiftKey)
        return '<S-' + key + '>';
      return '<' + key + '>';
    }

    return _super.convertLang(key);
  };

  KeyListener.prototype.createListener = function(type: 'keydown' | 'keyup') {
    const _super = this;
    return function(event: KeyboardEvent): boolean {
      if (typeof event.key === 'undefined' || !event.isTrusted)
        return true;
      const code = _super.eventToCode!.call(_super, event, _super);
      if (_super.isActive) {
        const eventCallbacks = _super.eventCallbacks[type];
        let ret = true;
        for (let i = 0; i < eventCallbacks.length; i++) {
          const retConsider = eventCallbacks[i](code, event);
          if (retConsider !== undefined && !retConsider)
            ret = false;
        }
        return ret;
      }
      return true;
    };
  };

  KeyListener.prototype.activate = function() {
    this.isActive = true;
  };

  KeyListener.prototype.deactivate = function() {
    this.isActive = false;
  };

  KeyListener.prototype.parseLangMap = function(mapStr: string): { [key: string]: string } {
    function tokenize(mapStr: string): string[] {
      const tokens: string[] = [];
      for (let i = 0; i < mapStr.length; i++) {
        const ch = mapStr.charAt(i);
        if (ch === '\\' && i + 1 < mapStr.length) {
          const peek = mapStr.charAt(i + 1);
          if (peek === ',' || peek === ';') {
            tokens.push(peek);
            ++i;
          } else {
            tokens.push(ch);
          }
        } else if (ch === ',') {
          tokens.push('PAIR_SEP');
        } else if (ch === ';') {
          tokens.push('SEMI_SEP');
        } else {
          tokens.push(ch);
        }
      }
      return tokens;
    }
    function parseError(error: string): never {
      throw Error('KeyListener langmap error: ' + error);
    }
    function parseObj(tokens: string[], pairs: { [key: string]: string }): void {
      const len = tokens.length;
      const mid = len >> 1;
      let i: number, j: number;
      if (len % 2 === 0) {
        for (i = 0; i < len - 1; i += 2) {
          const a = tokens[i], b = tokens[i + 1];
          if (!a || a.length !== 1) parseError('unexpected token: ' + a);
          if (!b || b.length !== 1) parseError('unexpected token: ' + b);
          pairs[a] = b;
        }
        return;
      }
      if (tokens[mid] !== 'SEMI_SEP')
        parseError('mismatched characters');
      for (i = 0, j = mid + 1; i < mid; i++, j++) {
        const tokenI = tokens[i];
        const tokenJ = tokens[j];
        if (!tokenI || tokenI.length !== 1) parseError('unexpected token: ' + tokenI);
        if (!tokenJ || tokenJ.length !== 1) parseError('unexpected token: ' + tokenJ);
        pairs[tokenI] = tokenJ;
      }
      return;
    }
    function parse(tokens: string[]): { [key: string]: string } {
      let stream: string[] = [];
      const pairs: { [key: string]: string } = {};
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'PAIR_SEP') {
          parseObj(stream, pairs);
          stream = [];
        } else {
          stream.push(tokens[i]!);
        }
      }
      if (stream.length)
        parseObj(stream, pairs);
      return pairs;
    }
    const tokens = tokenize(mapStr);
    let parsed: { [key: string]: string };
    try {
      parsed = parse(tokens);
    } catch (error) {
      console.error((error as Error).message);
      return {};
    }
    return parsed;
  };

  KeyListener.prototype.setLangMap = function(map: string | { [key: string]: string }) {
    if (typeof map === 'string')
      this.langMap = this.parseLangMap!(map);
    else
      this.langMap = map;
  };
} else {
  // Legacy KeyListener implementation for older browsers
  KeyListener = (function() {
    'use strict';
    let isActive = false;

    const codeMap: { [key: number]: string | string[] } = {
      0: '\\',
      8: 'BS',
      9: 'Tab',
      12: 'Num',
      13: 'Enter',
      19: 'Pause',
      20: 'Caps',
      27: 'Esc',
      32: 'Space',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'Left',
      38: 'Up',
      39: 'Right',
      40: 'Down',
      42: 'PrintScreen',
      44: 'PrintScreen',
      45: 'Insert',
      46: 'Delete',
      48: ['0', ')'],
      49: ['1', '!'],
      50: ['2', '@'],
      51: ['3', '#'],
      52: ['4', '$'],
      53: ['5', '%'],
      54: ['6', '^'],
      55: ['7', '&'],
      56: ['8', '*'],
      57: ['9', '('],
      96: '0',
      97: '1',
      98: '2',
      99: '3',
      100: '4',
      101: '5',
      102: '6',
      103: '7',
      104: '8',
      105: ['9', ''],
      106: '*',
      107: '+',
      109: '-',
      111: '/',
      144: 'Num',
      186: [';', ':'],
      188: [',', '<'],
      189: ['-', '_'],
      190: ['.', '>'],
      187: ['=', '+'],
      191: ['/', '?'],
      192: ['`', '~'],
      219: ['[', '{'],
      221: [']', '}'],
      220: ['\\', '|'],
      222: ['\'', '"']
    };

    let langMap: { [key: string]: string } = {};

    const parseKeyDown = function(event: KeyboardEvent): string {
      let key: string;
      let map: string | string[];
      let isFKey = false;
      const modifiers = [
        event.ctrlKey ? 'C' : '',
        event.altKey ? 'A' : '',
        event.metaKey ? 'M' : '',
        event.shiftKey ? 'S' : ''
      ].join('').split('').filter(Boolean);

      const identifier = HAS_EVENT_KEY_SUPPORT ?
        event.key : (event as any).keyIdentifier;

      if (codeMap.hasOwnProperty(event.which.toString())) {
        map = codeMap[event.which] || '';
        if (Array.isArray(map)) {
          if (!modifiers.length) {
            modifiers.splice(modifiers.indexOf('S'), 1);
          }
          key = map[+(event.shiftKey && !modifiers.length)] || '';
        } else {
          key = map;
        }
      } else if (/^F[0-9]+$/.test(identifier)) {
        isFKey = true;
        key = identifier;
      } else {
        key = String.fromCharCode(event.which).toLowerCase();
        if (event.shiftKey && modifiers.length === 1) {
          key = key.toUpperCase();
          if (key.toLowerCase() !== key.toUpperCase()) {
            return key;
          }
        }
      }

      const filteredModifiers = modifiers.filter(function(e) { return e; });
      if (filteredModifiers.length) {
        if (Array.isArray(codeMap[event.which]) && filteredModifiers[0] === 'S') {
          key = (codeMap[event.which] as string[])[1] || '';
        } else {
          key = '<' + filteredModifiers.join('-') + '-' + key + '>';
        }
      } else if (key.length !== 1 &&
        (typeof codeMap[event.which] === 'string' || isFKey)) {
        key = '<' + (event.shiftKey ? 'S-' : '') + key + '>';
      }
      return key;
    };

    const KeyEvents = {
      lastHandledEvent: null as KeyboardEvent | null,
      keypress: function(callback: (event: KeyboardEvent) => void, event: KeyboardEvent) {
        if (typeof callback === 'function') {
          callback(event);
        }
      },
      keyhandle: function(event: KeyboardEvent, type: string): string {
        if (Visual.visualModeActive || Visual.caretModeActive) {
          event.preventDefault();
        }
        if (type === 'keypress') {
          let key = String.fromCharCode(event.which);
          if (langMap.hasOwnProperty(key) && langMap[key])
            key = langMap[key]!;
          return key;
        } else {
          return parseKeyDown(event);
        }
      },
      keyup: function(event: KeyboardEvent) {
        window.scrollKeyUp = true;
        if (Hints.active && event.which === 191) {
          setTimeout(function() {
            const container = document.getElementById('cVim-link-container');
            if (container) container.style.opacity = '1';
          }, 0);
        }
        if (KeyEvents.lastHandledEvent && Object.compare(event, KeyEvents.lastHandledEvent,
          ['which', 'ctrlKey', 'shiftKey', 'metaKey', 'altKey'])) {
          KeyEvents.lastHandledEvent = null;
          if (!DOM.isEditable(document.activeElement)) {
            event.stopImmediatePropagation();
          }
        }
      },
      keydown: function(callback: (key: string, event: KeyboardEvent) => boolean | void, event: KeyboardEvent): boolean | void {
        const keyString = KeyEvents.keyhandle(event, 'keydown');

        if (Hints.active) {
          event.preventDefault();
          if (event.which === 18) {
            Hints.changeFocus();
            return;
          }
        }
        if (Hints.shouldShowLinkInfo &&
          typeof Hints.acceptLink === 'function' &&
          (keyString === '<Enter>' || keyString === '<S-Enter>')) {
          Hints.acceptLink(keyString === '<S-Enter>');
          return;
        }

        if (~[16, 17, 18, 91, 123].indexOf(event.which))
          return true;

        if (Mappings.keyPassesLeft) {
          Mappings.keyPassesLeft--;
          return true;
        }

        if (!insertMode && !commandMode &&
          !DOM.isTextElement(document.activeElement)) {
          const guess = KeyEvents.keyhandle(event, 'keydown');
          if (guess.length > 1 &&
            Mappings.shouldPrevent(KeyEvents.keyhandle(event, 'keydown'))) {
            event.preventDefault();
          }
        }

        if ([9, 13, 32].indexOf(event.which) !== -1 || event.ctrlKey ||
          event.metaKey || event.altKey) {
          const code = KeyEvents.keyhandle(event, 'keydown');
          for (const key in Mappings.defaults) {
            if (Mappings.defaults[key] && Mappings.defaults[key].indexOf(code) !== -1) {
              event.stopImmediatePropagation();
              break;
            }
          }
          return callback(code, event);
        } else if (commandMode ||
          (!insertMode && mappingTrie && Mappings.queue && Mappings.splitMapping && mappingTrie.find(
            Mappings.splitMapping(Mappings.queue + keyString))) ||
          (keyString && keyString.length > 0 && keyString.charAt(0) >= '0' && keyString.charAt(0) <= '9')) {
          if (Command.commandBarFocused() &&
            (event.which === 38 || event.which === 40)) {
            event.preventDefault();
          }
          KeyEvents.lastHandledEvent = event;
          if (!DOM.isEditable(document.activeElement)) {
            event.stopImmediatePropagation();
          }
        }

        let keypressTriggered = false;
        const boundMethod = KeyEvents.keypress.bind(KeyEvents, function(event: KeyboardEvent) {
          if (!keypressTriggered && event.isTrusted) {
            if (Hints.active ||
              Visual.caretModeActive ||
              Visual.visualModeActive) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
            keypressTriggered = true;
            callback(KeyEvents.keyhandle(event, 'keypress'), event);
          }
        });

        window.addEventListener('keypress', boundMethod, true);

        window.setTimeout(function() {
          window.removeEventListener('keypress', boundMethod, true);
          if (!keypressTriggered) {
            if (Hints.active ||
              Visual.caretModeActive ||
              Visual.visualModeActive) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
            callback(KeyEvents.keyhandle(event, 'keydown'), event);
          }
        }, 0);
      }
    };

    const createEventListener = function(element: Window, type: string, callback: (...args: any[]) => any) {
      element.addEventListener(type, function() {
        return isActive ? callback.apply(element, Array.from(arguments)) : true;
      }, true);
    };

    const listenerFn = function(this: any, callback: (key: string, event: KeyboardEvent) => boolean | void) {
      this.callback = callback;
      this.eventFn = KeyEvents.keydown.bind(null, this.callback);
      isActive = false;
      return this;
    } as any;

    let initialSetup = false;
    listenerFn.prototype.activate = function() {
      if (!isActive) {
        isActive = true;
        if (!initialSetup) {
          initialSetup = true;
          createEventListener(window, 'keydown', this.eventFn);
          createEventListener(window, 'keyup', KeyEvents.keyup);
        }
      }
    };

    listenerFn.prototype.deactivate = function() {
      if (isActive) {
        isActive = false;
      }
    };

    const parseLangMap = (function() {
      function tokenize(mapStr: string): string[] {
        const tokens: string[] = [];
        for (let i = 0; i < mapStr.length; i++) {
          const ch = mapStr.charAt(i);
          if (ch === '\\' && i + 1 < mapStr.length) {
            const peek = mapStr.charAt(i + 1);
            if (peek === ',' || peek === ';') {
              tokens.push(peek);
              ++i;
            } else {
              tokens.push(ch);
            }
          } else if (ch === ',') {
            tokens.push('PAIR_SEP');
          } else if (ch === ';') {
            tokens.push('SEMI_SEP');
          } else {
            tokens.push(ch);
          }
        }
        return tokens;
      }
      function parseError(error: string): never {
        throw Error('cVim langmap error: ' + error);
      }
      function parseObj(tokens: string[], pairs: { [key: string]: string }): void {
        const len = tokens.length;
        const mid = len >> 1;
        let i: number, j: number;
        if (len % 2 === 0) {
          for (i = 0; i < len - 1; i += 2) {
            const a = tokens[i], b = tokens[i + 1];
            if (!a || a.length !== 1) parseError('unexpected token: ' + a);
            if (!b || b.length !== 1) parseError('unexpected token: ' + b);
            pairs[a] = b;
          }
          return;
        }
        if (tokens[mid] !== 'SEMI_SEP')
          parseError('mismatched characters');
        for (i = 0, j = mid + 1; i < mid; i++, j++) {
          const tokenI = tokens[i];
          const tokenJ = tokens[j];
          if (!tokenI || tokenI.length !== 1) parseError('unexpected token: ' + tokenI);
          if (!tokenJ || tokenJ.length !== 1) parseError('unexpected token: ' + tokenJ);
          pairs[tokenI] = tokenJ;
        }
        return;
      }
      function parse(tokens: string[]): { [key: string]: string } {
        let stream: string[] = [];
        const pairs: { [key: string]: string } = {};
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === 'PAIR_SEP') {
            parseObj(stream, pairs);
            stream = [];
          } else {
            stream.push(tokens[i]!);
          }
        }
        if (stream.length)
          parseObj(stream, pairs);
        return pairs;
      }
      return function(mapStr: string): { [key: string]: string } {
        const tokens = tokenize(mapStr);
        let parsed: { [key: string]: string };
        try {
          parsed = parse(tokens);
        } catch (error) {
          console.error((error as Error).message);
          return {};
        }
        return parsed;
      };
    })();

    listenerFn.prototype.setLangMap = function(mapStr: string) {
      langMap = parseLangMap(mapStr);
    };

    return listenerFn;
  })() as any;
}

interface KeyHandlerType {
  down(key: string, event: KeyboardEvent): boolean | void;
  up(key: string, event: KeyboardEvent): boolean | void;
  shiftKey?: boolean;
  hasPressedKey?: boolean;
  listener?: KeyListener;
  listenersActive?: boolean;
}

export const KeyHandler: KeyHandlerType = {
  down: function(key: string, event: KeyboardEvent): boolean | void {
    if (HAS_EVENT_KEY_SUPPORT) {
      if (Hints.active) {
        event.preventDefault();
        if (event.which === 18) {
          Hints.changeFocus();
          return;
        }
      }

      if (Visual.visualModeActive || Visual.caretModeActive)
        event.preventDefault();

      if (Mappings.keyPassesLeft) {
        Mappings.keyPassesLeft--;
        return true;
      }
    }

    if (['Control', 'Alt', 'Meta', 'Shift'].indexOf(key) !== -1)
      return false;

    KeyHandler.shiftKey = event.shiftKey;

    KeyHandler.hasPressedKey = true;

    if (Hints.active) {
      event.stopImmediatePropagation();
      switch (event.which) {
        case 18:
          Hints.changeFocus();
          return;
        case 191:
          event.preventDefault();
          const container = document.getElementById('cVim-link-container');
          if (container) container.style.opacity = '0';
          return;
      }
    }

    if (Hints.keyDelay) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }

    if (Cursor.overlay && settings.autohidecursor) {
      Cursor.overlay.style.display = 'block';
      Cursor.wiggleWindow();
    }

    if (Command.commandBarFocused())
      event.stopImmediatePropagation();

    const escapeKey = key === '<Esc>' || key === '<C-[>';

    if (Visual.caretModeActive || Visual.visualModeActive) {
      event.stopImmediatePropagation();
      Visual.selection = document.getSelection();
      if (event.which === 8)
        event.preventDefault();
      if (escapeKey) {
        Visual.lineMode = false;
        if (Visual.visualModeActive === false) {
          Visual.exit();
          insertMode = false;
          return;
        }
        HUD.setMessage(' -- CARET -- ');
        Visual.collapse();
        return;
      }
      Visual.action(key.replace(/^<BS>$/, 'h').replace(/^<Space>$/, 'l'));
      return;
    }

    if (escapeKey) {
      Mappings.handleEscapeKey();
      return;
    }

    if (insertMode)
      return;

    const isInput = DOM.isEditable(document.activeElement);

    if (!commandMode && Mappings.actions.inputFocused && event.which === 9) {
      const actions = Mappings.actions;
      if (!isInput || !actions.inputElements.length) {
        actions.inputFocused = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();

      actions.inputElementsIndex = ((actions.inputElementsIndex + (event.shiftKey ? -1 : 1)) % actions.inputElements.length + actions.inputElements.length) % actions.inputElements.length;

      const targetElement = actions.inputElements[actions.inputElementsIndex];
      if (targetElement) {
        targetElement.focus();
        if (targetElement.hasAttribute('readonly'))
          (targetElement as HTMLInputElement).select();
      }
      return;
    }

    if (!isInput) {
      if (Mappings.queue.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (Mappings.convertToAction(key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }

    if (Command.commandBarFocused()) {
      if (event.isComposing && /^<.*>$/.test(key))
        key = '';
      window.setTimeout(function() {
        Command.lastInputValue = Command.input!.value;
      }, 0);
      switch (key) {
        case '<Tab>':
        case '<S-Tab>':
          if (Command.type === 'action') {
            event.preventDefault();
            (Mappings.actions as any)[(key === '<Tab>' ? 'next' : 'previous') +
              'CompletionResult']();
          }
          break;
        case '<C-p>':
          if (Command.type === 'action' && settings.cncpcompletion) {
            event.preventDefault();
            (Mappings.actions as any).previousCompletionResult();
          }
          return;
        case '<Up>':
        case '<Down>':
          event.preventDefault();
          Command.history.cycle(Command.type, (key === '<Up>'));
          break;
        case '<Enter>':
        case '<C-Enter>':
          event.preventDefault();
          (document.activeElement as HTMLElement)?.blur();
          if (!(Command.history[Command.type].length > 0 &&
            Command.history[Command.type].slice(-1)[0] ===
            Command.input!.value)) {
            Command.history[Command.type].push(Command.input!.value);
            RUNTIME('appendHistory', {
              value: Command.input!.value,
              type: Command.type
            });
          }
          if (Command.type === 'action') {
            const inputValue = Command.input!.value + (event.ctrlKey ? '&!' : '');
            Command.hide(function() {
              setTimeout(function() {
                Command.execute(inputValue, 1);
              }, 10);
            });
            break;
          }
          if (Command.input!.value) {
            PORT('callFind', {
              command: 'clear',
              params: []
            });
            PORT('callFind', {
              command: 'highlight',
              params: [{
                base: null,
                mode: Command.modeIdentifier!.textContent,
                search: Command.input!.value,
                setIndex: true,
                executeSearch: false,
                saveSearch: true
              }]
            });
            PORT('callFind', {
              command: 'setIndex',
              params: []
            });
            PORT('callFind', {
              command: 'search',
              params: [Command.modeIdentifier!.textContent, +(Command.modeIdentifier!.textContent === '?'), false]
            });
            PORT('updateLastSearch', { value: Command.input!.value });
          }
          Command.hide();
          break;
        default:
          if (key === '<BS>' && Command.lastInputValue.length === 0 &&
            Command.input!.value.length === 0) {
            event.preventDefault();
            setTimeout(function() {
              Command.hide();
            }, 10);
            break;
          }
          setTimeout(function() {
            Command.history.reset = true;
            if (Command.type === 'action') {
              Command.complete(Command.input!.value);
              return;
            }
            if (Command.input!.value.length > 2) {
              if (settings.incsearch) {
                PORT('doIncSearch', {
                  search: Command.input!.value,
                  mode: Command.modeIdentifier!.textContent,
                });
              }
            }
          }, 0);
          break;
      }
    }
    if (settings && settings.insertmappings && isInput) {
      Mappings.insertCommand(key, function() {
        event.stopImmediatePropagation();
        event.preventDefault();
        if (Command.commandBarFocused() && Command.type !== 'search') {
          window.setTimeout(function() {
            Command.complete(Command.input!.value);
          }, 0);
        }
      });
    }
  },
  up: function(_key: string, event: KeyboardEvent): boolean | void {
    if (Command.commandBarFocused() ||
      (!insertMode && Mappings.queue.length && Mappings.validMatch)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
    window.scrollKeyUp = true;
    if (Hints.active && event.which === 191) {
      const container = document.getElementById('cVim-link-container');
      if (container) container.style.opacity = '1';
    }
  }
};

if (!HAS_EVENT_KEY_SUPPORT) {
  KeyHandler.listener = new KeyListener(KeyHandler.down);
  (function() {
    const oldKeyUpHandler = KeyHandler.up;
    KeyHandler.up = function(_key: string, event: KeyboardEvent) {
      if (!event.isTrusted)
        return true;
      return oldKeyUpHandler.call(KeyHandler, _key, event);
    };
  })();

  (window as any).removeListeners = function() {
    KeyHandler.listenersActive = false;
    window.removeEventListener('keyup', KeyHandler.up as any, true);
    KeyHandler.listener?.deactivate();
  };

  (window as any).addListeners = function() {
    if (KeyHandler.listenersActive)
      (window as any).removeListeners();
    KeyHandler.listenersActive = true;
    window.addEventListener('keyup', KeyHandler.up as any, true);
    KeyHandler.listener?.activate();
  };
} else {
  KeyHandler.listener = new KeyListener(KeyHandler.down, KeyHandler.up);

  (window as any).removeListeners = function() {
    KeyHandler.listenersActive = false;
    KeyHandler.listener?.deactivate();
  };

  (window as any).addListeners = function() {
    KeyHandler.listenersActive = true;
    KeyHandler.listener?.activate();
  };
}

(window as any).addListeners();

window.addEventListener('DOMContentLoaded', function() {
  if (self === top) {
    RUNTIME('isNewInstall', null, function(message: string) {
      if (message) {
        alert(message);
      }
    });
  }
});
