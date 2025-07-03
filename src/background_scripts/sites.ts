// Chrome Extension Sites - TypeScript conversion for Manifest v3

/**
 * Top site entry as returned by Chrome API
 */
interface TopSiteEntry {
  title: string;
  url: string;
}

/**
 * Transformed top site result (title-url pair)
 */
type TopSiteResult = [string, string];

/**
 * Callback function for receiving top sites
 */
type TopSitesCallback = (sites: TopSiteResult[]) => void;

/**
 * Sites manager class for handling Chrome Extension top sites functionality
 * 
 * Provides access to Chrome's most visited sites through the topSites API.
 * Transforms the data into a consistent format for use throughout the extension.
 * Compatible with Chrome Extension Manifest v3.
 */
class SitesManager {
  /** Whether the sites manager has been initialized */
  private initialized: boolean = false;

  constructor() {
    this.initializeSites();
  }

  /**
   * Gets the top sites from Chrome's topSites API
   * 
   * @param callback Function to receive the array of [title, url] pairs
   */
  async getTop(callback: TopSitesCallback): Promise<void> {
    if (!this.isTopSitesAvailable()) {
      console.warn('SitesManager.getTop: topSites API not available');
      callback([]);
      return;
    }

    try {
      const topSites = await new Promise<chrome.topSites.MostVisitedURL[]>((resolve, reject) => {
        chrome.topSites.get((sites: chrome.topSites.MostVisitedURL[]) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(sites);
          }
        });
      });

      const transformedSites = this.transformTopSites(topSites);
      callback(transformedSites);

      console.debug('SitesManager.getTop: Retrieved top sites', transformedSites.length);
    } catch (error) {
      console.error('SitesManager.getTop: Failed to get top sites:', error);
      callback([]);
    }
  }

  /**
   * Legacy synchronous version of getTop for backward compatibility
   * 
   * @param callback Function to receive the array of [title, url] pairs
   * @deprecated Use async getTop() method instead
   */
  getTopSync(callback: TopSitesCallback): void {
    if (!this.isTopSitesAvailable()) {
      console.warn('SitesManager.getTopSync: topSites API not available');
      callback([]);
      return;
    }

    chrome.topSites.get((sites: chrome.topSites.MostVisitedURL[]) => {
      if (chrome.runtime.lastError) {
        console.error('SitesManager.getTopSync: Error getting top sites:', chrome.runtime.lastError);
        callback([]);
        return;
      }

      const transformedSites = this.transformTopSites(sites);
      callback(transformedSites);
    });
  }

  /**
   * Gets top sites as a Promise (modern async pattern)
   * 
   * @returns Promise resolving to array of [title, url] pairs
   */
  async getTopPromise(): Promise<TopSiteResult[]> {
    if (!this.isTopSitesAvailable()) {
      console.warn('SitesManager.getTopPromise: topSites API not available');
      return [];
    }

    try {
      const topSites = await new Promise<chrome.topSites.MostVisitedURL[]>((resolve, reject) => {
        chrome.topSites.get((sites: chrome.topSites.MostVisitedURL[]) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(sites);
          }
        });
      });

      const transformedSites = this.transformTopSites(topSites);
      console.debug('SitesManager.getTopPromise: Retrieved top sites', transformedSites.length);
      
      return transformedSites;
    } catch (error) {
      console.error('SitesManager.getTopPromise: Failed to get top sites:', error);
      return [];
    }
  }

  /**
   * Transforms Chrome's top sites data into [title, url] pairs
   * 
   * @param sites Raw top sites from Chrome API
   * @returns Transformed array of [title, url] pairs
   */
  private transformTopSites(sites: chrome.topSites.MostVisitedURL[]): TopSiteResult[] {
    if (!Array.isArray(sites)) {
      console.warn('SitesManager.transformTopSites: Invalid sites data received');
      return [];
    }

    return sites
      .filter((site: chrome.topSites.MostVisitedURL) => 
        site && typeof site.title === 'string' && typeof site.url === 'string'
      )
      .map((site: chrome.topSites.MostVisitedURL): TopSiteResult => 
        [site.title, site.url]
      );
  }

  /**
   * Checks if Chrome's topSites API is available
   * 
   * @returns Whether the topSites API is accessible
   */
  private isTopSitesAvailable(): boolean {
    try {
      return !!(chrome && chrome.topSites && typeof chrome.topSites.get === 'function');
    } catch (error) {
      console.debug('SitesManager.isTopSitesAvailable: topSites API not available:', error);
      return false;
    }
  }

  /**
   * Initializes the sites manager
   */
  private initializeSites(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Check API availability
      const available = this.isTopSitesAvailable();
      console.debug('SitesManager.initializeSites: topSites API available:', available);

      if (!available) {
        console.warn('SitesManager.initializeSites: topSites API not available - check permissions');
      }

      this.initialized = true;
      console.debug('SitesManager: Initialization complete');
    } catch (error) {
      console.error('SitesManager: Initialization failed:', error);
    }
  }

  /**
   * Gets sites manager statistics
   * 
   * @returns Statistics object
   */
  getStats(): {
    initialized: boolean;
    apiAvailable: boolean;
  } {
    return {
      initialized: this.initialized,
      apiAvailable: this.isTopSitesAvailable()
    };
  }

  /**
   * Validates a top site entry
   * 
   * @param site Site entry to validate
   * @returns Whether the site entry is valid
   */
  validateTopSite(site: any): site is chrome.topSites.MostVisitedURL {
    return !!(
      site &&
      typeof site === 'object' &&
      typeof site.title === 'string' &&
      typeof site.url === 'string' &&
      site.title.length > 0 &&
      site.url.length > 0
    );
  }

  /**
   * Gets filtered top sites based on a pattern
   * 
   * @param pattern Pattern to filter sites by (title or URL)
   * @param callback Function to receive filtered sites
   */
  async getFilteredTop(pattern: string, callback: TopSitesCallback): Promise<void> {
    try {
      const allSites = await this.getTopPromise();
      
      if (!pattern || pattern.trim().length === 0) {
        callback(allSites);
        return;
      }

      const lowerPattern = pattern.toLowerCase();
      const filteredSites = allSites.filter(([title, url]: TopSiteResult) => 
        title.toLowerCase().includes(lowerPattern) || 
        url.toLowerCase().includes(lowerPattern)
      );

      callback(filteredSites);
      console.debug('SitesManager.getFilteredTop: Filtered sites', filteredSites.length, 'from', allSites.length);
    } catch (error) {
      console.error('SitesManager.getFilteredTop: Failed to filter top sites:', error);
      callback([]);
    }
  }

  /**
   * Checks if the sites manager is ready
   * 
   * @returns Whether the manager is initialized and API is available
   */
  isReady(): boolean {
    return this.initialized && this.isTopSitesAvailable();
  }
}

// Create singleton instance
const Sites = new SitesManager();

// For backward compatibility, expose global object with legacy methods
const sitesLegacy = {
  getTop: (callback: TopSitesCallback) => Sites.getTopSync(callback)
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Sites = sitesLegacy;
} else {
  // Service worker context
  (globalThis as any).Sites = sitesLegacy;
}

// Modern export for TypeScript modules
export default Sites;
export { 
  SitesManager, 
  TopSiteEntry,
  TopSiteResult,
  TopSitesCallback,
  sitesLegacy
};