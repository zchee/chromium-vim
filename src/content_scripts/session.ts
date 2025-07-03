// Session management for cVim Chrome Extension
// Stores session information that is accessed across multiple scopes

/**
 * Interface for session information management
 */
interface SessionInterface {
  /** Flag to prevent automatic document title updates */
  ignoreTitleUpdate: boolean;

  /** Current tab index for document title indexing (null if not set) */
  tabIndex: number | null;

  /** Whether this frame is the root/top frame in the hierarchy */
  isRootFrame: boolean;
}

/**
 * Session object that stores global session state information
 * Used for managing tab indexing, title updates, and frame hierarchy detection
 */
export const Session: SessionInterface = {
  // Accessed for use in indexing document.title
  ignoreTitleUpdate: false,

  // Tab index for document title management
  tabIndex: null,

  // Detect if this is the root frame by comparing self with top window
  isRootFrame: self === top
};

// Extend global Window interface to include Session
declare global {
  interface Window {
    Session: SessionInterface;
  }
}

// Attach Session to global window object for compatibility with existing code
window.Session = Session;
