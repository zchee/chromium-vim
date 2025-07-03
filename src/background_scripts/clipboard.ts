// Chrome Extension Clipboard - TypeScript conversion for Manifest v3

/**
 * Clipboard operations interface
 */
interface ClipboardOperations {
  copy: (text: string) => Promise<boolean>;
  paste: () => Promise<string | null>;
  createTextArea?: () => HTMLTextAreaElement;
}

/**
 * Clipboard class providing copy/paste functionality
 * 
 * Note: In Manifest v3 service workers, DOM-based clipboard operations
 * are not available. This implementation uses the modern Clipboard API
 * which is async and requires appropriate permissions.
 */
class Clipboard {
  /**
   * Creates a hidden textarea element (legacy DOM method)
   * This method is maintained for compatibility but won't work in service workers.
   * 
   * @returns HTMLTextAreaElement configured for clipboard operations
   * @deprecated Use modern Clipboard API methods instead
   */
  static createTextArea(): HTMLTextAreaElement {
    if (typeof document === 'undefined') {
      throw new Error('DOM not available in service worker context. Use modern clipboard methods.');
    }
    
    const textarea = document.createElement('textarea');
    textarea.style.position = 'absolute';
    textarea.style.left = '-100%';
    return textarea;
  }

  /**
   * Copy text to clipboard using modern Clipboard API
   * 
   * @param text The text to copy to clipboard
   * @returns Promise<boolean> indicating success/failure
   */
  static async copy(text: string): Promise<boolean> {
    try {
      // First try modern Clipboard API (preferred for Manifest v3)
      if (typeof navigator !== 'undefined' && 
          navigator.clipboard && 
          typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback to DOM method if in a context that supports it
      return Clipboard.copyLegacy(text);
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }

  /**
   * Legacy DOM-based copy method
   * Only works in contexts with DOM access (content scripts, not service workers)
   * 
   * @param text The text to copy
   * @returns boolean indicating success
   */
  private static copyLegacy(text: string): boolean {
    try {
      if (typeof document === 'undefined') {
        throw new Error('DOM not available');
      }

      const textarea = Clipboard.createTextArea();
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('Copy');
      document.body.removeChild(textarea);
      return success;
    } catch (error) {
      console.error('Legacy clipboard copy failed:', error);
      return false;
    }
  }

  /**
   * Paste text from clipboard using modern Clipboard API
   * 
   * @returns Promise<string | null> The pasted text or null if failed
   */
  static async paste(): Promise<string | null> {
    try {
      // First try modern Clipboard API (preferred for Manifest v3)
      if (typeof navigator !== 'undefined' && 
          navigator.clipboard && 
          typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        return text;
      }

      // Fallback to DOM method if in a context that supports it
      return Clipboard.pasteLegacy();
    } catch (error) {
      console.error('Clipboard paste failed:', error);
      return null;
    }
  }

  /**
   * Legacy DOM-based paste method
   * Only works in contexts with DOM access (content scripts, not service workers)
   * 
   * @returns string | null The pasted text or null if failed
   */
  private static pasteLegacy(): string | null {
    try {
      if (typeof document === 'undefined') {
        throw new Error('DOM not available');
      }

      const textarea = Clipboard.createTextArea();
      document.body.appendChild(textarea);
      textarea.focus();
      
      const success = document.execCommand('Paste');
      const text = success ? textarea.value : null;
      document.body.removeChild(textarea);
      return text;
    } catch (error) {
      console.error('Legacy clipboard paste failed:', error);
      return null;
    }
  }

  /**
   * Synchronous copy method for backward compatibility
   * Note: This is not recommended for Manifest v3 as it cannot guarantee success
   * in service worker contexts.
   * 
   * @param text The text to copy
   * @deprecated Use async copy() method instead
   */
  static copySync(text: string): void {
    // For backward compatibility, attempt synchronous copy
    // This will only work in DOM contexts
    try {
      if (typeof document !== 'undefined') {
        Clipboard.copyLegacy(text);
      } else {
        // In service worker, we can't do synchronous clipboard operations
        console.warn('Synchronous clipboard not available in service worker. Use async copy() method.');
      }
    } catch (error) {
      console.error('Synchronous clipboard copy failed:', error);
    }
  }

  /**
   * Synchronous paste method for backward compatibility
   * Note: This is not recommended for Manifest v3 as it cannot work
   * in service worker contexts.
   * 
   * @returns string | null The pasted text or null if failed
   * @deprecated Use async paste() method instead
   */
  static pasteSync(): string | null {
    // For backward compatibility, attempt synchronous paste
    // This will only work in DOM contexts
    try {
      if (typeof document !== 'undefined') {
        return Clipboard.pasteLegacy();
      } else {
        // In service worker, we can't do synchronous clipboard operations
        console.warn('Synchronous clipboard not available in service worker. Use async paste() method.');
        return null;
      }
    } catch (error) {
      console.error('Synchronous clipboard paste failed:', error);
      return null;
    }
  }

  /**
   * Check if clipboard API is available
   * 
   * @returns boolean indicating if clipboard operations are supported
   */
  static isSupported(): boolean {
    return !!((typeof navigator !== 'undefined' && navigator.clipboard) || 
              (typeof document !== 'undefined'));
  }

  /**
   * Check if modern Clipboard API is available
   * 
   * @returns boolean indicating if modern clipboard API is supported
   */
  static isModernApiSupported(): boolean {
    return !!(typeof navigator !== 'undefined' && 
              navigator.clipboard && 
              typeof navigator.clipboard.writeText === 'function' && 
              typeof navigator.clipboard.readText === 'function');
  }
}

// For backward compatibility, create an object that matches the original interface
const ClipboardLegacy = {
  createTextArea: Clipboard.createTextArea,
  copy: Clipboard.copySync,
  paste: Clipboard.pasteSync
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Clipboard = ClipboardLegacy;
}

// Modern export for TypeScript modules
export default Clipboard;
export { ClipboardLegacy, ClipboardOperations };