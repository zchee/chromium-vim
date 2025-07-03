declare global {
  interface Window {
    cVim: CVim;
    Command: any;
    Mappings: any;
    Search: any;
    Hints: any;
    Visual: any;
    Status: any;
    HUD: any;
    DOM: any;
    Keys: any;
    Scroll: any;
    Find: any;
    Cursor: any;
    Complete: any;
    Clipboard: any;
    Bookmarks: any;
    Session: any;
    Frames: any;
    Messenger: any;
    Utils: any;
    isCommandElement: boolean;
    isCommandElementVisible: boolean;
    commandBarFocused: boolean;
    commandMode: boolean;
    insertMode: boolean;
    searchMode: boolean;
    linkHintMode: boolean;
    visualMode: boolean;
    visualLineMode: boolean;
    settings: CVimSettings;
    cvimrc_parser: any;
  }
}

interface CVim {
  mode: string;
  insertMode: boolean;
  commandMode: boolean;
  searchMode: boolean;
  linkHintMode: boolean;
  visualMode: boolean;
  visualLineMode: boolean;
  settings: CVimSettings;
}

interface CVimSettings {
  [key: string]: any;
  smoothscroll: boolean;
  autohidecursor: boolean;
  typelinkhints: boolean;
  linkanimations: boolean;
  numerichints: boolean;
  defaultnewtabpage: boolean;
  cncpcompletion: boolean;
  smartcase: boolean;
  scrollstep: number;
  scrollduration: number;
  hintcharacters: string;
  homeurl: string;
  newtaburl: string;
  locale: string;
  completionengines: string[];
  searchengines: {[key: string]: string};
  qmarks: {[key: string]: string};
  previousmatchpattern: string;
  nextmatchpattern: string;
  barposition: string;
  langmap: string;
  insertmappings: {[key: string]: string};
  imapsites: string[];
  blacklists: string[];
  mapleader: string;
  maplocalleader: string;
  homedirectory: string;
  downloaddirectory: string;
  commandblacklist: string[];
  localconfig: boolean;
  completioncase: string;
  ignorediacritics: boolean;
  regexp: boolean;
  linkorder: string;
  autofocus: boolean;
  insertmodeescapetime: number;
  cmap: {[key: string]: string};
  imap: {[key: string]: string};
  nmap: {[key: string]: string};
  vmap: {[key: string]: string};
  unmap: string[];
  iunmap: string[];
  cunmap: string[];
  vunmap: string[];
  let: {[key: string]: any};
  site: string;
  command: {[key: string]: string};
  echo: {[key: string]: string};
  map: {[key: string]: string};
}

interface CVimConfig {
  unmaps: {
    insertMappings: string[];
    normalMappings: string[];
    commandMappings: string[];
    visualMappings: string[];
  };
  mappings: {
    insertMappings: {[key: string]: string};
    normalMappings: {[key: string]: string};
    commandMappings: {[key: string]: string};
    visualMappings: {[key: string]: string};
  };
  settings: CVimSettings;
  commands: {[key: string]: string};
  searchEngines: {[key: string]: string};
  completionEngines: string[];
  parseLines: string[];
  error: string;
  configPath: string;
  localconfig: boolean;
  sitemap: {[key: string]: CVimConfig};
}

interface CVimPort {
  postMessage: (message: any) => void;
  onMessage: {
    addListener: (callback: (message: any) => void) => void;
    removeListener: (callback: (message: any) => void) => void;
  };
}

interface CVimTab {
  id: number;
  url: string;
  title: string;
  index: number;
  pinned: boolean;
  active: boolean;
  windowId: number;
  favIconUrl?: string;
}

interface CVimBookmark {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  index?: number;
  children?: CVimBookmark[];
  dateAdded?: number;
  dateGroupModified?: number;
}

interface CVimHistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
  typedCount: number;
}

interface CVimMessage {
  type: string;
  data?: any;
  id?: string;
  origin?: string;
  request?: string;
  response?: any;
  tab?: CVimTab;
  sender?: chrome.runtime.MessageSender;
}

export {};