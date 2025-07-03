// External dependency declarations
declare const RUNTIME: (action: string, data?: any, callback?: (response: any) => void) => void;
declare const PORT: (action: string, data?: any) => void;
declare let commandMode: boolean;
declare const waitForLoad: (callback: () => void, context?: any) => void;
declare const addListeners: () => void;
declare const removeListeners: () => void;
declare const httpRequest: (options: { url: string }, callback: (data: string) => void) => void;
declare const matchLocation: (url: string, pattern: string) => boolean;
declare let settings: any;
declare let sessions: string[];
declare let realKeys: string;

declare const Utils: {
  compressArray<T>(array: (T | null | undefined)[]): T[];
  split(string: string, pattern: string | RegExp): string[];
  trim(string: string): string;
  uniqueElements<T>(array: T[]): T[];
};

declare const Search: {
  lastActive: any;
  index: number | null;
  settings: string[];
  topSites: Array<[string, string]>;
  chromeMatch(search: string, callback: (matches: any[]) => void): void;
  settingsMatch(search: string, callback: (matches: any[]) => void): void;
};

declare const Complete: {
  getEngine(name: string): { requestUrl: string } | null;
  engineEnabled(name: string): boolean;
  hasAlias(name: string): boolean;
  getAlias(name: string): string | null;
  hasEngine(name: string): boolean;
  queryEngine(name: string, query: string, callback: (response: any[]) => void): void;
  convertToLink(value: string, isURL?: boolean, isLink?: boolean): string;
  enableEngine(name: string): void;
  addEngine(name: string, engine: string | { baseUrl: string; requestUrl: string }): void;
  addAlias(name: string, alias: string): void;
  setLocale(locale: string): void;
  engines: { [key: string]: { requestUrl: string } };
  getMatchingEngines(search: string): string[];
};

declare const Mappings: {
  handleEscapeKey(): void;
  clearQueue(): void;
  parseCustom(config: string, updateSiteMappings: boolean): void;
  parseLine(line: string): void;
  executeSequence(command: string): void;
  defaults: string[][];
  defaultsClone: string[][];
};

declare const Find: {
  clear(): void;
};

declare const HUD: {
  hide(force?: boolean): void;
  display(message: string): void;
};

declare const Status: {
  setMessage(message: string, timeout?: number, type?: string): void;
  hide(): void;
  active: boolean;
};

declare const Marks: {
  match(search: string, callback: (response: any[]) => void, limit?: number): void;
  parseFileCommand(search: string): void;
  matchPath(search: string): boolean;
};

declare const Session: {
  tabIndex: string;
  ignoreTitleUpdate: boolean;
};

declare const DOM: {
  onTitleChange(callback: (text: string) => void): void;
};

declare const Cursor: {
  init(): void;
  overlay: HTMLElement | null;
};

declare const Frames: {
  frameId: string;
};

declare const Scroll: {
  addHistoryState(): void;
};

declare const RCParser: {
  parse(value: string): any;
};

declare const KeyHandler: {
  listener: {
    addListener(event: string, callback: (key: string) => void): void;
    removeListener(event: string, callback: (key: string) => void): void;
  };
};

declare global {
  interface Window {
    isCommandFrame?: boolean;
    wasFocused?: boolean;
  }

  interface HTMLElement {
    cVim?: boolean;
  }
}

// Type definitions
type CommandDescription = [string, string];

interface CommandHistoryType {
  [key: string]: any;
  index: { [key: string]: number };
  search: string[];
  url: string[];
  action: string[];
  setInfo(type: string, index: number): boolean;
  cycle(type: string, reverse: boolean): void;
}

interface CompletionStylesType {
  [key: string]: [string, string];
}

interface CompletionOrderType {
  engines: number;
  topsites: number;
  bookmarks: number;
  history: number;
  getImportance(item: string): number;
}

interface TabOptions {
  active: boolean;
  newWindow: boolean;
  isURL: boolean;
  isLink: boolean;
  pinned: boolean;
  tabbed: boolean;
  incognito: boolean;
}

interface CommandType {
  descriptions: CommandDescription[];
  dataElements: HTMLElement[];
  matches: any[];
  customCommands: { [key: string]: string };
  lastInputValue: string;
  completions: { [key: string]: any[] };
  completionResults: any[];
  completionStyles: CompletionStylesType;
  completionOrder: CompletionOrderType;
  history: CommandHistoryType;
  typed?: string;
  type: string;
  active: boolean;
  loaded?: boolean;
  blacklisted?: boolean;
  domElementsLoaded?: boolean;
  initialLoadStarted?: boolean;
  historyMode?: boolean;
  searchMode?: boolean;
  onBottom?: boolean;
  barHeight?: number;
  barPaddingTop?: number;
  barPaddingBottom?: number;
  lastScrollTop?: number;
  mainCSS?: string;

  // DOM elements
  bar?: HTMLDivElement;
  modeIdentifier?: HTMLSpanElement;
  input?: HTMLInputElement;
  statusBar?: HTMLDivElement;
  data?: HTMLDivElement;
  frame?: HTMLIFrameElement;
  css?: HTMLStyleElement;

  // Methods
  setupFrameElements(): void;
  setup(): void;
  commandBarFocused(): boolean;
  updateCompletions(useStyles?: boolean): void;
  hideData(): void;
  deleteCompletions(completions: string): void;
  expandCompletion(value: string): string;
  callCompletionFunction(value: string): boolean;
  complete(value: string): void;
  execute(value: string, repeats: number): void;
  show(search?: string | boolean, value?: string, complete?: boolean): void;
  hide(callback?: () => void): void;
  insertCSS(): void;
  callOnCvimLoad(callback?: () => void): void;
  onDOMLoad(): void;
  preventAutoFocus(): void;
  onDOMLoadAll(): void;
  updateSettings(config: any): void;
  addSettingBlock(config: any): void;
  init(enabled: boolean): void;
  onSettingsLoad(callback?: () => void): void;
  destroy(): void;
  configureSettings(settings: any): void;
}

// Command object implementation
export const Command: CommandType = {
  descriptions: [
    ['open', 'Open a link in the current tab'],
    ['tabnew', 'Open a link in a new tab'],
    ['tabnext', 'Switch to the next open tab'],
    ['tabprevious', 'Switch to the previous open tab'],
    ['new', 'Open a link in a new window'],
    ['buffer', 'Select from a list of current tabs'],
    ['history', 'Search through your browser history'],
    ['bookmarks', 'Search through your bookmarks'],
    ['file', 'Browse local directories'],
    ['source', 'Load a config from a local file'],
    ['set', 'Configure boolean settings'],
    ['call', 'Call a cVim command'],
    ['let', 'Configure non-boolean settings'],
    ['tabhistory', 'Open a tab from its history states'],
    ['execute', 'Execute a sequence of keys'],
    ['session', 'Open a saved session in a new window'],
    ['restore', 'Open a recently closed tab'],
    ['mksession', 'Create a saved session of current tabs'],
    ['delsession', 'Delete sessions'],
    ['map', 'Map a command'],
    ['unmap', 'Unmap a command'],
    ['tabattach', 'Move current tab to another window'],
    ['tabdetach', 'Move current tab to a new window'],
    ['chrome', 'Opens Chrome urls'],
    ['duplicate', 'Clone the current tab'],
    ['settings', 'Open the options page for this extension'],
    ['help', 'Shows the help page'],
    ['changelog', 'Shows the changelog page'],
    ['quit', 'Close the current tab'],
    ['qall', 'Close the current window'],
    ['stop', 'Stop the current page from loading'],
    ['stopall', 'Stop all pages in Chrome from loading'],
    ['undo', 'Reopen the last closed tab'],
    ['togglepin', 'Toggle the tab\'s pinned state'],
    ['nohlsearch', 'Clears the search highlight'],
    ['viewsource', 'View the source for the current document'],
    ['script', 'Run JavaScript on the current page']
  ],

  dataElements: [],
  matches: [],
  customCommands: {},
  lastInputValue: '',
  completions: {},
  completionResults: [],
  type: '',
  active: false,

  completionStyles: {
    engines: ['Se', '#87ff87'],
    topsites: ['Ts', '#00afaf'],
    history: ['Hi', '#87afff'],
    bookmarks: ['Bk', '#af5fff']
  },

  completionOrder: {
    engines: 5,
    topsites: 4,
    bookmarks: 2,
    history: 3,
    getImportance(item: string): number {
      if (!this.hasOwnProperty(item)) {
        return -1;
      }
      return (this as any)[item];
    }
  },

  history: {
    index: {},
    search: [],
    url: [],
    action: [],
    setInfo(type: string, index: number): boolean {
      let fail = false;
      if (index < 0) {
        index = 0;
        fail = true;
      }
      const typeArray = (this as any)[type] as string[];
      if (index >= typeArray.length) {
        index = typeArray.length;
        fail = true;
      }
      this.index[type] = index;
      return !fail;
    },
    cycle(type: string, reverse: boolean): void {
      const typeArray = (this as any)[type] as string[];
      if (typeArray.length === 0) {
        return;
      }
      const len = typeArray.length;
      let index = this.index[type];
      if (index === undefined) {
        index = len;
      }
      const lastIndex = index;
      index += reverse ? -1 : 1;
      if (Command.typed && Command.typed.trim()) {
        while (this.setInfo(type, index)) {
          if (typeArray[index]?.substring(0, Command.typed!.length) === Command.typed) {
            break;
          }
          index += reverse ? -1 : 1;
        }
      }
      if (reverse && index < 0) {
        this.index[type] = lastIndex;
        return;
      }
      Command.hideData();
      this.setInfo(type, index);
      if (this.index[type] !== typeArray.length) {
        Command.input!.value = typeArray[this.index[type]!] || '';
      } else {
        Command.input!.value = Command.typed || '';
      }
    }
  },

  setupFrameElements(): void {
    this.bar = document.createElement('div');
    this.bar.id = 'cVim-command-bar';
    this.bar.cVim = true;
    this.bar.style[(this.onBottom) ? 'bottom' : 'top'] = '0';
    this.modeIdentifier = document.createElement('span');
    this.modeIdentifier.id = 'cVim-command-bar-mode';
    this.modeIdentifier.cVim = true;
    this.bar.appendChild(this.modeIdentifier);
    this.bar.appendChild(this.input!);
    (this.bar as any).spellcheck = false;
    try {
      document.lastChild!.appendChild(this.bar);
    } catch (e) {
      document.body.appendChild(this.bar);
    }
    if (!this.data) {
      this.data = document.createElement('div');
      this.data.id = 'cVim-command-bar-search-results';
      this.data.cVim = true;
      try {
        document.lastChild!.appendChild(this.data);
      } catch (e) {
        document.body.appendChild(this.data);
      }
      this.barHeight = parseInt(getComputedStyle(this.bar).height, 10);
      if (this.onBottom) {
        this.barPaddingTop = 0;
        this.barPaddingBottom = this.barHeight;
        this.data.style.bottom = this.barHeight + 'px';
      } else {
        this.barPaddingBottom = 0;
        this.barPaddingTop = this.barHeight;
        this.data.style.top = this.barHeight + 'px';
      }
    }
  },

  setup(): void {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = 'cVim-command-bar-input';
    this.input.cVim = true;
    this.statusBar = document.createElement('div');
    this.statusBar.id = 'cVim-status-bar';
    this.statusBar.style[(this.onBottom) ? 'bottom' : 'top'] = '0';
    try {
      document.lastChild!.appendChild(this.statusBar);
    } catch (e) {
      document.body.appendChild(this.statusBar);
    }
    if (window.isCommandFrame)
      this.setupFrameElements();
  },

  commandBarFocused(): boolean {
    return !!(commandMode && this.active && document.activeElement &&
      document.activeElement.id === 'cVim-command-bar-input');
  },

  updateCompletions(useStyles?: boolean): void {
    if (!window.isCommandFrame)
      return;
    this.completionResults = [];
    this.dataElements = [];
    this.data!.innerHTML = '';
    let key: string;
    let i: number;
    const completionKeys = Object.keys(this.completions).sort((a, b) => {
      return this.completionOrder.getImportance(b) -
        this.completionOrder.getImportance(a);
    });
    for (i = 0; i < completionKeys.length; i++) {
      key = completionKeys[i]!;
      const completion = this.completions[key];
      if (completion) {
        for (let j = 0; j < completion.length; ++j) {
          this.completionResults.push([key].concat(completion[j]));
        }
      }
    }
    for (i = 0; i < this.completionResults.length; ++i) {
      if (i > settings.searchlimit) {
        break;
      }
      const item = document.createElement('div');
      item.className = 'cVim-completion-item';
      let identifier: HTMLSpanElement | undefined;
      if (useStyles &&
        this.completionStyles.hasOwnProperty(this.completionResults[i][0])) {
        const styles = this.completionStyles[this.completionResults[i]![0]];
        identifier = document.createElement('span');
        identifier.style.backgroundColor = styles![1];
        identifier.style.position = 'absolute';
        identifier.style.height = '100%';
        identifier.style.width = '2px';
        identifier.style.left = '0';
      }
      if (this.completionResults[i]!.length >= 3) {
        const left = document.createElement('span');
        left.className = 'cVim-left';
        left.textContent = this.completionResults[i]![1];
        const right = document.createElement('span');
        right.className = 'cVim-right';
        right.textContent = this.completionResults[i]![2];
        if (identifier) {
          left.style.paddingLeft = '4px';
          left.insertBefore(identifier, left.firstChild);
        }
        item.appendChild(left);
        item.appendChild(right);
      } else {
        const full = document.createElement('span');
        full.className = 'cVim-full';
        full.textContent = this.completionResults[i]![1];
        item.appendChild(full);
      }
      this.dataElements.push(item);
      this.data!.appendChild(item);
    }
    if (!this.active || !commandMode) {
      this.hideData();
    } else {
      this.data!.style.display = 'block';
    }
  },

  hideData(): void {
    this.completions = {};
    Search.lastActive = null;
    this.dataElements.length = 0;
    if (this.data) {
      this.data.innerHTML = '';
      Search.index = null;
    }
  },

  deleteCompletions(completions: string): void {
    const completionList = completions.split(',');
    for (let i = 0, l = completionList.length; i < l; ++i) {
      this.completions[completionList[i]!] = [];
    }
  },

  expandCompletion(value: string): string {
    const firstWord = value.match(/^[a-z]+(\b|$)/);
    const exactMatch = this.descriptions.some((e) => {
      return e[0] === firstWord?.[0];
    });
    const firstWordStr = firstWord?.[0];
    if (firstWordStr && this.customCommands.hasOwnProperty(firstWordStr)) {
      const replacement = this.customCommands[firstWordStr];
      return replacement ? value.replace(firstWordStr, replacement) : value;
    }
    if (firstWordStr && !exactMatch) {
      const completedWord = (() => {
        for (let i = 0; i < this.descriptions.length; i++) {
          const desc = this.descriptions[i];
          if (desc && desc[0] && desc[0].indexOf(firstWordStr) === 0 &&
            !this.customCommands.hasOwnProperty(desc[0]))
            return desc[0];
        }
        for (const key in this.customCommands) {
          if (key.indexOf(firstWordStr) === 0)
            return this.customCommands[key];
        }
        return undefined;
      })();
      if (completedWord)
        return value.replace(firstWordStr, completedWord);
    }
    return value;
  },

  callCompletionFunction: (() => {
    const self = () => Command;
    let search: string;

    const searchCompletion = (value: string) => {
      self().deleteCompletions('engines,bookmarks,complete,chrome,search');
      search = Utils.compressArray(search.split(/ +/)).join(' ');
      const searchTerms = Utils.compressArray(search.split(/ +/));
      if ((searchTerms.length < 2 && value.slice(-1) !== ' ') ||
        (!Complete.engineEnabled(searchTerms[0]!) && !Complete.hasAlias(searchTerms[0]!))) {
        self().completions.engines = Complete.getMatchingEngines(searchTerms.join(' ')).map((name) => {
          const engine = Complete.engines[name];
          return [name, engine?.requestUrl || ''];
        });
        self().updateCompletions(true);
        self().completions.topsites = Search.topSites.filter((e) => {
          return ~(e[0] + ' ' + e[1]).toLowerCase()
            .indexOf(searchTerms.slice(0).join(' ').toLowerCase());
        }).slice(0, 5).map((e) => {
          return [e[0], e[1]];
        });
        self().updateCompletions(true);
        if (searchTerms.length) {
          Marks.match(searchTerms.join(' '), (response) => {
            self().completions.bookmarks = response;
            self().updateCompletions(true);
          }, 2);
        }
        self().historyMode = false;
        self().searchMode = true;
        PORT('searchHistory', {
          search: value.replace(/^\S+\s+/, ''),
          limit: settings.searchlimit
        });
        return;
      }
      const aliasedEngine = Complete.getAlias(searchTerms[0]!) || searchTerms[0]!;
      if (aliasedEngine) {
        searchTerms[0] = aliasedEngine;
        if (searchTerms.length < 2) {
          self().hideData();
          return;
        }
      }
      if (Complete.engineEnabled(searchTerms[0]!)) {
        Complete.queryEngine(searchTerms[0]!, searchTerms.slice(1).join(' '), (response) => {
          self().completions = { search: response };
          self().updateCompletions();
        });
      }
    };

    const tabHistoryCompletion = (value: string) => {
      RUNTIME('getHistoryStates', null, (response: any) => {
        self().completions = {
          tabhistory: Utils.compressArray(response.links.filter((link: string) => {
            return link.toLowerCase().indexOf(value.replace(/\S+\s+/, '').toLowerCase()) !== -1;
          })).slice(0, settings.searchlimit)
        };
        self().updateCompletions();
      });
    };

    const restoreTabCompletion = (value: string) => {
      RUNTIME('getChromeSessions', null, (sessions: any) => {
        self().completions = {
          chromesessions: Object.keys(sessions).map((e) => {
            return [sessions[e].id + ': ' + sessions[e].title,
            sessions[e].url,
            sessions[e].id];
          }).filter((e) => {
            return ~e.join('').toLowerCase()
              .indexOf(value.replace(/^\S+\s+/, '').toLowerCase());
          })
        };
        self().updateCompletions();
      });
    };

    const deleteSessionCompletion = () => {
      self().completions = {
        sessions: sessions.filter((e) => {
          let regexp: RegExp;
          let isValidRegex = true;
          try {
            regexp = new RegExp(search, 'i');
          } catch (ex) {
            isValidRegex = false;
          }
          if (isValidRegex) {
            return regexp!.test(e);
          }
          return e.substring(0, search.length) === search;
        })
      };
      self().updateCompletions();
    };

    return (value: string): boolean => {
      search = value.replace(/^(chrome:\/\/|\S+ +)/, '');
      const baseCommand = (value.match(/^\S+/) || [null])[0];
      switch (baseCommand) {
        case 'tabnew':
        case 'tabedit':
        case 'tabopen':
        case 'open':
        case 'new':
          searchCompletion(value);
          return true;
        case 'chrome':
          Search.chromeMatch(search, (matches) => {
            self().completions = { chrome: matches };
            self().updateCompletions();
          });
          return true;
        case 'tabhistory':
          tabHistoryCompletion(value);
          return true;
        case 'tabattach':
          RUNTIME('getWindows', (wins: any) => {
            if (Command.active === true) {
              Command.completions = {
                windows: Object.keys(wins).map((e, i) => {
                  const tlen = wins[e].length.toString();
                  return [
                    (i + 1).toString() + ' (' + tlen +
                    (tlen === '1' ? ' Tab)' : ' Tabs)'),
                    wins[e].join(', '),
                    e
                  ];
                })
              };
              Command.completions.windows?.unshift(['0 (New window)', '']);
              Command.updateCompletions();
            }
          });
          self().completions = {};
          return true;
        case 'buffer':
          PORT('getBuffers');
          return true;
        case 'restore':
          restoreTabCompletion(value);
          return true;
        case 'session':
        case 'mksession':
        case 'delsession':
          deleteSessionCompletion();
          return true;
        case 'set':
          Search.settingsMatch(search, (matches) => {
            self().completions = { settings: matches };
            self().updateCompletions();
          });
          return true;
        case 'let': // TODO
          return true;
        case 'history':
          if (search.trim() === '') {
            self().hideData();
            return true;
          }
          self().historyMode = true;
          PORT('searchHistory', { search: search, limit: settings.searchlimit });
          return true;
        case 'file':
          Marks.parseFileCommand(search);
          return true;
        case 'source':
          Marks.parseFileCommand(search);
          return true;
        case 'bookmarks':
          self().completions = {};
          if (search[0] === '/') {
            return Marks.matchPath(search);
          }
          Marks.match(search, (response) => {
            self().completions.bookmarks = response;
            self().updateCompletions();
          });
          return true;
      }
      return false;
    };
  })(),

  complete(value: string): void {
    Search.index = null;
    this.typed = this.input!.value;
    const originalValue = value; // prevent expandCompletion from
    // limiting command completions
    value = this.expandCompletion(value).replace(/(^[^\s&$!*?=|]+)[&$!*?=|]*/, '$1');
    if (~value.indexOf(' ') && this.callCompletionFunction(value) === true) {
      return;
    }
    // Default completion for commands
    this.completions = {
      complete: this.descriptions.filter((element) => {
        return originalValue === element[0].slice(0, originalValue.length);
      })
    };
    this.updateCompletions();
  },

  execute(value: string, repeats: number): void {
    if (value.indexOf('@%') !== -1) {
      RUNTIME('getRootUrl', (url: string) => {
        this.execute(value.split('@%').join(url), repeats);
      });
      return;
    }
    if (value.indexOf('@"') !== -1) {
      RUNTIME('getPaste', (paste: string) => {
        this.execute(value.split('@"').join(paste), repeats);
      });
      return;
    }

    commandMode = false;

    const split = Utils.compressArray(value.split(/\s+/g));
    if (this.customCommands.hasOwnProperty(split[0]!)) {
      this.execute(this.customCommands[split[0]!] + ' ' + split.slice(1).join(' '), 1);
      return;
    }

    value = this.expandCompletion(value);
    value = value.replace(/@@[a-zA-Z_$][a-zA-Z0-9_$]*/g, (e) => {
      return settings.hasOwnProperty(e) ? settings[e] : e;
    });

    // Match commands like ':tabnew*&! search' before
    // commands like ':tabnew search&*!'
    // e.g. :tabnew& google asdf* => opens a new pinned tab
    // ! == whether to open in a new tab or not
    // & == whether the tab will be active
    // * == whether the tab will be pinned
    // = == force cVim to treat text as a URL
    // ? == force cVim to tread text as a search
    // | == whether to open url in incognito mode (only works for new windows)
    const tab: TabOptions = {
      active: true,
      newWindow: false,
      isURL: false,
      isLink: false,
      pinned: false,
      tabbed: false,
      incognito: false,
    };
    (value.match(/^[^\s&$!*=?|]*([&$!*=?|]+)/) || [] as string[])
      .concat(value.match(/[&$!*=?|]*$/) || [] as string[])
      .join('').split('')
      .forEach((e) => {
        switch (e) {
          case '&': tab.active = false; break;
          case '$': tab.newWindow = true; break;
          case '!': tab.tabbed = true; break;
          case '*': tab.pinned = true; break;
          case '?': tab.isLink = true; tab.isURL = false; break;
          case '=': tab.isLink = false; tab.isURL = true; break;
          case '|': tab.incognito = true; tab.newWindow = true; break;
        }
      });
    value = value.replace(/^([^\s&$*!=?|]*)[&$*!=?|]*\s/, '$1 ');
    value = value.replace(/[&$*!=?|]+$/, (e) => {
      return e.replace(/[^=?]/g, '');
    });
    if (Complete.engineEnabled(Utils.compressArray(value.split(/\s+/g))[1]!))
      value = value.replace(/[=?]+$/, '');

    this.history.index = {};

    switch (value) {
      case 'nohlsearch':
        Find.clear();
        HUD.hide();
        return;
      case 'duplicate':
        RUNTIME('duplicateTab', { repeats: repeats });
        return;
      case 'settings':
        tab.tabbed = true;
        RUNTIME('openLink', {
          tab: tab,
          url: chrome.runtime.getURL('/pages/options.html'),
          repeats: repeats
        });
        return;
      case 'changelog':
        tab.tabbed = true;
        RUNTIME('openLink', {
          tab: tab,
          url: chrome.runtime.getURL('/pages/changelog.html'),
          repeats: repeats
        });
        return;
      case 'help':
        tab.tabbed = true;
        RUNTIME('openLink', {
          tab: tab,
          url: chrome.runtime.getURL('/pages/mappings.html')
        });
        return;
      case 'stop':
        window.stop();
        return;
      case 'stopall':
        RUNTIME('cancelAllWebRequests');
        return;
      case 'viewsource':
        PORT('viewSource', { tab: tab });
        return;
      case 'pintab':
        RUNTIME('pinTab', { pinned: true });
        break;
      case 'unpintab':
        RUNTIME('pinTab', { pinned: false });
        break;
      case 'togglepin':
        RUNTIME('pinTab');
        return;
      case 'undo':
        RUNTIME('openLast');
        return;
      case 'tabnext':
      case 'tabn':
        RUNTIME('nextTab');
        return;
      case 'tabprevious':
      case 'tabp':
      case 'tabN':
        RUNTIME('previousTab');
        return;
      case 'q':
      case 'quit':
      case 'exit':
        RUNTIME('closeTab', { repeats: repeats });
        return;
      case 'qa':
      case 'qall':
        RUNTIME('closeWindow');
        return;
    }

    if (/^chrome +/.test(value)) {
      RUNTIME('openLink', {
        tab: tab,
        url: value.replace(' ', '://'),
        noconvert: true
      });
      return;
    }

    if (/^bookmarks +/.test(value) && !/^\S+\s*$/.test(value)) {
      if (/^\S+\s+\//.test(value)) {
        RUNTIME('openBookmarkFolder', {
          path: value.replace(/\S+\s+/, ''),
          noconvert: true
        });
        return;
      }
      if (this.completionResults.length &&
        !this.completionResults.some((e) => {
          return e[2] === value.replace(/^\S+\s*/, '');
        })) {
        RUNTIME('openLink', {
          tab: tab,
          url: this.completionResults[0][2],
          noconvert: true
        });
        return;
      }
      RUNTIME('openLink', {
        tab: tab,
        url: value.replace(/^\S+\s+/, ''),
        noconvert: true
      });
      return;
    }

    if (/^history +/.test(value) && !/^\S+\s*$/.test(value)) {
      RUNTIME('openLink', {
        tab: tab,
        url: Complete.convertToLink(value),
        noconvert: true
      });
      return;
    }

    if (/^taba(ttach)? +/.test(value) && !/^\S+\s*$/.test(value)) {
      let windowId: any;
      if (windowId = this.completionResults[parseInt(
        value.replace(/^\S+ */, ''), 10)]) {
        RUNTIME('moveTab', {
          windowId: windowId[3]
        });
        return;
      }
    }

    if (/^tabd(etach)?/.test(value)) {
      RUNTIME('moveTab');
      return;
    }

    if (/^file +/.test(value)) {
      RUNTIME('openLink', {
        tab: tab,
        url: 'file://' + value.replace(/\S+ +/, '')
          .replace(/^~/, settings.homedirectory),
        noconvert: true
      });
      return;
    }

    if (/^source/.test(value)) {
      let path = value.replace(/\S+ */, '');
      if (!path.length) {
        path = '';
      } else {
        path = 'file://' + path;
        path = path.split('~').join(settings.homedirectory || '~');
      }
      RUNTIME('loadLocalConfig', { path: path || null }, (res: any) => {
        if (res.code === -1) {
          // TODO: Fix Status (status bar cannot be displayed after the command
          //       bar iframe exits
          Status.setMessage('config file could not be opened', 1, 'error');
          console.error('cvim error: "%s" could not be opened for parsing', path);
        }
      });
      return;
    }

    if (/^(new|winopen|wo)$/.test(value.replace(/ .*/, ''))) {
      RUNTIME('openLinkWindow', {
        tab: tab,
        url: Complete.convertToLink(value, tab.isURL, tab.isLink),
        repeats: repeats,
        noconvert: true,
        incognito: tab.incognito
      });
      return;
    }

    if (/^restore\s+/.test(value)) {
      let sessionId: string = value.replace(/^\S+\s+/, '');
      if (Number.isNaN(+sessionId) && this.completionResults.length)
        sessionId = this.completionResults[0][3];
      RUNTIME('restoreChromeSession', {
        sessionId: Utils.trim(sessionId)
      });
    }

    if (/^(tabnew|tabedit|tabe|to|tabopen|tabhistory)$/
      .test(value.replace(/ .*/, ''))) {
      tab.tabbed = true;
      RUNTIME('openLink', {
        tab: tab,
        url: Complete.convertToLink(value, tab.isURL, tab.isLink),
        repeats: repeats,
        noconvert: true
      });
      return;
    }

    if (/^(o|open)$/.test(value.replace(/ .*/, '')) && !/^\S+\s*$/.test(value)) {
      RUNTIME('openLink', {
        tab: tab,
        url: Complete.convertToLink(value, tab.isURL, tab.isLink),
        noconvert: true
      });
      return;
    }

    if (/^buffer +/.test(value)) {
      const index = +value.replace(/^\S+\s+/, '') - 1;
      let selectedBuffer: any;
      if (Number.isNaN(index)) {
        selectedBuffer = this.completionResults[0];
        if (selectedBuffer === undefined)
          return;
      } else {
        selectedBuffer = this.completionResults.filter((e) => {
          return e[1].indexOf((index + 1).toString()) === 0;
        })[0];
      }
      if (selectedBuffer !== undefined)
        RUNTIME('goToTab', { id: selectedBuffer[3] });
      return;
    }

    if (/^execute +/.test(value)) {
      const command = value.replace(/^\S+/, '').trim();
      (realKeys as any) = '';
      (repeats as any) = '';
      this.hide();
      Mappings.executeSequence(command);
      return;
    }

    if (/^delsession/.test(value)) {
      value = Utils.trim(value.replace(/^\S+(\s+)?/, ''));
      if (value === '') {
        Status.setMessage('argument required', 1, 'error');
        return;
      }
      const sessionIndex = sessions.indexOf(value);
      if (sessionIndex !== -1) {
        sessions.splice(sessionIndex, 1);
      }
      value.split(' ').forEach((v) => {
        RUNTIME('deleteSession', { name: v });
      });
      PORT('getSessionNames');
      return;
    }

    if (/^mksession/.test(value)) {
      value = Utils.trim(value.replace(/^\S+(\s+)?/, ''));
      if (value === '') {
        Status.setMessage('session name required', 1, 'error');
        return;
      }
      if (/[^a-zA-Z0-9_-]/.test(value)) {
        Status.setMessage('only alphanumeric characters, dashes, ' +
          'and underscores are allowed', 1, 'error');
        return;
      }
      if (sessions.indexOf(value) === -1) {
        sessions.push(value);
      }
      RUNTIME('createSession', { name: value }, (response: string[]) => {
        sessions = response;
      });
      return;
    }

    if (/^session/.test(value)) {
      value = Utils.trim(value.replace(/^\S+(\s+)?/, ''));
      if (value === '') {
        Status.setMessage('session name required', 1, 'error');
        return;
      }
      RUNTIME('openSession', { name: value, sameWindow: !tab.active }, () => {
        Status.setMessage('session does not exist', 1, 'error');
      });
      return;
    }

    if (/^((i?(re)?map)|i?unmap(All)?)+/.test(value)) {
      settings.MAPPINGS += '\n' + value;
      Mappings.parseLine(value);
      PORT('syncSettings', { settings: settings });
      return;
    }

    if (/^set +/.test(value) && value !== 'set') {
      const setValue = value.replace(/^set +/, '').split(/[ =]+/);
      let isSet: boolean;
      let swapVal: boolean;
      const isQuery = /\?$/.test(setValue[0]!);
      setValue[0] = setValue[0]!.replace(/\?$/, '');
      if (!settings.hasOwnProperty(setValue[0]!.replace(/^no|!$/g, ''))) {
        Status.setMessage('unknown option: ' + setValue[0], 1, 'error');
        return;
      }

      if (isQuery) {
        Status.setMessage(setValue + ': ' + settings[setValue[0]!], 1);
        return;
      }

      isSet = !/^no/.test(setValue[0]!);
      swapVal = tab.tabbed;
      setValue[0] = setValue[0]!.replace(/^no|\?$/g, '');

      if (setValue.length === 1 && Boolean(settings[setValue[0]!]) === settings[setValue[0]!]) {
        if (setValue[0] === 'hud' && !isSet) {
          HUD.hide(true);
        }
        if (swapVal) {
          settings[setValue[0]!] = !settings[setValue[0]!];
        } else {
          settings[setValue[0]!] = isSet;
        }
        RUNTIME('syncSettings', { settings: settings });
      }
      return;
    }

    if (/^let +/.test(value) && value !== 'let') {
      try {
        const added = RCParser.parse(value);
        delete added.MAPPINGS;
        Object.assign(settings, added);
        PORT('syncSettings', { settings: settings });
      } catch (e) {
        this.hide();
      }
      return;
    }

    if (/^call +/.test(value)) {
      Mappings.parseLine(value);
      return;
    }

    if (/^script +/.test(value)) {
      RUNTIME('runScript', { code: value.slice(7) });
    }
  },

  show(search?: string | boolean, value?: string, complete?: boolean): void {
    if (!this.domElementsLoaded) {
      this.callOnCvimLoad(() => {
        this.show(search, value, complete);
      });
      return;
    }
    if (window.isCommandFrame === undefined) {
      Mappings.handleEscapeKey();
      Mappings.clearQueue();
      window.wasFocused = true;
      PORT('showCommandFrame', {
        frameId: Frames.frameId,
        search: search,
        value: value,
        complete: complete ? value : null
      });
      return;
    }
    commandMode = true;
    this.type = '';
    this.active = true;
    if (document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    if (search) {
      this.type = 'search';
      this.modeIdentifier!.innerHTML = search as string;
    } else {
      this.type = 'action';
      this.modeIdentifier!.innerHTML = ':';
    }
    if (value) {
      this.input!.value = value;
      this.typed = value;
    }
    if (Status.active) {
      Status.hide();
    }
    this.bar!.style.display = 'inline-block';
    setTimeout(() => {
      this.input!.focus();
      if (complete !== null) {
        this.complete(value!);
      }

      // UPDATE: seems to work without patch now (Chromium 44.0.2403.130)
      // Temp fix for Chromium issue in #97
      if (this.commandBarFocused()) {
        (document.activeElement as HTMLInputElement).select();

        // TODO: figure out why a842dd6 and fix for #527 are necessary
        // document.getSelection().collapseToEnd();
        document.getSelection()?.modify('move', 'right', 'lineboundary');

      }
      // End temp fix

    }, 0);
  },

  hide(callback?: () => void): void {
    if (window.isCommandFrame)
      this.input!.blur();
    commandMode = false;
    this.historyMode = false;
    this.active = false;
    Search.index = null;
    this.history.index = {};
    this.typed = '';
    this.dataElements = [];
    this.hideData();
    if (this.bar)
      this.bar.style.display = 'none';
    if (this.input)
      this.input.value = '';
    if (this.data)
      this.data.style.display = 'none';
    if (callback)
      callback();
    if (window.isCommandFrame)
      PORT('hideCommandFrame');
  },

  insertCSS(): void {
    let css = settings.COMMANDBARCSS;
    if (!css) {
      return;
    }
    if (settings.linkanimations) {
      css += '.cVim-link-hint { transition: opacity 0.2s ease-out, ' +
        'background 0.2s ease-out; }';
    }

    RUNTIME('injectCSS', { css: css, runAt: 'document_start' });

    const head = document.getElementsByTagName('head');
    if (head.length) {
      this.css = document.createElement('style');
      this.css.textContent = css;
      head[0]!.appendChild(this.css);
    }
  },

  callOnCvimLoad: (() => {
    const fnQueue: (() => void)[] = [];
    return function(this: CommandType, FN?: () => void): void {
      if (!this.domElementsLoaded) {
        if (typeof FN === 'function') {
          fnQueue.push(FN);
        }
      } else {
        if (typeof FN === 'function') {
          FN();
        }
        fnQueue.forEach((fn) => {
          fn();
        });
        fnQueue.length = 0;
      }
    };
  })(),

  onDOMLoad(): void {
    this.onDOMLoadAll();
    if (window.self === window.top) {
      this.frame = document.createElement('iframe');
      this.frame.src = chrome.runtime.getURL('cmdline_frame.html');
      this.frame.id = 'cVim-command-frame';
      document.lastElementChild!.appendChild(this.frame);
    }
  },

  preventAutoFocus(): void {
    let manualFocus = false;

    const addTextListeners = (() => {
      let allElems: Element[] = [];
      return (elems: NodeListOf<Element>) => {
        const filteredElems = Array.from(elems).filter((e) => {
          return allElems.indexOf(e) === -1;
        });
        allElems = allElems.concat(filteredElems);
        filteredElems.forEach((elem) => {
          const listener = (event: Event) => {
            if (manualFocus) {
              elem.removeEventListener('focus', listener);
              return;
            }
            if ((event as any).sourceCapabilities === null) {
              event.preventDefault();
              (elem as HTMLElement).blur();
            }
          };
          elem.addEventListener('focus', listener);
        });
      };
    })();

    let reset: (arg: any) => void;
    if (KeyboardEvent.prototype.hasOwnProperty('key')) {
      reset = (key: string) => {
        if (['Control', 'Alt', 'Meta', 'Shift'].indexOf(key) !== -1)
          return;
        manualFocus = true;
        KeyHandler.listener.removeListener('keydown', reset);
        window.removeEventListener('mousedown', reset, true);
      };
      KeyHandler.listener.addListener('keydown', reset);
      window.addEventListener('mousedown', reset, true);
    } else {
      reset = (event: Event) => {
        if (!(event as any).isTrusted)
          return;
        manualFocus = true;
        window.removeEventListener('keypress', reset, true);
        window.removeEventListener('mousedown', reset, true);
      };
      window.addEventListener('keypress', reset, true);
      window.addEventListener('mousedown', reset, true);
    }

    const preventFocus = () => {
      if (manualFocus)
        return;
      const textElements = document.querySelectorAll('input,textarea,*[contenteditable]');
      for (let i = 0; i < textElements.length; i++) {
        if (manualFocus)
          break;
        if (document.activeElement === textElements[i])
          (textElements[i] as HTMLElement).blur();
      }
      addTextListeners(textElements);
    };

    window.addEventListener('load', preventFocus);
    preventFocus();
  },

  onDOMLoadAll(): void {
    this.insertCSS();
    this.onBottom = settings.barposition === 'bottom';
    if (this.data !== undefined) {
      this.data.style[(!this.onBottom) ? 'bottom' : 'top'] = '';
      this.data.style[(this.onBottom) ? 'bottom' : 'top'] = '20px';
    }
    if (!settings.autofocus)
      this.preventAutoFocus();
    httpRequest({
      url: chrome.runtime.getURL('content_scripts/main.css')
    }, (data: string) => {
      this.mainCSS = data;
    });
    this.setup();
    this.domElementsLoaded = true;
    this.callOnCvimLoad();
    Scroll.addHistoryState();
  },

  updateSettings(config: any): void {
    let key: string;
    if (Array.isArray(config.completionengines)) {
      config.completionengines.forEach((name: string) => {
        Complete.enableEngine(name);
      });
    }
    this.customCommands = config.COMMANDS || {};
    Object.keys(this.customCommands).forEach((name) => {
      this.descriptions.push([name, ':' + this.customCommands[name]]);
    });
    if (config.searchengines && config.searchengines.constructor === Object) {
      for (key in config.searchengines) {
        const engine = config.searchengines[key];
        if (typeof engine === 'string') {
          Complete.addEngine(key, engine);
        } else if (Array.isArray(engine) && engine.length === 2 &&
          typeof engine[0] === 'string' &&
          typeof engine[1] === 'string') {
          Complete.addEngine(key, {
            baseUrl: engine[0],
            requestUrl: engine[1]
          });
        }
      }
    }
    if (config.searchaliases && config.searchaliases.constructor === Object) {
      for (key in config.searchaliases) {
        if (!Complete.hasEngine(key) || !Complete.engineEnabled(key)) {
          Complete.addAlias(key, config.searchaliases[key]);
        }
      }
    }
    if (config.locale) {
      Complete.setLocale(config.locale);
    }

    const chars = Utils.uniqueElements((config.hintcharacters || '').split(''));
    settings.hintcharacters = chars.join('');

    if (config !== settings) {
      for (key in config) {
        if (key.toUpperCase() !== key && settings.hasOwnProperty(key)) {
          settings[key] = config[key];
        }
      }
    }
  },

  addSettingBlock(config: any): void {
    for (const key in config) {
      if (key === 'MAPPINGS') {
        settings.MAPPINGS += '\n' + config[key];
        Mappings.parseCustom(settings.MAPPINGS, false);
      } else if (config[key].constructor === Object) {
        settings[key] = Object.assign(settings[key], config[key]);
      } else {
        settings[key] = config[key];
      }
    }
  },

  init(enabled: boolean): void {
    Mappings.defaults = Object.assign([], Mappings.defaultsClone);
    Mappings.parseCustom(settings.MAPPINGS, true);
    if (enabled) {
      RUNTIME('setIconEnabled');
      this.loaded = true;
      this.updateSettings(settings);
      waitForLoad(this.onDOMLoad, this);
      if (settings.autohidecursor) {
        waitForLoad(Cursor.init, Cursor);
      }
      addListeners();
      if (typeof settings.AUTOFUNCTIONS === 'object') {
        Object.getOwnPropertyNames(settings.AUTOFUNCTIONS).forEach((name) => {
          eval('(function(){' + settings.AUTOFUNCTIONS[name] + '})()');
        });
      }
    } else {
      RUNTIME('setIconDisabled');
      this.loaded = false;
      if (this.css && this.css.parentNode) {
        this.css.parentNode.removeChild(this.css);
      }
      const links = document.getElementById('cVim-link-container');
      if (Cursor.overlay && Cursor.overlay.parentNode) {
        Cursor.overlay.parentNode.removeChild(Cursor.overlay);
      }
      if (this.bar && this.bar.parentNode) {
        this.bar.parentNode.removeChild(this.bar);
      }
      if (links) {
        links.parentNode!.removeChild(links);
      }
      removeListeners();
    }
  },

  onSettingsLoad: (() => {
    const funcList: (() => void)[] = [];
    let loaded = false;
    return function(callback?: () => void): void {
      if (typeof callback === 'function') {
        if (!loaded) {
          funcList.push(callback);
        } else {
          callback();
        }
      } else {
        funcList.forEach((func) => {
          func();
        });
        funcList.length = 0;
        loaded = true;
      }
    };
  })(),

  destroy(): void {
    const removeElements = (...elements: (HTMLElement | null | undefined)[]) => {
      for (let i = 0; i < elements.length; i++) {
        const elem = elements[i];
        if (!elem) continue;
        if (typeof (elem as any).remove === 'function')
          (elem as any).remove();
      }
    };
    removeElements(this.input, this.modeIdentifier, this.data, this.bar,
      this.statusBar, this.frame, this.css);
  },

  configureSettings(_settings: any): void {
    settings = _settings;
    this.onSettingsLoad();
    DOM.onTitleChange((text: string) => {
      if (!Session.ignoreTitleUpdate && settings.showtabindices) {
        if (text.indexOf(Session.tabIndex + ' ') !== 0) {
          document.title = Session.tabIndex + ' ' + document.title;
        }
      }
      Session.ignoreTitleUpdate = false;
    });
    this.initialLoadStarted = true;
    const checkBlacklist = (): boolean => {
      const blacklists = settings.blacklists;
      let blacklist: string[];
      this.blacklisted = false;
      let isBlacklisted = false;
      for (let i = 0, l = blacklists.length; i < l; i++) {
        blacklist = Utils.split(blacklists[i], /\s+/);
        if (!blacklist.length) {
          continue;
        }
        if (blacklist[0]!.charAt(0) === '@') {
          if (matchLocation(document.URL, blacklist[0]!.slice(1))) {
            isBlacklisted = false;
            break;
          }
        } else if (matchLocation(document.URL, blacklist[0]!)) {
          isBlacklisted = true;
        }
      }
      return isBlacklisted;
    };
    Search.settings = Object.keys(settings).filter((e) => {
      return typeof settings[e] === 'boolean';
    });
    removeListeners();
    settings.searchlimit = +settings.searchlimit;
    if (!checkBlacklist()) {
      RUNTIME('getActiveState', null, (isActive: boolean) => {
        this.init(isActive);
      });
    } else {
      this.init(false);
    }
  }
};
