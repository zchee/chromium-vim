// Service Worker for Chrome Extension Manifest v3
// Consolidates functionality from background_scripts/

// Import utility functions (these will be inline for now)
// We'll need to migrate from individual script files to ES modules or inline everything

// Global variables - replacing window globals with service worker context
var sessions = {},
    ActiveTabs = {},
    TabHistory = {},
    activePorts = [],
    LastUsedTabs = [],
    Quickmarks = {},
    storageMethod = 'local',
    settings = {},
    Options = {},
    History = {},
    Bookmarks = {},
    Clipboard = {},
    Sessions = {},
    Popup = {},
    Sites = {},
    Files = {},
    Frames = {},
    Links = {},
    Updates = {},
    Utils = {},
    RCParser = {};

// HTTP Request using fetch API instead of XMLHttpRequest
async function httpRequest(request) {
  return fetch(request.url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return request.json ? response.json() : response.text();
    });
}

// Service worker event listeners
chrome.runtime.onStartup.addListener(() => {
  console.log('cVim service worker started');
  initializeExtension();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('cVim service worker installed');
  initializeExtension();
});

function initializeExtension() {
  // Initialize storage and settings
  chrome.storage.local.get('sessions', function(e) {
    if (e.sessions === void 0) {
      chrome.storage.local.set({ sessions: {} });
    } else {
      sessions = e.sessions;
    }
  });

  // Initialize options and settings
  initializeOptions();
  initializeHistory();
  
  // Register event listeners
  registerEventListeners();
}

// Main functionality from main.js
function updateTabIndices() {
  if (settings.showtabindices) {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'displayTabIndices',
          index: tab.index + 1
        });
      });
    });
  }
}

function getTab(tab, reverse, count, first, last) {
  chrome.tabs.query({windowId: tab.windowId}, function(tabs) {
    if (first) {
      return chrome.tabs.update(tabs[0].id, {active: true});
    } else if (last) {
      return chrome.tabs.update(tabs[tabs.length - 1].id, {active: true});
    } else {
      var index = (reverse ? -1 : 1) * count + tab.index;
      if (count !== -1 && count !== 1)
        index = Math.min(Math.max(0, index), tabs.length - 1);
      else
        index = Utils.trueModulo(index, tabs.length);
      return chrome.tabs.update(tabs[index].id, {active: true});
    }
  });
}

// Event Listeners (migrated from main.js)
var Listeners = {
  tabs: {
    onUpdated: function(id, changeInfo) {
      updateTabIndices();
      if (changeInfo.hasOwnProperty('url')) {
        History.shouldRefresh = true;
        if (TabHistory.hasOwnProperty(id)) {
          if (TabHistory[id].links.indexOf(changeInfo.url) === -1) {
            if (TabHistory.state !== void 0 && TabHistory[id].state + 1 !==
                TabHistory[id].length) {
              TabHistory[id].links.splice(TabHistory[id].state);
            }
            TabHistory[id].links.push(changeInfo.url);
            TabHistory[id].state = TabHistory[id].state + 1;
          } else {
            TabHistory[id].state = TabHistory[id].links.indexOf(changeInfo.url);
          }
        } else {
          TabHistory[id] = {};
          TabHistory[id].links = [changeInfo.url];
          TabHistory[id].state = 0;
        }
      }
    },
    onActivated: function(tab) {
      LastUsedTabs.push(tab.tabId);
      if (LastUsedTabs.length > 2) {
        LastUsedTabs.shift();
      }
      if (ActiveTabs[tab.windowId] === void 0) {
        ActiveTabs[tab.windowId] = [];
      }
      ActiveTabs[tab.windowId].push(tab.tabId);
      if (ActiveTabs[tab.windowId].length > 2) {
        ActiveTabs[tab.windowId].shift();
      }
    },
    onRemoved: function(id, removeInfo) {
      updateTabIndices();
      if (ActiveTabs[removeInfo.windowId] !== void 0) {
        ActiveTabs[removeInfo.windowId] = ActiveTabs[removeInfo.windowId]
          .filter(function(e) {
            return e !== id;
          });
      }
      if (TabHistory[id] !== void 0) {
        delete TabHistory[id];
      }
      Frames.remove(id);
    },
    onCreated: updateTabIndices,
    onMoved: updateTabIndices,
  },

  windows: {
    onRemoved: function(windowId) { delete ActiveTabs[windowId]; }
  },

  runtime: { 
    onMessage: Actions,
    onConnect: function(port) {
      if (activePorts.indexOf(port) !== -1)
        return;
      var frameId = port.sender.frameId;
      port.postMessage({type: 'hello'});
      port.postMessage({type: 'addFrame', frameId: frameId});
      activePorts.push(port);
      port.onMessage.addListener(function(request) {
        return Actions(request, port.sender, port.postMessage.bind(port), port);
      });
      port.onDisconnect.addListener(function() {
        Frames.removeFrame(frameId);

        for (var i = 0; i < activePorts.length; i++) {
          if (activePorts[i] === port) {
            activePorts.splice(i, 1);
            break;
          }
        }
      });
    }
  },

  commands: {
    onCommand: function(command) {
      switch (command) {
      case 'togglecVim':
        Popup.toggleEnabled({});
        break;
      case 'toggleBlacklisted':
        Popup.toggleBlacklisted();
        Popup.toggleEnabled({
          request: {
            singleTab: true
          }
        });
        break;
      case 'nextTab':
      case 'previousTab':
        chrome.tabs.query({active: true, currentWindow: true}, function(e) {
          return getTab(e[0], false, (command === 'nextTab' ? 1 : -1),
                        false, false);
        });
        break;
      case 'viewSource':
        chrome.tabs.query({active: true, currentWindow: true}, function(e) {
          chrome.tabs.create({url: 'view-source:' + e[0].url, index: e[0].index + 1});
        });
        break;
      case 'nextCompletionResult':
        chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
          chrome.tabs.sendMessage(tab[0].id, {
            action: 'nextCompletionResult'
          }, function() {
            chrome.windows.create({url: 'chrome://newtab'});
          });
        });
        break;
      case 'deleteBackWord':
        chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
          chrome.tabs.sendMessage(tab[0].id, {action: 'deleteBackWord'});
        });
        break;
      case 'closeTab':
        chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
          chrome.tabs.remove(tab[0].id, function() {
            return chrome.runtime.lastError;
          });
        });
        break;
      case 'reloadTab':
        chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
          chrome.tabs.reload(tab[0].id);
        });
        break;
      case 'newTab':
        chrome.tabs.create({url: chrome.runtime.getURL('pages/blank.html')});
        break;
      case 'restartcVim':
        chrome.runtime.reload();
        break;
      default:
        break;
      }
    }
  }
};

// Register all event listeners
function registerEventListeners() {
  for (var api in Listeners) {
    for (var method in Listeners[api]) {
      chrome[api][method].addListener(Listeners[api][method]);
    }
  }
}

// Popup functionality (migrated from popup.js with chrome.action API)
Popup = {
  active: true,

  getBlacklisted: function(callback) {
    if (typeof callback === 'object')
      callback = callback.callback;
    var blacklists = Utils.compressArray(settings.blacklists);
    this.getActiveTab(function(tab) {
      var url = tab.url;
      for (var i = 0, l = blacklists.length; i < l; ++i) {
        if (matchLocation(url, blacklists[i])) {
          callback(true);
        }
      }
    });
  },

  getActiveTab: function(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
      callback(tab[0]);
    });
  },

  setIconDisabled: function() {
    this.getActiveTab(function(tab) {
      chrome.action.setIcon({
        path: 'icons/disabled.png',
        tabId: tab.id
      }, function() {
        return chrome.runtime.lastError;
      });
    });
  },

  setIconEnabled: function(obj) {
    if (obj.sender) {
      return chrome.action.setIcon({
        path: 'icons/38.png',
        tabId: obj.sender.tab.id
      }, function() {
        return chrome.runtime.lastError;
      });
    }
    this.getActiveTab(function(tab) {
      chrome.action.setIcon({
        path: 'icons/38.png',
        tabId: tab.id
      }, function() {
        return chrome.runtime.lastError;
      });
    });
  },

  getActiveState: function(obj) {
    obj.callback(this.active);
  },

  toggleEnabled: function(obj) {
    var request = obj.request;
    if (request && request.singleTab) {
      this.getActiveTab(function(tab) {
        chrome.tabs.sendMessage(tab.id, {action: 'toggleEnabled'});
      });
      if (request.blacklisted) {
        return this.setIconDisabled({});
      }
      return this.setIconEnabled({});
    }
    chrome.tabs.query({}, function(tabs) {
      this.active = !this.active;
      if (!request || (request && !request.blacklisted)) {
        tabs.map(function(tab) { return tab.id; }).forEach(function(id) {
          chrome.tabs.sendMessage(id, {action: 'toggleEnabled'});
          if (this.active) {
            chrome.action.setIcon({path: 'icons/38.png', tabId: id});
          } else {
            chrome.action.setIcon({path: 'icons/disabled.png', tabId: id});
          }
        }.bind(this));
      }
    }.bind(this));
  },

  toggleBlacklisted: function() {
    var blacklists = Utils.compressArray(settings.blacklists);
    this.getActiveTab(function(tab) {
      var url = tab.url;
      var foundMatch = false;
      for (var i = 0, l = blacklists.length; i < l; ++i) {
        if (matchLocation(url, blacklists[i])) {
          blacklists.splice(i, 1);
          foundMatch = true;
        }
      }
      if (!foundMatch) {
        url = new URL(url);
        blacklists.push(url.protocol + '//' + url.hostname + '/*');
      }
      settings.blacklists = blacklists;
      Options.saveSettings({settings: settings});
      Options.updateBlacklistsMappings();
    });
  }
};

// Clipboard functionality (migrated from clipboard.js for service worker)
Clipboard = {
  copy: function(text) {
    // In service worker, we need to use chrome.offscreen or alternative
    // For now, we'll use a workaround by delegating to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'copyToClipboard',
          text: text
        });
      }
    });
  },

  paste: function() {
    // Service worker can't directly access clipboard, need to delegate
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'getClipboard'
          }, function(response) {
            resolve(response || '');
          });
        } else {
          resolve('');
        }
      });
    });
  }
};

// Sites functionality (migrated from sites.js)
Sites = {
  getTop: function(callback) {
    chrome.topSites.get(function(e) {
      callback(e.map(function(e) {
        return [e.title, e.url];
      }));
    });
  }
};

// Bookmarks functionality (migrated from bookmarks.js)
Bookmarks = {
  getMarks: function(callback) {
    chrome.bookmarks.getTree(function(tree) {
      callback(tree[0].children);
    });
  },

  containsFolder: function(path, directory) {
    directory = directory.children;
    for (var i = 0, l = directory.length; i < l; ++i) {
      if (path === directory[i].title) {
        return directory[i];
      }
    }
  },

  getFolderLinks: function(path, callback) {
    path = Utils.compressArray(path.split('/'));
    chrome.bookmarks.getTree(function(tree) {
      var dir = tree[0];
      while (dir = Bookmarks.containsFolder(path[0], dir)) {
        path = path.slice(1);
        if (!path || !path.length) {
          var links = dir.children.map(function(e) { return e.url; });
          callback(Utils.compressArray(links));
        }
      }
    });
  },

  getPath: function(marks, path, callback, initialPath) {
    var result = [],
        folder = null,
        matchFound = false;
    if (!initialPath) {
      initialPath = path.replace(/\/[^\/]+$/, '/').replace(/\/+/g, '/');
    }
    if (typeof path !== 'string' || path[0] !== '/') {
      return false;
    }
    path = Utils.compressArray(path.split(/\//));
    marks.forEach(function(item) {
      if (item.title === path[0]) {
        folder = item;
      }
      if (path[0] && item.title.slice(0, path[0].length).toLowerCase() === path[0].toLowerCase()) {
        result.push([item.title, (item.url || 'folder'), initialPath]);
      }
      if (path.length === 0) {
        if (!matchFound) {
          result = [];
        }
        matchFound = true;
        result.push([item.title, (item.url || 'folder'), initialPath]);
      }
    });
    if (path.length === 0 || !folder) {
      return callback(result);
    }
    this.getPath(folder.children, '/' + path.slice(1).join('/'), callback, initialPath);
  }
};

// Frames functionality (migrated from frames.js)
function TabFrames(tabId) {
  this.tabId = tabId;
  this.frames = {};
  this.focusedId = 0;
}
TabFrames.prototype = {
  addFrame: function(port, isCommandFrame) {
    this.frames[port.sender.frameId] = port;
    this.port = port;
    if (isCommandFrame)
      this.commandFrameId = port.sender.frameId;
  },

  removeFrame: function(frameId) {
    delete this.frames[frameId];
  },

  focus: function(frameId, disableAnimation) {
    if (!this.frames.hasOwnProperty(frameId))
      return;
    this.focusedId = frameId;
    this.frames[frameId].postMessage({
      type: 'focusFrame',
      disableAnimation: !!disableAnimation,
    });
  },

  focusNext: function() {
    if (this.frames.length <= 0)
      return;
    var ids = Object.getOwnPropertyNames(this.frames)
      .sort((a, b) => a - b);
    var curIdx = Math.max(0, ids.indexOf(this.focusedId));
    var id = ids[(curIdx + 1) % ids.length];
    if (id === this.commandFrameId)
      id = ids[(curIdx + 2) % ids.length];
    this.focus(id, false);
  },
};

Frames = {
  tabFrames: {},

  add: function(tabId, port, isCommandFrame) {
    this.tabFrames[tabId] = this.tabFrames[tabId] || new TabFrames(tabId);
    this.tabFrames[tabId].addFrame(port, isCommandFrame);
  },

  remove: function(tabId) {
    delete this.tabFrames[tabId];
  },

  removeFrame: function(tabId, frameId) {
    var frame = this.get(tabId);
    if (!frame)
      return false;
    if (frameId === 0)
      return this.remove(tabId);
    frame.removeFrame(frameId);
    return true;
  },

  get: function(tabId) {
    return this.tabFrames[tabId];
  },
};

// Initialize placeholder utility functions that will be needed
Utils = {
  trueModulo: function(a, b) {
    return ((a % b) + b) % b;
  },
  compressArray: function(arr) {
    return arr.filter(function(e) { return e; });
  }
};

// Placeholder for missing functions that need to be implemented
function matchLocation(url, pattern) {
  // Simple wildcard matching - needs proper implementation
  return false;
}

// Default settings (migrated from options.js)
var defaultSettings = {
  searchlimit: 25,
  scrollstep: 70,
  fullpagescrollpercent: 0,
  typelinkhintsdelay: 300,
  qmarks: {},
  sites: {},
  searchengines: {},
  searchaliases: {},
  hud: true,
  regexp: true,
  scalehints: false,
  linkanimations: false,
  sortlinkhints: false,
  ignorecase: true,
  numerichints: false,
  cncpcompletion: false,
  smartcase: true,
  incsearch: true,
  autohidecursor: false,
  typelinkhints: false,
  autofocus: true,
  insertmappings: true,
  defaultnewtabpage: false,
  dimhintcharacters: true,
  smoothscroll: false,
  autoupdategist: false,
  nativelinkorder: false,
  showtabindices: false,
  changelog: true,
  localconfig: false,
  completeonopen: false,
  debugcss: false,
  scrollduration: 500,
  zoomfactor: 0.10,
  configpath: '',
  locale: '',
  mapleader: '\\',
  timeoutlen: 1000,
  defaultengine: 'google',
  hintcharacters: 'asdfgqwertzxcvb',
  homedirectory: '',
  langmap: '',
  completionengines: ['google', 'duckduckgo', 'wikipedia', 'amazon'],
  nextmatchpattern: '((?!first)(next|older|more|>|›|»|forward| )+)',
  previousmatchpattern: '((?!last)(prev(ious)?|newer|back|«|less|<|‹| )+)',
  barposition: 'top',
  vimport: 8001,
  blacklists: [],
  RC: '',
  MAPPINGS: '',
  GISTURL: '',
  FUNCTIONS: {},
  COMMANDBARCSS: '#cVim-command-bar{position:fixed;background-color:#1b1d1e;color:#bbb;}'
};

// Options functionality (migrated from options.js)
Options = {
  refreshSettings: function(callback) {
    for (var key in defaultSettings) {
      if (settings[key] === void 0) {
        settings[key] = defaultSettings[key];
      }
    }
    if (callback) {
      callback();
    }
  },

  saveSettings: function(request) {
    settings = request.settings;
    for (var key in settings.qmarks) {
      Quickmarks[key] = settings.qmarks[key];
    }
    this.refreshSettings(function() {
      chrome.storage[storageMethod].set({settings: settings});
      if (request.sendSettings) {
        Options.sendSettings();
      }
    });
  },

  sendSettings: function() {
    activePorts.forEach(function(port) {
      port.postMessage({
        type: 'sendSettings',
        settings: settings
      });
    });
  },

  getSettings: function(request, sender) {
    this.refreshSettings(function() {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'sendSettings',
        settings: request.reset ? defaultSettings : settings
      });
    });
  },

  updateBlacklistsMappings: function() {
    var rc = Utils.compressArray(settings.RC.split(/\n+/)),
        i, index, line;
    if (settings.BLACKLISTS) {
      settings.blacklists = settings.BLACKLISTS.split(/\n+/);
      delete settings.BLACKLISTS;
    }
    for (i = 0; i < rc.length; ++i) {
      if (/ *let *blacklists *= */.test(rc[i])) {
        rc.splice(i, 1);
        index = i;
      }
    }
    settings.blacklists = Utils.uniqueElements(settings.blacklists);
    if (settings.blacklists.length) {
      line = 'let blacklists = ' + JSON.stringify(settings.blacklists);
      if (index) {
        rc = rc.slice(0, index).concat(line).concat(rc.slice(index));
      } else {
        rc.push(line);
      }
    }
    settings.RC = rc.join('\n');
    Options.saveSettings({settings: settings});
  }
};

// History functionality (migrated from history.js with chrome.storage)
History = {
  historyTypes: ['action', 'url', 'search'],
  searchResults: null,
  historyStore: [],
  commandHistory: {},
  shouldRefresh: false,

  saveCommandHistory: function() {
    Object.keys(this.commandHistory).forEach(function(e) {
      var storageKey = 'commandHistory_' + e;
      var data = {};
      data[storageKey] = JSON.stringify(this.commandHistory[e]);
      chrome.storage.local.set(data);
    }.bind(this));
  },

  clear: function() {
    this.commandHistory = {};
    this.historyTypes.forEach(function(type) {
      this.commandHistory[type] = [];
    }.bind(this));
  },

  sendToTabs: function() {
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'commandHistory',
          history: History.commandHistory
        });
      });
    });
  },

  append: function(value, type) {
    if (~this.historyTypes.indexOf(type)) {
      this.commandHistory[type].push('' + value);
      this.commandHistory[type] = this.commandHistory[type].splice(-500);
      this.saveCommandHistory();
    }
  },

  retrieve: function(type) {
    return [type, this.commandHistory[type]];
  },

  refreshStore: (function() {
    var utime;
    var calculateWeight = function(item) {
      var weight = 1;
      var points = 0;
      var delta = utime - item.lastVisitTime;
      switch (true) {
      case delta < 345600000:  // 0-4 days
        break;
      case delta < 1209600000: // 5-14 days
        weight = 0.7; break;
      case delta < 2678400000: // 15-31 days
        weight = 0.5; break;
      case delta < 7776000000: // 32-90 days
        weight = 0.3; break;
      default: weight = 0.1;
      }
      points += item.visitCount * 100 * weight;
      points += item.typedCount * 200 * weight;
      return points;
    };
    return function() {
      utime = new Date().getTime();
      this.shouldRefresh = false;
      chrome.history.search({
        text: '',
        startTime: 0,
        maxResults: 2147483647,
      }, function(results) {
        History.historyStore = results.sort(function(a, b) {
          return calculateWeight(b) - calculateWeight(a);
        });
      });
    };
  })(),

  retrieveSearchHistory: function(search, limit, callback) {
    if (History.shouldRefresh) {
      History.refreshStore();
    }
    callback(searchArray({
      array: this.historyStore,
      search: search,
      limit: limit,
      fn: function(item) {
        return item.title + ' ' + item.url;
      }
    }), true);
  }
};

// Enhanced Utils with additional functions
Utils.uniqueElements = function(arr) {
  return arr.filter(function(item, pos) {
    return arr.indexOf(item) === pos;
  });
};

// Simple search array function
function searchArray(options) {
  var results = [];
  var search = options.search.toLowerCase();
  for (var i = 0; i < options.array.length && results.length < options.limit; i++) {
    var item = options.array[i];
    var text = options.fn(item).toLowerCase();
    if (text.includes(search)) {
      results.push(item);
    }
  }
  return results;
}

function initializeOptions() {
  chrome.storage[storageMethod].get('settings', function(data) {
    if (data.settings) {
      settings = data.settings;
      Quickmarks = settings.qmarks;
    }
    if (settings.debugcss)
      settings.COMMANDBARCSS = defaultSettings.COMMANDBARCSS;
    Options.refreshSettings();
    Options.updateBlacklistsMappings();
  });
}

function initializeHistory() {
  History.historyTypes.forEach(function(type) {
    var storageKey = 'commandHistory_' + type;
    chrome.storage.local.get([storageKey], function(result) {
      var data = result[storageKey];
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = typeof data === 'string' ? data.split(',') : [];
      }
      History.commandHistory[type] = data || [];
    });
  });
  History.refreshStore();
}

// Links functionality (migrated from links.js)
Links = {
  multiOpen: function(links) {
    links.forEach(function(item) {
      chrome.tabs.create({url: item, active: false});
    });
  }
};

// Updates functionality (migrated from update.js)
Updates = {
  displayMessage: false,
  installMessage: 'Welcome to cVim! Here\'s everything you need to know.',
  tabId: null
};

// Files functionality (migrated from files.js)
Files = {
  parseHTML: function(data) {
    return (data.match(/addRow\(".*/g) || []).map(function(e) {
      e = JSON.parse('[' + e.slice(7).replace(/\);.*/, ']'));
      return [e[0], e[2] ? 'Directory' : 'File (' + e[3] + ')'];
    });
  },
  getPath: function(path, callback) {
    if (path = path.replace(/[^\/]*$/, '')) {
      httpRequest({url: 'file://' + path}).then(function(data) {
        callback(Files.parseHTML(data));
      }, function(xhr) { if (xhr); });
    }
  }
};

// Register install/update handler
chrome.runtime.onInstalled.addListener(function(details) {
  var currentVersion   = chrome.runtime.getManifest().version;
  var previousVersion  = details.previousVersion;
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pages/mappings.html'),
      active: true
    }, function(tabInfo) {
      Updates.tabId = tabInfo.id;
      Updates.displayMessage = true;
    });
  } else if (details.reason === 'update') {
    if (previousVersion !== currentVersion) {
      Options.refreshSettings(function() {
        if (settings.changelog) {
          chrome.tabs.create({
            url: chrome.runtime.getURL('pages/changelog.html'),
            active: true
          });
        }
      });
    }
    // Note: chrome.tabs.executeScript is deprecated in Manifest v3
    // Content scripts should be automatically injected via manifest
    console.log('Extension updated to version:', currentVersion);
  }
});

// Simple Actions handler - placeholder for full implementation
function Actions(request, sender, callback, port) {
  // This would contain the full Actions functionality from actions.js
  // For now, this is a minimal implementation
  console.log('Action received:', request.action);
  if (callback) {
    callback({});
  }
}

console.log('cVim service worker loaded');
