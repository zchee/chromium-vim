// Chrome Extension Sessions - TypeScript conversion for Manifest v3

// Chrome Extension messaging functions (defined in messenger.ts)
declare function RUNTIME(action: string, args?: any, callback?: (response?: any) => void): void;

/**
 * Recently closed session entry
 */
interface RecentlyClosedSession {
  id: string;
  title: string;
  url: string;
}

/**
 * Tab history entry for session restoration
 */
interface TabHistoryEntry {
  id: number;
  index: number;
  pinned: boolean;
  active: boolean;
  url: string;
  windowId: number;
}

/**
 * Tab history organized by window ID
 */
interface TabHistoryData {
  [windowId: number]: TabHistoryEntry[];
}

/**
 * Active tabs structure for tracking
 */
interface ActiveTabsData {
  [windowId: number]: {
    [tabId: number]: chrome.tabs.Tab;
  };
}

/**
 * Chrome sessions API extension for restored sessions
 */
interface ChromeSessionEntry {
  tab?: {
    sessionId: string;
    title: string;
    url: string;
  };
  window?: {
    sessionId: string;
    tabs: chrome.tabs.Tab[];
  };
}

/**
 * Sessions manager class for handling Chrome Extension session functionality
 * 
 * Manages session restoration, tab history tracking, and recently closed tabs.
 * Supports both native Chrome sessions API and fallback manual tracking.
 * Compatible with Chrome Extension Manifest v3.
 */
class SessionsManager {
  /** Whether Chrome native sessions API is available */
  public nativeSessions: boolean = false;

  /** Recently closed sessions list */
  public recentlyClosed: RecentlyClosedSession[] = [];

  /** Current index for session restoration */
  public sessionIndex: number = 0;

  /** Tab history organized by window ID */
  public tabHistory: TabHistoryData = {};

  /** Active tabs tracking (fallback mode) */
  public activeTabs: ActiveTabsData = {};

  /** Whether the sessions manager has been initialized */
  private initialized: boolean = false;

  constructor() {
    this.initializeSessions();
  }

  /**
   * Updates the recently closed sessions list
   * 
   * Fetches the latest closed sessions from Chrome and filters for valid tab sessions.
   */
  async onChanged(): Promise<void> {
    if (!this.nativeSessions || !chrome.sessions?.getRecentlyClosed) {
      console.debug('SessionsManager.onChanged: Native sessions not available');
      return;
    }

    try {
      const sessions = await new Promise<chrome.sessions.Session[]>((resolve, reject) => {
        chrome.sessions.getRecentlyClosed((sessions: chrome.sessions.Session[]) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(sessions);
          }
        });
      });

      this.recentlyClosed = sessions
        .filter((session: chrome.sessions.Session) => 
          session.tab && (session.tab as any).sessionId
        )
        .map((session: chrome.sessions.Session) => ({
          id: (session.tab as any).sessionId,
          title: session.tab!.title || '',
          url: session.tab!.url || ''
        }));

      this.sessionIndex = 0;
      console.debug('SessionsManager.onChanged: Updated recently closed sessions', this.recentlyClosed.length);
    } catch (error) {
      console.error('SessionsManager.onChanged: Failed to get recently closed sessions:', error);
    }
  }

  /**
   * Legacy synchronous version of onChanged for backward compatibility
   * 
   * @deprecated Use async onChanged() method instead
   */
  onChangedSync(): void {
    if (!this.nativeSessions || !chrome.sessions?.getRecentlyClosed) {
      console.debug('SessionsManager.onChangedSync: Native sessions not available');
      return;
    }

    chrome.sessions.getRecentlyClosed((sessions: chrome.sessions.Session[]) => {
      if (chrome.runtime.lastError) {
        console.error('SessionsManager.onChangedSync: Error getting recently closed:', chrome.runtime.lastError);
        return;
      }

      this.recentlyClosed = sessions
        .filter((session: chrome.sessions.Session) => 
          session.tab && (session.tab as any).sessionId
        )
        .map((session: chrome.sessions.Session) => ({
          id: (session.tab as any).sessionId,
          title: session.tab!.title || '',
          url: session.tab!.url || ''
        }));

      this.sessionIndex = 0;
    });
  }

  /**
   * Restores a previously closed session using Chrome's native sessions API
   */
  async nativeStepBack(): Promise<void> {
    if (!this.nativeSessions || !chrome.sessions?.restore) {
      console.warn('SessionsManager.nativeStepBack: Native sessions not available');
      return;
    }

    try {
      if (this.sessionIndex < this.recentlyClosed.length) {
        const sessionToRestore = this.recentlyClosed[this.sessionIndex++];
        if (!sessionToRestore) {
          console.warn('SessionsManager.nativeStepBack: Invalid session to restore');
          return;
        }
        
        const sessionId = sessionToRestore.id;
        
        await new Promise<void>((resolve, reject) => {
          chrome.sessions.restore(sessionId, (_restoredSession?: chrome.sessions.Session) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        console.debug('SessionsManager.nativeStepBack: Restored session', sessionId);
      } else {
        console.debug('SessionsManager.nativeStepBack: No more sessions to restore');
      }
    } catch (error) {
      console.error('SessionsManager.nativeStepBack: Failed to restore session:', error);
    }
  }

  /**
   * Legacy synchronous version of nativeStepBack for backward compatibility
   * 
   * @deprecated Use async nativeStepBack() method instead
   */
  nativeStepBackSync(): void {
    if (!this.nativeSessions || !chrome.sessions?.restore) {
      console.warn('SessionsManager.nativeStepBackSync: Native sessions not available');
      return;
    }

    if (this.sessionIndex < this.recentlyClosed.length) {
      const sessionToRestore = this.recentlyClosed[this.sessionIndex++];
      if (!sessionToRestore) {
        console.warn('SessionsManager.nativeStepBackSync: Invalid session to restore');
        return;
      }
      
      const sessionId = sessionToRestore.id;
      chrome.sessions.restore(sessionId, () => {
        if (chrome.runtime.lastError) {
          console.error('SessionsManager.nativeStepBackSync: Error restoring session:', chrome.runtime.lastError);
        }
      });
    }
  }

  /**
   * Restores a tab from manual tab history (fallback mode)
   * 
   * @param sender Message sender information containing tab context
   */
  async stepBack(sender: chrome.runtime.MessageSender): Promise<void> {
    if (!sender.tab?.windowId) {
      console.warn('SessionsManager.stepBack: Invalid sender tab information');
      return;
    }

    const windowId = sender.tab.windowId;

    try {
      if (Object.keys(this.tabHistory).length === 0) {
        console.debug('SessionsManager.stepBack: No tab history available');
        return;
      }

      if (!this.tabHistory[windowId] || this.tabHistory[windowId].length === 0) {
        console.debug('SessionsManager.stepBack: No tab history for window', windowId);
        return;
      }

      const lastTab = this.tabHistory[windowId].pop();
      if (!lastTab) {
        console.debug('SessionsManager.stepBack: No tab to restore from history');
        return;
      }

      await chrome.tabs.create({
        active: true,
        index: lastTab.index,
        pinned: lastTab.pinned,
        url: lastTab.url
      });

      console.debug('SessionsManager.stepBack: Restored tab from history', lastTab.url);
    } catch (error) {
      console.error('SessionsManager.stepBack: Failed to restore tab from history:', error);
    }
  }

  /**
   * Legacy synchronous version of stepBack for backward compatibility
   * 
   * @param sender Message sender information containing tab context
   * @deprecated Use async stepBack() method instead
   */
  stepBackSync(sender: chrome.runtime.MessageSender): void {
    if (!sender.tab?.windowId) {
      console.warn('SessionsManager.stepBackSync: Invalid sender tab information');
      return;
    }

    const windowId = sender.tab.windowId;

    if (Object.keys(this.tabHistory).length === 0) {
      console.debug('SessionsManager.stepBackSync: No tab history available');
      return;
    }

    if (!this.tabHistory[windowId] || this.tabHistory[windowId].length === 0) {
      console.debug('SessionsManager.stepBackSync: No tab history for window', windowId);
      return;
    }

    const lastTab = this.tabHistory[windowId].pop();
    if (!lastTab) {
      console.debug('SessionsManager.stepBackSync: No tab to restore from history');
      return;
    }

    chrome.tabs.create({
      active: true,
      index: lastTab.index,
      pinned: lastTab.pinned,
      url: lastTab.url
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('SessionsManager.stepBackSync: Error creating tab:', chrome.runtime.lastError);
      }
    });
  }

  /**
   * Sets up event listeners for session management
   */
  private setupEventListeners(): void {
    if (this.nativeSessions) {
      // Use Chrome native sessions API
      if (chrome.sessions.onChanged) {
        chrome.sessions.onChanged.addListener(() => {
          this.onChangedSync();
        });
      } else {
        // Fallback for older Chrome versions without onChanged
        chrome.tabs.onRemoved.addListener(() => {
          this.onChangedSync();
        });
      }

      // Initialize sessions
      this.onChangedSync();
    } else {
      // Fallback mode - manual tab tracking
      this.setupFallbackTracking();
    }

    console.debug('SessionsManager.setupEventListeners: Event listeners registered');
  }

  /**
   * Sets up fallback tab tracking for browsers without native sessions API
   */
  private setupFallbackTracking(): void {
    // Track removed tabs
    chrome.tabs.onRemoved.addListener((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
    });

    // Track updated tabs
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    console.debug('SessionsManager.setupFallbackTracking: Fallback tracking enabled');
  }

  /**
   * Handles tab removal events for fallback tracking
   * 
   * @param tabId ID of the removed tab
   * @param removeInfo Tab removal information
   */
  private handleTabRemoved(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo): void {
    try {
      // Search through active tabs to find the removed tab
      for (const windowId in this.activeTabs) {
        const windowIdNum = parseInt(windowId, 10);
        const windowTabs = this.activeTabs[windowIdNum];

        if (windowTabs && windowTabs[tabId]) {
          const removedTab = windowTabs[tabId];

          // Initialize tab history for window if needed
          if (removedTab.windowId !== undefined) {
            const windowId = removedTab.windowId;
            if (!this.tabHistory[windowId]) {
              this.tabHistory[windowId] = [];
            }

            // Add to tab history
            if (removedTab.id !== undefined) {
              const tabHistoryEntry = this.tabHistory[windowId];
              if (tabHistoryEntry) {
                tabHistoryEntry.push({
                  id: removedTab.id,
                  index: removedTab.index,
                  pinned: removedTab.pinned,
                  active: removedTab.active,
                  url: removedTab.url || '',
                  windowId: removedTab.windowId
                });
              }
            }
          }

          // Remove from active tabs
          delete windowTabs[tabId];
          break;
        }
      }
    } catch (error) {
      console.error('SessionsManager.handleTabRemoved: Error handling tab removal:', error);
    }
  }

  /**
   * Handles tab update events for fallback tracking
   * 
   * @param tabId ID of the updated tab
   * @param changeInfo Tab change information
   * @param tab Updated tab information
   */
  private handleTabUpdated(tabId: number, _changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab): void {
    try {
      chrome.tabs.get(tabId, (updatedTab: chrome.tabs.Tab) => {
        if (chrome.runtime.lastError) {
          // Tab may have been removed - ignore error
          return;
        }

        if (!updatedTab.windowId) {
          return;
        }

        // Initialize window tracking if needed
        if (!this.activeTabs[updatedTab.windowId]) {
          this.activeTabs[updatedTab.windowId] = {};
        }

        // Update active tabs tracking
        if (updatedTab.id !== undefined && updatedTab.windowId !== undefined) {
          const windowTabs = this.activeTabs[updatedTab.windowId];
          if (windowTabs) {
            windowTabs[updatedTab.id] = updatedTab;
          }
        }
      });
    } catch (error) {
      // Ignore errors for tabs that have already been removed
      console.debug('SessionsManager.handleTabUpdated: Tab update error (tab may be removed):', error);
    }
  }

  /**
   * Detects Chrome sessions API availability and initializes appropriate mode
   */
  private detectSessionsSupport(): boolean {
    try {
      return !!(chrome && chrome.sessions && typeof chrome.sessions.getRecentlyClosed === 'function');
    } catch (error) {
      console.debug('SessionsManager.detectSessionsSupport: Sessions API not available:', error);
      return false;
    }
  }

  /**
   * Initializes the sessions manager
   */
  private initializeSessions(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Detect Chrome sessions API support
      this.nativeSessions = this.detectSessionsSupport();

      console.debug('SessionsManager.initializeSessions: Native sessions support:', this.nativeSessions);

      // Set up appropriate event listeners
      this.setupEventListeners();

      this.initialized = true;
      console.debug('SessionsManager: Initialization complete');
    } catch (error) {
      console.error('SessionsManager: Initialization failed:', error);
    }
  }

  /**
   * Gets sessions manager statistics
   * 
   * @returns Statistics object
   */
  getStats(): {
    nativeSessions: boolean;
    recentlyClosedCount: number;
    sessionIndex: number;
    tabHistoryWindows: number;
    activeTabsWindows: number;
    initialized: boolean;
  } {
    return {
      nativeSessions: this.nativeSessions,
      recentlyClosedCount: this.recentlyClosed.length,
      sessionIndex: this.sessionIndex,
      tabHistoryWindows: Object.keys(this.tabHistory).length,
      activeTabsWindows: Object.keys(this.activeTabs).length,
      initialized: this.initialized
    };
  }

  /**
   * Clears all session history
   */
  clearHistory(): void {
    this.tabHistory = {};
    this.recentlyClosed = [];
    this.sessionIndex = 0;
    console.debug('SessionsManager.clearHistory: Session history cleared');
  }

  /**
   * Gets tab history for a specific window
   * 
   * @param windowId Window ID to get history for
   * @returns Tab history for the window
   */
  getTabHistory(windowId: number): TabHistoryEntry[] {
    return this.tabHistory[windowId] || [];
  }

  /**
   * Gets recently closed sessions
   * 
   * @returns Array of recently closed sessions
   */
  getRecentlyClosed(): RecentlyClosedSession[] {
    return [...this.recentlyClosed];
  }

  /**
   * Checks if the sessions manager is ready
   * 
   * @returns Whether the manager is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const Sessions = new SessionsManager();

// For backward compatibility, expose global object and variables
const sessionsLegacy = {
  nativeSessions: Sessions.nativeSessions,
  recentlyClosed: Sessions.recentlyClosed,
  sessionIndex: Sessions.sessionIndex,
  onChanged: () => Sessions.onChangedSync(),
  nativeStepBack: () => Sessions.nativeStepBackSync(),
  stepBack: (sender: chrome.runtime.MessageSender) => Sessions.stepBackSync(sender)
};

// Legacy global tabHistory variable
const tabHistory = Sessions.tabHistory;

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Sessions = sessionsLegacy;
  (window as any).tabHistory = tabHistory;
} else {
  // Service worker context
  (globalThis as any).Sessions = sessionsLegacy;
  (globalThis as any).tabHistory = tabHistory;
}

// Modern export for TypeScript modules
export default Sessions;
export { 
  SessionsManager, 
  RecentlyClosedSession,
  TabHistoryEntry,
  TabHistoryData,
  ActiveTabsData,
  ChromeSessionEntry,
  sessionsLegacy,
  tabHistory
};