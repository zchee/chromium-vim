import { Trie } from './utils.js';

declare let insertMode: boolean;
declare let commandMode: boolean;
declare let settings: any;

declare global {
  interface Window {
    resetScrollFocus(): void;
    scrollKeyUp: boolean;
  }

  const Visual: {
    caretModeActive: boolean;
    visualModeActive: boolean;
    lineMode: boolean;
    getTextNodes(): void;
    focusSearchResult(lineMode?: boolean): void;
    closestNode(): Node | null;
    selection: Selection | null;
    scrollIntoView(): void;
    exit(): void;
    action(key: string): void;
    collapse(): void;
  };

  const Hints: {
    dispatchAction(element: Element): void;
    matchPatterns(pattern: string): void;
    create(type?: string): void;
    scriptFunction?: string;
    lastClicked?: Element;
    active: boolean;
    handleHint(key: string): void;
    hideHints(a: boolean, b: boolean): void;
    lastHover?: Element | null;
    changeFocus(): void;
    shouldShowLinkInfo: boolean;
    acceptLink?: (shift?: boolean) => void;
    keyDelay: boolean;
  };

  const Find: {
    matches: any[];
    index: number;
    mode?: string;
    lastSearch?: string;
    search(mode: string, direction: number): void;
    highlight(options: any): void;
    clear(): void;
    lastIndex?: number;
    previousMatches?: boolean;
  };

  const Scroll: {
    scroll(direction: string, repeats?: number): void;
    lastPosition?: [number, number];
    positions: { [key: string]: [number, number] };
    previousHistoryState(): void;
    nextHistoryState(): void;
  };


  const Search: {
    nextResult(reverse: boolean): void;
  };

  const Marks: {
    addQuickMark(key: string): void;
    openQuickMark(key: string, options: any, repeats: number): void;
  };

  const Status: {
    setMessage(message: string, timeout?: number, type?: string): void;
  };

  const HUD: {
    display(message: string): void;
    hide(): void;
    setMessage(text: string): void;
  };

  const Command: {
    callOnCvimLoad(callback: () => void): void;
    commandBarFocused(): boolean;
    show(mode?: string | boolean, command?: string, complete?: boolean): any;
    hide(callback?: () => void): void;
    type: string;
    input: HTMLInputElement;
    modeIdentifier: { textContent: string };
    history: { [key: string]: any; reset?: boolean };
    complete(value: string): void;
    execute(command: string, repeats: number): void;
    lastScrollTop?: number;
    lastInputValue: string;
    hideData(): void;
    addSettingBlock(settings: any): void;
  };

  const DOM: any;

  function RUNTIME(action: string, data?: any, callback?: (response: any) => void): void;
  function PORT(action: string, data?: any): void;
  function ECHO(action: string, data: any): void;
  function waitForLoad(callback: () => void): void;
  const Utils: any;
  const matchLocation: (url: string, pattern: string) => boolean;

  const Cursor: {
    overlay: HTMLElement | null;
    wiggleWindow(): void;
  };

  const mappingTrie: any;

  const Mappings: {
    keyPassesLeft: number;
    handleEscapeKey(): void;
    queue: string;
    validMatch: boolean;
    splitMapping(key: string): string[];
    convertToAction(key: string): boolean;
    defaults: { [key: string]: string[] };
    shouldPrevent(key: string): boolean;
    actions: {
      inputFocused: boolean;
      inputElements: HTMLElement[];
      inputElementsIndex: number;
    };
    insertCommand(key: string, callback: (result?: boolean) => void): void;
  };
}

const insertMappings = new Trie();
const mappingTrie = new Trie();
let currentTrieNode = mappingTrie;

interface LastCommand {
  fn: string;
  queue: string;
  repeatStr: string;
  repeats: number;
  params?: any;
}

interface MappingsType {
  repeats: string;
  queue: string;
  lastCommand: LastCommand;
  defaults: string[][];
  defaultsClone: string[][];
  actions: MappingsActions;
  insertDefaults: string[][];
  insertFunctions: InsertFunctions;
  nonRepeatableCommands: string[];
  validMatch: boolean;
  keyPassesLeft: number;
  insertCommand(modifier: string, callback: (result?: boolean) => void): void;
  splitMapping(string: string): string[];
  parseLine(line: string): void;
  parseCustom(config: string, updateSiteMappings?: boolean): void;
  executeSequence(c: string, r?: string): void;
  handleEscapeKey(): void;
  clearQueue(): void;
  shouldPrevent(key: string): boolean;
  convertToAction(key: string): boolean;
}

interface MappingsActions {
  lastUsedTab(): void;
  '<Nop>'(): void;
  toggleVisualMode(): void;
  toggleVisualLineMode(): void;
  openLastHint(): void;
  nextMatchPattern(): void;
  previousMatchPattern(): void;
  cancelWebRequest(): void;
  cancelAllWebRequests(): void;
  percentScroll(repeats: number): void;
  goToTab(repeats: number): void;
  hideDownloadsShelf(): void;
  goToRootUrl(): void;
  goUpUrl(repeats: number): void;
  nextFrame(repeats: number): void;
  rootFrame(): void;
  closeTab(repeats: number): void;
  closeTabLeft(repeats: number): void;
  closeTabRight(repeats: number): void;
  closeTabsToLeft(): void;
  closeTabsToRight(): void;
  pinTab(): void;
  firstTab(): void;
  lastTab(): void;
  lastClosedTab(repeats: number): void;
  moveTabRight(repeats: number): void;
  moveTabLeft(repeats: number): void;
  lastActiveTab(): void;
  reverseImage(): void;
  multiReverseImage(): void;
  toggleImageZoom(): void;
  zoomPageIn(repeats: number): void;
  zoomPageOut(repeats: number): void;
  zoomOrig(): void;
  centerMatchT(): void;
  centerMatchH(): void;
  centerMatchB(): void;
  openLastLinkInTab(repeats: number): void;
  openNextLinkInTab(repeats: number): void;
  scrollDown(repeats: number): void;
  scrollUp(repeats: number): void;
  scrollPageDown(repeats: number): void;
  scrollFullPageDown(repeats: number): void;
  scrollPageUp(repeats: number): void;
  scrollFullPageUp(repeats: number): void;
  scrollLeft(repeats: number): void;
  scrollRight(repeats: number): void;
  scrollToTop(): void;
  scrollToBottom(): void;
  scrollToLeft(): void;
  scrollToRight(): void;
  lastScrollPosition(): void;
  previousScrollPosition(): void;
  nextScrollPosition(): void;
  goToMark(): void;
  setMark(): void;
  createHint(): void;
  createTabbedHint(): void;
  createActiveTabbedHint(): void;
  createMultiHint(): void;
  createHintWindow(): void;
  createEditHint(): void;
  createHoverHint(): void;
  createUnhoverHint(): void;
  createScriptHint(repeats: number, scriptName: string): void;
  yankUrl(): void;
  multiYankUrl(): void;
  fullImageHint(): void;
  yankDocumentUrl(): void;
  yankFrameUrl(): void;
  yankWindowUrls(): void;
  yankHighlight(): void;
  openPaste(): void;
  openPasteTab(repeats: number): void;
  nextCompletionResult(): void;
  previousCompletionResult(): void;
  addQuickMark(): void;
  openQuickMark(repeats: number): void;
  openQuickMarkTabbed(repeats: number): void;
  openQuickMarkWindowed(repeats: number): void;
  insertMode(): void;
  reloadTab(): void;
  reloadTabUncached(): void;
  reloadAllButCurrent(): void;
  reloadAllTabs(): void;
  nextSearchResult(repeats: number): void;
  previousSearchResult(repeats: number): void;
  nextTab(r: number): void;
  previousTab(r: number): void;
  goBack(repeats: number): void;
  goForward(repeats: number): void;
  _switchDomain(direction: number, repeats: number): void;
  previousDomain(repeats: number): void;
  nextDomain(repeats: number): void;
  goToLastInput(): void;
  goToInput(repeats: number): void;
  shortCuts(command: string, repeats: number): void;
  openSearchBar(): void;
  openSearchBarReverse(): void;
  openLinkSearchBar(): void;
  openCommandBar(): void;
  repeatCommand(repeats: number): void;
  createBookmark(): void;
  quitChrome(): void;
  passKeys(repeats: number): void;
  resetScrollFocus(): void;
  clearSearchHighlight(): void;
  muteTab(): void;
  incrementURLPath(repeats: number): void;
  decrementURLPath(repeats: number): void;
  inputFocused: boolean;
  inputElements: HTMLElement[];
  inputElementsIndex: number;
}

interface InsertFunctions {
  __setElement__(element: HTMLElement): void;
  __getElement__(): HTMLElement;
  editWithVim(): void;
  forwardChar(): void;
  backwardChar(): void;
  backwardWord(): void;
  forwardWord(): void;
  deleteToBeginning(): void;
  deleteToEnd(): void;
  beginningOfLine(): void;
  endOfLine(): void;
  deleteWord(): void;
  deleteForwardWord(): void;
  deleteChar(): void;
  deleteForwardChar(): void;
  forwardLine(): void;
  backwardLine(): void;
  selectAll(): void;
}

export const Mappings: MappingsType = {
  repeats: '',
  queue: '',
  lastCommand: {
    fn: '',
    queue: '',
    repeatStr: '',
    repeats: 1
  },
  keyPassesLeft: 0,
  validMatch: false,
  defaults: [],
  defaultsClone: [],
  nonRepeatableCommands: [],
  actions: {} as MappingsActions,
  insertDefaults: [],
  insertFunctions: {} as InsertFunctions,
  insertCommand: function(modifier: string, callback: (result?: boolean) => void) {
    const value = insertMappings.findValue(this.splitMapping(modifier));
    if (value) {
      callback(true);
      if ((this.insertFunctions as any)[value]) {
        this.insertFunctions.__setElement__(document.activeElement as HTMLElement);
        (this.insertFunctions as any)[value]();
      } else if ((this.actions as any)[value]) {
        (this.actions as any)[value]();
      }
    }
  },
  splitMapping: function(string: string): string[] {
    const blocks = Array.from(string.match(/<[^>]+>/g) || []);
    const split: string[] = [];
    for (let i = 0; i < string.length; i++) {
      if (string.slice(i).indexOf(blocks[0]!) === 0) {
        i += blocks[0]!.length - 1;
        split.push(blocks.shift()!);
      } else {
        split.push(string.charAt(i));
      }
    }
    return split;
  },
  parseLine: function(line: string) {
    const map = Utils.compressArray(line.split(/ +/));
    if (map.length) {
      switch (map[0]) {
        case 'unmapAll':
          mappingTrie.children = {};
          return;
        case 'iunmapAll':
          insertMappings.children = {};
          return;
        case 'map':
        case 'remap':
          if (map[1] === map[2]) {
            return;
          }
          map[1] = map[1].replace(/<leader>/ig, settings.mapleader);
          mappingTrie.removeByKey(this.splitMapping(map[1]));
          mappingTrie.insert(this.splitMapping(map[1]), map.slice(2).join(' '));
          return;
        case 'imap':
        case 'iremap':
          if (map[1] === map[2]) {
            return;
          }
          insertMappings.removeByKey(map[1]);
          return insertMappings.insert(this.splitMapping(map[1]),
            insertMappings.findValue(this.splitMapping(map[2])) ||
            map.slice(2).join(' ').replace(/\s+".*/, ''));
        case 'iunmap':
          map.slice(1).forEach((unmap: string) => {
            insertMappings.removeByKey(this.splitMapping(unmap));
          });
          return;
        case 'unmap':
          map.slice(1).forEach((unmap: string) => {
            mappingTrie.removeByKey(this.splitMapping(unmap));
          });
          return;
        case 'call':
          waitForLoad(function() {
            const trimmedMap = Utils.trim(map.slice(1).join(' '));
            if (trimmedMap[0] === ':') {
              Command.execute(trimmedMap.slice(1).replace(/<CR>/i, ''), 1);
            } else if (Mappings.actions.hasOwnProperty(trimmedMap)) {
              ECHO('callMapFunction', {
                name: trimmedMap
              });
            } else {
              ECHO('eval', {
                name: trimmedMap.replace(/\(.*/, ''),
                args: trimmedMap.replace(/[^(]+/, '') || '()'
              });
            }
          });
          break;
      }
    }
  },
  parseCustom: function(config: string, updateSiteMappings?: boolean) {
    this.defaults.forEach(function(e) {
      if (e[0] && e[1]) mappingTrie.insert(Mappings.splitMapping(e[0]), e[1]);
    });
    this.insertDefaults.forEach(function(e) {
      if (e[0] && e[1]) insertMappings.insert(Mappings.splitMapping(e[0]), e[1]);
    });
    Utils.split(config, '\n').forEach((e: string) => {
      Mappings.parseLine(e);
    });

    if (updateSiteMappings && settings.sites) {
      for (const key in settings.sites) {
        if (matchLocation(document.URL, key)) {
          Command.addSettingBlock(settings.sites[key]);
        }
      }
    }
  },
  executeSequence: function(c: string, r?: string) {
    if (!c.length) {
      return;
    }
    if (/^\d+/.test(c)) {
      const match = c.match(/^\d+/);
      if (match) {
        r = match[0];
        c = c.replace(/^\d+/, '');
        this.repeats = r;
        if (!c.length) {
          return;
        }
      }
    }
    const com = c[0]!;
    this.queue += com;
    this.queue = this.queue.slice(0, -1);
    if (Hints.active) {
      Hints.handleHint(com);
    } else if (Visual.caretModeActive || Visual.visualModeActive) {
      Visual.action(com);
    } else {
      this.convertToAction(com);
    }
    if (!commandMode && !DOM.isEditable(document.activeElement)) {
      setTimeout(function() {
        Mappings.executeSequence(c.substring(1), r);
      });
    } else {
      setTimeout(function() {
        (document.activeElement as any).value += c.substring(1);
      });
    }
  },
  handleEscapeKey: function() {
    this.queue = '';
    this.repeats = '';
    currentTrieNode = mappingTrie;

    if (commandMode) {
      if (Command.type === 'search') {
        PORT('cancelIncSearch', {
          search: Command.input.value
        });
      }
      Command.hideData();
      Command.hide();
      return;
    }

    if (DOM.isEditable(document.activeElement)) {
      if (document.getSelection()?.type === 'Range') {
        document.getSelection()?.collapseToEnd();
        return;
      }
      this.actions.inputFocused = false;
      (document.activeElement as HTMLElement).blur();
      return;
    }

    if (Hints.active) {
      return Hints.hideHints(false, false);
    }

    if (insertMode) {
      insertMode = false;
      HUD.hide();
      return;
    }

    if (Hints.lastHover) {
      DOM.mouseEvent('unhover', Hints.lastHover);
      Hints.lastHover = null;
      return;
    }

    if (Find.matches.length) {
      Find.clear();
      (document.activeElement as HTMLElement).blur();
      HUD.hide();
      return;
    }

    window.stop();
  },
  clearQueue: function() {
    currentTrieNode = mappingTrie;
    this.queue = this.repeats = '';
    this.validMatch = false;
  },
  shouldPrevent: function(key: string): boolean {
    if (key === '<Esc>' || key === '<C-[>' || Hints.active) {
      return true;
    }
    if (/^[0-9]$/.test(key) &&
      !(currentTrieNode.hasKey(key) && this.repeats === '') &&
      !(key === '0' && this.repeats === '')) {
      return true;
    }
    if (!currentTrieNode.hasKey(key)) {
      if (currentTrieNode.getKey('*')) {
        return true;
      }
    } else {
      return true;
    }
    return false;
  },
  convertToAction: function(key: string): boolean {
    if (key === '<Esc>' || key === '<C-[>') {
      this.handleEscapeKey();
      return false;
    }
    if (Hints.active) {
      Hints.handleHint(key);
      return true;
    }

    if (/^[0-9]$/.test(key) &&
      !(currentTrieNode.hasKey(key) &&
        this.repeats === '') &&
      !(key === '0' && this.repeats === '')) {
      this.repeats += key;
      return false;
    }

    this.queue += key;
    if (!currentTrieNode.hasKey(key)) {
      if (currentTrieNode.getKey('*')) {
        currentTrieNode = currentTrieNode.getKey('*')!;
      } else {
        this.clearQueue();
        return false;
      }
    } else {
      currentTrieNode = currentTrieNode.getKey(key)!;
      this.validMatch = true;
    }

    let mapVal = currentTrieNode.value || '';
    let actionParams: any;

    (function() {
      if (mapVal.charAt(0) !== ':') {
        mapVal = mapVal.replace(/\([^)]+\)/, function(e: string) {
          actionParams = e.slice(1, -1);
          return '';
        });
      }
    })();

    if (mapVal) {
      if (/^\d+\D/.test(mapVal)) {
        this.repeats = String(+mapVal.replace(/\D.*/g, '') || 1);
        mapVal = mapVal.replace(/^\d+/, '');
      }
      const mapLinks = [mapVal];
      while (!this.actions.hasOwnProperty(mapVal) && mapVal.charAt(0) !== ':') {
        mapVal = mappingTrie.findValue(this.splitMapping(mapVal));
        if (mapVal === null) {
          this.clearQueue();
          return false;
        }
        if (mapLinks.indexOf(mapVal) !== -1) {
          Status.setMessage('recursive mapping detected', undefined, 'error');
          this.clearQueue();
          return false;
        }
        mapLinks.push(mapVal);
      }
      if (mapVal !== 'repeatCommand' &&
        this.nonRepeatableCommands.indexOf(mapVal) === -1) {
        this.lastCommand.queue = this.queue;
        this.lastCommand.repeats = +this.repeats || 1;
        this.lastCommand.fn = mapVal;
        this.lastCommand.params = actionParams;
        this.lastCommand.repeatStr = this.repeats;
      }
      if (mapVal.charAt(0) === ':') {
        this.actions.shortCuts(mapVal, this.lastCommand.repeats);
      } else {
        if (mapVal !== 'repeatCommand') {
          (this.actions as any)[mapVal](+this.repeats || 1, actionParams);
          RUNTIME('updateLastCommand', {
            data: JSON.stringify(this.lastCommand)
          });
        } else {
          this.actions.repeatCommand(+this.repeats || 1);
        }
      }
      this.clearQueue();
    }

    return true;
  }
};

Mappings.defaults = [
  ['j', 'scrollDown'],
  ['gg', 'scrollToTop'],
  ['a', ':tabnew google '],
  ['o', ':open '],
  ['O', ':open @%'],
  ['b', ':bookmarks '],
  ['t', ':tabnew '],
  ['I', ':history '],
  ['T', ':tabnew @%'],
  ['B', ':buffer '],
  ['gd', ':chrome downloads!<cr>'],
  ['ge', ':chrome extensions!<cr>'],
  ['x', 'closeTab'],
  ['gxT', 'closeTabLeft'],
  ['gxt', 'closeTabRight'],
  ['gx0', 'closeTabsToLeft'],
  ['gx$', 'closeTabsToRight'],
  ['s', 'scrollDown'],
  ['j', 'scrollDown'],
  ['w', 'scrollUp'],
  ['k', 'scrollUp'],
  ['e', 'scrollPageUp'],
  ['u', 'scrollPageUp'],
  ['d', 'scrollPageDown'],
  ['gg', 'scrollToTop'],
  ['G', 'scrollToBottom'],
  ['h', 'scrollLeft'],
  ['l', 'scrollRight'],
  ['0', 'scrollToLeft'],
  ['$', 'scrollToRight'],
  ['i', 'insertMode'],
  ['r', 'reloadTab'],
  ['cr', 'reloadAllButCurrent'],
  ['gR', 'reloadTabUncached'],
  ['f', 'createHint'],
  ['mf', 'createMultiHint'],
  [']]', 'nextMatchPattern'],
  ['[[', 'previousMatchPattern'],
  ['W', 'createHintWindow'],
  ['gp', 'pinTab'],
  ['>', 'moveTabRight'],
  ['<', 'moveTabLeft'],
  ['H', 'goBack'],
  ['S', 'goBack'],
  ['gr', 'reverseImage'],
  ['mr', 'multiReverseImage'],
  ['L', 'goForward'],
  ['D', 'goForward'],
  ['[d', 'previousDomain'],
  [']d', 'nextDomain'],
  ['g0', 'firstTab'],
  ['M*', 'addQuickMark'],
  ['A', 'openLastHint'],
  ['go*', 'openQuickMark'],
  ['gn*', 'openQuickMarkTabbed'],
  ['gw*', 'openQuickMarkWindowed'],
  ['gq', 'cancelWebRequest'],
  ['<C-S-h>', 'openLastLinkInTab'],
  ['gh', 'openLastLinkInTab'],
  ['<C-S-l>', 'openNextLinkInTab'],
  ['gl', 'openNextLinkInTab'],
  ['gQ', 'cancelAllWebRequests'],
  ['q', 'createHoverHint'],
  ['Q', 'createUnhoverHint'],
  ['g$', 'lastTab'],
  ['X', 'lastClosedTab'],
  ['gj', 'hideDownloadsShelf'],
  ['F', 'createTabbedHint'],
  ['gi', 'goToInput'],
  ['gI', 'goToLastInput'],
  ['K', 'nextTab'],
  ['R', 'nextTab'],
  ['gt', 'nextTab'],
  ['gf', 'nextFrame'],
  ['gF', 'rootFrame'],
  ['g\'', 'lastActiveTab'],
  ['g%', 'percentScroll'],
  ['%', 'goToTab'],
  ['z<Enter>', 'toggleImageZoom'],
  ['zi', 'zoomPageIn'],
  ['zo', 'zoomPageOut'],
  ['z0', 'zoomOrig'],
  ['\'\'', 'lastScrollPosition'],
  ['<C-o>', 'previousScrollPosition'],
  ['<C-i>', 'nextScrollPosition'],
  ['\'*', 'goToMark'],
  [';*', 'setMark'],
  ['zt', 'centerMatchT'],
  ['zb', 'centerMatchB'],
  ['zz', 'centerMatchH'],
  ['gs', ':viewsource!<CR>'],
  ['gU', 'goToRootUrl'],
  ['gu', 'goUpUrl'],
  ['gy', 'yankUrl'],
  ['my', 'multiYankUrl'],
  ['yy', 'yankDocumentUrl'],
  ['yY', 'yankFrameUrl'],
  ['ya', 'yankWindowUrls'],
  ['yh', 'yankHighlight'],
  ['p', 'openPaste'],
  ['v', 'toggleVisualMode'],
  ['V', 'toggleVisualLineMode'],
  ['P', 'openPasteTab'],
  ['J', 'previousTab'],
  ['E', 'previousTab'],
  ['gT', 'previousTab'],
  ['n', 'nextSearchResult'],
  ['N', 'previousSearchResult'],
  ['/', 'openSearchBar'],
  ['?', 'openSearchBarReverse'],
  [':', 'openCommandBar'],
  ['<C-6>', 'lastUsedTab'],
  ['.', 'repeatCommand'],
  ['<C-b>', 'createBookmark'],
  ['g+', 'incrementURLPath'],
  ['g-', 'decrementURLPath'],
  ['#', 'resetScrollFocus'],
  ['cm', 'muteTab']
];

Mappings.defaultsClone = (Object as any).clone(Mappings.defaults);

Mappings.actions = {

  lastUsedTab: function() { RUNTIME('lastUsedTab'); },
  '<Nop>': function() { },
  toggleVisualMode: function() {
    Command.callOnCvimLoad(function() {
      Visual.caretModeActive = true;
      Visual.getTextNodes();
      Visual.lineMode = false;
      document.body.spellcheck = false;
      document.designMode = 'on';
      Visual.selection = document.getSelection();
      if (document.getSelection()?.type === 'Range') {
        return false;
      }
      if (Find.matches.length) {
        Visual.focusSearchResult();
      } else {
        const closestNode = Visual.closestNode();
        if (closestNode) {
          Visual.selection?.setPosition(Visual.closestNode()!, 0);
          HUD.display(' -- CARET -- ');
          Visual.scrollIntoView();
        } else {
          Visual.lineMode = false;
          Visual.visualModeActive = false;
          Visual.exit();
        }
      }
      return true;
    });
  },
  toggleVisualLineMode: function() {
    if (Visual.caretModeActive || Visual.visualModeActive) {
      return false;
    }
    Visual.caretModeActive = true;
    Visual.getTextNodes();
    Visual.lineMode = true;
    document.body.spellcheck = false;
    document.designMode = 'on';
    Visual.selection = document.getSelection();
    if (document.getSelection()?.type === 'Range') {
      return false;
    }
    if (Find.matches.length) {
      Visual.focusSearchResult(true);
    }
    return true;
  },
  openLastHint: function() {
    if (Hints.lastClicked) {
      Hints.dispatchAction(Hints.lastClicked);
    }
  },
  nextMatchPattern: function() {
    Hints.matchPatterns(settings.nextmatchpattern);
  },
  previousMatchPattern: function() {
    Hints.matchPatterns(settings.previousmatchpattern);
  },
  cancelWebRequest: function() {
    window.stop();
  },
  cancelAllWebRequests: function() {
    RUNTIME('cancelAllWebRequests');
  },
  percentScroll: function(repeats: number) {
    repeats = (Mappings.repeats === '0' || Mappings.repeats === '')
      ? 0 : repeats;
    document.scrollingElement!.scrollTop =
      (document.body.scrollHeight - window.innerHeight) * repeats / 100;
  },
  goToTab: function(repeats: number) {
    RUNTIME('goToTab', { index: repeats - 1 });
  },
  hideDownloadsShelf: function() {
    RUNTIME('hideDownloadsShelf');
  },
  goToRootUrl: function() {
    RUNTIME('openLink', {
      url: location.protocol + '//' + location.hostname +
        (location.port ? ':' + location.port : ''),
      tab: { pinned: null }
    });
  },
  goUpUrl: function(repeats: number) {
    const path = '/' + location.pathname.split('/')
      .filter(function(e) { return e; })
      .slice(0, -repeats).join('/');
    if (path !== location.pathname) {
      RUNTIME('openLink', {
        url: location.protocol + '//' + location.hostname +
          (location.port ? ':' + location.port : '') + path,
        tab: { pinned: null }
      });
    }
  },
  nextFrame: function(repeats: number) {
    RUNTIME('focusFrame', { repeats: repeats });
  },
  rootFrame: function() {
    RUNTIME('focusFrame', { isRoot: true });
  },
  closeTab: function(repeats: number) {
    RUNTIME('closeTab', { repeats: repeats });
  },
  closeTabLeft: function(repeats: number) {
    RUNTIME('closeTabLeft', { repeats: repeats });
  },
  closeTabRight: function(repeats: number) {
    RUNTIME('closeTabRight', { repeats: repeats });
  },
  closeTabsToLeft: function() {
    RUNTIME('closeTabsToLeft');
  },
  closeTabsToRight: function() {
    RUNTIME('closeTabsToRight');
  },
  pinTab: function() {
    RUNTIME('pinTab');
  },
  firstTab: function() {
    RUNTIME('firstTab');
  },
  lastTab: function() {
    RUNTIME('lastTab');
  },
  lastClosedTab: function(repeats: number) {
    RUNTIME('openLast', { repeats: repeats });
  },
  moveTabRight: function(repeats: number) {
    RUNTIME('moveTabRight', { repeats: repeats });
  },
  moveTabLeft: function(repeats: number) {
    RUNTIME('moveTabLeft', { repeats: repeats });
  },
  lastActiveTab: function() {
    RUNTIME('lastActiveTab');
  },
  reverseImage: function() {
    if (/\(\d+×\d+\)$/.test(document.title) === true &&
      document.body.firstChild?.nodeName === 'IMG') {
      const img = document.body.firstChild as HTMLImageElement;
      if (img.src) {
        RUNTIME('openLinkTab', {
          active: false,
          url: 'https://www.google.com/searchbyimage?image_url=' + img.src,
          noconvert: true
        });
        return;
      }
    } else {
      window.setTimeout(function() {
        Hints.create('image');
      }, 0);
    }
  },
  multiReverseImage: function() {
    window.setTimeout(function() {
      Hints.create('multiimage');
    }, 0);
  },
  toggleImageZoom: function() {
    if (/\.[a-z]+\s+\(\d+×\d+\)/i.test(document.title)) {
      const images = document.getElementsByTagName('img');
      if (images.length) {
        DOM.mouseEvent('click', images[0]);
      }
    }
  },
  zoomPageIn: function(repeats: number) {
    RUNTIME('zoomIn', { repeats: repeats }, function() {
      document.body.style.zoom =
        String(+(document.body.style.zoom || '1') + settings.zoomfactor * repeats);
    });
  },
  zoomPageOut: function(repeats: number) {
    RUNTIME('zoomOut', { repeats: repeats }, function() {
      document.body.style.zoom =
        String(+(document.body.style.zoom || '1') - settings.zoomfactor * repeats);
    });
  },
  zoomOrig: function() {
    RUNTIME('zoomOrig', null, function() {
      document.body.style.zoom = '1';
    });
  },
  centerMatchT: function() {
    const documentZoom = parseFloat(document.body.style.zoom) || 1;
    if (Find.matches.length && Find.matches[Find.index]) {
      window.scrollBy(0, Find.matches[Find.index].getBoundingClientRect().top *
        documentZoom);
    }
  },
  centerMatchH: function() {
    const documentZoom = parseFloat(document.body.style.zoom) || 1;
    if (Find.matches.length && Find.matches[Find.index]) {
      const scrollOffset = (function(this: typeof Find) {
        return this.matches[this.index].getBoundingClientRect().top *
          documentZoom + this.matches[this.index].offsetHeight -
          0.5 * window.innerHeight;
      }).call(Find);
      window.scrollBy(0, scrollOffset);
    }
  },
  centerMatchB: function() {
    const documentZoom = parseFloat(document.body.style.zoom) || 1;
    if (Find.matches.length && Find.matches[Find.index]) {
      const scrollOffset = (function(this: typeof Find) {
        return this.matches[this.index].getBoundingClientRect().top *
          documentZoom + this.matches[this.index].offsetHeight *
          documentZoom - window.innerHeight;
      }).call(Find);
      window.scrollBy(0, scrollOffset);
    }
  },
  openLastLinkInTab: function(repeats: number) {
    RUNTIME('openLastLinkInTab', { repeats: repeats });
  },
  openNextLinkInTab: function(repeats: number) {
    RUNTIME('openNextLinkInTab', { repeats: repeats });
  },
  scrollDown: function(repeats: number) {
    Scroll.scroll('down', repeats);
  },
  scrollUp: function(repeats: number) {
    Scroll.scroll('up', repeats);
  },
  scrollPageDown: function(repeats: number) {
    Scroll.scroll('pageDown', repeats);
  },
  scrollFullPageDown: function(repeats: number) {
    Scroll.scroll('fullPageDown', repeats);
  },
  scrollPageUp: function(repeats: number) {
    Scroll.scroll('pageUp', repeats);
  },
  scrollFullPageUp: function(repeats: number) {
    Scroll.scroll('fullPageUp', repeats);
  },
  scrollLeft: function(repeats: number) {
    Scroll.scroll('left', repeats);
  },
  scrollRight: function(repeats: number) {
    Scroll.scroll('right', repeats);
  },
  scrollToTop: function() {
    Scroll.scroll('top');
  },
  scrollToBottom: function() {
    Scroll.scroll('bottom');
  },
  scrollToLeft: function() {
    Scroll.scroll('leftmost');
  },
  scrollToRight: function() {
    Scroll.scroll('rightmost');
  },
  lastScrollPosition: function() {
    if (!Scroll.lastPosition) {
      return;
    }
    const currentPosition: [number, number] = [document.scrollingElement!.scrollLeft, document.scrollingElement!.scrollTop];
    window.scrollTo(...Scroll.lastPosition);
    Scroll.lastPosition = currentPosition;
  },
  previousScrollPosition: function() {
    Scroll.previousHistoryState();
  },
  nextScrollPosition: function() {
    Scroll.nextHistoryState();
  },
  goToMark: function() {
    const key = Mappings.lastCommand.queue.slice(-1);
    if (Scroll.positions.hasOwnProperty(key)) {
      Scroll.lastPosition =
        [document.scrollingElement!.scrollLeft, document.scrollingElement!.scrollTop];
      const position = Scroll.positions[key];
      if (position) window.scrollTo(...position);
    } else {
      Status.setMessage('Mark not set', 1, 'error');
    }
  },
  setMark: function() {
    Scroll.positions[Mappings.lastCommand.queue.slice(-1)] =
      [document.scrollingElement!.scrollLeft, document.scrollingElement!.scrollTop];
  },
  createHint: function() { Hints.create(); },
  createTabbedHint: function() { Hints.create('tabbed'); },
  createActiveTabbedHint: function() { Hints.create('tabbedActive'); },
  createMultiHint: function() { Hints.create('multi'); },
  createHintWindow: function() { Hints.create('window'); },
  createEditHint: function() { Hints.create('edit'); },
  createHoverHint: function() { Hints.create('hover'); },
  createUnhoverHint: function() { Hints.create('unhover'); },
  createScriptHint: function(_repeats: number, scriptName: string) {
    Hints.scriptFunction = scriptName;
    if (settings.FUNCTIONS.hasOwnProperty(scriptName)) {
      Hints.create('script');
    }
  },
  yankUrl: function() { Hints.create('yank'); },
  multiYankUrl: function() { Hints.create('multiyank'); },
  fullImageHint: function() { Hints.create('fullimage'); },
  yankDocumentUrl: function() {
    RUNTIME('getRootUrl', function(url: string) {
      (Clipboard as any).copy(url);
      Status.setMessage(url, 2);
    });
  },
  yankFrameUrl: function() {
    (Clipboard as any).copy(document.URL);
    Status.setMessage(document.URL, 2);
  },
  yankWindowUrls: function() {
    PORT('yankWindowUrls');
  },
  yankHighlight: function() {
    const selection = document.getSelection();
    if (selection?.type === 'Range' && selection.toString() !== '') {
      (Clipboard as any).copy(selection.toString());
      return;
    }
    const match = Find.matches[Find.index];
    if (match) {
      (Clipboard as any).copy(match.textContent);
    }
  },
  openPaste: function() {
    (Clipboard as any).paste(false);
  },
  openPasteTab: function(repeats: number) {
    for (let i = 0; i < repeats; ++i) {
      (Clipboard as any).paste(true);
    }
  },
  nextCompletionResult: function() {
    if (Command.commandBarFocused())
      Search.nextResult(false);
  },
  previousCompletionResult: function() {
    if (Command.commandBarFocused())
      Search.nextResult(true);
  },
  addQuickMark: function() {
    Marks.addQuickMark(Mappings.lastCommand.queue.slice(-1));
  },
  openQuickMark: function(repeats: number) {
    Marks.openQuickMark(Mappings.lastCommand.queue.slice(-1), {
      tab: {},
    }, repeats);
  },
  openQuickMarkTabbed: function(repeats: number) {
    Marks.openQuickMark(Mappings.lastCommand.queue.slice(-1), {
      tab: { tabbed: true }
    }, repeats);
  },
  openQuickMarkWindowed: function(repeats: number) {
    Marks.openQuickMark(Mappings.lastCommand.queue.slice(-1), {
      tab: { newWindow: true }
    }, repeats);
  },
  insertMode: function() {
    Command.callOnCvimLoad(function() {
      HUD.display(' -- INSERT -- ');
    });
    insertMode = true;
  },
  reloadTab: function() {
    RUNTIME('reloadTab', { nocache: false });
  },
  reloadTabUncached: function() {
    RUNTIME('reloadTab', { nocache: true });
  },
  reloadAllButCurrent: function() {
    RUNTIME('reloadAllTabs', { nocache: false, current: false });
  },
  reloadAllTabs: function() {
    RUNTIME('reloadAllTabs', { nocache: false, current: true });
  },
  nextSearchResult: function(repeats: number) {
    if (Find.matches.length) {
      Find.search(Find.mode || '/', repeats);
    } else if (Find.lastSearch !== void 0 &&
      typeof Find.lastSearch === 'string') {
      Find.highlight({
        base: document.body,
        mode: Find.mode || '/',
        search: Find.lastSearch,
        setIndex: true,
        executeSearch: false
      });
      Find.search(Find.mode || '/', +(Find.mode === '?'));
    }
  },
  previousSearchResult: function(repeats: number) {
    if (Find.matches.length) {
      Find.search(Find.mode || '?', -repeats);
    } else if (Find.lastSearch !== void 0 &&
      typeof Find.lastSearch === 'string') {
      Find.highlight({
        base: document.body,
        mode: Find.mode || '?',
        search: Find.lastSearch,
        setIndex: true,
        executeSearch: false,
      });
      Find.search(Find.mode || '?', -(Find.mode !== '?' ? 1 : 0));
    }
  },
  nextTab: function(r: number) {
    RUNTIME('nextTab', { repeats: r });
  },
  previousTab: function(r: number) {
    RUNTIME('previousTab', { repeats: r });
  },
  goBack: function(repeats: number) {
    history.go(-1 * repeats);
  },
  goForward: function(repeats: number) {
    history.go(1 * repeats);
  },

  _switchDomain: function(direction: number, repeats: number) {
    RUNTIME('getHistoryStates', null, function(response: any) {
      if (response.links.length === 0)
        return;

      const curDomain = new URL(response.links[response.state]).hostname;

      const searchSpace = direction > 0 ?
        response.links.slice(response.state) :
        response.links.slice(0, response.state + 1).reverse();

      for (let i = 1, domainDistance = 0; i < searchSpace.length; i++) {
        const targetDomain = new URL(searchSpace[i]).hostname;
        if (targetDomain !== curDomain) {
          if (++domainDistance >= repeats) {
            history.go(i * (direction > 0 ? 1 : -1));
            break;
          }
        }
      }
    });
  },
  previousDomain: function(repeats: number) {
    this._switchDomain(-1, repeats);
  },
  nextDomain: function(repeats: number) {
    this._switchDomain(1, repeats);
  },

  goToLastInput: function() {
    if ((this as any).inputElements && (this as any).inputElements[(this as any).inputElementsIndex]) {
      (this as any).inputElements[(this as any).inputElementsIndex].focus();
    }
  },
  goToInput: function(repeats: number) {
    (this as any).inputElements = [];
    const allInput = document.
      querySelectorAll('input,textarea,*[contenteditable]');
    for (let i = 0, l = allInput.length; i < l; i++) {
      if (DOM.isEditable(allInput[i]) &&
        DOM.isVisible(allInput[i]) &&
        (allInput[i] as HTMLElement).id !== 'cVim-command-bar-input') {
        (this as any).inputElements.push(allInput[i] as HTMLElement);
      }
    }
    if (this.inputElements.length === 0) {
      return false;
    }
    (this as any).inputElementsIndex = repeats % (this as any).inputElements.length - 1;
    if ((this as any).inputElementsIndex < 0) {
      (this as any).inputElementsIndex = 0;
    }
    for (let i = 0, l = (this as any).inputElements.length; i < l; i++) {
      const br = (this as any).inputElements[i].getBoundingClientRect();
      if (br.top + br.height >= 0 &&
        br.left + br.width >= 0 &&
        br.right - br.width <= window.innerWidth &&
        br.top < window.innerHeight) {
        (this as any).inputElementsIndex = i;
        break;
      }
    }
    (this as any).inputFocused = true;
    (this as any).inputElements[(this as any).inputElementsIndex].focus();
    return true;
  },
  shortCuts: function(command: string, repeats: number) {
    commandMode = true;
    if (command.indexOf('@%') !== -1) {
      RUNTIME('getRootUrl', function(url: string) {
        Mappings.actions.shortCuts.call(Mappings.actions, command.split('@%').join(url), repeats);
      });
      return;
    }
    return window.setTimeout(function() {
      const shouldComplete = !/<cr>(\s+)?$/i.test(command);
      command = command
        .replace(/^:/, '')
        .replace(/<cr>(\s+)?$/i, '')
        .replace(/<space>/ig, ' ');
      if (!shouldComplete) {
        Command.execute(command, repeats);
        return;
      }
      Command.show(false, command, shouldComplete);
      Mappings.queue = '';
      Mappings.repeats = '';
    }, 0);
  },
  openSearchBar: function() {
    if ('lastIndex' in Find) {
      Find.lastIndex = Find.index;
    }
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      if ('lastScrollTop' in Command) {
        Command.lastScrollTop = document.scrollingElement!.scrollTop;
      }
    }
    commandMode = true;
    if ('previousMatches' in Find) {
      Find.previousMatches = Find.matches.length > 0;
    }
    return Command.show('/');
  },
  openSearchBarReverse: function() {
    if ('lastIndex' in Find) {
      Find.lastIndex = Find.index;
    }
    commandMode = true;
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      if ('lastScrollTop' in Command) {
        Command.lastScrollTop = document.scrollingElement!.scrollTop;
      }
    }
    if ('previousMatches' in Find) {
      Find.previousMatches = Find.matches.length > 0;
    }
    return Command.show('?');
  },
  openLinkSearchBar: function() {
    if ('lastIndex' in Find) {
      Find.lastIndex = Find.index;
    }
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      if ('lastScrollTop' in Command) {
        Command.lastScrollTop = document.scrollingElement!.scrollTop;
      }
    }
    commandMode = true;
    if ('previousMatches' in Find) {
      Find.previousMatches = Find.matches.length > 0;
    }
    return Command.show('$');
  },
  openCommandBar: function() {
    commandMode = true;
    return Command.show(false, '', settings.completeonopen);
  },
  repeatCommand: function(repeats: number) {
    if (Mappings.actions.hasOwnProperty(Mappings.lastCommand.fn)) {
      (Mappings.actions as any)[Mappings.lastCommand.fn]
        .call(this,
          Mappings.lastCommand.repeats * repeats,
          Mappings.lastCommand.params);
    }
  },
  createBookmark: function() {
    PORT('createBookmark', {
      url: document.URL,
      title: document.title
    });
  },
  quitChrome: function() { PORT('quitChrome'); },
  passKeys: function(repeats: number) { Mappings.keyPassesLeft = repeats; },
  resetScrollFocus: function() { window.resetScrollFocus(); },
  clearSearchHighlight: function() {
    Find.clear();
    HUD.hide();
  },
  muteTab: function() {
    RUNTIME('muteTab');
  },

  inputFocused: false,
  inputElements: [],
  inputElementsIndex: 0,

  incrementURLPath: function() { },
  decrementURLPath: function() { }

};

(function() {
  const replaceURLNumber = function(callback: (e: string) => number) {
    const url = document.URL.replace(/\b\d+\b/, (match) => String(callback(match)));
    if (url !== document.URL)
      RUNTIME('openLink', { url: url, tab: { tabbed: false } });
  };
  Mappings.actions.incrementURLPath = function(repeats: number) {
    replaceURLNumber(function(e: string) { return +e + repeats; });
  };
  Mappings.actions.decrementURLPath = function(repeats: number) {
    replaceURLNumber(function(e: string) { return Math.max(0, +e - repeats); });
  };
})();

Mappings.insertDefaults = [
  ['<C-y>', 'deleteWord'],
  ['<C-p>', 'deleteForwardWord'],
  ['<C-i>', 'beginningOfLine'],
  ['<C-e>', 'endOfLine'],
  ['<C-u>', 'deleteToBeginning'],
  ['<C-o>', 'deleteToEnd'],
  ['<C-f>', 'forwardChar'],
  ['<C-b>', 'backwardChar'],
  ['<C-j>', 'forwardLine'],
  ['<C-k>', 'backwardLine'],
  ['<C-l>', 'forwardWord'],
  ['<C-h>', 'backwardWord'],
];

Mappings.insertFunctions = (function() {
  const selection = document.getSelection();
  let element: HTMLElement;

  function modify(...args: any[]) {
    if (args.length === 3) {
      selection?.modify(...args);
      return;
    }
    selection?.modify.bind(
      selection,
      selection?.type === 'Range' ? 'extend' : 'move'
    )(...args);
  }

  function deleteSelection(): boolean {
    if (selection?.type === 'Range' && selection.toString().length !== 0) {
      document.execCommand('delete', false);
      return true;
    }
    return false;
  }

  return {
    __setElement__: function(e: HTMLElement) {
      element = e;
    },
    __getElement__: function() {
      return element;
    },
    editWithVim: function() {
      PORT('editWithVim', {
        text: (element as any).value || element.innerHTML
      });
    },
    forwardChar: () => modify('right', 'character'),
    backwardChar: () => modify('left', 'character'),
    backwardWord: function() {
      if ((element as any).value !== void 0) {
        const el = element as HTMLInputElement;
        const text = el.value.split('').reverse().join('');
        const len = text.length;
        const start = len - el.selectionStart!;
        const end = text.slice(start)
          .match(/[\s\n]*[a-zA-Z_0-9]+|(\n|[^a-zA-Z_0-9])+/);
        const endPos = start + (end ? end[0].length : 0);
        el.selectionStart = len - endPos;
        el.selectionEnd = len - endPos;
        return;
      }
      modify('left', 'word');
    },
    forwardWord: function() {
      if ((element as any).value !== void 0) {
        const el = element as HTMLInputElement;
        const start = el.selectionStart!;
        const end = el.value.slice(start)
          .match(/[a-zA-Z_0-9]+[\s\n]*|(\n|[^a-zA-Z_0-9])+/);
        const endPos = start + (end ? end[0].length : 0);
        el.selectionStart = endPos;
        el.selectionEnd = endPos;
        return;
      }
      modify('right', 'word');
    },
    deleteToBeginning: function() {
      modify('extend', 'left', 'lineboundary');
      if (!deleteSelection()) {
        modify('extend', 'left', 'character');
        deleteSelection();
      }
    },
    deleteToEnd: function() {
      modify('extend', 'right', 'lineboundary');
      deleteSelection();
      modify('move', 'right', 'lineboundary');
    },
    beginningOfLine: function() {
      modify('left', 'lineboundary');
    },
    endOfLine: function() {
      modify('right', 'lineboundary');
    },
    deleteWord: function() {
      modify('extend', 'left', 'word');
      deleteSelection();
    },
    deleteForwardWord: function() {
      if ((element as any).value !== void 0) {
        const el = element as HTMLInputElement;
        const start = el.selectionStart!;
        const end = el.value.slice(start)
          .match(/[a-zA-Z_0-9]+[\s\n]*|(\n|[^a-zA-Z_0-9])\1*/);
        const endPos = start + (end ? end[0].length : 0);
        el.selectionStart = start;
        el.selectionEnd = endPos;
      } else {
        modify('extend', 'right', 'word');
      }
      deleteSelection();
    },
    deleteChar: function() {
      modify('extend', 'left', 'character');
      deleteSelection();
    },
    deleteForwardChar: function() {
      modify('extend', 'right', 'character');
      deleteSelection();
    },
    forwardLine: function() {
      modify('move', 'right', 'line');
    },
    backwardLine: function() {
      modify('move', 'left', 'line');
    },
    selectAll: function() {
      if ((element as any).select) {
        (element as any).select();
      }
    }
  };
})();

