// Chrome Extension History - TypeScript conversion for Manifest v3

/**
 * History types supported by the extension
 */
type HistoryType = 'action' | 'url' | 'search';

/**
 * Command history data structure
 */
interface CommandHistory {
  [key: string]: string[];
  action: string[];
  url: string[];
  search: string[];
}

/**
 * Chrome history item with weighted scoring
 */
interface WeightedHistoryItem extends chrome.history.HistoryItem {
  weight?: number;
  score?: number;
}

/**
 * History search parameters
 */
interface HistorySearchParams {
  search: string;
  limit: number;
  callback: (results: chrome.history.HistoryItem[], fromCache?: boolean) => void;
}

/**
 * Search array function interface (external dependency)
 */
interface SearchArrayFunction {
  (params: {
    array: any[];
    search: string;
    limit: number;
    fn: (item: any) => string;
  }): any[];
}

/**
 * Tab message for sending history data
 */
interface HistoryTabMessage {
  action: 'commandHistory';
  history: CommandHistory;
}

/**
 * Storage interface for localStorage operations
 */
interface HistoryStorage {
  [key: string]: string | undefined;
}

// Global searchArray function declaration
declare var searchArray: SearchArrayFunction;

/**
 * History manager class for handling command history and browser history
 * 
 * Manages three types of history: action, url, and search commands.
 * Provides weighted scoring for browser history items and caching.
 * Compatible with Chrome Extension Manifest v3.
 */
class HistoryManager {
  /** Supported history types */
  public readonly historyTypes: readonly HistoryType[] = ['action', 'url', 'search'] as const;
  
  /** Current search results (legacy property) */
  public searchResults: chrome.history.HistoryItem[] | null = null;
  
  /** Cached browser history with weighted scoring */
  public historyStore: WeightedHistoryItem[] = [];
  
  /** Command history organized by type */
  public commandHistory: CommandHistory = {
    action: [],
    url: [],
    search: []
  };
  
  /** Flag indicating if history store needs refreshing */
  public shouldRefresh: boolean = false;

  /** Maximum number of items to keep per history type */
  private readonly MAX_HISTORY_ITEMS = 500;

  /** Maximum number of history results to fetch from Chrome */
  private readonly MAX_CHROME_RESULTS = 2147483647;

  constructor() {
    this.initializeCommandHistory();
    this.scheduleHistoryRefresh();
  }

  /**
   * Saves command history to localStorage
   * 
   * Persists all command history types to browser storage for
   * restoration across extension sessions.
   */
  saveCommandHistory(): void {
    try {
      Object.keys(this.commandHistory).forEach((key: string) => {
        const historyType = key as HistoryType;
        if (this.historyTypes.includes(historyType)) {
          const data = JSON.stringify(this.commandHistory[historyType]);
          localStorage.setItem(key, data);
        }
      });
      console.debug('HistoryManager.saveCommandHistory: Command history saved to localStorage');
    } catch (error) {
      console.error('HistoryManager.saveCommandHistory: Failed to save command history:', error);
    }
  }

  /**
   * Clears all command history
   * 
   * Resets all history types to empty arrays and updates localStorage.
   */
  clear(): void {
    try {
      this.commandHistory = {
        action: [],
        url: [],
        search: []
      };

      // Clear localStorage for each history type
      this.historyTypes.forEach((type: HistoryType) => {
        try {
          localStorage.removeItem(type);
        } catch (error) {
          console.warn(`HistoryManager.clear: Failed to clear localStorage for ${type}:`, error);
        }
      });

      console.debug('HistoryManager.clear: All command history cleared');
    } catch (error) {
      console.error('HistoryManager.clear: Failed to clear history:', error);
    }
  }

  /**
   * Sends command history to all open tabs
   * 
   * Broadcasts current command history state to all tabs for
   * synchronization across content scripts.
   */
  async sendToTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      
      const message: HistoryTabMessage = {
        action: 'commandHistory',
        history: this.commandHistory
      };

      const sendPromises = tabs.map(async (tab: chrome.tabs.Tab) => {
        if (tab.id && typeof tab.id === 'number') {
          try {
            await chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // Ignore errors for tabs that can't receive messages (e.g., chrome:// pages)
            console.debug(`HistoryManager.sendToTabs: Could not send message to tab ${tab.id}:`, error);
          }
        }
      });

      await Promise.allSettled(sendPromises);
      console.debug('HistoryManager.sendToTabs: History sent to all tabs');
    } catch (error) {
      console.error('HistoryManager.sendToTabs: Failed to send history to tabs:', error);
    }
  }

  /**
   * Legacy synchronous version of sendToTabs for backward compatibility
   * 
   * @deprecated Use async sendToTabs() method instead
   */
  sendToTabsSync(): void {
    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      if (chrome.runtime.lastError) {
        console.error('HistoryManager.sendToTabsSync: Error querying tabs:', chrome.runtime.lastError);
        return;
      }

      const message: HistoryTabMessage = {
        action: 'commandHistory',
        history: this.commandHistory
      };

      tabs.forEach((tab: chrome.tabs.Tab) => {
        if (tab.id && typeof tab.id === 'number') {
          chrome.tabs.sendMessage(tab.id, message, () => {
            // Ignore chrome.runtime.lastError for tabs that can't receive messages
            if (chrome.runtime.lastError) {
              console.debug(`HistoryManager.sendToTabsSync: Could not send message to tab ${tab.id}`);
            }
          });
        }
      });
    });
  }

  /**
   * Appends a new item to the specified history type
   * 
   * @param value The value to add to history
   * @param type The history type to add to
   */
  append(value: string | number, type: string): void {
    if (!this.isValidHistoryType(type)) {
      console.warn(`HistoryManager.append: Invalid history type: ${type}`);
      return;
    }

    const historyType = type as HistoryType;
    const stringValue = String(value);

    try {
      // Add to history array
      this.commandHistory[historyType].push(stringValue);
      
      // Keep only the last MAX_HISTORY_ITEMS items
      if (this.commandHistory[historyType].length > this.MAX_HISTORY_ITEMS) {
        this.commandHistory[historyType] = this.commandHistory[historyType].slice(-this.MAX_HISTORY_ITEMS);
      }

      // Save to localStorage
      this.saveCommandHistory();
      
      console.debug(`HistoryManager.append: Added "${stringValue}" to ${historyType} history`);
    } catch (error) {
      console.error(`HistoryManager.append: Failed to append to ${historyType} history:`, error);
    }
  }

  /**
   * Retrieves history for a specific type
   * 
   * @param type The history type to retrieve
   * @returns Tuple of [type, history_array]
   */
  retrieve(type: string): [string, string[]] {
    if (!this.isValidHistoryType(type)) {
      console.warn(`HistoryManager.retrieve: Invalid history type: ${type}`);
      return [type, []];
    }

    const historyType = type as HistoryType;
    return [type, [...this.commandHistory[historyType]]]; // Return copy to prevent mutation
  }

  /**
   * Calculates weighted score for a history item based on recency and usage
   * 
   * @param item Chrome history item
   * @param currentTime Current timestamp for age calculation
   * @returns Numerical score for ranking
   */
  private calculateWeight(item: chrome.history.HistoryItem, currentTime: number): number {
    if (!item.lastVisitTime || !item.visitCount) {
      return 0;
    }

    let weight = 1;
    const delta = currentTime - item.lastVisitTime;

    // Age-based weight calculation
    switch (true) {
      case delta < 345600000:  // 0-4 days
        weight = 1.0;
        break;
      case delta < 1209600000: // 5-14 days
        weight = 0.7;
        break;
      case delta < 2678400000: // 15-31 days
        weight = 0.5;
        break;
      case delta < 7776000000: // 32-90 days
        weight = 0.3;
        break;
      default:
        weight = 0.1;
    }

    // Calculate total points
    let points = 0;
    points += item.visitCount * 100 * weight;
    
    if (item.typedCount) {
      points += item.typedCount * 200 * weight; // Typed URLs get higher weight
    }

    return points;
  }

  /**
   * Refreshes the browser history store with weighted scoring
   * 
   * Fetches browser history from Chrome and applies weighted scoring
   * based on recency and usage patterns.
   */
  async refreshStore(): Promise<void> {
    try {
      this.shouldRefresh = false;
      const currentTime = new Date().getTime();

      const results = await chrome.history.search({
        text: '',
        startTime: 0,
        maxResults: this.MAX_CHROME_RESULTS,
      });

      // Calculate weights and sort by score
      const weightedResults: WeightedHistoryItem[] = results.map((item: chrome.history.HistoryItem) => {
        const score = this.calculateWeight(item, currentTime);
        return {
          ...item,
          score
        };
      });

      // Sort by score (highest first)
      this.historyStore = weightedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      console.debug(`HistoryManager.refreshStore: Loaded ${this.historyStore.length} history items`);
    } catch (error) {
      console.error('HistoryManager.refreshStore: Failed to refresh history store:', error);
      this.historyStore = [];
    }
  }

  /**
   * Legacy synchronous version of refreshStore for backward compatibility
   * 
   * @deprecated Use async refreshStore() method instead
   */
  refreshStoreSync(): void {
    const currentTime = new Date().getTime();
    this.shouldRefresh = false;

    chrome.history.search({
      text: '',
      startTime: 0,
      maxResults: this.MAX_CHROME_RESULTS,
    }, (results: chrome.history.HistoryItem[]) => {
      if (chrome.runtime.lastError) {
        console.error('HistoryManager.refreshStoreSync: Error searching history:', chrome.runtime.lastError);
        this.historyStore = [];
        return;
      }

      // Calculate weights and sort by score
      const weightedResults: WeightedHistoryItem[] = results.map((item: chrome.history.HistoryItem) => {
        const score = this.calculateWeight(item, currentTime);
        return {
          ...item,
          score
        };
      });

      this.historyStore = weightedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  }

  /**
   * Searches browser history with filtering and limiting
   * 
   * @param search Search term to filter history
   * @param limit Maximum number of results to return
   * @param callback Function to call with search results
   */
  retrieveSearchHistory(search: string, limit: number, callback: (results: chrome.history.HistoryItem[], fromCache?: boolean) => void): void {
    if (typeof search !== 'string') {
      console.error('HistoryManager.retrieveSearchHistory: Search term must be a string');
      callback([], false);
      return;
    }

    if (typeof limit !== 'number' || limit <= 0) {
      console.error('HistoryManager.retrieveSearchHistory: Limit must be a positive number');
      callback([], false);
      return;
    }

    if (typeof callback !== 'function') {
      console.error('HistoryManager.retrieveSearchHistory: Callback must be a function');
      return;
    }

    try {
      if (this.shouldRefresh) {
        this.refreshStoreSync();
      }

      // Check if searchArray function is available
      if (typeof searchArray !== 'function') {
        console.error('HistoryManager.retrieveSearchHistory: searchArray function not available');
        callback([], false);
        return;
      }

      const results = searchArray({
        array: this.historyStore,
        search: search,
        limit: limit,
        fn: (item: chrome.history.HistoryItem) => {
          return (item.title || '') + ' ' + (item.url || '');
        }
      });

      callback(results, true);
    } catch (error) {
      console.error('HistoryManager.retrieveSearchHistory: Search failed:', error);
      callback([], false);
    }
  }

  /**
   * Async version of retrieveSearchHistory for modern usage
   * 
   * @param search Search term to filter history
   * @param limit Maximum number of results to return
   * @returns Promise resolving to search results
   */
  async retrieveSearchHistoryAsync(search: string, limit: number): Promise<chrome.history.HistoryItem[]> {
    return new Promise((resolve, reject) => {
      try {
        this.retrieveSearchHistory(search, limit, (results: chrome.history.HistoryItem[], fromCache?: boolean) => {
          resolve(results);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initializes command history from localStorage
   * 
   * Loads previously saved command history or initializes empty arrays.
   */
  private initializeCommandHistory(): void {
    this.historyTypes.forEach((type: HistoryType) => {
      try {
        const data = localStorage.getItem(type);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            this.commandHistory[type] = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            // Handle legacy comma-separated format
            this.commandHistory[type] = typeof data === 'string' ? data.split(',').filter(Boolean) : [];
          }
        } else {
          this.commandHistory[type] = [];
        }
      } catch (error) {
        console.warn(`HistoryManager.initializeCommandHistory: Failed to load ${type} history:`, error);
        this.commandHistory[type] = [];
      }
    });

    console.debug('HistoryManager.initializeCommandHistory: Command history initialized');
  }

  /**
   * Schedules initial history refresh
   */
  private scheduleHistoryRefresh(): void {
    // Refresh immediately
    this.shouldRefresh = true;
    
    // Use timeout to avoid blocking initialization
    setTimeout(() => {
      this.refreshStoreSync();
    }, 100);
  }

  /**
   * Type guard to check if a string is a valid history type
   * 
   * @param type String to check
   * @returns Whether the string is a valid HistoryType
   */
  private isValidHistoryType(type: string): type is HistoryType {
    return this.historyTypes.includes(type as HistoryType);
  }

  /**
   * Gets statistics about current history state
   * 
   * @returns Object containing history statistics
   */
  getStats(): {
    commandHistory: { [K in HistoryType]: number };
    browserHistory: number;
    shouldRefresh: boolean;
  } {
    return {
      commandHistory: {
        action: this.commandHistory.action.length,
        url: this.commandHistory.url.length,
        search: this.commandHistory.search.length
      },
      browserHistory: this.historyStore.length,
      shouldRefresh: this.shouldRefresh
    };
  }

  /**
   * Forces a refresh of the browser history store
   */
  forceRefresh(): void {
    this.shouldRefresh = true;
    this.refreshStoreSync();
  }
}

// Create singleton instance
const History = new HistoryManager();

// For backward compatibility, create an object that matches the original interface
const HistoryLegacy = {
  historyTypes: History.historyTypes,
  searchResults: History.searchResults,
  historyStore: History.historyStore,
  commandHistory: History.commandHistory,
  shouldRefresh: History.shouldRefresh,
  
  saveCommandHistory: () => History.saveCommandHistory(),
  clear: () => History.clear(),
  sendToTabs: () => History.sendToTabsSync(),
  append: (value: string | number, type: string) => History.append(value, type),
  retrieve: (type: string) => History.retrieve(type),
  refreshStore: () => History.refreshStoreSync(),
  retrieveSearchHistory: (search: string, limit: number, callback: (results: chrome.history.HistoryItem[], fromCache?: boolean) => void) => 
    History.retrieveSearchHistory(search, limit, callback)
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).History = HistoryLegacy;
}

// Modern export for TypeScript modules
export default History;
export { 
  HistoryManager, 
  HistoryLegacy, 
  HistoryType, 
  CommandHistory, 
  WeightedHistoryItem, 
  HistorySearchParams,
  HistoryTabMessage 
};