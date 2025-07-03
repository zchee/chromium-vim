// Chrome Extension Main Controller - TypeScript conversion for Manifest v3

/**
 * Session storage structure
 */
interface SessionData {
  [sessionId: string]: any;
}

/**
 * Active tabs per window structure
 */
interface ActiveTabsData {
  [windowId: number]: number[];
}

/**
 * Tab history structure for individual tabs
 */
interface TabHistoryEntry {
  links: string[];
  state: number;
}

/**
 * Tab history collection
 */
interface TabHistoryData {
  [tabId: number]: TabHistoryEntry;
}

/**
 * HTTP request options
 */
interface HttpRequestOptions {
  url: string;
  json?: boolean;
  method?: string;
  headers?: { [key: string]: string };
  body?: string;
}

/**
 * Tab navigation options
 */
interface TabNavigationOptions {
  reverse?: boolean;
  count?: number;
  first?: boolean;
  last?: boolean;
}

/**
 * Chrome Extension message types
 */
interface ExtensionMessage {
  type: string;
  [key: string]: any;
}

/**
 * Port message with frame information
 */
interface PortMessage extends ExtensionMessage {
  frameId?: number;
}

/**
 * Tab indices message
 */
interface TabIndicesMessage {
  action: 'displayTabIndices';
  index: number;
}

/**
 * Command completion message
 */
interface CompletionMessage {
  action: 'nextCompletionResult' | 'deleteBackWord';
}

/**
 * Settings interface (external dependency)
 */
interface Settings {
  showtabindices?: boolean;
  [key: string]: any;
}

/**
 * Utils interface (external dependency)
 */
interface UtilsModule {
  trueModulo: (dividend: number, divisor: number) => number;
}

/**
 * Actions interface (external dependency)
 */
interface ActionsModule {
  (request: any, sender: chrome.runtime.MessageSender, sendResponse: Function, port?: chrome.runtime.Port): any;
}

/**
 * Popup interface (external dependency)
 */
interface PopupModule {
  toggleEnabled: (options: any) => void;
  toggleBlacklisted: () => void;
}

/**
 * Frames interface (external dependency)
 */
interface FramesModule {
  remove: (tabId: number) => void;
  removeFrame: (frameId: number) => void;
}

/**
 * History interface (external dependency)
 */
interface HistoryModule {
  shouldRefresh: boolean;
}

// Global declarations for external dependencies
declare var settings: Settings;
declare var Utils: UtilsModule;
declare var Actions: ActionsModule;
declare var Popup: PopupModule;
declare var Frames: FramesModule;
declare var History: HistoryModule;

/**
 * Main background script controller for Chrome Extension
 * 
 * Manages global state, handles Chrome Extension events, and coordinates
 * communication between content scripts and background functionality.
 * Compatible with Chrome Extension Manifest v3.
 */
class MainController {
  /** Session storage data */
  public sessions: SessionData = {};
  
  /** Active tabs per window */
  public activeTabs: ActiveTabsData = {};
  
  /** Tab navigation history */
  public tabHistory: TabHistoryData = {};
  
  /** Active extension ports */
  public activePorts: chrome.runtime.Port[] = [];
  
  /** Last used tabs for quick switching */
  public lastUsedTabs: number[] = [];

  /** Whether the controller has been initialized */
  private initialized: boolean = false;

  constructor() {
    this.initializeController();
  }

  /**
   * Creates an HTTP request function for global usage
   * 
   * @param request HTTP request options
   * @returns Promise resolving to response data
   */
  createHttpRequest(): (request: HttpRequestOptions) => Promise<any> {
    return (request: HttpRequestOptions): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!request || !request.url) {
          reject(new Error('Invalid request: URL is required'));
          return;
        }

        try {
          const xhr = new XMLHttpRequest();
          const method = request.method || 'GET';
          
          xhr.open(method, request.url);
          
          // Set headers if provided
          if (request.headers) {
            Object.keys(request.headers).forEach(key => {
              xhr.setRequestHeader(key, request.headers![key]);
            });
          }

          xhr.onload = () => {
            try {
              if (xhr.status >= 200 && xhr.status < 300) {
                const response = request.json ? JSON.parse(xhr.responseText) : xhr.responseText;
                resolve(response);
              } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
          };

          xhr.ontimeout = () => {
            reject(new Error('Request timeout'));
          };

          // Set timeout
          xhr.timeout = 30000; // 30 seconds

          // Send request
          if (request.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            xhr.send(request.body);
          } else {
            xhr.send();
          }

        } catch (error) {
          reject(error);
        }
      });
    };
  }

  /**
   * Updates tab indices display in all tabs
   * 
   * Shows tab numbers if the showtabindices setting is enabled.
   */
  async updateTabIndices(): Promise<void> {
    try {
      if (!settings || !settings.showtabindices) {
        return;
      }

      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      const messagePromises = tabs.map(async (tab: chrome.tabs.Tab) => {
        if (tab.id && typeof tab.index === 'number') {
          try {
            const message: TabIndicesMessage = {
              action: 'displayTabIndices',
              index: tab.index + 1
            };
            
            await chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // Ignore errors for tabs that can't receive messages
            console.debug(`MainController.updateTabIndices: Could not send message to tab ${tab.id}`);
          }
        }
      });

      await Promise.allSettled(messagePromises);
    } catch (error) {
      console.error('MainController.updateTabIndices: Failed to update tab indices:', error);
    }
  }

  /**
   * Legacy synchronous version of updateTabIndices for backward compatibility
   * 
   * @deprecated Use async updateTabIndices() method instead
   */
  updateTabIndicesSync(): void {
    if (!settings || !settings.showtabindices) {
      return;
    }

    chrome.tabs.query({ currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (chrome.runtime.lastError) {
        console.error('MainController.updateTabIndicesSync: Error querying tabs:', chrome.runtime.lastError);
        return;
      }

      tabs.forEach((tab: chrome.tabs.Tab) => {
        if (tab.id && typeof tab.index === 'number') {
          const message: TabIndicesMessage = {
            action: 'displayTabIndices',
            index: tab.index + 1
          };

          chrome.tabs.sendMessage(tab.id, message, () => {
            // Ignore chrome.runtime.lastError for tabs that can't receive messages
            if (chrome.runtime.lastError) {
              console.debug(`MainController.updateTabIndicesSync: Could not send message to tab ${tab.id}`);
            }
          });
        }
      });
    });
  }

  /**
   * Navigates to a specific tab based on navigation options
   * 
   * @param tab Current tab reference
   * @param options Navigation options
   */
  async getTab(tab: chrome.tabs.Tab, options: TabNavigationOptions = {}): Promise<void> {
    if (!tab || !tab.windowId) {
      console.error('MainController.getTab: Invalid tab provided');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ windowId: tab.windowId });
      
      if (tabs.length === 0) {
        console.warn('MainController.getTab: No tabs found in window');
        return;
      }

      let targetIndex: number;

      if (options.first) {
        targetIndex = 0;
      } else if (options.last) {
        targetIndex = tabs.length - 1;
      } else {
        const count = options.count || 1;
        const reverse = options.reverse || false;
        const direction = reverse ? -1 : 1;
        
        let newIndex = direction * count + tab.index;
        
        if (count !== -1 && count !== 1) {
          // Clamp to valid range
          newIndex = Math.min(Math.max(0, newIndex), tabs.length - 1);
        } else {
          // Use modulo for wrapping
          if (typeof Utils !== 'undefined' && Utils.trueModulo) {
            newIndex = Utils.trueModulo(newIndex, tabs.length);
          } else {
            // Fallback modulo implementation
            newIndex = ((newIndex % tabs.length) + tabs.length) % tabs.length;
          }
        }
        
        targetIndex = newIndex;
      }

      const targetTab = tabs[targetIndex];
      if (targetTab && targetTab.id) {
        await chrome.tabs.update(targetTab.id, { active: true });
      }

    } catch (error) {
      console.error('MainController.getTab: Failed to navigate tab:', error);
    }
  }

  /**
   * Legacy synchronous version of getTab for backward compatibility
   * 
   * @param tab Current tab reference
   * @param reverse Whether to navigate in reverse
   * @param count Number of tabs to move
   * @param first Whether to go to first tab
   * @param last Whether to go to last tab
   * @deprecated Use async getTab() method instead
   */
  getTabSync(tab: chrome.tabs.Tab, reverse?: boolean, count?: number, first?: boolean, last?: boolean): void {
    if (!tab || !tab.windowId) {
      console.error('MainController.getTabSync: Invalid tab provided');
      return;
    }

    chrome.tabs.query({ windowId: tab.windowId }, (tabs: chrome.tabs.Tab[]) => {
      if (chrome.runtime.lastError) {
        console.error('MainController.getTabSync: Error querying tabs:', chrome.runtime.lastError);
        return;
      }

      if (tabs.length === 0) {
        console.warn('MainController.getTabSync: No tabs found in window');
        return;
      }

      let targetIndex: number;

      if (first) {
        targetIndex = 0;
      } else if (last) {
        targetIndex = tabs.length - 1;
      } else {
        const actualCount = count || 1;
        const direction = reverse ? -1 : 1;
        let newIndex = direction * actualCount + tab.index;
        
        if (actualCount !== -1 && actualCount !== 1) {
          newIndex = Math.min(Math.max(0, newIndex), tabs.length - 1);
        } else {
          if (typeof Utils !== 'undefined' && Utils.trueModulo) {
            newIndex = Utils.trueModulo(newIndex, tabs.length);
          } else {
            newIndex = ((newIndex % tabs.length) + tabs.length) % tabs.length;
          }
        }
        
        targetIndex = newIndex;
      }

      const targetTab = tabs[targetIndex];
      if (targetTab && targetTab.id) {
        chrome.tabs.update(targetTab.id, { active: true }, () => {
          if (chrome.runtime.lastError) {
            console.error('MainController.getTabSync: Failed to update tab:', chrome.runtime.lastError);
          }
        });
      }
    });
  }

  /**
   * Initializes session storage from Chrome storage
   */
  async initializeSessions(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('sessions');
      
      if (result.sessions === undefined) {
        await chrome.storage.local.set({ sessions: {} });
        this.sessions = {};
      } else {
        this.sessions = result.sessions;
      }
      
      console.debug('MainController.initializeSessions: Sessions initialized');
    } catch (error) {
      console.error('MainController.initializeSessions: Failed to initialize sessions:', error);
      this.sessions = {};
    }
  }

  /**
   * Legacy synchronous session initialization for backward compatibility
   * 
   * @deprecated Use async initializeSessions() method instead
   */
  initializeSessionsSync(): void {
    chrome.storage.local.get('sessions', (result) => {
      if (chrome.runtime.lastError) {
        console.error('MainController.initializeSessionsSync: Error getting sessions:', chrome.runtime.lastError);
        this.sessions = {};
        return;
      }

      if (result.sessions === undefined) {
        chrome.storage.local.set({ sessions: {} }, () => {
          if (chrome.runtime.lastError) {
            console.error('MainController.initializeSessionsSync: Error setting sessions:', chrome.runtime.lastError);
          }
        });
        this.sessions = {};
      } else {
        this.sessions = result.sessions;
      }
    });
  }

  /**
   * Sets up all Chrome Extension event listeners
   */
  private setupEventListeners(): void {
    // Tab event listeners
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    chrome.tabs.onActivated.addListener((activeInfo: chrome.tabs.TabActiveInfo) => {
      this.handleTabActivated(activeInfo);
    });

    chrome.tabs.onRemoved.addListener((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
    });

    chrome.tabs.onCreated.addListener(() => {
      this.updateTabIndicesSync();
    });

    chrome.tabs.onMoved.addListener(() => {
      this.updateTabIndicesSync();
    });

    // Window event listeners
    chrome.windows.onRemoved.addListener((windowId: number) => {
      this.handleWindowRemoved(windowId);
    });

    // Runtime message listener
    chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: Function) => {
      return this.handleRuntimeMessage(request, sender, sendResponse);
    });

    // Extension port connection listener
    chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
      this.handlePortConnection(port);
    });

    // Command listeners
    chrome.commands.onCommand.addListener((command: string) => {
      this.handleCommand(command);
    });

    console.debug('MainController.setupEventListeners: All event listeners registered');
  }

  /**
   * Handles tab update events
   */
  private handleTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    this.updateTabIndicesSync();

    if (changeInfo.hasOwnProperty('url') && changeInfo.url) {
      // Update history refresh flag
      if (typeof History !== 'undefined') {
        History.shouldRefresh = true;
      }

      // Update tab history
      if (this.tabHistory.hasOwnProperty(tabId)) {
        const history = this.tabHistory[tabId];
        const urlIndex = history.links.indexOf(changeInfo.url);
        
        if (urlIndex === -1) {
          // New URL - add to history
          if (history.state !== undefined && history.state + 1 !== history.links.length) {
            // Remove forward history if we're not at the end
            history.links.splice(history.state + 1);
          }
          history.links.push(changeInfo.url);
          history.state = history.links.length - 1;
        } else {
          // Existing URL - update state
          history.state = urlIndex;
        }
      } else {
        // Initialize tab history
        this.tabHistory[tabId] = {
          links: [changeInfo.url],
          state: 0
        };
      }
    }
  }

  /**
   * Handles tab activation events
   */
  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    // Update last used tabs
    this.lastUsedTabs.push(activeInfo.tabId);
    if (this.lastUsedTabs.length > 2) {
      this.lastUsedTabs.shift();
    }

    // Update active tabs per window
    const windowId = activeInfo.windowId;
    if (this.activeTabs[windowId] === undefined) {
      this.activeTabs[windowId] = [];
    }
    
    this.activeTabs[windowId].push(activeInfo.tabId);
    if (this.activeTabs[windowId].length > 2) {
      this.activeTabs[windowId].shift();
    }
  }

  /**
   * Handles tab removal events
   */
  private handleTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): void {
    this.updateTabIndicesSync();

    // Remove from active tabs
    if (this.activeTabs[removeInfo.windowId] !== undefined) {
      this.activeTabs[removeInfo.windowId] = this.activeTabs[removeInfo.windowId]
        .filter((id: number) => id !== tabId);
    }

    // Remove from tab history
    if (this.tabHistory[tabId] !== undefined) {
      delete this.tabHistory[tabId];
    }

    // Remove from frames
    if (typeof Frames !== 'undefined') {
      Frames.remove(tabId);
    }
  }

  /**
   * Handles window removal events
   */
  private handleWindowRemoved(windowId: number): void {
    delete this.activeTabs[windowId];
  }

  /**
   * Handles runtime message events
   */
  private handleRuntimeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: Function): any {
    if (typeof Actions !== 'undefined') {
      return Actions(request, sender, sendResponse);
    } else {
      console.warn('MainController.handleRuntimeMessage: Actions module not available');
      return false;
    }
  }

  /**
   * Handles port connection events
   */
  private handlePortConnection(port: chrome.runtime.Port): void {
    // Check if port is already connected
    if (this.activePorts.indexOf(port) !== -1) {
      return;
    }

    const frameId = port.sender?.frameId || 0;
    
    // Send initial messages
    port.postMessage({ type: 'hello' });
    port.postMessage({ type: 'addFrame', frameId: frameId });
    
    // Add to active ports
    this.activePorts.push(port);

    // Set up message listener
    port.onMessage.addListener((request: any) => {
      if (typeof Actions !== 'undefined' && port.sender) {
        return Actions(request, port.sender, port.postMessage.bind(port), port);
      }
    });

    // Set up disconnect listener
    port.onDisconnect.addListener(() => {
      // Remove from frames
      if (typeof Frames !== 'undefined') {
        Frames.removeFrame(frameId);
      }

      // Remove from active ports
      const portIndex = this.activePorts.indexOf(port);
      if (portIndex !== -1) {
        this.activePorts.splice(portIndex, 1);
      }
    });
  }

  /**
   * Handles Chrome extension command events
   */
  private async handleCommand(command: string): Promise<void> {
    try {
      switch (command) {
        case 'togglecVim':
          if (typeof Popup !== 'undefined') {
            Popup.toggleEnabled({});
          }
          break;

        case 'toggleBlacklisted':
          if (typeof Popup !== 'undefined') {
            Popup.toggleBlacklisted();
            Popup.toggleEnabled({
              request: {
                singleTab: true
              }
            });
          }
          break;

        case 'nextTab':
        case 'previousTab':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
              await this.getTab(tabs[0], {
                reverse: false,
                count: command === 'nextTab' ? 1 : -1,
                first: false,
                last: false
              });
            }
          } catch (error) {
            console.error(`MainController.handleCommand: Failed to handle ${command}:`, error);
          }
          break;

        case 'viewSource':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].url) {
              await chrome.tabs.create({
                url: 'view-source:' + tabs[0].url,
                index: (tabs[0].index || 0) + 1
              });
            }
          } catch (error) {
            console.error('MainController.handleCommand: Failed to view source:', error);
          }
          break;

        case 'nextCompletionResult':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id) {
              try {
                await chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'nextCompletionResult'
                });
              } catch (messageError) {
                // If message fails, create new tab
                await chrome.windows.create({ url: 'chrome://newtab' });
              }
            }
          } catch (error) {
            console.error('MainController.handleCommand: Failed to handle nextCompletionResult:', error);
          }
          break;

        case 'deleteBackWord':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id) {
              await chrome.tabs.sendMessage(tabs[0].id, { action: 'deleteBackWord' });
            }
          } catch (error) {
            console.error('MainController.handleCommand: Failed to handle deleteBackWord:', error);
          }
          break;

        case 'closeTab':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id) {
              await chrome.tabs.remove(tabs[0].id);
            }
          } catch (error) {
            console.error('MainController.handleCommand: Failed to close tab:', error);
          }
          break;

        case 'reloadTab':
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].id) {
              await chrome.tabs.reload(tabs[0].id);
            }
          } catch (error) {
            console.error('MainController.handleCommand: Failed to reload tab:', error);
          }
          break;

        case 'newTab':
          try {
            await chrome.tabs.create({
              url: chrome.runtime.getURL('pages/blank.html')
            });
          } catch (error) {
            console.error('MainController.handleCommand: Failed to create new tab:', error);
          }
          break;

        case 'restartcVim':
          try {
            chrome.runtime.reload();
          } catch (error) {
            console.error('MainController.handleCommand: Failed to restart extension:', error);
          }
          break;

        default:
          console.warn(`MainController.handleCommand: Unknown command: ${command}`);
          break;
      }
    } catch (error) {
      console.error(`MainController.handleCommand: Error handling command ${command}:`, error);
    }
  }

  /**
   * Initializes the main controller
   */
  private async initializeController(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Set up global httpRequest function
      if (typeof window !== 'undefined') {
        (window as any).httpRequest = this.createHttpRequest();
      } else {
        // In service worker context, attach to global scope
        (globalThis as any).httpRequest = this.createHttpRequest();
      }

      // Initialize sessions
      await this.initializeSessions();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      console.debug('MainController: Initialization complete');
    } catch (error) {
      console.error('MainController: Initialization failed:', error);
    }
  }

  /**
   * Gets controller statistics
   */
  getStats(): {
    sessions: number;
    activeTabs: number;
    tabHistory: number;
    activePorts: number;
    lastUsedTabs: number;
    initialized: boolean;
  } {
    return {
      sessions: Object.keys(this.sessions).length,
      activeTabs: Object.keys(this.activeTabs).length,
      tabHistory: Object.keys(this.tabHistory).length,
      activePorts: this.activePorts.length,
      lastUsedTabs: this.lastUsedTabs.length,
      initialized: this.initialized
    };
  }

  /**
   * Checks if the main controller is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const mainController = new MainController();

// For backward compatibility, expose global functions and variables
if (typeof window !== 'undefined') {
  // Browser context
  (window as any).sessions = mainController.sessions;
  (window as any).ActiveTabs = mainController.activeTabs;
  (window as any).TabHistory = mainController.tabHistory;
  (window as any).activePorts = mainController.activePorts;
  (window as any).LastUsedTabs = mainController.lastUsedTabs;
  (window as any).updateTabIndices = () => mainController.updateTabIndicesSync();
  (window as any).getTab = (tab: chrome.tabs.Tab, reverse?: boolean, count?: number, first?: boolean, last?: boolean) => 
    mainController.getTabSync(tab, reverse, count, first, last);
} else {
  // Service worker context
  (globalThis as any).sessions = mainController.sessions;
  (globalThis as any).ActiveTabs = mainController.activeTabs;
  (globalThis as any).TabHistory = mainController.tabHistory;
  (globalThis as any).activePorts = mainController.activePorts;
  (globalThis as any).LastUsedTabs = mainController.lastUsedTabs;
  (globalThis as any).updateTabIndices = () => mainController.updateTabIndicesSync();
  (globalThis as any).getTab = (tab: chrome.tabs.Tab, reverse?: boolean, count?: number, first?: boolean, last?: boolean) => 
    mainController.getTabSync(tab, reverse, count, first, last);
}

// Modern export for TypeScript modules
export default mainController;
export { 
  MainController, 
  SessionData, 
  ActiveTabsData, 
  TabHistoryData, 
  TabHistoryEntry, 
  HttpRequestOptions, 
  TabNavigationOptions,
  ExtensionMessage,
  PortMessage,
  TabIndicesMessage,
  CompletionMessage
};