// Status bar functionality for cVim Chrome Extension
// Displays status messages with optional timeout and error styling

// External dependencies
declare const Command: {
  domElementsLoaded: boolean;
  statusBar: HTMLElement;
  callOnCvimLoad(callback: () => void): void;
};

// Type definitions for status message types
type StatusMessageType = 'error' | 'info' | undefined;

/**
 * Interface for status bar management
 */
interface StatusInterface {
  /** Default timeout duration in seconds */
  defaultTimeout: number;

  /** Whether the status message is currently active/visible */
  active: boolean;

  /** Timeout ID for auto-hiding status messages */
  delay?: number;

  /**
   * Display a status message with optional timeout and styling
   * @param message - The message text to display
   * @param timeout - Timeout in seconds (defaults to defaultTimeout)
   * @param type - Message type for styling ('error' adds red error prefix)
   */
  setMessage(message: string, timeout?: number, type?: StatusMessageType): void;

  /**
   * Hide the status message immediately
   */
  hide(): void;
}

/**
 * Status object for managing status bar messages
 * Handles displaying temporary messages with automatic timeout
 */
export const Status: StatusInterface = {
  defaultTimeout: 3,
  active: false,

  /**
   * Display a status message with optional timeout and error styling
   * @param message - The message text to display
   * @param timeout - Timeout in seconds (defaults to defaultTimeout)
   * @param type - Message type for styling ('error' adds red error prefix)
   */
  setMessage(message: string, timeout?: number, type?: StatusMessageType): void {
    // Ensure DOM elements are loaded before proceeding
    if (!Command.domElementsLoaded) {
      Command.callOnCvimLoad(() => {
        Status.setMessage(message, timeout, type);
      });
      return;
    }

    // Clear any existing timeout and hide current message
    if (this.delay !== undefined) {
      window.clearTimeout(this.delay);
    }
    this.hide();

    // Use default timeout if none provided
    if (timeout === undefined) {
      timeout = this.defaultTimeout;
    }

    // Mark status as active and clear previous content
    this.active = true;
    Command.statusBar.textContent = '';

    // Add error styling if message type is 'error'
    if (type === 'error') {
      const errorElement = document.createElement('span');
      errorElement.style.color = 'red';
      errorElement.textContent = 'Error';
      errorElement.className = 'cVim-error';
      Command.statusBar.appendChild(errorElement);
      Command.statusBar.appendChild(document.createTextNode(': '));
    }

    // Add the main message text
    Command.statusBar.appendChild(document.createTextNode(message));

    // Normalize whitespace and show the status bar
    Command.statusBar.normalize();
    Command.statusBar.style.display = 'inline-block';

    // Set timeout to auto-hide the message
    this.delay = window.setTimeout(() => {
      if (Status.active === true) {
        Command.statusBar.style.display = 'none';
        Status.active = false;
      }
    }, timeout * 1000);
  },

  /**
   * Hide the status message immediately
   */
  hide(): void {
    Command.statusBar.style.display = 'none';
    this.active = false;
  }
};

// Make Status globally available for compatibility with existing code
(window as any).Status = Status;
