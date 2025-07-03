// Chrome Extension messaging system for cVim content scripts  
// Handles communication between content scripts and background script

// Type definitions for Chrome Extension APIs and messages
interface ChromePort extends chrome.runtime.Port {
  postMessage(message: any, callback?: () => void): void;
}


interface PortMessage {
  type: PortMessageType;
  [key: string]: any;
}

interface RuntimeMessage {
  action: RuntimeMessageAction;
  [key: string]: any;
}

type PortMessageType =
  | 'hello'
  | 'addFrame'
  | 'focusFrame'
  | 'updateLastCommand'
  | 'commandHistory'
  | 'history'
  | 'bookmarks'
  | 'topsites'
  | 'buffers'
  | 'sessions'
  | 'quickMarks'
  | 'bookmarkPath'
  | 'editWithVim'
  | 'httpRequest'
  | 'parseRC'
  | 'sendSettings';

type RuntimeMessageAction =
  | 'hideHud'
  | 'commandHistory'
  | 'updateLastSearch'
  | 'sendSettings'
  | 'cancelAllWebRequests'
  | 'updateMarks'
  | 'nextCompletionResult'
  | 'deleteBackWord'
  | 'toggleEnabled'
  | 'getBlacklistStatus'
  | 'alert'
  | 'showCommandFrame'
  | 'hideCommandFrame'
  | 'callFind'
  | 'setFindIndex'
  | 'doIncSearch'
  | 'cancelIncSearch'
  | 'echoRequest'
  | 'displayTabIndices'
  | 'isFrameVisible';

// Utility function type for message wrapping
type MessageWrapper = (action: string, args?: any, callback?: (response?: any) => void) => void;

// Extend window interface for extension-specific properties
declare global {
  interface Window {
    portDestroyed?: boolean;
    isCommandFrame?: boolean;
    wasFocused?: boolean;
  }
}

// External dependency declarations - use `any` to avoid conflicts with existing declarations
declare const Command: any;
declare const Visual: any;
declare const Find: any;
declare const Mappings: any;
declare const KeyHandler: any;
declare const HUD: any;
declare const DOM: any;
declare const Marks: any;
declare const Search: any;
declare const Frames: any;
declare const Session: any;
declare const searchArray: any;
declare const httpCallback: any;
declare const removeListeners: any;
declare const addListeners: any;
declare const insertMode: boolean;

// Message utility functions - will be defined below
let RUNTIME: MessageWrapper;
let PORT: MessageWrapper;

// Establish connection to background script using Manifest v3 API
const messagePort: ChromePort = chrome.runtime.connect({ name: 'main' }) as ChromePort;

// Handle port disconnection
messagePort.onDisconnect.addListener(() => {
  window.portDestroyed = true;
  // Disable messaging functions to prevent errors
  (chrome.runtime.sendMessage as any) = () => { };
  (chrome.runtime.connect as any) = () => ({} as any);

  // Clean up UI components
  Command.hide();
  removeListeners();
  Visual.exit();
  Find.clear();
  Command.destroy();
});

// Create utility functions for messaging
(function() {
  const $ = function(FN: Function, caller: any): MessageWrapper {
    return function(action: string, args?: any, callback?: (response?: any) => void) {
      if (typeof args === 'function') {
        callback = args;
        args = {};
      }
      (args = args || {}).action = action;
      FN.call(caller, args, typeof callback === 'function' ? callback : undefined);
    };
  };

  RUNTIME = $(chrome.runtime.sendMessage, chrome.runtime);
  PORT = $(messagePort.postMessage, messagePort);
})();

// Handle messages from background script via port
messagePort.onMessage.addListener((response: PortMessage) => {
  let key: string;

  switch (response.type) {
    case 'hello':
      PORT('getSettings');
      PORT('getBookmarks');
      PORT('getQuickMarks');
      PORT('getSessionNames');
      PORT('retrieveAllHistory');
      PORT('sendLastSearch');
      PORT('getTopSites');
      PORT('getLastCommand');
      break;

    case 'addFrame':
      if (innerWidth > 5 && innerHeight > 5) {
        Frames.init(response.frameId);
      }
      break;

    case 'focusFrame':
      Frames.focus(response.disableAnimation);
      break;

    case 'updateLastCommand':
      Mappings.lastCommand = JSON.parse(response.data);
      break;

    case 'commandHistory':
      for (key in response.history) {
        Command.history[key] = response.history[key];
      }
      break;

    case 'history':
      const matches: [string, string][] = [];
      for (key in response.history) {
        if (response.history[key].url) {
          if (response.history[key].title.trim() === '') {
            matches.push(['Untitled', response.history[key].url]);
          } else {
            matches.push([response.history[key].title, response.history[key].url]);
          }
        }
      }

      if (Command.historyMode) {
        if (Command.active && Command.bar.style.display !== 'none') {
          Command.completions = { history: matches };
          Command.updateCompletions(false);
        }
      } else if (Command.searchMode) {
        Command.searchMode = false;
        if (Command.active && Command.bar.style.display !== 'none') {
          Command.completions.history = matches;
          Command.updateCompletions(true);
        }
      }
      break;

    case 'bookmarks':
      Marks.parse(response.bookmarks);
      break;

    case 'topsites':
      Search.topSites = response.sites;
      break;

    case 'buffers':
      if (Command.bar.style.display !== 'none') {
        const val = Command.input.value.replace(/\S+\s+/, '');
        Command.hideData();
        Command.completions = {
          buffers: (function() {
            if (!val.trim() ||
              Number.isNaN(+val) ||
              !response.buffers[+val - 1]) {
              return searchArray({
                array: response.buffers,
                search: val,
                limit: (window as any).settings.searchlimit,
                fn: function(item: any) { return item.join(' '); }
              });
            }
            return response.buffers[+val - 1] ? [response.buffers[+val - 1]] : [];
          })()
        };
        Command.updateCompletions();
      }
      break;

    case 'sessions':
      (window as any).sessions = response.sessions;
      break;

    case 'quickMarks':
      Marks.parseQuickMarks(response.marks);
      break;

    case 'bookmarkPath':
      if (response.path.length) {
        Command.completions = {};
        Command.completions.paths = response.path;
        Command.updateCompletions();
      } else {
        Command.hideData();
      }
      break;

    case 'editWithVim':
      const lastInputElement = Mappings.insertFunctions.__getElement__();
      if (lastInputElement) {
        const element = lastInputElement as any;
        element[element.value !== undefined ? 'value' : 'innerHTML'] =
          response.text.replace(/\n$/, ''); // remove trailing line left by vim
        if (!DOM.isSubmittable(lastInputElement)) {
          lastInputElement.blur();
        }
      }
      break;

    case 'httpRequest':
      httpCallback(response.id, response.text);
      break;

    case 'parseRC':
      if (response.config.MAPPINGS) {
        response.config.MAPPINGS.split('\n').forEach((line: string) => {
          Mappings.parseLine(line);
        });
        delete response.config.MAPPINGS;
      }
      Command.updateSettings(response.config);
      break;

    case 'sendSettings':
      Mappings.defaults = Object.clone(Mappings.defaultsClone);
      KeyHandler.listener.setLangMap(response.settings.langmap || '');
      if (!Command.initialLoadStarted) {
        Command.configureSettings(response.settings);
      } else {
        (window as any).settings = response.settings;
        Mappings.parseCustom((window as any).settings.MAPPINGS, true);
      }
      break;
  }
});

// Handle messages from other parts of the extension using Manifest v3 API
chrome.runtime.onMessage.addListener((request: RuntimeMessage, _sender: chrome.runtime.MessageSender, callback: (response?: any) => void) => {
  switch (request.action) {
    case 'hideHud':
      HUD.hide(true);
      break;

    case 'commandHistory':
      for (const key in request.history) {
        Command.history[key] = request.history[key];
      }
      break;

    case 'updateLastSearch':
      Find.lastSearch = request.value;
      break;

    case 'sendSettings':
      Mappings.defaults = Object.clone(Mappings.defaultsClone);
      if (!Command.initialLoadStarted) {
        Command.configureSettings(request.settings);
      } else {
        (window as any).settings = request.settings;
        Mappings.parseCustom((window as any).settings.MAPPINGS, true);
      }
      break;

    case 'cancelAllWebRequests':
      window.stop();
      break;

    case 'updateMarks':
      Marks.parseQuickMarks(request.marks);
      break;

    case 'nextCompletionResult':
      if (window.isCommandFrame) {
        if ((window as any).settings.cncpcompletion &&
          Command.commandBarFocused() &&
          Command.type === 'action') {
          Search.nextResult();
          break;
        }
        callback(true);
      }
      break;

    case 'deleteBackWord':
      if (!insertMode && DOM.isEditable(document.activeElement)) {
        Mappings.insertFunctions.deleteWord();
        if (Command.commandBarFocused() && Command.type === 'action') {
          Command.complete(Command.input.value);
        }
      }
      break;

    case 'toggleEnabled':
      addListeners();
      if (!(window as any).settings) {
        RUNTIME('getSettings');
      }
      Command.init(!Command.loaded);
      break;

    case 'getBlacklistStatus':
      callback(Command.blacklisted);
      break;

    case 'alert':
      alert(request.message);
      break;

    case 'showCommandFrame':
      if (Command.frame) {
        Command.frame.style.display = 'block';
        Command.frame.contentWindow?.focus();
      }
      if (window.isCommandFrame === true) {
        window.focus();
        Command.show(request.search, request.value, request.complete);
      }
      break;

    case 'hideCommandFrame':
      window.wasFocused = false;
      if (Command.frame) {
        Command.frame.style.display = 'none';
        callback();
      }
      break;

    case 'callFind':
      if (window.wasFocused) {
        (Find as any)[request.command].apply(Find, request.params);
      }
      break;

    case 'setFindIndex':
      if (window.wasFocused) {
        Find.index = request.index;
      }
      break;

    case 'doIncSearch':
      if (!window.wasFocused) break;
      Find.clear();
      Find.highlight({
        base: document.body,
        mode: request.mode,
        search: request.search
      });
      Find.setIndex();
      Find.search(request.mode, request.mode === '?' ? 1 : 0, true);
      break;

    case 'cancelIncSearch':
      if (Command.lastScrollTop !== undefined) {
        document.scrollingElement!.scrollTop = Command.lastScrollTop;
      }
      if (Find.previousMatches &&
        request.search &&
        Find.lastSearch &&
        Find.lastSearch !== request.search) {
        Find.clear();
        HUD.hide();
        Find.highlight({
          base: document.body,
          search: Find.lastSearch,
          setIndex: false,
          executeSearch: false,
          reverse: true,
          saveSearch: true
        });
        Find.index = Find.lastIndex! - 1;
        Find.search('/', 1, false);
      } else {
        Find.clear();
        HUD.hide();
      }
      break;

    case 'echoRequest':
      if (!window.isCommandFrame && document.hasFocus()) {
        switch (request.call) {
          case 'callMapFunction':
            Mappings.actions[request.name](1);
            break;
          case 'eval':
            eval((window as any).settings.FUNCTIONS[request.name] + request.args);
            break;
        }
      }
      break;

    case 'displayTabIndices':
      if (Session.isRootFrame) {
        Command.onSettingsLoad(() => {
          if ((window as any).settings.showtabindices) {
            Session.ignoreTitleUpdate = true;
            if (document.title === '' + request.index) {
              if (location.hostname + location.pathname === 'www.google.com/_/chrome/newtab') {
                document.title = Session.tabIndex + ' New Tab';
              } else {
                document.title = Session.tabIndex + ' ' + location.href.replace(/.*\//, '');
              }
            } else {
              document.title = document.title.replace(
                new RegExp('^(' + Session.tabIndex + ' )?'),
                (request.index ? request.index + ' ' : '')
              );
            }
          }
          Session.tabIndex = request.index;
        });
      }
      break;

    case 'isFrameVisible':
      callback(innerWidth > 5 && innerHeight > 5);
      break;
  }

  return true;
});

// Export to make this a proper module for TypeScript
export { };
