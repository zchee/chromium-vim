// Chrome Extension Actions - TypeScript conversion for Manifest v3

interface ActionRequest {
  action: string;
  data?: any;
  repeats?: number;
  url?: string;
  noconvert?: boolean;
  tab?: {
    newWindow?: boolean;
    tabbed?: boolean;
    active?: boolean;
    pinned?: boolean;
    incognito?: boolean;
  };
  urls?: string[];
  focused?: boolean;
  incognito?: boolean;
  nocache?: boolean;
  current?: boolean;
  engineUrl?: string;
  pinned?: boolean;
  active?: boolean;
  id?: number;
  index?: number;
  windowId?: string;
  name?: string;
  sameWindow?: boolean;
  value?: string;
  type?: string;
  text?: string;
  marks?: any;
  sessionId?: string;
  settings?: any;
  reset?: boolean;
  path?: string;
  css?: string;
  search?: string;
  limit?: number;
  code?: string;
  request?: any;
  title?: string;
  config?: string;
  frameId?: number;
  command?: string;
  params?: any;
  isCommandFrame?: boolean;
  isRoot?: boolean;
  complete?: boolean;
}

interface ActionContext {
  request: ActionRequest;
  sender: chrome.runtime.MessageSender;
  callback: (response?: any) => void;
  port?: chrome.runtime.Port;
  url?: string;
}

interface TabOrderContext {
  id: number;
  index: number;
  windowId: number;
  pinned: boolean;
  incognito: boolean;
}

interface SessionData {
  [key: string]: {
    [index: string]: chrome.tabs.Tab;
  };
}

interface CallbackRegistry {
  [id: string]: (response: any) => void;
}

interface ExternalModules {
  Utils: {
    toSearchURL: (url: string, engine?: string) => string;
  };
  Frames: {
    add: (tabId: number, port: chrome.runtime.Port, isCommandFrame: boolean) => void;
    get: (tabId: number) => any;
  };
  History: {
    clear: () => void;
    saveCommandHistory: () => void;
    sendToTabs: () => void;
    append: (value: string, type: string) => void;
    retrieveSearchHistory: (search: string, limit: number, callback: (results: any) => void) => void;
    commandHistory: any[];
  };
  Options: {
    sendSettings: () => void;
    refreshSettings: (callback: () => void) => void;
    saveSettings: (options: any) => void;
  };
  Bookmarks: {
    getFolderLinks: (path: string, callback: (links: any) => void) => void;
    getMarks: (callback: (marks: any) => void) => void;
    getPath: (children: any[], path: string, callback: (result: any) => void) => void;
  };
  Clipboard: {
    copy: (text: string) => void;
    paste: () => string | null;
  };
  Sites: {
    getTop: (callback: (results: any) => void) => void;
  };
  Links: {
    multiOpen: (links: any) => void;
  };
  Sessions: {
    nativeSessions: boolean;
    stepBack: (sender: chrome.runtime.MessageSender) => void;
    recentlyClosed: any[];
  };
  Files: {
    getPath: (path: string, callback: (data: any) => void) => void;
  };
  Popup: {
    getBlacklisted: (callback: () => void) => void;
  };
  Updates: {
    tabId: number | null;
    displayMessage: boolean;
    installMessage: string;
  };
  RCParser: {
    parse: (config: string) => any;
  };
}

// Global variables - these would normally be imported from other modules
declare var Quickmarks: any;
declare var settings: any;
declare var defaultSettings: any;
declare var activePorts: chrome.runtime.Port[];
declare var sessions: SessionData;
declare var ActiveTabs: { [windowId: number]: number[] };
declare var LastUsedTabs: number[];
declare var TabHistory: { [tabId: number]: any };
declare var Utils: ExternalModules['Utils'];
declare var Frames: ExternalModules['Frames'];
declare var History: ExternalModules['History'];
declare var Options: ExternalModules['Options'];
declare var Bookmarks: ExternalModules['Bookmarks'];
declare var Clipboard: ExternalModules['Clipboard'];
declare var Sites: ExternalModules['Sites'];
declare var Links: ExternalModules['Links'];
declare var Sessions: ExternalModules['Sessions'];
declare var Files: ExternalModules['Files'];
declare var Popup: ExternalModules['Popup'];
declare var Updates: ExternalModules['Updates'];
declare var RCParser: ExternalModules['RCParser'];
declare var getTabOrderIndex: (tab: TabOrderContext) => number;
declare var getTab: (tab: chrome.tabs.Tab, reverse: boolean, count: number | boolean, first: boolean, last: boolean) => void;
declare var httpRequest: (options: any) => Promise<string>;
declare var parseConfig: (config: string) => any;
declare var Object: any;

// Initialize Quickmarks at module level
const quickmarks: any = {};

class Actions {
  private static lastCommand: any = null;
  private static lastSearch: string | null = null;
  private static callbacks: CallbackRegistry = {};

  private static openTab(options: chrome.tabs.CreateProperties, times: number = 1): void {
    const doOpen = (): void => {
      for (let i = 0; i < times; i++) {
        chrome.tabs.create(options);
      }
    };

    if (options.active) {
      setTimeout(doOpen, 80);
    } else {
      doOpen();
    }
  }

  static updateLastCommand(context: ActionContext): void {
    Actions.lastCommand = context.request.data;
    if (!Actions.lastCommand) {
      return;
    }
    activePorts.forEach((port) => {
      port.postMessage({
        type: 'updateLastCommand',
        data: context.request.data
      });
    });
  }

  static getRootUrl(context: ActionContext): void {
    if (context.sender.tab?.url) {
      context.callback(context.sender.tab.url);
    }
  }

  static viewSource(context: ActionContext): void {
    if (context.sender.tab?.url) {
      context.url = 'view-source:' + context.sender.tab.url;
      Actions.openLink(context);
    }
  }

  static openLink(context: ActionContext): void {
    if (!context.url) return;

    const request = context.request;
    const repeats = request.repeats || 1;

    if (request.tab?.newWindow) {
      for (let i = 0; i < repeats; i++) {
        chrome.windows.create({
          url: context.url,
          focused: request.tab.active,
          ...(request.tab.incognito && { incognito: true })
        });
      }
    } else if (request.tab?.tabbed) {
      const tabOrderIndex = context.sender.tab?.id ? getTabOrderIndex({
        id: context.sender.tab.id,
        index: context.sender.tab.index,
        windowId: context.sender.tab.windowId,
        pinned: context.sender.tab.pinned,
        incognito: context.sender.tab.incognito
      }) : undefined;
      
      Actions.openTab({
        url: context.url,
        active: request.tab.active,
        pinned: request.tab.pinned,
        index: tabOrderIndex
      }, repeats);
    } else {
      chrome.tabs.update({
        url: context.url,
        pinned: request.tab?.pinned || context.sender.tab?.pinned
      });
    }
  }

  static openLinkTab(context: ActionContext): void {
    if (!context.url) return;

    const openTabWithOptions = (tab: chrome.tabs.Tab): void => {
      if (tab.id !== undefined) {
        Actions.openTab({
          url: context.url!,
          active: context.request.active,
          pinned: context.request.pinned,
          index: getTabOrderIndex({
            id: tab.id,
            index: tab.index,
            windowId: tab.windowId,
            pinned: tab.pinned,
            incognito: tab.incognito
          })
        }, context.request.repeats || 1);
      }
    };

    if (!context.sender.tab) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          openTabWithOptions(tabs[0]);
        }
      });
    } else {
      openTabWithOptions(context.sender.tab);
    }
  }

  static addFrame(context: ActionContext): void {
    if (context.sender.tab?.id && context.port) {
      Frames.add(context.sender.tab.id, context.port, context.request.isCommandFrame || false);
    }
  }

  static portCallback(context: ActionContext): void {
    const id = context.request.id;
    if (id && Actions.callbacks[id]) {
      Actions.callbacks[id](Object.clone(context.request));
      delete Actions.callbacks[id];
    }
  }

  static addCallback(callback: (response: any) => void): number {
    const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    Actions.callbacks[id] = callback;
    return id;
  }

  static focusFrame(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    const frame = Frames.get(context.sender.tab.id);
    if (context.request.isRoot) {
      if (frame) {
        frame.focus(0);
      }
    } else {
      frame?.focusNext();
    }
  }

  static syncSettings(context: ActionContext): void {
    if (context.request.settings.hud === false && settings.hud === true) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'hideHud' });
          }
        });
      });
    }
    
    for (const key in context.request.settings) {
      settings[key] = context.request.settings[key];
    }
    Options.sendSettings();
  }

  static openLinksWindow(context: ActionContext): void {
    let urls = context.request.urls || [];
    if (!context.request.noconvert) {
      urls = urls.map((url: string) => Utils.toSearchURL(url));
    }
    
    for (let i = 0; i < (context.request.repeats || 1); i++) {
      chrome.windows.create({
        url: urls[0],
        focused: context.request.focused,
        ...(context.request.incognito && { incognito: true })
      }, (win) => {
        if (win?.id) {
          for (let j = 1; j < urls.length; j++) {
            chrome.tabs.create({
              url: urls[j],
              windowId: win.id
            });
          }
        }
      });
    }
  }

  static openLinkWindow(context: ActionContext): void {
    if (!context.url) return;

    for (let i = 0; i < (context.request.repeats || 1); i++) {
      chrome.windows.create({
        url: context.url,
        focused: context.request.focused,
        ...(context.request.incognito && { incognito: true })
      });
    }
  }

  static closeTab(context: ActionContext): void {
    if (!context.sender.tab) return;

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const sortedIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
      let base = context.sender.tab!.index;
      const repeats = context.request.repeats || 1;

      if (repeats > sortedIds.length - base) {
        base -= repeats - (sortedIds.length - base);
      }
      if (base < 0) {
        base = 0;
      }
      chrome.tabs.remove(sortedIds.slice(base, base + repeats));
    });
  }

  private static closeTabHelper(context: ActionContext, n: number): void {
    if (!context.sender.tab) return;

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
      const startIndex = context.sender.tab!.index + (n < 0 ? n : 1);
      const endIndex = context.sender.tab!.index + (n < 0 ? 0 : 1 + n);
      chrome.tabs.remove(tabIds.slice(startIndex, endIndex));
    });
  }

  static closeTabLeft(context: ActionContext): void {
    Actions.closeTabHelper(context, -(context.request.repeats || 1));
  }

  static closeTabRight(context: ActionContext): void {
    Actions.closeTabHelper(context, context.request.repeats || 1);
  }

  static closeTabsToLeft(context: ActionContext): void {
    if (!context.sender.tab) return;
    Actions.closeTabHelper(context, -context.sender.tab.index);
  }

  static closeTabsToRight(context: ActionContext): void {
    if (!context.sender.tab) return;
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      Actions.closeTabHelper(context, tabs.length - context.sender.tab!.index);
    });
  }

  static getWindows(context: ActionContext): boolean {
    const result: { [windowId: number]: string[] } = {};
    
    chrome.windows.getAll((windows) => {
      const windowIds = windows
        .filter((window) => window.type === 'normal' && window.id !== context.sender.tab?.windowId)
        .map((window) => {
          if (window.id) {
            result[window.id] = [];
          }
          return window.id;
        })
        .filter((id): id is number => id !== undefined);

      chrome.tabs.query({}, (tabs) => {
        const filteredTabs = tabs.filter((tab) => windowIds.includes(tab.windowId));
        
        filteredTabs.forEach((tab) => {
          if (result[tab.windowId] && tab.title) {
            result[tab.windowId]!.push(tab.title);
          }
        });
        
        context.callback(result);
      });
    });
    
    return true;
  }

  static moveTab(context: ActionContext): void {
    if (!context.sender.tab || !context.request.windowId) return;
    
    if (parseInt(context.request.windowId) === context.sender.tab.windowId) {
      return;
    }

    chrome.windows.getAll((windows) => {
      const windowIds = windows
        .filter((window) => window.type === 'normal')
        .map((window) => window.id)
        .filter((id): id is number => id !== undefined);

      const repin = (): void => {
        if (!context.sender.tab?.id) return;
        
        chrome.tabs.update(context.sender.tab.id, {
          pinned: context.sender.tab.pinned,
          active: true
        }, (tab) => {
          if (tab?.windowId) {
            chrome.windows.update(tab.windowId, {
              focused: true
            });
          }
        });
      };

      const targetWindowId = parseInt(context.request.windowId!);
      if (windowIds.includes(targetWindowId) && context.sender.tab!.id) {
        chrome.tabs.move(context.sender.tab!.id, {
          windowId: targetWindowId,
          index: -1
        }, repin);
      } else {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          if (tabs.length > 1 && context.sender.tab!.id) {
            chrome.windows.create({
              tabId: context.sender.tab!.id,
              incognito: context.sender.tab!.incognito,
              focused: true
            }, repin);
          }
        });
      }
    });
  }

  static closeWindow(context: ActionContext): void {
    if (context.sender.tab?.windowId) {
      chrome.windows.remove(context.sender.tab.windowId);
    }
  }

  static openLastLinkInTab(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    
    const hist = TabHistory[context.sender.tab.id];
    if (!hist) return;

    const repeats = context.request.repeats || 1;
    const link = hist.links[hist.state - repeats];
    if (link) {
      Actions.openTab({ url: link }, 1);
    }
  }

  static openNextLinkInTab(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    
    const hist = TabHistory[context.sender.tab.id];
    if (!hist) return;

    const repeats = context.request.repeats || 1;
    const link = hist.links[hist.state + repeats];
    if (link) {
      Actions.openTab({ url: link }, 1);
    }
  }

  static getHistoryStates(context: ActionContext): void {
    if (!context.sender.tab?.id) {
      return context.callback({ links: [] });
    }
    
    const hist = TabHistory[context.sender.tab.id];
    context.callback(hist || { links: [] });
  }

  static reloadTab(context: ActionContext): void {
    chrome.tabs.reload({
      bypassCache: context.request.nocache
    });
  }

  static reloadAllTabs(context: ActionContext): void {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        const shouldReload = !/^chrome:\/\//.test(tab.url || '') && 
          !(context.request.current === false && 
            tab.id === context.sender.tab?.id && 
            tab.windowId === context.sender.tab?.windowId);
        
        if (shouldReload && tab.id) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  }

  static nextTab(context: ActionContext): void {
    if (context.sender.tab) {
      getTab(context.sender.tab, false, context.request.repeats || 1, false, false);
    }
  }

  static previousTab(context: ActionContext): void {
    if (context.sender.tab) {
      getTab(context.sender.tab, true, context.request.repeats || 1, false, false);
    }
  }

  static firstTab(context: ActionContext): void {
    if (context.sender.tab) {
      getTab(context.sender.tab, false, false, true, false);
    }
  }

  static lastTab(context: ActionContext): void {
    if (context.sender.tab) {
      getTab(context.sender.tab, false, false, false, true);
    }
  }

  static clearHistory(): void {
    History.clear();
    History.saveCommandHistory();
    History.sendToTabs();
  }

  static appendHistory(context: ActionContext): void {
    if (context.sender.tab?.incognito === false && context.request.value && context.request.type) {
      History.append(context.request.value, context.request.type);
      History.sendToTabs();
    }
  }

  static pinTab(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    
    const pinned = context.request.pinned !== undefined ? 
      context.request.pinned : 
      !context.sender.tab.pinned;
    
    chrome.tabs.update(context.sender.tab.id, { pinned });
  }

  static copy(context: ActionContext): void {
    if (context.request.text) {
      Clipboard.copy(context.request.text);
    }
  }

  static goToTab(context: ActionContext): void {
    const { id, index } = context.request;
    
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (id) {
        chrome.tabs.get(id, (tabInfo) => {
          chrome.windows.update(tabInfo.windowId, { focused: true }, () => {
            chrome.tabs.update(id, { active: true, highlighted: true });
          });
        });
      } else if (index !== undefined) {
        const targetTab = index < tabs.length ? tabs[index] : tabs[tabs.length - 1];
        if (targetTab?.id) {
          chrome.tabs.update(targetTab.id, { active: true });
        }
      }
    });
  }

  private static moveTabHelper(context: ActionContext, offset: number): void {
    if (!context.sender.tab?.id) return;

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const pinnedTabs = tabs.filter((tab) => tab.pinned);
      const newIndex = Math.min(
        context.sender.tab!.pinned ? pinnedTabs.length - 1 : pinnedTabs.length + tabs.length - 1,
        Math.max(
          context.sender.tab!.pinned ? 0 : pinnedTabs.length,
          (context.sender.tab!.index || 0) + offset
        )
      );
      
      if (context.sender.tab!.id) {
        chrome.tabs.move(context.sender.tab!.id, { index: newIndex });
      }
    });
  }

  static moveTabRight(context: ActionContext): void {
    Actions.moveTabHelper(context, context.request.repeats || 1);
  }

  static moveTabLeft(context: ActionContext): void {
    Actions.moveTabHelper(context, -(context.request.repeats || 1));
  }

  static openPasteTab(context: ActionContext): void {
    const paste = Clipboard.paste();
    if (!paste) return;

    const urls = paste.split('\n').filter((line) => line.trim());
    const repeats = context.request.repeats || 1;

    for (let i = 0; i < repeats; i++) {
      urls.forEach((url) => {
        const tabOrderIndex = context.sender.tab?.id ? getTabOrderIndex({
          id: context.sender.tab.id,
          index: context.sender.tab.index,
          windowId: context.sender.tab.windowId,
          pinned: context.sender.tab.pinned,
          incognito: context.sender.tab.incognito
        }) : undefined;
        
        if (url) {
          Actions.openTab({
            url: Utils.toSearchURL(url, context.request.engineUrl),
            index: tabOrderIndex
          }, 1);
        }
      });
    }
  }

  static openPaste(context: ActionContext): void {
    const paste = Clipboard.paste();
    if (!paste) return;

    const url = paste.split('\n')[0];
    if (url) {
      chrome.tabs.update({
        url: Utils.toSearchURL(url, context.request.engineUrl)
      });
    }
  }

  static getPaste(context: ActionContext): void {
    context.callback(Clipboard.paste());
  }

  static createSession(context: ActionContext): boolean {
    const sessionName = context.request.name;
    if (!sessionName) return false;

    sessions[sessionName] = {};
    
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.index !== undefined && sessions[sessionName]) {
          sessions[sessionName][tab.index] = tab;
        }
      });
      
      chrome.storage.local.set({ sessions }, () => {
        const sessionList = Object.keys(sessions).map((name: string) => {
          const tabCount = Object.keys(sessions[name]).length;
          return [name, `${tabCount} tab${tabCount === 1 ? '' : 's'}`];
        });
        context.callback(sessionList);
      });
    });
    
    return true;
  }

  static openBookmarkFolder(context: ActionContext): void {
    if (context.request.path) {
      Bookmarks.getFolderLinks(context.request.path, Links.multiOpen);
    }
  }

  static deleteSession(context: ActionContext): void {
    const sessionName = context.request.name;
    if (sessionName) {
      delete sessions[sessionName];
      chrome.storage.local.set({ sessions });
    }
  }

  static lastActiveTab(context: ActionContext): void {
    if (!context.sender.tab?.windowId) return;
    
    const activeTab = ActiveTabs[context.sender.tab.windowId];
    if (activeTab?.length) {
      chrome.tabs.update(activeTab.shift()!, { active: true });
    }
  }

  static openSession(context: ActionContext): void {
    const sessionName = context.request.name;
    if (!sessionName || !sessions[sessionName]) return;

    const tabs = Object.keys(sessions[sessionName] || {})
      .sort()
      .map((index: string) => sessions[sessionName]?.[index])
      .filter((tab: any) => tab !== undefined);

    if (!context.request.sameWindow) {
      chrome.windows.create({ url: 'chrome://newtab' }, (windowInfo) => {
        if (tabs[0] && windowInfo?.tabs?.[0]) {
          chrome.tabs.update(windowInfo.tabs[0].id!, {
            url: tabs[0].url,
            pinned: tabs[0].pinned
          });
          
          tabs.slice(1).forEach((tab: any) => {
            if (windowInfo?.tabs?.[0]?.windowId) {
              Actions.openTab({
                url: tab.url,
                pinned: tab.pinned,
                windowId: windowInfo.tabs[0].windowId,
                index: tab.index
              }, 1);
            }
          });
        }
      });
    } else {
      chrome.tabs.query({ currentWindow: true }, (currentTabs) => {
        const windowLength = currentTabs.length;
        tabs.forEach((tab: any) => {
          Actions.openTab({
            url: tab.url,
            pinned: tab.pinned,
            active: false,
            index: windowLength + tab.index
          }, 1);
        });
      });
    }
  }

  static openLast(context: ActionContext): void {
    if (context.sender.tab?.incognito) return;

    const stepBackFn = Sessions.nativeSessions ?
      chrome.sessions.restore.bind(chrome.sessions) :
      Sessions.stepBack.bind(Sessions, context.sender);

    const repeats = context.request.repeats || 1;
    for (let i = 0; i < repeats; i++) {
      stepBackFn();
    }
  }

  static isNewInstall(context: ActionContext): void {
    if (context.sender.tab?.id === Updates.tabId && Updates.displayMessage) {
      Updates.displayMessage = false;
      Updates.tabId = null;
      context.callback(Updates.installMessage);
    }
  }

  static cancelAllWebRequests(): void {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'cancelAllWebRequests' });
        }
      });
    });
  }

  static hideDownloadsShelf(): void {
    chrome.downloads.setShelfEnabled(false);
    chrome.downloads.setShelfEnabled(true);
  }

  static updateMarks(context: ActionContext): void {
    Object.assign(quickmarks, context.request.marks);
    
    if (!context.sender.tab?.id) return;
    
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id !== context.sender.tab!.id && tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateMarks',
            marks: context.request.marks
          });
        }
      });
    });
  }

  static getChromeSessions(context: ActionContext): void {
    context.callback(Sessions.recentlyClosed);
  }

  static restoreChromeSession(context: ActionContext): void {
    const sessionIds = Sessions.recentlyClosed.map((session) => session.id);
    if (sessionIds.includes(context.request.sessionId)) {
      chrome.sessions.restore(context.request.sessionId);
    }
  }

  private static zoom(context: ActionContext, scale: number | null, override?: number, repeats: number = 1): void {
    if (!chrome.tabs.getZoom || !context.sender.tab?.id) {
      context.callback(false);
      return;
    }

    chrome.tabs.getZoom(context.sender.tab.id, (zoomFactor) => {
      chrome.tabs.setZoomSettings(context.sender.tab!.id!, {
        scope: 'per-tab'
      }, () => {
        const newZoom = override !== undefined ? override : zoomFactor + (scale || 0) * repeats;
        chrome.tabs.setZoom(context.sender.tab!.id!, newZoom);
      });
    });
  }

  static zoomIn(context: ActionContext): void {
    Actions.zoom(context, settings.zoomfactor, undefined, context.request.repeats || 1);
  }

  static zoomOut(context: ActionContext): void {
    Actions.zoom(context, -settings.zoomfactor, undefined, context.request.repeats || 1);
  }

  static zoomOrig(context: ActionContext): void {
    Actions.zoom(context, null, 1.0, 1);
  }

  static duplicateTab(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    
    const repeats = context.request.repeats || 1;
    for (let i = 0; i < repeats; i++) {
      chrome.tabs.duplicate(context.sender.tab.id);
    }
  }

  static lastUsedTab(): void {
    if (LastUsedTabs.length === 2) {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (LastUsedTabs[0] === tab.id && tab.id) {
            chrome.tabs.update(tab.id, { active: true });
            break;
          }
        }
      });
    }
  }

  static runScript(context: ActionContext): void {
    if (!context.sender.tab?.id || !context.request.code) return;

    // Use chrome.scripting.executeScript for Manifest v3
    chrome.scripting.executeScript({
      target: { tabId: context.sender.tab.id },
      func: new Function(context.request.code) as (...args: any[]) => unknown,
    }, () => {
      // Callback for script execution - no return value needed
    });
  }

  static sendLastSearch(): void {
    if (!Actions.lastSearch) return;

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateLastSearch',
            value: Actions.lastSearch
          });
        }
      });
    });
  }

  static updateLastSearch(context: ActionContext): void {
    if (!context.request.value) return;
    
    Actions.lastSearch = context.request.value;
    Actions.sendLastSearch();
  }

  static injectCSS(context: ActionContext): void {
    if (!context.sender.tab?.id || !context.request.css) return;

    // Use chrome.scripting.insertCSS for Manifest v3
    chrome.scripting.insertCSS({
      target: { tabId: context.sender.tab.id },
      css: context.request.css
    }, () => {
      // Callback for CSS injection - no return value needed
    });
  }

  static getBookmarks(context: ActionContext): void {
    Bookmarks.getMarks((marks) => {
      context.callback({ type: 'bookmarks', bookmarks: marks });
    });
  }

  static searchHistory(context: ActionContext): void {
    if (context.request.search) {
      History.retrieveSearchHistory(
        context.request.search,
        context.request.limit || 4,
        (results) => {
          context.callback({ type: 'history', history: results });
        }
      );
    }
  }

  static getTopSites(context: ActionContext): void {
    Sites.getTop((results) => {
      context.callback({ type: 'topsites', sites: results });
    });
  }

  static getQuickMarks(context: ActionContext): void {
    context.callback({ type: 'quickMarks', marks: quickmarks });
  }

  static getBuffers(context: ActionContext): void {
    chrome.tabs.query({}, (tabs) => {
      const otherWindows: chrome.tabs.Tab[] = [];
      const currentWindowTabs = tabs.filter((tab) => {
        if (tab.windowId === context.sender.tab?.windowId) {
          return true;
        }
        otherWindows.push(tab);
        return false;
      });

      const allTabs = currentWindowTabs.concat(otherWindows);
      const buffers = allTabs.map((tab, index) => {
        let title = tab.title || '';
        if (settings.showtabindices) {
          title = title.replace(new RegExp(`^${(tab.index || 0) + 1} `), '');
        }
        return [`${index + 1}: ${title}`, tab.url, tab.id];
      });

      context.callback({
        type: 'buffers',
        buffers
      });
    });
  }

  static getSessionNames(context: ActionContext): void {
    const sessionList = Object.keys(sessions).map((name: string) => {
      const tabCount = Object.keys(sessions[name]).length;
      return [name, `${tabCount} tab${tabCount === 1 ? '' : 's'}`];
    });
    
    context.callback({
      type: 'sessions',
      sessions: sessionList
    });
  }

  static retrieveAllHistory(context: ActionContext): void {
    context.callback({
      type: 'commandHistory',
      history: History.commandHistory
    });
  }

  static getBookmarkPath(context: ActionContext): void {
    chrome.bookmarks.getTree((bookmarks) => {
      if (bookmarks[0]?.children && context.request.path) {
        Bookmarks.getPath(bookmarks[0].children, context.request.path, (path) => {
          context.callback({ type: 'bookmarkPath', path });
        });
      }
    });
  }

  static getLastCommand(context: ActionContext): void {
    if (Actions.lastCommand) {
      context.callback({
        type: 'updateLastCommand',
        data: Actions.lastCommand
      });
    }
  }

  static getSettings(context: ActionContext): void {
    Options.refreshSettings(() => {
      context.callback({
        type: 'sendSettings',
        settings: context.request.reset ? defaultSettings : settings
      });
    });
  }

  static setIconEnabled(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    // Use chrome.action for Manifest v3
    chrome.action.setIcon({
      path: 'icons/38.png',
      tabId: context.sender.tab.id
    }, () => {
      return chrome.runtime.lastError;
    });
  }

  static getFilePath(context: ActionContext): boolean {
    if (context.request.path) {
      Files.getPath(context.request.path, (data) => {
        context.callback(data);
      });
    }
    return true;
  }

  static getBlacklisted(context: ActionContext): void {
    Popup.getBlacklisted(() => {
      context.callback(true);
    });
  }

  static editWithVim(context: ActionContext): void {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `http://127.0.0.1:${settings.vimport}`);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        context.callback({
          type: 'editWithVim',
          text: xhr.responseText
        });
      }
    };
    xhr.send(JSON.stringify({
      data: context.request.text || ''
    }));
  }

  static httpRequest(context: ActionContext): void {
    httpRequest(context.request.request).then((response) => {
      context.callback({
        type: 'httpRequest',
        id: context.request.id,
        text: response
      });
    });
  }

  static createBookmark(context: ActionContext): void {
    const { url, title } = context.request;
    if (!url || !title) return;

    chrome.bookmarks.search({ url: url! }, (results) => {
      if (!results.length) {
        chrome.bookmarks.create({ url: url!, title: title! });
      } else if (results[0]?.parentId === '2' && results[0]?.id) {
        chrome.bookmarks.remove(results[0].id);
      }
    });
  }

  static quitChrome(): void {
    chrome.windows.getAll({ populate: false }, (windows) => {
      windows.forEach((window) => {
        if (window.id) {
          chrome.windows.remove(window.id);
        }
      });
    });
  }

  static parseRC(context: ActionContext): void {
    if (context.request.config) {
      context.callback({
        type: 'parseRC',
        config: RCParser.parse(context.request.config)
      });
    }
  }

  static showCommandFrame(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    const frame = Frames.get(context.sender.tab.id);
    if (frame) {
      frame.focusedId = context.request.frameId;
    }
    
    chrome.tabs.sendMessage(context.sender.tab.id, {
      action: context.request.action,
      search: context.request.search,
      value: context.request.value,
      complete: context.request.complete
    });
  }

  static markActiveFrame(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    const frame = Frames.get(context.sender.tab.id);
    if (frame) {
      frame.focusedId = context.request.frameId;
    }
  }

  static hideCommandFrame(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    chrome.tabs.sendMessage(context.sender.tab.id, {
      action: context.request.action
    }, () => {
      if (context.sender.tab?.id) {
        const frame = Frames.get(context.sender.tab.id);
        if (frame) {
          frame.focus(frame.focusedId, true);
        }
      }
    });
  }

  static callFind(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    chrome.tabs.sendMessage(context.sender.tab.id, {
      action: context.request.action,
      command: context.request.command,
      params: context.request.params
    });
  }

  static setFindIndex(context: ActionContext): void {
    if (!context.sender.tab?.id) return;

    chrome.tabs.sendMessage(context.sender.tab.id, {
      action: context.request.action,
      index: context.request.index
    });
  }

  static yankWindowUrls(context: ActionContext): void {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const urls = tabs.map((tab) => tab.url || '').join('\n');
      Clipboard.copy(urls);
      context.callback(tabs.length);
    });
  }

  static doIncSearch(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    chrome.tabs.sendMessage(context.sender.tab.id, context.request);
  }

  static cancelIncSearch(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    chrome.tabs.sendMessage(context.sender.tab.id, context.request);
  }

  static echoRequest(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    chrome.tabs.sendMessage(context.sender.tab.id, context.request);
  }

  static loadLocalConfig(context: ActionContext): boolean {
    const path = context.request.path || 
      `file://${settings.configpath.split('~').join(settings.homedirectory || '~')}`;
    
    httpRequest({ url: path }).then((data) => {
      const parsed = parseConfig(data);
      
      if (parsed.error) {
        console.error('parse error on line %d of cVimrc: %s',
          parsed.error.lineno, parsed.error.message);
        context.callback({
          code: -2,
          error: parsed.error,
          config: settings
        });
        return;
      }
      
      const added = parsed.value;
      added.localconfig = added.localconfig || false;
      const oldSettings = Object.clone(settings);
      const settingsClone = Object.clone(defaultSettings);
      added.localconfig = oldSettings.localconfig;
      Object.merge(settingsClone, added);
      
      if (oldSettings.localconfig) {
        Options.saveSettings({
          settings: Object.clone(settingsClone),
          sendSettings: false
        });
        Object.merge(settings, oldSettings);
        Object.merge(settings, added);
        Options.sendSettings();
      } else {
        Object.merge(settings, added);
        settings.RC = oldSettings.RC;
        Options.sendSettings();
      }
      
      context.callback({
        code: 0,
        error: null,
        config: settings
      });
    }, () => {
      context.callback({
        code: -1,
        error: null,
        config: settings
      });
    });
    
    return true;
  }

  static muteTab(context: ActionContext): void {
    if (!context.sender.tab?.id) return;
    
    chrome.tabs.update(context.sender.tab.id, {
      muted: !context.sender.tab.mutedInfo?.muted
    });
  }

  static handleAction(
    request: ActionRequest,
    sender: chrome.runtime.MessageSender,
    callback: (response?: any) => void,
    port?: chrome.runtime.Port
  ): boolean | void {
    const action = request.action;
    const actionMethod = (Actions as any)[action];
    
    if (!actionMethod || typeof actionMethod !== 'function') {
      return;
    }

    const context: ActionContext = {
      request,
      sender,
      callback,
      port
    };

    context.request.repeats = Math.max(~~(context.request.repeats || 0), 1);

    if (context.request.url && !context.request.noconvert) {
      context.url = Utils.toSearchURL(context.request.url);
    } else if (context.request.url) {
      context.url = context.request.url;
    } else {
      context.url = settings.defaultnewtabpage ?
        'chrome://newtab' : '../pages/blank.html';
    }

    if (!context.sender.tab && action !== 'openLinkTab') {
      return;
    }

    return actionMethod(context);
  }
}

// Export for global usage
if (typeof window !== 'undefined') {
  (window as any).Actions = Actions;
}

export default Actions;