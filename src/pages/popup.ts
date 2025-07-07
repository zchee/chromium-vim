interface GetBlacklistedMessage {
  action: 'getBlacklisted';
}

interface GetActiveStateMessage {
  action: 'getActiveState';
}

interface OpenLinkTabMessage {
  action: 'openLinkTab';
  active: boolean;
  url: string;
}

interface ToggleEnabledMessage {
  action: 'toggleEnabled';
  blacklisted: boolean;
  singleTab?: boolean;
}

interface ToggleBlacklistedMessage {
  action: 'toggleBlacklisted';
}

type PopupMessage = GetBlacklistedMessage | GetActiveStateMessage | OpenLinkTabMessage | ToggleEnabledMessage | ToggleBlacklistedMessage;

const pause = document.getElementById('pause') as HTMLElement;
const blacklist = document.getElementById('blacklist') as HTMLElement;
const settingsButton = document.getElementById('settings') as HTMLElement;
let isEnabled: boolean = true;
let isBlacklisted: boolean = false;

// Enhanced message handling with retry logic, timeout, and service worker lifecycle management
interface MessageOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface MessageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Service worker keepalive mechanism
function wakeUpServiceWorker(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'ping' }, () => {
      resolve();
    });
  });
}

// Enhanced message sending with retry, timeout, and error handling
async function sendMessage<T>(
  message: PopupMessage,
  options: MessageOptions = {}
): Promise<MessageResult<T>> {
  const { timeout = 5000, retries = 3, retryDelay = 100 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Wake up service worker before sending message
      if (attempt === 0) {
        await wakeUpServiceWorker();
      }

      const result = await Promise.race([
        new Promise<T>((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response: T) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Message timeout')), timeout);
        })
      ]);

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Message attempt ${attempt + 1} failed:`, errorMessage);

      if (attempt === retries) {
        return { success: false, error: errorMessage };
      }

      // Exponential backoff with jitter
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Fallback message handler for backwards compatibility
function sendMessageLegacy<T>(message: PopupMessage, callback?: (response: T) => void): void {
  sendMessage<T>(message)
    .then(result => {
      if (result.success && callback) {
        callback(result.data as T);
      } else if (!result.success) {
        console.error('Message sending failed:', result.error);
      }
    })
    .catch(error => {
      console.error('Message sending failed:', error);
    });
}

// UI helper functions for fallback states
function setLoadingState(element: HTMLElement, originalText: string): void {
  element.textContent = `${originalText} (Loading...)`;
  element.style.opacity = '0.6';
}

function setErrorState(element: HTMLElement, fallbackText: string): void {
  element.textContent = fallbackText;
  element.style.opacity = '0.8';
  element.style.color = '#ff6b6b';
}

function setNormalState(element: HTMLElement, text: string): void {
  element.textContent = text;
  element.style.opacity = '1';
  element.style.color = '';
}

// Initialize popup state with enhanced error handling
async function initializePopup(): Promise<void> {
  // Set loading states
  setLoadingState(blacklist, 'Domain settings');
  setLoadingState(pause, 'Extension state');

  try {
    // Initialize blacklist state
    const blacklistResult = await sendMessage<boolean>({ action: 'getBlacklisted' } as GetBlacklistedMessage);
    if (blacklistResult.success && blacklistResult.data !== undefined) {
      isBlacklisted = blacklistResult.data;
      setNormalState(blacklist, isBlacklisted ? 'Enable cVim on this domain' : 'Disable cVim on this domain');
    } else {
      console.error('Failed to get blacklist state:', blacklistResult.error);
      setErrorState(blacklist, 'Domain settings unavailable');
    }

    // Initialize active state
    const activeResult = await sendMessage<boolean>({ action: 'getActiveState' } as GetActiveStateMessage);
    if (activeResult.success && activeResult.data !== undefined) {
      isEnabled = activeResult.data;
      setNormalState(pause, isEnabled ? 'Disable cVim' : 'Enable cVim');
    } else {
      console.error('Failed to get active state:', activeResult.error);
      setErrorState(pause, 'Extension state unavailable');
    }
  } catch (error) {
    console.error('Popup initialization failed:', error);
    setErrorState(blacklist, 'Failed to load');
    setErrorState(pause, 'Failed to load');
  }
}

// Initialize popup when DOM is ready
initializePopup();

settingsButton.addEventListener('click', async () => {
  try {
    const result = await sendMessage({
      action: 'openLinkTab',
      active: true,
      url: chrome.runtime.getURL('/pages/options.html')
    } as OpenLinkTabMessage);
    
    if (!result.success) {
      console.error('Failed to open settings page:', result.error);
    }
  } catch (error) {
    console.error('Settings button error:', error);
  }
}, false);

pause.addEventListener('click', async () => {
  // Prevent multiple clicks during processing
  if (pause.style.opacity === '0.6') return;
  
  setLoadingState(pause, isEnabled ? 'Disabling...' : 'Enabling...');
  
  try {
    const result = await sendMessage({ action: 'toggleEnabled', blacklisted: isBlacklisted } as ToggleEnabledMessage);
    
    if (result.success) {
      isEnabled = !isEnabled;
      setNormalState(pause, isEnabled ? 'Disable cVim' : 'Enable cVim');
    } else {
      console.error('Failed to toggle enabled state:', result.error);
      setErrorState(pause, 'Toggle failed');
      // Restore UI after 2 seconds
      setTimeout(() => {
        setNormalState(pause, isEnabled ? 'Disable cVim' : 'Enable cVim');
      }, 2000);
    }
  } catch (error) {
    console.error('Pause button error:', error);
    setErrorState(pause, 'Action failed');
    setTimeout(() => {
      setNormalState(pause, isEnabled ? 'Disable cVim' : 'Enable cVim');
    }, 2000);
  }
}, false);

blacklist.addEventListener('click', async () => {
  // Prevent multiple clicks during processing
  if (blacklist.style.opacity === '0.6') return;
  
  const currentText = blacklist.textContent;
  setLoadingState(blacklist, 'Updating...');
  
  try {
    const toggleResult = await sendMessage({ action: 'toggleBlacklisted' } as ToggleBlacklistedMessage);
    
    if (toggleResult.success) {
      isBlacklisted = !isBlacklisted;
      setNormalState(blacklist, isBlacklisted ? 'Enable cVim on this domain' : 'Disable cVim on this domain');
      
      // If extension is enabled, also toggle the single tab state
      if (isEnabled) {
        const enabledResult = await sendMessage({
          action: 'toggleEnabled',
          singleTab: true,
          blacklisted: isBlacklisted
        } as ToggleEnabledMessage);
        
        if (!enabledResult.success) {
          console.warn('Failed to update single tab state:', enabledResult.error);
        }
      }
    } else {
      console.error('Failed to toggle blacklist:', toggleResult.error);
      setErrorState(blacklist, 'Update failed');
      // Restore UI after 2 seconds
      setTimeout(() => {
        setNormalState(blacklist, currentText || 'Domain settings');
      }, 2000);
    }
  } catch (error) {
    console.error('Blacklist button error:', error);
    setErrorState(blacklist, 'Action failed');
    setTimeout(() => {
      setNormalState(blacklist, currentText || 'Domain settings');
    }, 2000);
  }
}, false); 
