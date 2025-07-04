// Chrome Extension Links - TypeScript conversion for Manifest v3

/**
 * Tab creation options for link opening
 */
interface LinkTabOptions extends chrome.tabs.CreateProperties {
  /** Whether to open the tab in an active state */
  active?: boolean;
  /** URL to open in the new tab */
  url: string;
  /** Index position for the new tab */
  index?: number;
  /** ID of the window to create the tab in */
  windowId?: number;
  /** Whether to pin the tab */
  pinned?: boolean;
}

/**
 * Options for opening multiple links
 */
interface MultiOpenOptions {
  /** Whether to open tabs in active state (default: false) */
  active?: boolean;
  /** Whether to validate URLs before opening (default: true) */
  validate?: boolean;
  /** Maximum number of tabs to open at once (default: 20) */
  maxTabs?: number;
  /** Delay between opening tabs in milliseconds (default: 0) */
  delay?: number;
  /** Window ID to open tabs in (default: current window) */
  windowId?: number;
  /** Whether to pin opened tabs (default: false) */
  pinned?: boolean;
}

/**
 * Result of a link opening operation
 */
interface LinkOpenResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The URL that was processed */
  url: string;
  /** Created tab if successful */
  tab?: chrome.tabs.Tab;
  /** Error message if failed */
  error?: string;
}

/**
 * URL validation result
 */
interface UrlValidationResult {
  /** Whether the URL is valid */
  isValid: boolean;
  /** Normalized/cleaned URL if valid */
  normalizedUrl?: string;
  /** Error message if invalid */
  error?: string;
  /** Detected URL scheme */
  scheme?: string;
}

/**
 * Link metadata for analysis
 */
interface LinkMetadata {
  /** Original URL */
  url: string;
  /** Normalized URL */
  normalizedUrl: string;
  /** URL scheme (http, https, etc.) */
  scheme: string;
  /** Domain name */
  domain: string;
  /** Whether the URL is secure (HTTPS) */
  isSecure: boolean;
  /** Whether the URL appears to be valid */
  isValid: boolean;
}

/**
 * Links manager class for handling URL operations and tab management
 * 
 * Provides comprehensive link management functionality including URL validation,
 * batch tab opening, and security features. Compatible with Chrome Extension Manifest v3.
 */
class LinksManager {
  /** Maximum number of tabs that can be opened in a single operation */
  private readonly MAX_TABS_LIMIT = 50;
  
  /** Default delay between tab operations in milliseconds */
  private readonly DEFAULT_DELAY = 50;

  /** Supported URL schemes */
  private readonly SUPPORTED_SCHEMES = ['http', 'https', 'ftp', 'file', 'chrome', 'chrome-extension'] as const;

  /** Dangerous schemes that should be blocked */
  private readonly DANGEROUS_SCHEMES = ['javascript', 'data', 'vbscript'] as const;

  /**
   * Opens multiple links in new tabs
   * 
   * @param links Array of URLs to open
   * @param options Options for opening the links
   */
  async multiOpen(links: string[], options: MultiOpenOptions = {}): Promise<LinkOpenResult[]> {
    // Set default options
    const opts: Required<MultiOpenOptions> = {
      active: false,
      validate: true,
      maxTabs: 20,
      delay: 0,
      windowId: chrome.windows.WINDOW_ID_CURRENT,
      pinned: false,
      ...options
    };

    // Validate input
    if (!Array.isArray(links)) {
      throw new Error('LinksManager.multiOpen: Links must be an array');
    }

    if (links.length === 0) {
      console.warn('LinksManager.multiOpen: No links provided');
      return [];
    }

    // Enforce limits
    const limitedLinks = links.slice(0, Math.min(links.length, this.MAX_TABS_LIMIT));
    if (limitedLinks.length < links.length) {
      console.warn(`LinksManager.multiOpen: Limited to ${this.MAX_TABS_LIMIT} tabs, ignoring ${links.length - limitedLinks.length} links`);
    }

    const results: LinkOpenResult[] = [];

    try {
      for (let i = 0; i < limitedLinks.length; i++) {
        const url = limitedLinks[i];
        
        // Skip if URL is undefined (due to noUncheckedIndexedAccess)
        if (!url) {
          continue;
        }
        
        try {
          // Validate URL if requested
          if (opts.validate) {
            const validation = this.validateUrl(url);
            if (!validation.isValid) {
              results.push({
                success: false,
                url: url,
                error: validation.error || 'Invalid URL'
              });
              continue;
            }
          }

          // Create tab
          const tab = await this.createTab({
            url: opts.validate ? this.normalizeUrl(url) : url,
            active: opts.active,
            windowId: opts.windowId,
            pinned: opts.pinned
          });

          results.push({
            success: true,
            url: url,
            tab: tab
          });

          // Add delay if specified
          if (opts.delay > 0 && i < limitedLinks.length - 1) {
            await this.delay(opts.delay);
          }

        } catch (error) {
          console.error(`LinksManager.multiOpen: Failed to open ${url}:`, error);
          results.push({
            success: false,
            url: url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.debug(`LinksManager.multiOpen: Opened ${results.filter(r => r.success).length}/${results.length} tabs`);
      return results;

    } catch (error) {
      console.error('LinksManager.multiOpen: Operation failed:', error);
      throw error;
    }
  }

  /**
   * Legacy synchronous version of multiOpen for backward compatibility
   * 
   * @param links Array of URLs to open
   * @deprecated Use async multiOpen() method instead
   */
  multiOpenSync(links: string[]): void {
    if (!Array.isArray(links)) {
      console.error('LinksManager.multiOpenSync: Links must be an array');
      return;
    }

    links.forEach((url: string) => {
      if (typeof url === 'string' && url.trim()) {
        try {
          chrome.tabs.create({
            url: url,
            active: false
          }, (_tab) => {
            if (chrome.runtime.lastError) {
              console.error(`LinksManager.multiOpenSync: Failed to open ${url}:`, chrome.runtime.lastError);
            }
          });
        } catch (error) {
          console.error(`LinksManager.multiOpenSync: Error creating tab for ${url}:`, error);
        }
      }
    });
  }

  /**
   * Opens a single link in a new tab
   * 
   * @param url URL to open
   * @param options Tab creation options
   * @returns Promise resolving to the created tab
   */
  async openLink(url: string, options: Partial<LinkTabOptions> = {}): Promise<chrome.tabs.Tab> {
    if (typeof url !== 'string' || !url.trim()) {
      throw new Error('LinksManager.openLink: Invalid URL provided');
    }

    // Validate and normalize URL
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      throw new Error(`LinksManager.openLink: ${validation.error}`);
    }

    const tabOptions: LinkTabOptions = {
      url: validation.normalizedUrl ?? url,
      active: false,
      ...options
    };

    return this.createTab(tabOptions);
  }

  /**
   * Validates a URL for safety and correctness
   * 
   * @param url URL to validate
   * @returns Validation result with details
   */
  validateUrl(url: string): UrlValidationResult {
    if (typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL must be a string'
      };
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return {
        isValid: false,
        error: 'URL cannot be empty'
      };
    }

    try {
      // Try to parse as URL
      let parsedUrl: URL;
      
      // Handle relative URLs and URLs without protocol
      if (trimmedUrl.startsWith('//')) {
        parsedUrl = new URL('https:' + trimmedUrl);
      } else if (trimmedUrl.startsWith('/') || (!trimmedUrl.includes('://') && !trimmedUrl.startsWith('chrome'))) {
        // Relative URL or no protocol - assume https
        parsedUrl = new URL('https://' + trimmedUrl);
      } else {
        parsedUrl = new URL(trimmedUrl);
      }

      const scheme = parsedUrl.protocol.slice(0, -1); // Remove trailing ':'

      // Check for dangerous schemes
      if (this.DANGEROUS_SCHEMES.includes(scheme as any)) {
        return {
          isValid: false,
          error: `Dangerous URL scheme: ${scheme}`,
          scheme: scheme
        };
      }

      // Check for supported schemes
      if (!this.SUPPORTED_SCHEMES.includes(scheme as any)) {
        return {
          isValid: false,
          error: `Unsupported URL scheme: ${scheme}`,
          scheme: scheme
        };
      }

      return {
        isValid: true,
        normalizedUrl: parsedUrl.toString(),
        scheme: scheme
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Normalizes a URL by ensuring proper format
   * 
   * @param url URL to normalize
   * @returns Normalized URL string
   */
  normalizeUrl(url: string): string {
    const validation = this.validateUrl(url);
    return validation.normalizedUrl ?? url;
  }

  /**
   * Analyzes a URL and returns metadata
   * 
   * @param url URL to analyze
   * @returns Link metadata object
   */
  analyzeLinkMetadata(url: string): LinkMetadata {
    const validation = this.validateUrl(url);
    
    if (!validation.isValid) {
      return {
        url: url,
        normalizedUrl: url,
        scheme: 'unknown',
        domain: 'unknown',
        isSecure: false,
        isValid: false
      };
    }

    try {
      const parsedUrl = new URL(validation.normalizedUrl || url);
      
      return {
        url: url,
        normalizedUrl: validation.normalizedUrl || url,
        scheme: validation.scheme || 'unknown',
        domain: parsedUrl.hostname,
        isSecure: parsedUrl.protocol === 'https:',
        isValid: validation.isValid
      };
    } catch (error) {
      return {
        url: url,
        normalizedUrl: url,
        scheme: 'unknown',
        domain: 'unknown',
        isSecure: false,
        isValid: false
      };
    }
  }

  /**
   * Filters an array of URLs to only include valid ones
   * 
   * @param urls Array of URLs to filter
   * @returns Array of valid URLs
   */
  filterValidUrls(urls: string[]): string[] {
    if (!Array.isArray(urls)) {
      console.error('LinksManager.filterValidUrls: Input must be an array');
      return [];
    }

    return urls.filter((url) => {
      if (typeof url !== 'string') {
        return false;
      }
      
      const validation = this.validateUrl(url);
      return validation.isValid;
    });
  }

  /**
   * Deduplicates an array of URLs
   * 
   * @param urls Array of URLs to deduplicate
   * @param normalize Whether to normalize URLs before comparison
   * @returns Array of unique URLs
   */
  deduplicateUrls(urls: string[], normalize: boolean = true): string[] {
    if (!Array.isArray(urls)) {
      console.error('LinksManager.deduplicateUrls: Input must be an array');
      return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    urls.forEach((url) => {
      if (typeof url === 'string') {
        const keyUrl = normalize ? this.normalizeUrl(url) : url;
        if (!seen.has(keyUrl)) {
          seen.add(keyUrl);
          result.push(url);
        }
      }
    });

    return result;
  }

  /**
   * Creates a new tab with error handling
   * 
   * @param options Tab creation options
   * @returns Promise resolving to the created tab
   */
  private async createTab(options: LinkTabOptions): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
      chrome.tabs.create(options, (tab: chrome.tabs.Tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (tab) {
          resolve(tab);
        } else {
          reject(new Error('Failed to create tab: No tab returned'));
        }
      });
    });
  }

  /**
   * Utility function to create a delay
   * 
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets statistics about link operations
   * 
   * @returns Object containing usage statistics
   */
  getStats(): {
    supportedSchemes: readonly string[];
    dangerousSchemes: readonly string[];
    maxTabsLimit: number;
    defaultDelay: number;
  } {
    return {
      supportedSchemes: this.SUPPORTED_SCHEMES,
      dangerousSchemes: this.DANGEROUS_SCHEMES,
      maxTabsLimit: this.MAX_TABS_LIMIT,
      defaultDelay: this.DEFAULT_DELAY
    };
  }

  /**
   * Checks if the links management system is available
   * 
   * @returns Whether Chrome tabs API is available
   */
  isAvailable(): boolean {
    return !!(chrome && chrome.tabs && typeof chrome.tabs.create === 'function');
  }
}

// Create singleton instance
const Links = new LinksManager();

// For backward compatibility, create an object that matches the original interface
const LinksLegacy = {
  multiOpen: (links: string[]) => Links.multiOpenSync(links)
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Links = LinksLegacy;
}

// Modern export for TypeScript modules
export default Links;
export { 
  LinksManager, 
  LinksLegacy, 
  LinkTabOptions, 
  MultiOpenOptions, 
  LinkOpenResult, 
  UrlValidationResult, 
  LinkMetadata 
};