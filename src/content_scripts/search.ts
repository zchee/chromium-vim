// Search functionality for cVim Chrome Extension
// Handles search completions, Chrome URL matching, and result navigation

// External dependencies
declare const settings: {
  searchlimit?: number;
};

declare const Command: {
  dataElements: HTMLElement[];
  input: HTMLInputElement;
  typed?: string;
  completionResults: CompletionResult[];
  customCommands: Record<string, string>;
  complete(input: string): boolean;
};

declare const Utils: {
  split(string: string, pattern: string | RegExp): string[];
  trim(string: string): string;
};

declare const searchArray: <T>(options: {
  array: T[];
  search: string;
  limit?: number;
  fn?: (item: T) => string;
}) => T[];

// Type definitions for search functionality
type CompletionResultType =
  | 'chrome'
  | 'bookmarks'
  | 'history'
  | 'topsites'
  | 'tabhistory'
  | 'engines'
  | 'search'
  | 'windows'
  | 'chromesessions'
  | 'markOptions'
  | 'sessions'
  | 'files'
  | 'settings'
  | 'paths'
  | 'buffers'
  | 'complete';

// Completion result arrays with different structures based on type
type CompletionResult =
  | [CompletionResultType, string]                    // Basic 2-element result
  | [CompletionResultType, string, string]            // 3-element result
  | [CompletionResultType, string, string, string]    // 4-element result
  | [CompletionResultType, string, string, string, string]; // 5-element result

interface SearchMatchCallback {
  (results: string[]): void;
}

interface SearchInterface {
  index: number | null;
  topSites: Array<[string, string]>;
  chromeUrls: readonly string[];
  settings?: string[];

  chromeMatch(searchString: string, callback: SearchMatchCallback): void;
  settingsMatch(searchString: string, callback: SearchMatchCallback): void;
  nextResult(reverse?: boolean): boolean | void;
}

// Chrome internal URLs for completion
const CHROME_URLS = [
  'about', 'accessibility', 'appcache-internals', 'apps', 'blob-internals',
  'bluetooth-internals', 'bookmarks', 'cache', 'chrome', 'chrome-urls',
  'components', 'crashes', 'credits', 'device-log', 'devices', 'dino',
  'dns', 'downloads', 'extensions', 'flags', 'flash', 'gcm-internals',
  'gpu', 'help', 'histograms', 'history', 'indexeddb-internals', 'inspect',
  'invalidations', 'linux-proxy-config', 'local-state', 'media-engagement',
  'media-internals', 'net-export', 'net-internals', 'network-error',
  'network-errors', 'newtab', 'ntp-tiles-internals', 'omnibox',
  'password-manager-internals', 'policy', 'predictors', 'print', 'profiler',
  'quota-internals', 'safe-browsing', 'sandbox', 'serviceworker-internals',
  'settings', 'signin-internals', 'site-engagement', 'suggestions',
  'supervised-user-internals', 'sync-internals', 'system',
  'taskscheduler-internals', 'terms', 'thumbnails', 'tracing',
  'translate-internals', 'usb-internals', 'user-actions', 'version',
  'view-http-cache', 'webrtc-internals', 'webrtc-logs'
] as const;

// Main Search object implementation
export const Search: SearchInterface = {
  index: null,
  topSites: [],
  chromeUrls: CHROME_URLS,

  /**
   * Match Chrome internal URLs against search string
   * @param searchString - String to match against Chrome URLs
   * @param callback - Callback function to receive matched results
   */
  chromeMatch(searchString: string, callback: SearchMatchCallback): void {
    callback(searchArray({
      array: this.chromeUrls as string[],
      search: searchString,
      limit: settings?.searchlimit
    }));
  },

  /**
   * Match settings against search string
   * @param searchString - String to match against settings (removes 'no' prefix)
   * @param callback - Callback function to receive matched results
   */
  settingsMatch(searchString: string, callback: SearchMatchCallback): void {
    if (!this.settings) {
      callback([]);
      return;
    }

    callback(searchArray({
      array: this.settings,
      search: searchString.replace(/^no/, ''),
      limit: settings?.searchlimit
    }));
  },

  /**
   * Navigate through completion results
   * @param reverse - Whether to navigate in reverse order
   * @returns boolean indicating success, or void for input value updates
   */
  nextResult(reverse = false): boolean | void {
    // Handle empty completion data
    if (!Command.dataElements.length) {
      if (Command.input.value.length) {
        return false;
      }
      return Command.complete('');
    }

    // Initialize or update index
    if (this.index === null) {
      if (!reverse) {
        this.index = 0;
      } else {
        this.index = Command.dataElements.length - 1;
      }
    } else {
      // Remove active attribute from current element
      const currentElement = Command.dataElements[this.index];
      if (currentElement) {
        currentElement.removeAttribute('active');
      }

      if (!reverse) {
        if (this.index + 1 < Command.dataElements.length) {
          this.index++;
        } else {
          this.index = null;
          Command.input.value = Command.typed || '';
          return;
        }
      } else {
        if (this.index === 0) {
          this.index = null;
          Command.input.value = Command.typed || '';
          return;
        } else {
          this.index--;
        }
      }
    }

    // Set active attribute on new element
    const activeElement = Command.dataElements[this.index];
    if (!activeElement) {
      return;
    }
    activeElement.setAttribute('active', '');

    // Update input value based on completion result type
    const result = Command.completionResults[this.index];
    if (!result || result.length < 2) {
      return;
    }

    const resultType = result[0];

    switch (resultType) {
      case 'chrome':
        if (result.length >= 2) {
          const match = Command.input.value.match(/^\S+ /);
          Command.input.value = (match ? match[0] : '') + result[1];
        }
        break;

      case 'bookmarks':
      case 'history':
      case 'topsites':
        if (result.length >= 3) {
          const match = Command.input.value.match(/^\S+ /);
          Command.input.value = (match ? match[0] : '') + result[2];
        }
        break;

      case 'tabhistory':
        if (result.length >= 2) {
          Command.input.value = 'tabhistory ' + result[1];
        }
        break;

      case 'engines':
        if (result.length >= 2) {
          const match = Command.input.value.match(/^\S+ /);
          Command.input.value = (match ? match[0] : '') + result[1];
        }
        break;

      case 'search': {
        const value = Utils.split(Command.input.value, /\s+/);
        let repl = '';

        if (value[0] && Command.customCommands.hasOwnProperty(value[0])) {
          const customCommand = Command.customCommands[value[0]];
          if (customCommand) {
            const customCommandParts = Utils.split(customCommand, /\s+/);
            repl = customCommandParts.slice(2).join(' ');
            value.length = 1; // Keep only the first element
          }
        }

        let inputValue: string;
        let searchValue: string;

        if (result.length === 3) {
          inputValue = value[0] + ' ';
          searchValue = result[2];
        } else {
          inputValue = value.slice(0, 2).join(' ') + ' ';
          searchValue = result[1];
        }

        if (searchValue.indexOf(repl) === 0) {
          searchValue = Utils.trim(searchValue.replace(repl, ''));
        }

        Command.input.value = inputValue + searchValue;
        break;
      }

      case 'windows':
        if (result.length >= 2) {
          const match = Command.input.value.match(/^\S+/);
          const prefix = match ? match[0] + ' ' : '';
          Command.input.value = prefix + result[1].replace(/ .*/, '');
        }
        break;

      case 'chromesessions':
        if (result.length >= 4 && result[3]) {
          const match = Command.input.value.match(/^\S+/);
          const prefix = match ? match[0] + ' ' : '';
          Command.input.value = prefix + result[3].replace(/ .*/, '');
        }
        break;

      case 'markOptions':
        if (result.length >= 2) {
          Command.input.value = Command.input.value.replace(/-[a-zA-Z]*$/, result[1]);
        }
        break;

      case 'sessions':
        if (result.length >= 2) {
          const match = Command.input.value.match(/^\S+/);
          const prefix = match ? match[0] + ' ' : '';
          Command.input.value = prefix + result[1];
        }
        break;

      case 'files':
        if (result.length >= 2) {
          Command.input.value = Command.input.value.replace(/[^\/]+$/, '') + result[1];
        }
        break;

      case 'settings': {
        const command = Command.input.value.split(/\s+/);
        if (result.length >= 2 && command.length >= 2 && command[1]) {
          const prefix = /^no/.test(command[1]) ? 'no' : '';
          Command.input.value = command[0] + ' ' + prefix + result[1];
        }
        break;
      }

      case 'paths':
        if (result.length >= 3) {
          if (result[2] !== 'folder') {
            Command.input.value = 'bookmarks ' + result[2];
          } else if (result.length >= 4) {
            Command.input.value = 'bookmarks ' + result[3] + result[1];
          }
        }
        break;

      case 'buffers':
        if (result.length >= 2) {
          const match = Command.input.value.match(/^\S+/);
          const prefix = match ? match[0] + ' ' : '';
          Command.input.value = prefix + result[1].replace(/:.*/, '');
        }
        break;

      case 'complete':
        if (result.length >= 2 && result[1] !== undefined) {
          Command.input.value = result[1];
        }
        break;
    }
  }
};

// Make Search globally available for compatibility
(window as any).Search = Search;
