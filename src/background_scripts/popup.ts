// Chrome Extension Popup - TypeScript conversion for Manifest v3

/**
 * Popup request context for method calls
 */
interface PopupRequestContext {
  callback: (response?: any) => void;
  request?: PopupRequest;
  sender?: chrome.runtime.MessageSender;
}

/**
 * Popup action request
 */
interface PopupRequest {
  action: string;
  singleTab?: boolean;
  blacklisted?: boolean;
}

/**
 * Popup message for runtime communication
 */
interface PopupMessage {
  action: string;
  [key: string]: any;
}

/**
 * Settings interface (external dependency)
 */
interface Settings {
  blacklists: string[];
  [key: string]: any;
}

/**
 * Utils module interface (external dependency)
 */
interface UtilsModule {
  compressArray: <T>(array: T[]) => T[];
}

/**
 * Options module interface (external dependency)
 */
interface OptionsModule {
  saveSettings: (options: { settings: Settings }) => void;
  updateBlacklistsMappings: () => void;
}

/**
 * URL matching function (external dependency)
 */
type MatchLocationFunction = (url: string, pattern: string) => boolean;

// Global declarations for external dependencies
declare var settings: Settings;
declare var Utils: UtilsModule;
declare var Options: OptionsModule;
declare var matchLocation: MatchLocationFunction;

/**
 * Popup manager class for handling Chrome Extension popup functionality
 * 
 * Manages icon states, blacklist functionality, and extension enable/disable states.
 * Compatible with Chrome Extension Manifest v3 using chrome.action API.
 */
class PopupManager {
  /** Whether the extension is globally active */
  public active: boolean = true;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Checks if the current tab is blacklisted
   * 
   * @param callback Callback to receive blacklist status
   */
  async getBlacklisted(callback: (isBlacklisted: boolean) => void | { callback: (isBlacklisted: boolean) => void }): Promise<void> {
    let actualCallback: (isBlacklisted: boolean) => void;
    
    try {
      if (typeof callback === 'object' && callback && 'callback' in callback) {
        actualCallback = (callback as any).callback;
      } else {
        actualCallback = callback as (isBlacklisted: boolean) => void;
      }

      const blacklists = Utils.compressArray(settings.blacklists);
      const tab = await this.getActiveTab();
      
      if (!tab?.url) {
        actualCallback(false);
        return;
      }

      const isBlacklisted = blacklists.some((pattern: string) => 
        tab.url ? matchLocation(tab.url, pattern) : false
      );
      
      actualCallback(isBlacklisted);
    } catch (error) {
      console.error('PopupManager.getBlacklisted: Failed to check blacklist status:', error);
      if (actualCallback!) {
        actualCallback(false);
      }
    }
  }

  /**
   * Legacy synchronous version of getBlacklisted for backward compatibility
   * 
   * @param context Popup request context
   * @deprecated Use async getBlacklisted() method instead
   */
  getBlacklistedSync(context: PopupRequestContext): void {
    let actualCallback = context.callback;
    if (typeof context.callback === 'object' && context.callback && 'callback' in context.callback) {
      actualCallback = (context.callback as any).callback;
    }

    const blacklists = Utils.compressArray(settings.blacklists);
    this.getActiveTabSync((tab: chrome.tabs.Tab) => {
      if (!tab?.url) {
        actualCallback(false);
        return;
      }

      const isBlacklisted = blacklists.some((pattern: string) => 
        tab.url ? matchLocation(tab.url, pattern) : false
      );
      
      actualCallback(isBlacklisted);
    });
  }

  /**
   * Gets the currently active tab
   * 
   * @returns Promise resolving to the active tab
   */
  async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (error) {
      console.error('PopupManager.getActiveTab: Failed to get active tab:', error);
      return null;
    }
  }

  /**
   * Legacy synchronous version of getActiveTab for backward compatibility
   * 
   * @param callback Callback to receive the active tab
   * @deprecated Use async getActiveTab() method instead
   */
  getActiveTabSync(callback: (tab: chrome.tabs.Tab) => void): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (chrome.runtime.lastError) {
        console.error('PopupManager.getActiveTabSync: Error querying tabs:', chrome.runtime.lastError);
        return;
      }
      
      if (tabs[0]) {
        callback(tabs[0]);
      }
    });
  }

  /**
   * Sets the extension icon to disabled state
   */
  async setIconDisabled(): Promise<void> {
    try {
      const tab = await this.getActiveTab();
      if (!tab?.id) {
        console.warn('PopupManager.setIconDisabled: No active tab found');
        return;
      }

      await chrome.action.setIcon({
        path: 'icons/disabled.png',
        tabId: tab.id
      });
    } catch (error) {
      console.error('PopupManager.setIconDisabled: Failed to set disabled icon:', error);
    }
  }

  /**
   * Legacy synchronous version of setIconDisabled for backward compatibility
   * 
   * @deprecated Use async setIconDisabled() method instead
   */
  setIconDisabledSync(): void {
    this.getActiveTabSync((tab: chrome.tabs.Tab) => {
      if (tab?.id) {
        chrome.action.setIcon({
          path: 'icons/disabled.png',
          tabId: tab.id
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('PopupManager.setIconDisabledSync: Error setting icon:', chrome.runtime.lastError);
          }
        });
      }
    });
  }

  /**
   * Sets the extension icon to enabled state
   * 
   * @param context Optional popup request context with sender information
   */
  async setIconEnabled(context?: PopupRequestContext): Promise<void> {
    try {
      if (context?.sender?.tab?.id) {
        await chrome.action.setIcon({
          path: 'icons/38.png',
          tabId: context.sender.tab.id
        });
        return;
      }

      const tab = await this.getActiveTab();
      if (!tab?.id) {
        console.warn('PopupManager.setIconEnabled: No active tab found');
        return;
      }

      await chrome.action.setIcon({
        path: 'icons/38.png',
        tabId: tab.id
      });
    } catch (error) {
      console.error('PopupManager.setIconEnabled: Failed to set enabled icon:', error);
    }
  }

  /**
   * Legacy synchronous version of setIconEnabled for backward compatibility
   * 
   * @param context Optional popup request context with sender information
   * @deprecated Use async setIconEnabled() method instead
   */
  setIconEnabledSync(context?: PopupRequestContext): void {
    if (context?.sender?.tab?.id) {
      chrome.action.setIcon({
        path: 'icons/38.png',
        tabId: context.sender.tab.id
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('PopupManager.setIconEnabledSync: Error setting icon:', chrome.runtime.lastError);
        }
      });
      return;
    }

    this.getActiveTabSync((tab: chrome.tabs.Tab) => {
      if (tab?.id) {
        chrome.action.setIcon({
          path: 'icons/38.png',
          tabId: tab.id
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('PopupManager.setIconEnabledSync: Error setting icon:', chrome.runtime.lastError);
          }
        });
      }
    });
  }

  /**
   * Gets the current active state of the extension
   * 
   * @param context Popup request context
   */
  getActiveState(context: PopupRequestContext): void {
    context.callback(this.active);
  }

  /**
   * Toggles the enabled state of the extension
   * 
   * @param context Popup request context
   */
  async toggleEnabled(context: PopupRequestContext): Promise<void> {
    try {
      const request = context.request;
      
      if (request?.singleTab) {
        const tab = await this.getActiveTab();
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled' });
        }

        if (request.blacklisted) {
          await this.setIconDisabled();
        } else {
          await this.setIconEnabled();
        }
        return;
      }

      // Toggle global state
      this.active = !this.active;
      const tabs = await chrome.tabs.query({});
      
      if (!request?.blacklisted) {
        const updatePromises = tabs.map(async (tab: chrome.tabs.Tab) => {
          if (!tab.id) return;

          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled' });
            
            const iconPath = this.active ? 'icons/38.png' : 'icons/disabled.png';
            await chrome.action.setIcon({ path: iconPath, tabId: tab.id });
          } catch (error) {
            console.debug(`PopupManager.toggleEnabled: Could not update tab ${tab.id}:`, error);
          }
        });

        await Promise.allSettled(updatePromises);
      }
    } catch (error) {
      console.error('PopupManager.toggleEnabled: Failed to toggle enabled state:', error);
    }
  }

  /**
   * Legacy synchronous version of toggleEnabled for backward compatibility
   * 
   * @param context Popup request context
   * @deprecated Use async toggleEnabled() method instead
   */
  toggleEnabledSync(context: PopupRequestContext): void {
    const request = context.request;
    
    if (request?.singleTab) {
      this.getActiveTabSync((tab: chrome.tabs.Tab) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled' }, () => {
            if (chrome.runtime.lastError) {
              console.debug('PopupManager.toggleEnabledSync: Could not send message to tab');
            }
          });
        }
      });

      if (request.blacklisted) {
        this.setIconDisabledSync();
      } else {
        this.setIconEnabledSync();
      }
      return;
    }

    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      if (chrome.runtime.lastError) {
        console.error('PopupManager.toggleEnabledSync: Error querying tabs:', chrome.runtime.lastError);
        return;
      }

      this.active = !this.active;
      
      if (!request?.blacklisted) {
        tabs.forEach((tab: chrome.tabs.Tab) => {
          if (!tab.id) return;

          chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled' }, () => {
            if (chrome.runtime.lastError) {
              console.debug(`PopupManager.toggleEnabledSync: Could not send message to tab ${tab.id}`);
            }
          });

          const iconPath = this.active ? 'icons/38.png' : 'icons/disabled.png';
          chrome.action.setIcon({ path: iconPath, tabId: tab.id }, () => {
            if (chrome.runtime.lastError) {
              console.debug(`PopupManager.toggleEnabledSync: Could not set icon for tab ${tab.id}`);
            }
          });
        });
      }
    });
  }

  /**
   * Toggles the blacklist status of the current domain
   */
  async toggleBlacklisted(): Promise<void> {
    try {
      const blacklists = Utils.compressArray(settings.blacklists);
      const tab = await this.getActiveTab();
      
      if (!tab?.url) {
        console.warn('PopupManager.toggleBlacklisted: No active tab URL found');
        return;
      }

      let foundMatch = false;
      
      // Remove from blacklist if found
      for (let i = blacklists.length - 1; i >= 0; i--) {
        if (matchLocation(tab.url, blacklists[i])) {
          blacklists.splice(i, 1);
          foundMatch = true;
        }
      }

      // Add to blacklist if not found
      if (!foundMatch) {
        try {
          const url = new URL(tab.url);
          blacklists.push(`${url.protocol}//${url.hostname}/*`);
        } catch (urlError) {
          console.error('PopupManager.toggleBlacklisted: Invalid URL:', urlError);
          return;
        }
      }

      settings.blacklists = blacklists;
      Options.saveSettings({ settings });
      Options.updateBlacklistsMappings();
    } catch (error) {
      console.error('PopupManager.toggleBlacklisted: Failed to toggle blacklist:', error);
    }
  }

  /**
   * Legacy synchronous version of toggleBlacklisted for backward compatibility
   * 
   * @deprecated Use async toggleBlacklisted() method instead
   */
  toggleBlacklistedSync(): void {
    const blacklists = Utils.compressArray(settings.blacklists);
    
    this.getActiveTabSync((tab: chrome.tabs.Tab) => {
      if (!tab?.url) {
        console.warn('PopupManager.toggleBlacklistedSync: No active tab URL found');
        return;
      }

      let foundMatch = false;
      
      // Remove from blacklist if found
      for (let i = blacklists.length - 1; i >= 0; i--) {
        if (matchLocation(tab.url, blacklists[i])) {
          blacklists.splice(i, 1);
          foundMatch = true;
        }
      }

      // Add to blacklist if not found
      if (!foundMatch) {
        try {
          const url = new URL(tab.url);
          blacklists.push(`${url.protocol}//${url.hostname}/*`);
        } catch (urlError) {
          console.error('PopupManager.toggleBlacklistedSync: Invalid URL:', urlError);
          return;
        }
      }

      settings.blacklists = blacklists;
      Options.saveSettings({ settings });
      Options.updateBlacklistsMappings();
    });
  }

  /**
   * Sets up Chrome Extension event listeners for popup functionality
   */
  private setupEventListeners(): void {
    // Port connection listener
    chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
      if (port.name === 'popup') {
        port.onMessage.addListener((request: PopupMessage) => {
          this.handlePortMessage(request, port);
        });
      }
    });

    // Runtime message listener
    chrome.runtime.onMessage.addListener((request: PopupMessage, sender: chrome.runtime.MessageSender, callback: (response?: any) => void) => {
      return this.handleRuntimeMessage(request, sender, callback);
    });

    console.debug('PopupManager: Event listeners registered');
  }

  /**
   * Handles port-based messages
   * 
   * @param request Message request
   * @param port Chrome runtime port
   */
  private handlePortMessage(request: PopupMessage, port: chrome.runtime.Port): void {
    if (this.hasMethod(request.action)) {
      try {
        const context: PopupRequestContext = {
          callback: (response: any) => {
            port.postMessage(response);
          },
          request: request as PopupRequest,
          sender: port.sender
        };

        const method = (this as any)[request.action];
        if (typeof method === 'function') {
          method.call(this, context);
        }
      } catch (error) {
        console.error(`PopupManager.handlePortMessage: Error handling ${request.action}:`, error);
      }
    }
  }

  /**
   * Handles runtime-based messages
   * 
   * @param request Message request
   * @param sender Message sender
   * @param callback Response callback
   * @returns Whether the message was handled asynchronously
   */
  private handleRuntimeMessage(request: PopupMessage, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean {
    if (!this.hasMethod(request.action)) {
      return false;
    }

    if (!sender.tab) {
      return false;
    }

    try {
      const context: PopupRequestContext = {
        callback,
        request: request as PopupRequest,
        sender
      };

      const method = (this as any)[request.action];
      if (typeof method === 'function') {
        method.call(this, context);
        return true;
      }
    } catch (error) {
      console.error(`PopupManager.handleRuntimeMessage: Error handling ${request.action}:`, error);
      callback({ error: error instanceof Error ? error.message : 'Unknown error' });
    }

    return false;
  }

  /**
   * Checks if the popup manager has a specific method
   * 
   * @param methodName Method name to check
   * @returns Whether the method exists
   */
  private hasMethod(methodName: string): boolean {
    return typeof (this as any)[methodName] === 'function';
  }

  /**
   * Gets popup manager statistics
   * 
   * @returns Statistics object
   */
  getStats(): {
    active: boolean;
    blacklistsCount: number;
  } {
    return {
      active: this.active,
      blacklistsCount: settings?.blacklists?.length || 0
    };
  }
}

// Create singleton instance
const Popup = new PopupManager();

// For backward compatibility, expose global object with legacy methods
const popupLegacy = {
  active: true,
  getBlacklisted: (context: PopupRequestContext) => Popup.getBlacklistedSync(context),
  getActiveTab: (callback: (tab: chrome.tabs.Tab) => void) => Popup.getActiveTabSync(callback),
  setIconDisabled: () => Popup.setIconDisabledSync(),
  setIconEnabled: (context?: PopupRequestContext) => Popup.setIconEnabledSync(context),
  getActiveState: (context: PopupRequestContext) => Popup.getActiveState(context),
  toggleEnabled: (context: PopupRequestContext) => Popup.toggleEnabledSync(context),
  toggleBlacklisted: () => Popup.toggleBlacklistedSync()
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Popup = popupLegacy;
} else {
  // Service worker context
  (globalThis as any).Popup = popupLegacy;
}

// Modern export for TypeScript modules
export default Popup;
export { 
  PopupManager, 
  PopupRequestContext,
  PopupRequest,
  PopupMessage,
  popupLegacy
};