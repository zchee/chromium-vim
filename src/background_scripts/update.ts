// Chrome Extension Updates - TypeScript conversion for Manifest v3

/**
 * Update message configuration
 */
interface UpdatesConfig {
  displayMessage: boolean;
  installMessage: string;
  tabId: number | null;
}

/**
 * Chrome Extension installation details
 */
interface InstallationDetails {
  reason: chrome.runtime.OnInstalledReason;
  previousVersion?: string;
}

/**
 * Script injection target for Manifest v3
 */
interface ScriptTarget {
  tabId: number;
  allFrames?: boolean;
}

/**
 * Script file for injection
 */
interface ScriptFile {
  file: string;
}

/**
 * CSS file for injection
 */
interface CSSFile {
  file: string;
}

/**
 * Options interface (external dependency)
 */
interface OptionsModule {
  refreshSettings: (callback?: () => void) => Promise<void>;
}

/**
 * Settings interface (external dependency) 
 */
interface Settings {
  changelog?: boolean;
  [key: string]: any;
}

// Global declarations for external dependencies
declare var Options: OptionsModule;
declare var settings: Settings;

/**
 * Update manager class for handling Chrome Extension updates
 * 
 * Manages installation and update events, displays welcome messages,
 * handles changelog display, and reloads content scripts on updates.
 * Compatible with Chrome Extension Manifest v3.
 */
class UpdateManager {
  /** Update configuration */
  private config: UpdatesConfig;

  /** Whether the update manager has been initialized */
  private initialized: boolean = false;

  constructor() {
    this.config = {
      displayMessage: false,
      installMessage: 'Welcome to cVim! Here\'s everything you need to know.',
      tabId: null
    };

    this.initializeUpdateManager();
  }

  /**
   * Handles Chrome extension installation event
   * 
   * @param _tabInfo Created tab information (unused)
   */
  private async handleInstallation(_tabInfo?: chrome.tabs.Tab): Promise<void> {
    try {
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('pages/mappings.html'),
        active: true
      });

      this.config.tabId = tab.id || null;
      this.config.displayMessage = true;

      console.debug('UpdateManager.handleInstallation: Welcome tab created');
    } catch (error) {
      console.error('UpdateManager.handleInstallation: Failed to create welcome tab:', error);
    }
  }

  /**
   * Handles Chrome extension update event
   * 
   * @param currentVersion Current extension version
   * @param previousVersion Previous extension version
   */
  private async handleUpdate(currentVersion: string, previousVersion?: string): Promise<void> {
    try {
      if (previousVersion !== currentVersion) {
        // Refresh settings and potentially show changelog
        if (typeof Options !== 'undefined') {
          await Options.refreshSettings(async () => {
            if (typeof settings !== 'undefined' && settings.changelog) {
              try {
                await chrome.tabs.create({
                  url: chrome.runtime.getURL('pages/changelog.html'),
                  active: true
                });
                console.debug('UpdateManager.handleUpdate: Changelog tab created');
              } catch (error) {
                console.error('UpdateManager.handleUpdate: Failed to create changelog tab:', error);
              }
            }
          });
        }

        // Reload content scripts in all complete tabs
        await this.reloadContentScripts();
      }
    } catch (error) {
      console.error('UpdateManager.handleUpdate: Failed to handle update:', error);
    }
  }

  /**
   * Reloads content scripts in all complete tabs for Manifest v3
   * 
   * Uses the new chrome.scripting API instead of deprecated chrome.tabs.executeScript
   */
  private async reloadContentScripts(): Promise<void> {
    try {
      const manifest = chrome.runtime.getManifest();
      const contentScripts = manifest.content_scripts?.[0];

      if (!contentScripts) {
        console.warn('UpdateManager.reloadContentScripts: No content scripts found in manifest');
        return;
      }

      const tabs = await chrome.tabs.query({ status: 'complete' });

      if (tabs.length === 0) {
        console.debug('UpdateManager.reloadContentScripts: No complete tabs found');
        return;
      }

      // Process all tabs concurrently
      const scriptPromises = tabs.map(async (tab: chrome.tabs.Tab) => {
        if (!tab.id) return;

        try {
          // Inject JavaScript files using new Manifest v3 API
          if (contentScripts.js && contentScripts.js.length > 0) {
            await chrome.scripting.executeScript({
              target: {
                tabId: tab.id,
                allFrames: contentScripts.all_frames || false
              },
              files: contentScripts.js
            });
          }

          // Inject CSS files using new Manifest v3 API
          if (contentScripts.css && contentScripts.css.length > 0) {
            await chrome.scripting.insertCSS({
              target: {
                tabId: tab.id,
                allFrames: contentScripts.all_frames || false
              },
              files: contentScripts.css
            });
          }

          console.debug(`UpdateManager.reloadContentScripts: Scripts reloaded for tab ${tab.id}`);
        } catch (error) {
          // Some tabs may not support script injection (chrome://, etc.)
          console.debug(`UpdateManager.reloadContentScripts: Could not inject scripts into tab ${tab.id}:`, error);
        }
      });

      await Promise.allSettled(scriptPromises);
      console.debug('UpdateManager.reloadContentScripts: Content script reload completed');
    } catch (error) {
      console.error('UpdateManager.reloadContentScripts: Failed to reload content scripts:', error);
    }
  }

  /**
   * Legacy synchronous version of reloadContentScripts for backward compatibility
   * 
   * @deprecated Use async reloadContentScripts() method instead
   */
  // private reloadContentScriptsSync(): void {
  //   try {
  //     const manifest = chrome.runtime.getManifest();
  //     const contentScripts = manifest.content_scripts?.[0];

  //     if (!contentScripts) {
  //       console.warn('UpdateManager.reloadContentScriptsSync: No content scripts found in manifest');
  //       return;
  //     }

  //     const checkError = () => {
  //       if (chrome.runtime.lastError) {
  //         console.debug('UpdateManager.reloadContentScriptsSync: Script injection failed:', chrome.runtime.lastError);
  //         return false;
  //       }
  //       return true;
  //     };

  //     chrome.tabs.query({ status: 'complete' }, (tabs: chrome.tabs.Tab[]) => {
  //       if (chrome.runtime.lastError) {
  //         console.error('UpdateManager.reloadContentScriptsSync: Error querying tabs:', chrome.runtime.lastError);
  //         return;
  //       }

  //       tabs.forEach((tab: chrome.tabs.Tab) => {
  //         if (!tab.id) return;

  //         // Note: In a real Manifest v3 environment, chrome.tabs.executeScript and chrome.tabs.insertCSS
  //         // would not be available. This legacy method is kept for compatibility but should not be used.
          
  //         if (contentScripts.js) {
  //           contentScripts.js.forEach((file: string) => {
  //             // This would fail in actual Manifest v3 - kept for compatibility only
  //             if ((chrome.tabs as any).executeScript) {
  //               (chrome.tabs as any).executeScript(tab.id, {
  //                 file: file,
  //                 allFrames: contentScripts.all_frames || false
  //               }, checkError);
  //             }
  //           });
  //         }

  //         if (contentScripts.css) {
  //           contentScripts.css.forEach((file: string) => {
  //             // This would fail in actual Manifest v3 - kept for compatibility only
  //             if ((chrome.tabs as any).insertCSS) {
  //               (chrome.tabs as any).insertCSS(tab.id, {
  //                 file: file,
  //                 allFrames: contentScripts.all_frames || false
  //               }, checkError);
  //             }
  //           });
  //         }
  //       });
  //     });
  //   } catch (error) {
  //     console.error('UpdateManager.reloadContentScriptsSync: Failed to reload content scripts:', error);
  //   }
  // }

  /**
   * Handles the main installation event
   * 
   * @param details Installation details from Chrome
   */
  private async handleInstallationEvent(details: InstallationDetails): Promise<void> {
    try {
      const currentVersion = chrome.runtime.getManifest().version;
      const previousVersion = details.previousVersion;

      switch (details.reason) {
        case 'install':
          console.debug('UpdateManager.handleInstallationEvent: Extension installed');
          await this.handleInstallation();
          break;

        case 'update':
          console.debug(`UpdateManager.handleInstallationEvent: Extension updated from ${previousVersion} to ${currentVersion}`);
          await this.handleUpdate(currentVersion, previousVersion);
          break;

        case 'chrome_update':
        case 'shared_module_update':
          console.debug(`UpdateManager.handleInstallationEvent: ${details.reason} event`);
          // These typically don't require special handling
          break;

        default:
          console.debug(`UpdateManager.handleInstallationEvent: Unknown reason: ${details.reason}`);
          break;
      }
    } catch (error) {
      console.error('UpdateManager.handleInstallationEvent: Failed to handle installation event:', error);
    }
  }

  /**
   * Legacy synchronous version of handleInstallationEvent for backward compatibility
   * 
   * @param details Installation details from Chrome
   * @deprecated Use async handleInstallationEvent() method instead
   */
  // private handleInstallationEventSync(details: InstallationDetails): void {
  //   const currentVersion = chrome.runtime.getManifest().version;
  //   const previousVersion = details.previousVersion;

  //   switch (details.reason) {
  //     case 'install':
  //       chrome.tabs.create({
  //         url: chrome.runtime.getURL('pages/mappings.html'),
  //         active: true
  //       }, (tabInfo: chrome.tabs.Tab) => {
  //         if (chrome.runtime.lastError) {
  //           console.error('UpdateManager.handleInstallationEventSync: Error creating welcome tab:', chrome.runtime.lastError);
  //           return;
  //         }
  //         this.config.tabId = tabInfo.id || null;
  //         this.config.displayMessage = true;
  //       });
  //       break;

  //     case 'update':
  //       if (previousVersion !== currentVersion) {
  //         if (typeof Options !== 'undefined') {
  //           Options.refreshSettings(() => {
  //             if (typeof settings !== 'undefined' && settings.changelog) {
  //               chrome.tabs.create({
  //                 url: chrome.runtime.getURL('pages/changelog.html'),
  //                 active: true
  //               }, () => {
  //                 if (chrome.runtime.lastError) {
  //                   console.error('UpdateManager.handleInstallationEventSync: Error creating changelog tab:', chrome.runtime.lastError);
  //                 }
  //               });
  //             }
  //           });
  //         }
  //         this.reloadContentScriptsSync();
  //       }
  //       break;

  //     default:
  //       console.debug(`UpdateManager.handleInstallationEventSync: Unhandled reason: ${details.reason}`);
  //       break;
  //   }
  // }

  /**
   * Sets up Chrome Extension event listeners
   */
  private setupEventListeners(): void {
    chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
      this.handleInstallationEvent(details as InstallationDetails);
    });

    console.debug('UpdateManager.setupEventListeners: Event listeners registered');
  }

  /**
   * Initializes the update manager
   */
  private async initializeUpdateManager(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.setupEventListeners();

      this.initialized = true;
      console.debug('UpdateManager: Initialization complete');
    } catch (error) {
      console.error('UpdateManager: Initialization failed:', error);
    }
  }

  /**
   * Gets update manager configuration
   * 
   * @returns Current configuration
   */
  getConfig(): Readonly<UpdatesConfig> {
    return { ...this.config };
  }

  /**
   * Gets update manager statistics
   * 
   * @returns Statistics object
   */
  getStats(): {
    initialized: boolean;
    displayMessage: boolean;
    hasTabId: boolean;
  } {
    return {
      initialized: this.initialized,
      displayMessage: this.config.displayMessage,
      hasTabId: this.config.tabId !== null
    };
  }

  /**
   * Checks if the update manager is ready
   * 
   * @returns Whether the manager is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const updateManager = new UpdateManager();

// For backward compatibility, expose global variables and functions
const updatesLegacy = {
  displayMessage: false,
  installMessage: 'Welcome to cVim! Here\'s everything you need to know.',
  tabId: null
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Updates = updatesLegacy;
} else {
  // Service worker context
  (globalThis as any).Updates = updatesLegacy;
}

// Modern export for TypeScript modules
export default updateManager;
export { 
  UpdateManager, 
  UpdatesConfig, 
  InstallationDetails, 
  ScriptTarget, 
  ScriptFile, 
  CSSFile,
  updatesLegacy
};