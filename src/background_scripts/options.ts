// Chrome Extension Options - TypeScript conversion for Manifest v3

/**
 * Storage method type for Chrome storage API
 */
type StorageMethod = 'local' | 'sync';

/**
 * Quick marks structure
 */
interface QuickMarks {
  [key: string]: string;
}

/**
 * Site-specific configuration
 */
interface SiteConfig {
  [domain: string]: any;
}

/**
 * Search engines configuration
 */
interface SearchEngines {
  [name: string]: string;
}

/**
 * Search aliases configuration
 */
interface SearchAliases {
  [alias: string]: string;
}

/**
 * Function definitions for RC configuration
 */
interface RCFunctions {
  [functionName: string]: Function | string;
}

/**
 * Complete settings interface with all configuration options
 */
interface Settings {
  // Numeric settings
  searchlimit: number;
  scrollstep: number;
  fullpagescrollpercent: number;
  typelinkhintsdelay: number;
  scrollduration: number;
  zoomfactor: number;
  timeoutlen: number;
  vimport: number;

  // Object settings
  qmarks: QuickMarks;
  sites: SiteConfig;
  searchengines: SearchEngines;
  searchaliases: SearchAliases;
  FUNCTIONS: RCFunctions;

  // Boolean settings
  hud: boolean;
  regexp: boolean;
  scalehints: boolean;
  linkanimations: boolean;
  sortlinkhints: boolean;
  ignorecase: boolean;
  numerichints: boolean;
  cncpcompletion: boolean;
  smartcase: boolean;
  incsearch: boolean;
  autohidecursor: boolean;
  typelinkhints: boolean;
  autofocus: boolean;
  insertmappings: boolean;
  defaultnewtabpage: boolean;
  dimhintcharacters: boolean;
  smoothscroll: boolean;
  autoupdategist: boolean;
  nativelinkorder: boolean;
  showtabindices: boolean;
  changelog: boolean;
  localconfig: boolean;
  completeonopen: boolean;
  debugcss: boolean;

  // String settings
  configpath: string;
  locale: string;
  mapleader: string;
  defaultengine: string;
  hintcharacters: string;
  homedirectory: string;
  langmap: string;
  nextmatchpattern: string;
  previousmatchpattern: string;
  barposition: string;
  RC: string;
  MAPPINGS: string;
  GISTURL: string;
  COMMANDBARCSS: string;

  // Array settings
  completionengines: string[];
  blacklists: string[];

  // Legacy settings (may be undefined)
  BLACKLISTS?: string;
}

/**
 * Partial settings for updates
 */
type PartialSettings = Partial<Settings>;

/**
 * Settings save request
 */
interface SettingsSaveRequest {
  settings: Settings;
  sendSettings?: boolean;
}

/**
 * Settings get request
 */
interface SettingsGetRequest {
  reset?: boolean;
}

/**
 * Settings message for tabs
 */
interface SettingsMessage {
  action: 'sendSettings';
  settings: Settings;
}

/**
 * Settings port message
 */
interface SettingsPortMessage {
  type: 'sendSettings';
  settings: Settings;
}

/**
 * Get all settings response
 */
interface AllSettingsResponse {
  defaults: Settings;
  current: Settings;
}

/**
 * Chrome storage change event
 */
interface StorageChange {
  oldValue?: any;
  newValue?: any;
}

/**
 * Chrome storage changes event
 */
interface StorageChanges {
  [key: string]: StorageChange;
}

/**
 * RC Parser interface (external dependency)
 */
interface RCParser {
  parse: (rcContent: string) => Settings;
}

/**
 * Utils interface (external dependency)
 */
interface UtilsModule {
  compressArray: <T>(array: T[]) => T[];
  uniqueElements: <T>(array: T[]) => T[];
}

/**
 * Quickmarks interface (external dependency)
 */
interface QuickmarksModule {
  [key: string]: string;
}

/**
 * HTTP request interface (external dependency)
 */
interface HttpRequestFunction {
  (options: { url: string }): Promise<string>;
}

// Global declarations for external dependencies
declare var Utils: UtilsModule;
declare var Quickmarks: QuickmarksModule;
declare var RCParser: RCParser;
declare var httpRequest: HttpRequestFunction;
declare var activePorts: chrome.runtime.Port[];

/**
 * Options manager class for handling Chrome Extension settings
 * 
 * Manages all extension settings including persistence, synchronization,
 * RC configuration parsing, and Gist integration. Compatible with
 * Chrome Extension Manifest v3.
 */
class OptionsManager {
  /** Chrome storage method to use */
  private storageMethod: StorageMethod = 'local';
  
  /** Current settings object */
  public settings: Settings;
  
  /** Default settings configuration */
  public readonly defaultSettings: Readonly<Settings>;

  /** Whether the options manager has been initialized */
  private initialized: boolean = false;

  /** Gist update timeout ID */
  private gistUpdateTimeout?: number;

  constructor() {
    this.defaultSettings = this.createDefaultSettings();
    this.settings = { ...this.defaultSettings };
    this.initializeOptions();
  }

  /**
   * Creates the default settings object
   * 
   * @returns Complete default settings configuration
   */
  private createDefaultSettings(): Settings {
    return {
      // Numeric settings
      searchlimit: 25,
      scrollstep: 70,
      fullpagescrollpercent: 0,
      typelinkhintsdelay: 300,
      scrollduration: 500,
      zoomfactor: 0.10,
      timeoutlen: 1000,
      vimport: 8001,

      // Object settings
      qmarks: {},
      sites: {},
      searchengines: {},
      searchaliases: {},
      FUNCTIONS: {},

      // Boolean settings
      hud: true,
      regexp: true,
      scalehints: false,
      linkanimations: false,
      sortlinkhints: false,
      ignorecase: true,
      numerichints: false,
      cncpcompletion: false,
      smartcase: true,
      incsearch: true,
      autohidecursor: false,
      typelinkhints: false,
      autofocus: true,
      insertmappings: true,
      defaultnewtabpage: false,
      dimhintcharacters: true,
      smoothscroll: false,
      autoupdategist: false,
      nativelinkorder: false,
      showtabindices: false,
      changelog: true,
      localconfig: false,
      completeonopen: false,
      debugcss: false, // Always use default COMMANDBARCSS

      // String settings
      configpath: '',
      locale: '',
      mapleader: '\\',
      defaultengine: 'google',
      hintcharacters: 'asdfgqwertzxcvb',
      homedirectory: '',
      langmap: '',
      nextmatchpattern: '((?!first)(next|older|more|>|›|»|forward| )+)',
      previousmatchpattern: '((?!last)(prev(ious)?|newer|back|«|less|<|‹| )+)',
      barposition: 'top',
      RC: '',
      MAPPINGS: '',
      GISTURL: '',

      // Array settings
      completionengines: ['google', 'duckduckgo', 'wikipedia', 'amazon'],
      blacklists: [],

      // CSS configuration
      COMMANDBARCSS: `#cVim-command-bar, #cVim-command-bar-mode, #cVim-command-bar-input, #cVim-command-bar-search-results,
.cVim-completion-item, .cVim-completion-item .cVim-full, .cVim-completion-item .cVim-left,
.cVim-completion-item .cVim-right {
  font-family: Helvetica, Helvetica Neue, Neue, sans-serif, monospace, Arial;
  font-size: 10pt !important;
  -webkit-font-smoothing: antialiased !important;
}

#cVim-command-bar {
  position: fixed;
  z-index: 2147483646;
  background-color: #1b1d1e;
  color: #bbb;
  display: none;
  box-sizing: content-box;
  box-shadow: 0 3px 3px rgba(0,0,0,0.4);
  left: 0;
  width: 100%;
  height: 20px;
}

#cVim-command-bar-mode {
  display: inline-block;
  vertical-align: middle;
  box-sizing: border-box;
  padding-left: 2px;
  height: 100%;
  width: 10px;
  padding-top: 2px;
  color: #888;
}

#cVim-command-bar-input {
  background-color: #1b1d1e;
  color: #bbb;
  height: 100%;
  right: 0;
  top: 0;
  width: calc(100% - 10px);
  position: absolute;
}

#cVim-command-bar-search-results {
  position: fixed;
  width: 100%;
  overflow: hidden;
  z-index: 2147483647;
  left: 0;
  box-shadow: 0 3px 3px rgba(0,0,0,0.4);
  background-color: #1c1c1c;
}

.cVim-completion-item, .cVim-completion-item .cVim-full, .cVim-completion-item .cVim-left, .cVim-completion-item .cVim-right {
  text-overflow: ellipsis;
  padding: 1px;
  display: inline-block;
  box-sizing: border-box;
  vertical-align: middle;
  overflow: hidden;
  white-space: nowrap;
}

.cVim-completion-item:nth-child(even) {
  background-color: #1f1f1f;
}

.cVim-completion-item {
  width: 100%; left: 0;
  color: #bcbcbc;
}

.cVim-completion-item[active] {
  width: 100%; left: 0;
  color: #1b1d1e;
  background-color: #f1f1f1;
}

.cVim-completion-item[active] span {
  color: #1b1d1e;
}

.cVim-completion-item .cVim-left {
  color: #fff;
  width: 37%;
}

.cVim-completion-item .cVim-right {
  font-style: italic;
  color: #888;
  width: 57%;
}


#cVim-link-container, .cVim-link-hint,
#cVim-hud, #cVim-status-bar {
  font-family: Helvetica, Helvetica Neue, Neue, sans-serif, monospace, Arial;
  font-size: 10pt !important;
  -webkit-font-smoothing: antialiased !important;
}

#cVim-link-container {
  position: absolute;
  pointer-events: none;
  width: 100%; left: 0;
  height: 100%; top: 0;
  z-index: 2147483647;
}

.cVim-link-hint {
  position: absolute;
  color: #302505 !important;
  background-color: #ffd76e !important;
  border-radius: 2px !important;
  padding: 2px !important;
  font-size: 8pt !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  border: 1px solid #ad810c;
  display: inline-block !important;
  vertical-align: middle !important;
  text-align: center !important;
  box-shadow: 2px 2px 1px rgba(0,0,0,0.25) !important;
}

.cVim-link-hint_match {
  color: #777;
  text-transform: uppercase !important;
}


#cVim-hud {
  background-color: rgba(28,28,28,0.9);
  position: fixed !important;
  transition: right 0.2s ease-out;
  z-index: 24724289;
}

#cVim-hud span {
  padding: 2px;
  padding-left: 4px;
  padding-right: 4px;
  color: #8f8f8f;
  font-size: 10pt;
}

#cVim-frames-outline {
  position: fixed;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  right: 0;
  z-index: 9999999999;
  box-sizing: border-box;
  border: 3px solid yellow;
}
`
    };
  }

  /**
   * Refreshes settings by merging with defaults
   * 
   * @param callback Optional callback to execute after refresh
   */
  async refreshSettings(callback?: () => void): Promise<void> {
    try {
      // Merge with defaults to ensure all keys exist
      for (const key in this.defaultSettings) {
        if (this.settings[key as keyof Settings] === undefined) {
          (this.settings as any)[key] = (this.defaultSettings as any)[key];
        }
      }

      if (callback) {
        callback();
      }

      console.debug('OptionsManager.refreshSettings: Settings refreshed');
    } catch (error) {
      console.error('OptionsManager.refreshSettings: Failed to refresh settings:', error);
    }
  }

  /**
   * Legacy synchronous version of refreshSettings for backward compatibility
   * 
   * @param callback Optional callback to execute after refresh
   * @deprecated Use async refreshSettings() method instead
   */
  refreshSettingsSync(callback?: () => void): void {
    for (const key in this.defaultSettings) {
      if (this.settings[key as keyof Settings] === undefined) {
        (this.settings as any)[key] = (this.defaultSettings as any)[key];
      }
    }

    if (callback) {
      callback();
    }
  }

  /**
   * Saves settings to Chrome storage
   * 
   * @param request Settings save request
   */
  async saveSettings(request: SettingsSaveRequest | Settings): Promise<void> {
    try {
      // Handle both new and legacy request formats
      let settingsData: Settings;
      let shouldSendSettings = false;

      if ('settings' in request && typeof request === 'object') {
        settingsData = request.settings;
        shouldSendSettings = request.sendSettings || false;
      } else {
        settingsData = request as Settings;
      }

      this.settings = settingsData;

      // Update quickmarks
      if (typeof Quickmarks !== 'undefined') {
        for (const key in this.settings.qmarks) {
          Quickmarks[key] = this.settings.qmarks[key];
        }
      }

      await this.refreshSettings();
      
      // Save to Chrome storage
      await chrome.storage[this.storageMethod].set({ settings: this.settings });

      if (shouldSendSettings) {
        await this.sendSettings();
      }

      console.debug('OptionsManager.saveSettings: Settings saved successfully');
    } catch (error) {
      console.error('OptionsManager.saveSettings: Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Legacy synchronous version of saveSettings for backward compatibility
   * 
   * @param request Settings save request
   * @deprecated Use async saveSettings() method instead
   */
  saveSettingsSync(request: SettingsSaveRequest | Settings): void {
    let settingsData: Settings;
    let shouldSendSettings = false;

    if ('settings' in request && typeof request === 'object') {
      settingsData = request.settings;
      shouldSendSettings = request.sendSettings || false;
    } else {
      settingsData = request as Settings;
    }

    this.settings = settingsData;

    // Update quickmarks
    if (typeof Quickmarks !== 'undefined') {
      for (const key in this.settings.qmarks) {
        Quickmarks[key] = this.settings.qmarks[key];
      }
    }

    this.refreshSettingsSync(() => {
      chrome.storage[this.storageMethod].set({ settings: this.settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('OptionsManager.saveSettingsSync: Error saving settings:', chrome.runtime.lastError);
        } else if (shouldSendSettings) {
          this.sendSettingsSync();
        }
      });
    });
  }

  /**
   * Sends current settings to all active ports
   */
  async sendSettings(): Promise<void> {
    try {
      if (typeof activePorts !== 'undefined' && Array.isArray(activePorts)) {
        const message: SettingsPortMessage = {
          type: 'sendSettings',
          settings: this.settings
        };

        activePorts.forEach((port: chrome.runtime.Port) => {
          try {
            port.postMessage(message);
          } catch (error) {
            console.debug('OptionsManager.sendSettings: Failed to send to port:', error);
          }
        });
      }

      console.debug('OptionsManager.sendSettings: Settings sent to all ports');
    } catch (error) {
      console.error('OptionsManager.sendSettings: Failed to send settings:', error);
    }
  }

  /**
   * Legacy synchronous version of sendSettings for backward compatibility
   * 
   * @deprecated Use async sendSettings() method instead
   */
  sendSettingsSync(): void {
    if (typeof activePorts !== 'undefined' && Array.isArray(activePorts)) {
      const message: SettingsPortMessage = {
        type: 'sendSettings',
        settings: this.settings
      };

      activePorts.forEach((port: chrome.runtime.Port) => {
        try {
          port.postMessage(message);
        } catch (error) {
          console.debug('OptionsManager.sendSettingsSync: Failed to send to port:', error);
        }
      });
    }
  }

  /**
   * Gets settings and sends them to a specific tab
   * 
   * @param request Settings get request
   * @param sender Message sender information
   */
  async getSettings(request: SettingsGetRequest, sender: chrome.runtime.MessageSender): Promise<void> {
    try {
      if (!sender.tab?.id) {
        console.error('OptionsManager.getSettings: Invalid sender tab');
        return;
      }

      await this.refreshSettings();

      const message: SettingsMessage = {
        action: 'sendSettings',
        settings: request.reset ? this.defaultSettings as Settings : this.settings
      };

      await chrome.tabs.sendMessage(sender.tab.id, message);
      console.debug('OptionsManager.getSettings: Settings sent to tab', sender.tab.id);
    } catch (error) {
      console.error('OptionsManager.getSettings: Failed to get/send settings:', error);
    }
  }

  /**
   * Legacy synchronous version of getSettings for backward compatibility
   * 
   * @param request Settings get request
   * @param sender Message sender information
   * @deprecated Use async getSettings() method instead
   */
  getSettingsSync(request: SettingsGetRequest, sender: chrome.runtime.MessageSender): void {
    if (!sender.tab?.id) {
      console.error('OptionsManager.getSettingsSync: Invalid sender tab');
      return;
    }

    const tabId = sender.tab.id;
    this.refreshSettingsSync(() => {
      const message: SettingsMessage = {
        action: 'sendSettings',
        settings: request.reset ? this.defaultSettings as Settings : this.settings
      };

      chrome.tabs.sendMessage(tabId, message, () => {
        if (chrome.runtime.lastError) {
          console.error('OptionsManager.getSettingsSync: Error sending settings:', chrome.runtime.lastError);
        }
      });
    });
  }

  /**
   * Resets settings to defaults
   */
  async setDefaults(): Promise<void> {
    try {
      this.settings = { ...this.defaultSettings };
      await this.saveSettings({ settings: this.settings });
      console.debug('OptionsManager.setDefaults: Settings reset to defaults');
    } catch (error) {
      console.error('OptionsManager.setDefaults: Failed to reset settings:', error);
      throw error;
    }
  }

  /**
   * Legacy synchronous version of setDefaults for backward compatibility
   * 
   * @deprecated Use async setDefaults() method instead
   */
  setDefaultsSync(): void {
    this.settings = { ...this.defaultSettings };
    this.saveSettingsSync({ settings: this.settings });
  }

  /**
   * Gets default settings
   * 
   * @param request Request object (unused)
   * @param sender Sender information (unused)
   * @param callback Callback to return defaults
   */
  getDefaults(request: any, sender: chrome.runtime.MessageSender, callback: (defaults: Settings) => void): void {
    callback(this.defaultSettings as Settings);
  }

  /**
   * Gets all settings (both default and current)
   * 
   * @param request Request object (unused)
   * @param sender Sender information (unused)
   * @param callback Callback to return all settings
   */
  getAllSettings(request: any, sender: chrome.runtime.MessageSender, callback: (response: AllSettingsResponse) => void): void {
    callback({
      defaults: this.defaultSettings as Settings,
      current: this.settings
    });
  }

  /**
   * Updates blacklists and mappings from RC configuration
   */
  async updateBlacklistsMappings(): Promise<void> {
    try {
      if (typeof Utils === 'undefined') {
        console.warn('OptionsManager.updateBlacklistsMappings: Utils module not available');
        return;
      }

      const rc = Utils.compressArray(this.settings.RC.split(/\n+/));
      let index: number | undefined;

      // Handle legacy BLACKLISTS setting
      if (this.settings.BLACKLISTS) {
        this.settings.blacklists = this.settings.BLACKLISTS.split(/\n+/);
        delete this.settings.BLACKLISTS;
      }

      // Remove existing blacklists declaration from RC
      for (let i = 0; i < rc.length; ++i) {
        if (/ *let *blacklists *= */.test(rc[i])) {
          rc.splice(i, 1);
          index = i;
          break;
        }
      }

      // Ensure unique blacklists
      this.settings.blacklists = Utils.uniqueElements(this.settings.blacklists);

      // Add blacklists back to RC if they exist
      if (this.settings.blacklists.length > 0) {
        const line = 'let blacklists = ' + JSON.stringify(this.settings.blacklists);
        if (index !== undefined) {
          rc.splice(index, 0, line);
        } else {
          rc.push(line);
        }
      }

      this.settings.RC = rc.join('\n');
      await this.saveSettings({ settings: this.settings });

      console.debug('OptionsManager.updateBlacklistsMappings: Blacklists updated');
    } catch (error) {
      console.error('OptionsManager.updateBlacklistsMappings: Failed to update blacklists:', error);
    }
  }

  /**
   * Legacy synchronous version of updateBlacklistsMappings for backward compatibility
   * 
   * @deprecated Use async updateBlacklistsMappings() method instead
   */
  updateBlacklistsMappingsSync(): void {
    if (typeof Utils === 'undefined') {
      console.warn('OptionsManager.updateBlacklistsMappingsSync: Utils module not available');
      return;
    }

    const rc = Utils.compressArray(this.settings.RC.split(/\n+/));
    let index: number | undefined;

    // Handle legacy BLACKLISTS setting
    if (this.settings.BLACKLISTS) {
      this.settings.blacklists = this.settings.BLACKLISTS.split(/\n+/);
      delete this.settings.BLACKLISTS;
    }

    // Remove existing blacklists declaration from RC
    for (let i = 0; i < rc.length; ++i) {
      if (/ *let *blacklists *= */.test(rc[i])) {
        rc.splice(i, 1);
        index = i;
        break;
      }
    }

    // Ensure unique blacklists
    this.settings.blacklists = Utils.uniqueElements(this.settings.blacklists);

    // Add blacklists back to RC if they exist
    if (this.settings.blacklists.length > 0) {
      const line = 'let blacklists = ' + JSON.stringify(this.settings.blacklists);
      if (index !== undefined) {
        rc.splice(index, 0, line);
      } else {
        rc.push(line);
      }
    }

    this.settings.RC = rc.join('\n');
    this.saveSettingsSync({ settings: this.settings });
  }

  /**
   * Fetches configuration from GitHub Gist
   */
  async fetchGist(): Promise<void> {
    try {
      if (!this.settings.GISTURL) {
        console.warn('OptionsManager.fetchGist: No GIST URL configured');
        return;
      }

      if (typeof httpRequest !== 'function') {
        console.error('OptionsManager.fetchGist: httpRequest function not available');
        return;
      }

      const url = this.settings.GISTURL + 
        (this.settings.GISTURL.indexOf('raw') === -1 && 
         this.settings.GISTURL.indexOf('github') !== -1 ? '/raw' : '');

      const response = await httpRequest({ url });

      let updated: Partial<Settings>;
      try {
        if (typeof RCParser !== 'undefined') {
          updated = RCParser.parse(response);
        } else {
          console.error('OptionsManager.fetchGist: RCParser not available');
          return;
        }
      } catch (parseError) {
        console.error('cVim Error: error parsing config file', parseError);
        return;
      }

      // Preserve certain settings
      updated.GISTURL = this.settings.GISTURL;
      updated.COMMANDBARCSS = this.settings.COMMANDBARCSS;

      await this.saveSettings({
        settings: { ...this.settings, ...updated },
        sendSettings: true
      });

      // Schedule next update if auto-update is enabled
      if (updated.autoupdategist) {
        this.scheduleGistUpdate();
      }

      console.debug('OptionsManager.fetchGist: Gist configuration updated');
    } catch (error) {
      console.error('OptionsManager.fetchGist: Failed to fetch gist:', error);
    }
  }

  /**
   * Legacy synchronous version of fetchGist for backward compatibility
   * 
   * @deprecated Use async fetchGist() method instead
   */
  fetchGistSync(): void {
    if (!this.settings.GISTURL) {
      console.warn('OptionsManager.fetchGistSync: No GIST URL configured');
      return;
    }

    if (typeof httpRequest !== 'function') {
      console.error('OptionsManager.fetchGistSync: httpRequest function not available');
      return;
    }

    const url = this.settings.GISTURL + 
      (this.settings.GISTURL.indexOf('raw') === -1 && 
       this.settings.GISTURL.indexOf('github') !== -1 ? '/raw' : '');

    httpRequest({ url }).then((response: string) => {
      let updated: Partial<Settings>;
      try {
        if (typeof RCParser !== 'undefined') {
          updated = RCParser.parse(response);
        } else {
          console.error('OptionsManager.fetchGistSync: RCParser not available');
          return;
        }
      } catch (parseError) {
        console.error('cVim Error: error parsing config file', parseError);
        return;
      }

      updated.GISTURL = this.settings.GISTURL;
      updated.COMMANDBARCSS = this.settings.COMMANDBARCSS;

      this.saveSettingsSync({
        settings: { ...this.settings, ...updated },
        sendSettings: true
      });

      if (updated.autoupdategist) {
        this.scheduleGistUpdateSync();
      }
    }).catch((error: any) => {
      console.error('OptionsManager.fetchGistSync: Failed to fetch gist:', error);
    });
  }

  /**
   * Schedules automatic Gist updates
   */
  private scheduleGistUpdate(): void {
    if (this.gistUpdateTimeout) {
      clearTimeout(this.gistUpdateTimeout);
    }

    this.gistUpdateTimeout = window.setTimeout(() => {
      this.fetchGist();
    }, 1000 * 60 * 60); // 1 hour
  }

  /**
   * Legacy synchronous version of scheduleGistUpdate
   */
  private scheduleGistUpdateSync(): void {
    if (this.gistUpdateTimeout) {
      clearTimeout(this.gistUpdateTimeout);
    }

    this.gistUpdateTimeout = window.setTimeout(() => {
      this.fetchGistSync();
    }, 1000 * 60 * 60); // 1 hour
  }

  /**
   * Handles Chrome storage change events
   * 
   * @param changes Storage changes object
   */
  private handleStorageChanges(changes: StorageChanges): void {
    if (!changes.hasOwnProperty('sessions')) {
      const settingsChange = changes['settings'];
      if (settingsChange) {
        this.settings = settingsChange.newValue || this.defaultSettings as Settings;
        console.debug('OptionsManager.handleStorageChanges: Settings updated from storage');
      }
    }
  }

  /**
   * Handles Chrome runtime messages
   * 
   * @param request Message request
   * @param sender Message sender
   * @param callback Response callback
   */
  private handleRuntimeMessage(request: any, sender: chrome.runtime.MessageSender, callback: Function): boolean {
    if (request && request.action && this.hasMethod(request.action)) {
      try {
        const method = (this as any)[request.action];
        if (typeof method === 'function') {
          method.call(this, request, sender, callback);
          return true;
        }
      } catch (error) {
        console.error(`OptionsManager.handleRuntimeMessage: Error handling ${request.action}:`, error);
        callback({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return false;
  }

  /**
   * Checks if the options manager has a specific method
   * 
   * @param methodName Method name to check
   * @returns Whether the method exists
   */
  private hasMethod(methodName: string): boolean {
    return typeof (this as any)[methodName] === 'function';
  }

  /**
   * Initializes the options manager
   */
  private async initializeOptions(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load settings from storage
      const data = await chrome.storage[this.storageMethod].get('settings');
      
      if (data.settings) {
        this.settings = data.settings;
        
        // Update Quickmarks if available
        if (typeof Quickmarks !== 'undefined') {
          Object.assign(Quickmarks, this.settings.qmarks);
        }
      }

      // Handle debug CSS setting
      if (this.settings.debugcss) {
        this.settings.COMMANDBARCSS = this.defaultSettings.COMMANDBARCSS;
      }

      await this.refreshSettings();
      await this.updateBlacklistsMappings();

      // Set up Gist auto-update if configured
      if (this.settings.autoupdategist && this.settings.GISTURL) {
        this.scheduleGistUpdate();
      }

      // Set up event listeners
      chrome.storage.onChanged.addListener((changes: StorageChanges) => {
        this.handleStorageChanges(changes);
      });

      chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, callback: Function) => {
        return this.handleRuntimeMessage(request, sender, callback);
      });

      this.initialized = true;
      console.debug('OptionsManager: Initialization complete');
    } catch (error) {
      console.error('OptionsManager: Initialization failed:', error);
    }
  }

  /**
   * Legacy synchronous initialization for backward compatibility
   * 
   * @deprecated Use async initialization instead
   */
  private initializeOptionsSync(): void {
    chrome.storage[this.storageMethod].get('settings', (data) => {
      if (chrome.runtime.lastError) {
        console.error('OptionsManager.initializeOptionsSync: Error getting settings:', chrome.runtime.lastError);
        return;
      }

      if (data.settings) {
        this.settings = data.settings;
        
        if (typeof Quickmarks !== 'undefined') {
          Object.assign(Quickmarks, this.settings.qmarks);
        }
      }

      if (this.settings.debugcss) {
        this.settings.COMMANDBARCSS = this.defaultSettings.COMMANDBARCSS;
      }

      this.refreshSettingsSync();
      this.updateBlacklistsMappingsSync();

      if (this.settings.autoupdategist && this.settings.GISTURL) {
        this.scheduleGistUpdateSync();
      }
    });
  }

  /**
   * Gets options manager statistics
   * 
   * @returns Statistics object
   */
  getStats(): {
    initialized: boolean;
    settingsKeys: number;
    blacklistsCount: number;
    qmarksCount: number;
    hasGistUrl: boolean;
    autoUpdateGist: boolean;
  } {
    return {
      initialized: this.initialized,
      settingsKeys: Object.keys(this.settings).length,
      blacklistsCount: this.settings.blacklists.length,
      qmarksCount: Object.keys(this.settings.qmarks).length,
      hasGistUrl: !!this.settings.GISTURL,
      autoUpdateGist: this.settings.autoupdategist
    };
  }

  /**
   * Validates settings object
   * 
   * @param settings Settings to validate
   * @returns Whether settings are valid
   */
  validateSettings(settings: any): settings is Settings {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // Check required numeric fields
    const numericFields = ['searchlimit', 'scrollstep', 'timeoutlen'];
    for (const field of numericFields) {
      if (typeof settings[field] !== 'number') {
        return false;
      }
    }

    // Check required boolean fields
    const booleanFields = ['hud', 'regexp', 'smartcase'];
    for (const field of booleanFields) {
      if (typeof settings[field] !== 'boolean') {
        return false;
      }
    }

    // Check required string fields
    const stringFields = ['defaultengine', 'hintcharacters', 'barposition'];
    for (const field of stringFields) {
      if (typeof settings[field] !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the options manager is ready
   * 
   * @returns Whether the manager is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const Options = new OptionsManager();

// For backward compatibility, expose global variables and functions
const optionsLegacy = {
  refreshSettings: (callback?: () => void) => Options.refreshSettingsSync(callback),
  saveSettings: (request: SettingsSaveRequest | Settings) => Options.saveSettingsSync(request),
  sendSettings: () => Options.sendSettingsSync(),
  getSettings: (request: SettingsGetRequest, sender: chrome.runtime.MessageSender) => 
    Options.getSettingsSync(request, sender),
  setDefaults: () => Options.setDefaultsSync(),
  getDefaults: (request: any, sender: chrome.runtime.MessageSender, callback: (defaults: Settings) => void) =>
    Options.getDefaults(request, sender, callback),
  getAllSettings: (request: any, sender: chrome.runtime.MessageSender, callback: (response: AllSettingsResponse) => void) =>
    Options.getAllSettings(request, sender, callback),
  updateBlacklistsMappings: () => Options.updateBlacklistsMappingsSync(),
  fetchGist: () => Options.fetchGistSync()
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).storageMethod = 'local';
  (window as any).settings = Options.settings;
  (window as any).Options = optionsLegacy;
  (window as any).defaultSettings = Options.defaultSettings;
} else {
  // Service worker context
  (globalThis as any).storageMethod = 'local';
  (globalThis as any).settings = Options.settings;
  (globalThis as any).Options = optionsLegacy;
  (globalThis as any).defaultSettings = Options.defaultSettings;
}

// Modern export for TypeScript modules
export default Options;
export { 
  OptionsManager, 
  Settings, 
  PartialSettings,
  SettingsSaveRequest,
  SettingsGetRequest,
  SettingsMessage,
  SettingsPortMessage,
  AllSettingsResponse,
  QuickMarks,
  SiteConfig,
  SearchEngines,
  SearchAliases,
  RCFunctions,
  StorageMethod,
  StorageChanges,
  optionsLegacy
};