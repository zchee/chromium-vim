// Chrome Extension Tab Creation Order - TypeScript conversion for Manifest v3

/**
 * Tab creation order tracking data structure
 */
interface TabCreationOrderData {
  [tabId: number]: number[];
}

/**
 * Tab context for order calculation
 */
interface TabOrderContext {
  id: number;
  index: number;
  windowId: number;
  pinned: boolean;
  incognito: boolean;
}

/**
 * Settings interface for tab order functionality
 */
interface TabOrderSettings {
  nativelinkorder: boolean;
  [key: string]: any;
}


// Global declarations for external dependencies
declare var settings: TabOrderSettings;

/**
 * Tab Creation Order Manager for Chrome Extension
 * 
 * Tracks the creation order of tabs to maintain proper ordering when
 * native link order settings are enabled. Compatible with Chrome
 * Extension Manifest v3.
 */
class TabCreationOrderManager {
  /** Tab creation order tracking data */
  private tabCreationOrder: TabCreationOrderData = {};
  
  /** Last active tab ID for reference */
  private lastActiveTabId: number | null = null;
  
  /** Whether the manager has been initialized */
  private initialized: boolean = false;

  constructor() {
    this.initializeManager();
  }

  /**
   * Handles tab activation events
   * 
   * @param activeInfo Tab activation information
   */
  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    try {
      this.lastActiveTabId = activeInfo.tabId;
      console.debug(`TabCreationOrderManager.handleTabActivated: Tab ${activeInfo.tabId} activated`);
    } catch (error) {
      console.error('TabCreationOrderManager.handleTabActivated: Error handling tab activation:', error);
    }
  }

  /**
   * Handles tab creation events
   * 
   * @param tab Newly created tab information
   */
  private handleTabCreated(tab: chrome.tabs.Tab): void {
    try {
      if (!tab.id) {
        console.warn('TabCreationOrderManager.handleTabCreated: Tab created without ID');
        return;
      }

      // Initialize creation order for the new tab
      this.tabCreationOrder[tab.id] = [];

      // Track creation relationship with last active tab
      if (this.lastActiveTabId !== null) {
        if (this.tabCreationOrder[this.lastActiveTabId] === undefined) {
          this.tabCreationOrder[this.lastActiveTabId] = [];
        }
        
        const lastActiveTabOrder = this.tabCreationOrder[this.lastActiveTabId];
        if (lastActiveTabOrder) {
          lastActiveTabOrder.push(tab.id);
          console.debug(`TabCreationOrderManager.handleTabCreated: Tab ${tab.id} created from tab ${this.lastActiveTabId}`);
        }
      }
    } catch (error) {
      console.error('TabCreationOrderManager.handleTabCreated: Error handling tab creation:', error);
    }
  }

  /**
   * Handles tab removal events
   * 
   * @param tabId ID of the removed tab
   * @param _removeInfo Additional removal information (unused)
   */
  private handleTabRemoved(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo): void {
    try {
      // Clean up references to the removed tab
      if (this.tabCreationOrder[tabId] !== undefined) {
        // Remove references from other tabs' creation lists
        Object.keys(this.tabCreationOrder).forEach((parentTabId: string) => {
          const parentId = parseInt(parentTabId, 10);
          if (parentId !== tabId && this.tabCreationOrder[parentId]) {
            const childIndex = this.tabCreationOrder[parentId].indexOf(tabId);
            if (childIndex !== -1) {
              this.tabCreationOrder[parentId].splice(childIndex, 1);
            }
          }
        });

        // Remove the tab's own creation order data
        delete this.tabCreationOrder[tabId];
        console.debug(`TabCreationOrderManager.handleTabRemoved: Tab ${tabId} removed and cleaned up`);
      }

      // Reset last active tab ID if it was the removed tab
      if (this.lastActiveTabId === tabId) {
        this.lastActiveTabId = null;
      }
    } catch (error) {
      console.error('TabCreationOrderManager.handleTabRemoved: Error handling tab removal:', error);
    }
  }

  /**
   * Calculates the tab order index for a given tab
   * 
   * When native link order is enabled, returns the tab's index plus
   * the number of child tabs it has created plus one. Otherwise,
   * returns the standard tab index plus one.
   * 
   * @param tab Tab context for order calculation
   * @returns Calculated tab order index
   */
  getTabOrderIndex(tab: TabOrderContext | chrome.tabs.Tab): number {
    try {
      // Validate input tab
      if (!tab || typeof tab.id !== 'number' || typeof tab.index !== 'number') {
        console.warn('TabCreationOrderManager.getTabOrderIndex: Invalid tab provided:', tab);
        return 1; // Default fallback
      }

      // Check if native link order is enabled
      const useNativeLinkOrder = typeof settings !== 'undefined' && 
                                settings && 
                                settings.nativelinkorder === true;

      const tabCreationData = this.tabCreationOrder[tab.id];
      if (useNativeLinkOrder && tabCreationData) {
        const childTabsCount = tabCreationData.length;
        const orderIndex = tab.index + childTabsCount + 1;
        
        console.debug(`TabCreationOrderManager.getTabOrderIndex: Tab ${tab.id} native order index: ${orderIndex} (base: ${tab.index}, children: ${childTabsCount})`);
        return orderIndex;
      }

      const standardIndex = tab.index + 1;
      console.debug(`TabCreationOrderManager.getTabOrderIndex: Tab ${tab.id} standard order index: ${standardIndex}`);
      return standardIndex;
    } catch (error) {
      console.error('TabCreationOrderManager.getTabOrderIndex: Error calculating tab order:', error);
      return (tab?.index || 0) + 1; // Safe fallback
    }
  }

  /**
   * Sets up Chrome Extension event listeners
   */
  private setupEventListeners(): void {
    try {
      // Tab activation listener
      chrome.tabs.onActivated.addListener((activeInfo: chrome.tabs.TabActiveInfo) => {
        this.handleTabActivated(activeInfo);
      });

      // Tab creation listener
      chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => {
        this.handleTabCreated(tab);
      });

      // Tab removal listener
      chrome.tabs.onRemoved.addListener((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
        this.handleTabRemoved(tabId, removeInfo);
      });

      console.debug('TabCreationOrderManager.setupEventListeners: Event listeners registered');
    } catch (error) {
      console.error('TabCreationOrderManager.setupEventListeners: Failed to setup event listeners:', error);
    }
  }

  /**
   * Initializes the tab creation order manager
   */
  private initializeManager(): void {
    if (this.initialized) {
      return;
    }

    try {
      this.setupEventListeners();
      this.initialized = true;
      console.debug('TabCreationOrderManager: Initialization complete');
    } catch (error) {
      console.error('TabCreationOrderManager: Initialization failed:', error);
    }
  }

  /**
   * Gets manager statistics for debugging
   * 
   * @returns Statistics object
   */
  getStats(): {
    initialized: boolean;
    trackedTabs: number;
    lastActiveTabId: number | null;
    totalChildTabs: number;
  } {
    const totalChildTabs = Object.values(this.tabCreationOrder)
      .reduce((total, children) => total + children.length, 0);

    return {
      initialized: this.initialized,
      trackedTabs: Object.keys(this.tabCreationOrder).length,
      lastActiveTabId: this.lastActiveTabId,
      totalChildTabs
    };
  }

  /**
   * Clears all tracking data (useful for testing or reset)
   */
  clearTracking(): void {
    this.tabCreationOrder = {};
    this.lastActiveTabId = null;
    console.debug('TabCreationOrderManager.clearTracking: All tracking data cleared');
  }

  /**
   * Gets the creation order data for a specific tab
   * 
   * @param tabId Tab ID to get data for
   * @returns Array of child tab IDs or null if not found
   */
  getTabCreationData(tabId: number): number[] | null {
    return this.tabCreationOrder[tabId] || null;
  }

  /**
   * Checks if the manager is ready
   * 
   * @returns Whether the manager is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const tabCreationOrderManager = new TabCreationOrderManager();

/**
 * Legacy function for backward compatibility
 * 
 * @param tab Tab object or context
 * @returns Tab order index
 * @deprecated Use tabCreationOrderManager.getTabOrderIndex() instead
 */
const getTabOrderIndex = (tab: TabOrderContext | chrome.tabs.Tab): number => {
  return tabCreationOrderManager.getTabOrderIndex(tab);
};

// For backward compatibility, expose global function
if (typeof window !== 'undefined') {
  (window as any).getTabOrderIndex = getTabOrderIndex;
} else {
  // Service worker context
  (globalThis as any).getTabOrderIndex = getTabOrderIndex;
}

// Modern export for TypeScript modules
export default tabCreationOrderManager;
export { 
  TabCreationOrderManager, 
  getTabOrderIndex,
  TabCreationOrderData,
  TabOrderContext,
  TabOrderSettings
};