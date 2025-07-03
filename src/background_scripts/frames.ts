// Chrome Extension Frames - TypeScript conversion for Manifest v3

/**
 * Chrome Extension Runtime Port interface for frame communication
 */
interface FramePort extends chrome.runtime.Port {
  sender: chrome.runtime.MessageSender & {
    frameId: number;
    tab?: chrome.tabs.Tab;
  };
  postMessage: (message: any) => void;
}

/**
 * Frame focus message interface
 */
interface FrameFocusMessage {
  type: 'focusFrame';
  disableAnimation: boolean;
}

/**
 * Frame management data structure
 */
interface FrameData {
  [frameId: number]: FramePort;
}

/**
 * Tab frames collection
 */
interface TabFramesCollection {
  [tabId: number]: TabFrames;
}

/**
 * TabFrames class manages all frames within a single browser tab
 * 
 * Handles frame registration, focus management, and communication
 * with content scripts through Chrome Extension messaging.
 */
class TabFrames {
  /** The tab ID this instance manages */
  public readonly tabId: number;
  
  /** Collection of frame ports indexed by frame ID */
  public frames: FrameData = {};
  
  /** Currently focused frame ID */
  public focusedId: number = 0;
  
  /** Primary port reference (typically the main frame) */
  public port?: FramePort;
  
  /** Frame ID designated as the command frame */
  public commandFrameId?: number;

  /**
   * Creates a new TabFrames instance for managing frames in a specific tab
   * 
   * @param tabId The browser tab ID to manage frames for
   */
  constructor(tabId: number) {
    if (typeof tabId !== 'number' || tabId < 0) {
      throw new Error('Invalid tab ID provided to TabFrames constructor');
    }
    this.tabId = tabId;
  }

  /**
   * Adds a new frame to this tab's frame collection
   * 
   * @param port Chrome Extension port for communication with the frame
   * @param isCommandFrame Whether this frame should be designated as the command frame
   */
  addFrame(port: FramePort, isCommandFrame?: boolean): void {
    if (!port || !port.sender || typeof port.sender.frameId !== 'number') {
      console.error('TabFrames.addFrame: Invalid port or frame ID provided');
      return;
    }

    const frameId = port.sender.frameId;
    
    // Validate frame ID
    if (frameId < 0) {
      console.warn(`TabFrames.addFrame: Invalid frame ID ${frameId} for tab ${this.tabId}`);
      return;
    }

    // Register the frame
    this.frames[frameId] = port;
    this.port = port;

    // Set as command frame if specified
    if (isCommandFrame) {
      this.commandFrameId = frameId;
    }

    console.debug(`TabFrames.addFrame: Added frame ${frameId} to tab ${this.tabId}${isCommandFrame ? ' (command frame)' : ''}`);
  }

  /**
   * Removes a frame from this tab's frame collection
   * 
   * @param frameId The frame ID to remove
   */
  removeFrame(frameId: number): void {
    if (typeof frameId !== 'number') {
      console.error('TabFrames.removeFrame: Invalid frame ID type');
      return;
    }

    if (!this.frames.hasOwnProperty(frameId)) {
      console.warn(`TabFrames.removeFrame: Frame ${frameId} not found in tab ${this.tabId}`);
      return;
    }

    delete this.frames[frameId];
    
    // Clear command frame reference if it was the removed frame
    if (this.commandFrameId === frameId) {
      this.commandFrameId = undefined;
    }

    // Reset focused ID if it was the removed frame
    if (this.focusedId === frameId) {
      this.focusedId = 0;
    }

    console.debug(`TabFrames.removeFrame: Removed frame ${frameId} from tab ${this.tabId}`);
  }

  /**
   * Focuses a specific frame within this tab
   * 
   * @param frameId The frame ID to focus
   * @param disableAnimation Whether to disable focus animation
   */
  focus(frameId: number, disableAnimation?: boolean): void {
    if (typeof frameId !== 'number') {
      console.error('TabFrames.focus: Invalid frame ID type');
      return;
    }

    if (!this.frames.hasOwnProperty(frameId)) {
      console.warn(`TabFrames.focus: Frame ${frameId} not found in tab ${this.tabId}`);
      return;
    }

    const frame = this.frames[frameId];
    if (!frame || !frame.postMessage) {
      console.error(`TabFrames.focus: Invalid frame port for frame ${frameId}`);
      return;
    }

    try {
      this.focusedId = frameId;
      
      const message: FrameFocusMessage = {
        type: 'focusFrame',
        disableAnimation: !!disableAnimation,
      };

      frame.postMessage(message);
      console.debug(`TabFrames.focus: Focused frame ${frameId} in tab ${this.tabId}`);
    } catch (error) {
      console.error(`TabFrames.focus: Failed to send focus message to frame ${frameId}:`, error);
    }
  }

  /**
   * Focuses the next available frame in sequence
   * 
   * Skips the command frame when cycling through frames.
   */
  focusNext(): void {
    const frameIds = Object.getOwnPropertyNames(this.frames);
    
    if (frameIds.length <= 0) {
      console.warn(`TabFrames.focusNext: No frames available in tab ${this.tabId}`);
      return;
    }

    // Sort frame IDs numerically
    const sortedIds = frameIds
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
      .sort((a, b) => a - b);

    if (sortedIds.length === 0) {
      console.warn(`TabFrames.focusNext: No valid frame IDs found in tab ${this.tabId}`);
      return;
    }

    // Find current index
    const currentIndex = Math.max(0, sortedIds.indexOf(this.focusedId));
    let nextIndex = (currentIndex + 1) % sortedIds.length;
    let nextId = sortedIds[nextIndex];

    // Skip command frame if it's the next frame
    if (this.commandFrameId !== undefined && nextId === this.commandFrameId) {
      nextIndex = (currentIndex + 2) % sortedIds.length;
      nextId = sortedIds[nextIndex];
    }

    this.focus(nextId, false);
  }

  /**
   * Gets the number of frames in this tab
   * 
   * @returns The count of registered frames
   */
  getFrameCount(): number {
    return Object.keys(this.frames).length;
  }

  /**
   * Gets all frame IDs in this tab
   * 
   * @returns Array of frame IDs
   */
  getFrameIds(): number[] {
    return Object.getOwnPropertyNames(this.frames)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
  }

  /**
   * Checks if a specific frame exists in this tab
   * 
   * @param frameId The frame ID to check
   * @returns Whether the frame exists
   */
  hasFrame(frameId: number): boolean {
    return this.frames.hasOwnProperty(frameId);
  }

  /**
   * Gets the port for a specific frame
   * 
   * @param frameId The frame ID to get the port for
   * @returns The frame port or undefined if not found
   */
  getFramePort(frameId: number): FramePort | undefined {
    return this.frames[frameId];
  }
}

/**
 * Global Frames manager for handling all tab frames across the extension
 * 
 * Provides centralized frame management with tab lifecycle integration.
 */
class FramesManager {
  /** Collection of TabFrames instances indexed by tab ID */
  private tabFrames: TabFramesCollection = {};

  /**
   * Adds a frame to the specified tab
   * 
   * Creates a new TabFrames instance if the tab doesn't exist yet.
   * 
   * @param tabId The tab ID to add the frame to
   * @param port Chrome Extension port for the frame
   * @param isCommandFrame Whether this frame is the command frame
   */
  add(tabId: number, port: FramePort, isCommandFrame?: boolean): void {
    if (typeof tabId !== 'number' || tabId < 0) {
      console.error('FramesManager.add: Invalid tab ID provided');
      return;
    }

    if (!port) {
      console.error('FramesManager.add: Invalid port provided');
      return;
    }

    try {
      // Create TabFrames instance if it doesn't exist
      if (!this.tabFrames[tabId]) {
        this.tabFrames[tabId] = new TabFrames(tabId);
      }

      this.tabFrames[tabId].addFrame(port, isCommandFrame);
      console.debug(`FramesManager.add: Added frame to tab ${tabId}`);
    } catch (error) {
      console.error(`FramesManager.add: Failed to add frame to tab ${tabId}:`, error);
    }
  }

  /**
   * Removes all frames for a specific tab
   * 
   * @param tabId The tab ID to remove
   */
  remove(tabId: number): void {
    if (typeof tabId !== 'number') {
      console.error('FramesManager.remove: Invalid tab ID type');
      return;
    }

    if (this.tabFrames[tabId]) {
      delete this.tabFrames[tabId];
      console.debug(`FramesManager.remove: Removed all frames for tab ${tabId}`);
    } else {
      console.warn(`FramesManager.remove: Tab ${tabId} not found`);
    }
  }

  /**
   * Removes a specific frame from a tab
   * 
   * @param tabId The tab ID containing the frame
   * @param frameId The frame ID to remove
   * @returns Whether the operation was successful
   */
  removeFrame(tabId: number, frameId: number): boolean {
    if (typeof tabId !== 'number' || typeof frameId !== 'number') {
      console.error('FramesManager.removeFrame: Invalid tab ID or frame ID type');
      return false;
    }

    const tabFrames = this.get(tabId);
    if (!tabFrames) {
      console.warn(`FramesManager.removeFrame: Tab ${tabId} not found`);
      return false;
    }

    // Remove entire tab if removing the main frame (frameId = 0)
    if (frameId === 0) {
      this.remove(tabId);
      return true;
    }

    tabFrames.removeFrame(frameId);
    return true;
  }

  /**
   * Gets the TabFrames instance for a specific tab
   * 
   * @param tabId The tab ID to get frames for
   * @returns The TabFrames instance or undefined if not found
   */
  get(tabId: number): TabFrames | undefined {
    if (typeof tabId !== 'number') {
      console.error('FramesManager.get: Invalid tab ID type');
      return undefined;
    }
    
    return this.tabFrames[tabId];
  }

  /**
   * Gets all tab IDs that have registered frames
   * 
   * @returns Array of tab IDs
   */
  getAllTabIds(): number[] {
    return Object.getOwnPropertyNames(this.tabFrames)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
  }

  /**
   * Gets the total number of tabs with registered frames
   * 
   * @returns The count of tabs
   */
  getTabCount(): number {
    return Object.keys(this.tabFrames).length;
  }

  /**
   * Checks if a specific tab has any registered frames
   * 
   * @param tabId The tab ID to check
   * @returns Whether the tab has frames
   */
  hasTab(tabId: number): boolean {
    return this.tabFrames.hasOwnProperty(tabId);
  }

  /**
   * Clears all registered frames across all tabs
   * 
   * Useful for extension cleanup or reset operations.
   */
  clear(): void {
    this.tabFrames = {};
    console.debug('FramesManager.clear: Cleared all tab frames');
  }

  /**
   * Gets frame statistics for debugging
   * 
   * @returns Object containing frame statistics
   */
  getStats(): { totalTabs: number; totalFrames: number; tabDetails: Array<{ tabId: number; frameCount: number }> } {
    const tabDetails = this.getAllTabIds().map(tabId => ({
      tabId,
      frameCount: this.tabFrames[tabId]?.getFrameCount() || 0
    }));

    const totalFrames = tabDetails.reduce((sum, tab) => sum + tab.frameCount, 0);

    return {
      totalTabs: this.getTabCount(),
      totalFrames,
      tabDetails
    };
  }
}

// Create singleton instance for global usage
const Frames = new FramesManager();

// For backward compatibility, create an object that matches the original interface
const FramesLegacy = {
  tabFrames: {}, // This will be populated by the legacy interface methods
  add: (tabId: number, port: FramePort, isCommandFrame?: boolean) => Frames.add(tabId, port, isCommandFrame),
  remove: (tabId: number) => Frames.remove(tabId),
  removeFrame: (tabId: number, frameId: number) => Frames.removeFrame(tabId, frameId),
  get: (tabId: number) => Frames.get(tabId)
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Frames = FramesLegacy;
  (window as any).TabFrames = TabFrames;
}

// Modern export for TypeScript modules
export default Frames;
export { TabFrames, FramesManager, FramesLegacy, FramePort, FrameFocusMessage, FrameData };