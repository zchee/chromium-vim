/// <reference types="chrome" />

// Global type augmentations need export for module context
export { };

declare global {
  interface Window {
    parseConfig(value: string): ParseConfigResult;
  }

  interface ObjectConstructor {
    clone<T>(node: T): T;
    merge(a: Record<string, any>, b: Record<string, any>): void;
  }
}

// Type definitions for external dependencies
type MessageWrapper = (action: string, args?: any, callback?: (response?: any) => void) => void;

declare const RUNTIME: MessageWrapper;
declare const PORT: MessageWrapper;
declare const port: chrome.runtime.Port;
declare const waitForLoad: (callback: () => void, constructor?: any) => void;
declare const httpRequest: (request: HttpRequestOptions, callback: HttpCallback) => void;
declare const Utils: {
  split(string: string, pattern: string | RegExp): string[];
  trim(string: string): string;
};

// CodeMirror type definitions
declare const CodeMirror: {
  fromTextArea(textarea: HTMLTextAreaElement, options?: CodeMirrorOptions): CodeMirrorEditor;
};

interface CodeMirrorOptions {
  lineNumbers?: boolean;
  keyMap?: string;
}

interface CodeMirrorEditor {
  setValue(value: string): void;
  getValue(): string;
  setOption(option: string, value: any): void;
}

// Configuration and settings interfaces
interface ParseConfigResult {
  error: {
    lineno: number;
    message: string;
  } | null;
  value: any;
}

interface ConfigObject {
  RC: string;
  COMMANDBARCSS: string;
  GISTURL: string;
  localconfig?: boolean;
  configpath?: string;
  homedirectory?: string;
  mapleader?: string;
  [key: string]: any;
}

interface HttpRequestOptions {
  url: string;
  json?: boolean;
}

type HttpCallback = (response: any) => void;

interface ChromeMessage {
  action: string;
  settings?: ConfigObject;
  sendSettings?: boolean;
  type?: string;
  [key: string]: any;
}

interface LoadConfigResponse {
  config: ConfigObject;
  code: number;
  error?: {
    lineno: number;
    message: string;
  };
}

// Settings class definition
class SettingsManager {
  public initialLoad: boolean = true;
  public rcEl!: HTMLTextAreaElement;
  public cssEl!: CodeMirrorEditor;
  public saveButton!: HTMLInputElement;
  public editModeEl!: HTMLSelectElement;
  public gistUrl!: HTMLInputElement;
  public gistPlaceHolder!: string;
  public settings!: ConfigObject;

  loadrc(config: ConfigObject): void {
    this.rcEl.value = config.RC;
    this.rcEl.style.height = this.rcEl.scrollHeight + 'px';
    if (this.cssEl) {
      this.cssEl.setValue(config.COMMANDBARCSS);
    }
    this.gistUrl.value = config.GISTURL;
  }

  resetSettings(): void {
    if (confirm('Reset all configuration and CSS settings to their default values?')) {
      RUNTIME('getDefaults', (defaults: ConfigObject) => {
        this.rcEl.value = defaults.RC;
        this.cssEl.setValue(defaults.COMMANDBARCSS);
        this.gistUrl.value = defaults.GISTURL;
        this.settings = Object.clone(defaults);
      });
    }
  }

  saveSettings(): void {
    RUNTIME('getDefaults', (defaults: ConfigObject) => {
      const hadLocalConfigSet = !!this.settings.localconfig;
      const lastConfigPath = this.settings.configpath;
      this.settings = defaults;
      const res = window.parseConfig(this.rcEl.value);
      if (res.error !== null) {
        console.error('Line %d: %s', res.error.lineno, res.error.message);
        alert('parse error on line ' + res.error.lineno +
          ' of config (see console for more info)');
      } else {
        Object.merge(this.settings, res.value);
      }
      this.settings.COMMANDBARCSS = this.cssEl.getValue();
      this.settings.GISTURL = this.gistUrl.value;
      this.settings.mapleader = this.settings.mapleader?.replace(/ /g, '<Space>') || '';
      if (hadLocalConfigSet && this.settings.localconfig && this.settings.configpath &&
        lastConfigPath === this.settings.configpath) {
        alert('cVim Error: unset the localconfig before saving from here');
      }
      this.saveButton.value = 'Saved';
      chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: this.settings,
        sendSettings: true
      } as ChromeMessage);
      setTimeout(() => {
        this.saveButton.value = 'Save';
      }, 3000);
    });
  }

  editMode(e: Event): void {
    const target = e.target as HTMLSelectElement;
    if (this.cssEl) {
      this.cssEl.setOption('keyMap',
        target.value === 'Vim' ? 'vim' : 'default');
    }
  }

  syncGist(): void {
    const url = new URL(Utils.trim(this.gistUrl.value));
    if (url.hostname === 'gist.github.com') {
      url.hostname = 'gist.githubusercontent.com';
      url.pathname += '/raw';
    } else if (url.hostname === 'github.com') {
      url.hostname = 'raw.githubusercontent.com';
      const path = Utils.split(url.pathname, '/');
      if (path[2] === 'blob')
        path.splice(2, 1);
      url.pathname = path.join('/');
    }
    httpRequest({ url: url.toString() }, (res: string) => {
      this.rcEl.value = res;
    });
  }

  init(): void {
    addVersionInfo();
    document.body.spellcheck = false;

    this.saveButton = document.getElementById('save_button') as HTMLInputElement;
    this.rcEl = document.getElementById('mappings') as HTMLTextAreaElement;
    this.editModeEl = document.getElementById('edit_mode') as HTMLSelectElement;

    const autoSize = function(this: HTMLTextAreaElement): void {
      const stop = document.scrollingElement!.scrollTop;
      this.style.height = '';
      this.style.height = this.scrollHeight + 'px';
      document.scrollingElement!.scrollTop = stop;
    };

    this.rcEl.addEventListener('input', autoSize);

    this.editModeEl.addEventListener('change', (e) => this.editMode(e), false);
    this.saveButton.addEventListener('click', () => this.saveSettings(), false);
    (document.getElementById('reset_button') as HTMLInputElement).addEventListener('click', () => this.resetSettings(), false);
    (document.getElementById('clearHistory') as HTMLInputElement).addEventListener('click', () => {
      RUNTIME('clearHistory');
    });
    this.gistUrl = document.getElementById('gistUrl') as HTMLInputElement;
    (document.getElementById('gistSync') as HTMLInputElement).addEventListener('click', () => this.syncGist());
    this.gistPlaceHolder = 'https://gist.github.com/1995eaton/9e68803bf1f1e7524340';
    this.gistUrl.addEventListener('focus', function() {
      this.setAttribute('placeholder', '');
    });
    this.gistUrl.addEventListener('blur', function() {
      this.setAttribute('placeholder', Settings.gistPlaceHolder);
    });
  }
}

// Create Settings instance
const Settings = new SettingsManager();

function addVersionInfo(): void {
  const el = document.getElementById('version-number') as HTMLElement;
  const version = chrome.runtime.getManifest().version;
  if (version) {
    el.textContent = '(' + version + ')';
  }
}

// Chrome Extension message listener - Manifest v3 compatible
port.onMessage.addListener((response: ChromeMessage) => {
  if (response.type === 'sendSettings') {
    waitForLoad(() => {
      if (Settings.initialLoad) {
        Settings.cssEl = CodeMirror.fromTextArea(document.getElementById('commandBarCSS') as HTMLTextAreaElement, { lineNumbers: true });
        Settings.initialLoad = false;
        Settings.settings = response.settings!;
        Settings.init();
        if (response.settings!.localconfig &&
          response.settings!.configpath) {
          const path = 'file://' + response.settings!.configpath
            .split('~').join(response.settings!.homedirectory || '~');
          RUNTIME('loadLocalConfig', { path: path }, (e: LoadConfigResponse) => {
            Settings.loadrc(e.config);
            switch (e.code) {
              case -1:
                alert('error loading configpath: "' + path + '"');
                break;
              case -2:
                console.error('Line %d: %s', e.error!.lineno, e.error!.message);
                alert('parse error on line ' + e.error!.lineno +
                  ' of config (see console for more info)');
            }
          });
        } else {
          Settings.loadrc(response.settings!);
        }
      }
    });
  }
});

// Initialize settings request
PORT('getSettings');
