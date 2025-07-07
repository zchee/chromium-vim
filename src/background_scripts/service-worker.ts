/// <reference types="chrome"/>

interface CVimSession {
  [key: string]: any;
}

interface CVimActiveTab {
  id: number;
  url: string;
  title?: string;
}

interface CVimTabHistory {
  [tabId: number]: string[];
}

interface CVimPort extends chrome.runtime.Port {
  sender?: chrome.runtime.MessageSender | undefined;
}

let sessions: { [key: string]: CVimSession } = {};
let activeTabs: { [tabId: number]: CVimActiveTab } = {};
let tabHistory: CVimTabHistory = {};
let activePorts: CVimPort[] = [];
let lastUsedTabs: number[] = [];

async function httpRequest(request: { url: string; json?: boolean }): Promise<any> {
  try {
    const response = await fetch(request.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return request.json ? await response.json() : await response.text();
  } catch (error) {
    throw error;
  }
}

function updateTabIndices(): void {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || {};
    if (settings.showtabindices) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'displayTabIndices',
              index: tab.index + 1
            }).catch(() => {
              // Ignore errors for tabs that can't receive messages
            });
          }
        });
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('sessions', (result) => {
    if (result.sessions === undefined) {
      chrome.storage.local.set({ sessions: {} });
    } else {
      sessions = result.sessions;
    }
  });
});

function getTab(tab: chrome.tabs.Tab, reverse: boolean, count: number, first: boolean, last: boolean): void {
  if (!tab.windowId) return;

  chrome.tabs.query({ windowId: tab.windowId }, (tabs) => {
    if (first) {
      const firstTab = tabs[0];
      if (firstTab?.id) {
        chrome.tabs.update(firstTab.id, { active: true });
      }
    } else if (last) {
      const lastTab = tabs[tabs.length - 1];
      if (lastTab?.id) {
        chrome.tabs.update(lastTab.id, { active: true });
      }
    } else {
      let index = (reverse ? -1 : 1) * count + tab.index;
      if (count !== -1 && count !== 1) {
        index = Math.min(Math.max(0, index), tabs.length - 1);
      } else {
        if (index < 0) {
          index = tabs.length - 1;
        } else if (index >= tabs.length) {
          index = 0;
        }
      }
      const targetTab = tabs[index];
      if (targetTab?.id) {
        chrome.tabs.update(targetTab.id, { active: true });
      }
    }
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  if (tabId) {
    const index = lastUsedTabs.indexOf(tabId);
    if (index !== -1) {
      lastUsedTabs.splice(index, 1);
    }
    lastUsedTabs.unshift(tabId);

    if (lastUsedTabs.length > 50) {
      lastUsedTabs = lastUsedTabs.slice(0, 50);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete activeTabs[tabId];
  delete tabHistory[tabId];

  const index = lastUsedTabs.indexOf(tabId);
  if (index !== -1) {
    lastUsedTabs.splice(index, 1);
  }

  activePorts = activePorts.filter(port => {
    const senderId = port.sender?.tab?.id;
    return senderId !== tabId;
  });
});

chrome.runtime.onConnect.addListener((port) => {
  activePorts.push(port as CVimPort);

  port.onDisconnect.addListener(() => {
    const index = activePorts.indexOf(port as CVimPort);
    if (index !== -1) {
      activePorts.splice(index, 1);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.action) {
    case 'httpRequest':
      httpRequest(message.request)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response

    case 'updateTabIndices':
      updateTabIndices();
      break;

    case 'getTab':
      if (sender.tab) {
        getTab(sender.tab, message.reverse, message.count, message.first, message.last);
      }
      break;

    case 'getSessions':
      sendResponse(sessions);
      break;

    case 'setSessions':
      sessions = message.sessions;
      chrome.storage.local.set({ sessions });
      break;

    case 'getLastUsedTabs':
      sendResponse(lastUsedTabs);
      break;

    case 'registerTab':
      if (tabId) {
        activeTabs[tabId] = {
          id: tabId,
          url: message.url,
          title: message.title
        };
      }
      break;

    default:
      break;
  }
  return false;
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.id) return;

    switch (command) {
      case 'nextTab':
        getTab(activeTab, false, 1, false, false);
        break;
      case 'previousTab':
        getTab(activeTab, true, 1, false, false);
        break;
      case 'closeTab':
        chrome.tabs.remove(activeTab.id);
        break;
      case 'reloadTab':
        chrome.tabs.reload(activeTab.id);
        break;
      case 'newTab':
        chrome.tabs.create({});
        break;
      case 'togglecVim':
        chrome.tabs.sendMessage(activeTab.id, { action: 'toggleEnabled' });
        break;
      case 'toggleBlacklisted':
        chrome.tabs.sendMessage(activeTab.id, { action: 'toggleBlacklisted' });
        break;
      case 'restartcVim':
        chrome.runtime.reload();
        break;
      case 'viewSource':
        if (activeTab.url) {
          chrome.tabs.create({ url: `view-source:${activeTab.url}` });
        }
        break;
    }
  });
});

// Initialize
chrome.runtime.onStartup.addListener(() => {
  console.log('cVim service worker started');
});

export { };
