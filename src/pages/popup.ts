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

const popupPort = chrome.runtime.connect({ name: 'popup' });
popupPort.onMessage.addListener((data: boolean) => {
  if (data === true) {
    blacklist.textContent = 'Enable cVim on this domain';
    isBlacklisted = true;
  }
});
popupPort.postMessage({ action: 'getBlacklisted' } as GetBlacklistedMessage);

chrome.runtime.sendMessage({ action: 'getActiveState' } as GetActiveStateMessage, (response: boolean) => {
  isEnabled = response;
  if (isEnabled) {
    pause.textContent = 'Disable cVim';
  } else {
    pause.textContent = 'Enable cVim';
  }
});

settingsButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'openLinkTab',
    active: true,
    url: chrome.runtime.getURL('/pages/options.html')
  } as OpenLinkTabMessage);
}, false);

pause.addEventListener('click', () => {
  isEnabled = !isEnabled;
  if (isEnabled) {
    pause.textContent = 'Disable cVim';
  } else {
    pause.textContent = 'Enable cVim';
  }
  popupPort.postMessage({ action: 'toggleEnabled', blacklisted: isBlacklisted } as ToggleEnabledMessage);
}, false);

blacklist.addEventListener('click', () => {
  isBlacklisted = !isBlacklisted;
  if (blacklist.textContent === 'Disable cVim on this domain') {
    blacklist.textContent = 'Enable cVim on this domain';
  } else {
    blacklist.textContent = 'Disable cVim on this domain';
  }
  popupPort.postMessage({ action: 'toggleBlacklisted' } as ToggleBlacklistedMessage);
  if (isEnabled) {
    popupPort.postMessage({
      action: 'toggleEnabled',
      singleTab: true,
      blacklisted: isBlacklisted
    } as ToggleEnabledMessage);
  }
}, false);