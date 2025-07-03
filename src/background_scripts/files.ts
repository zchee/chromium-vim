// Chrome Extension Files - TypeScript conversion for Manifest v3

/**
 * Represents a file or directory entry
 */
interface FileEntry {
  /** The name of the file or directory */
  name: string;
  /** The type description (e.g., "File (1.2KB)" or "Directory") */
  type: string;
}

/**
 * HTTP request options for file system access
 */
interface HttpRequestOptions {
  url: string;
  method?: string;
  headers?: { [key: string]: string };
}

/**
 * HTTP request function interface
 */
interface HttpRequestFunction {
  (options: HttpRequestOptions): Promise<string>;
}

/**
 * Error interface for file access operations
 */
interface FileAccessError {
  message: string;
  code?: string;
  url?: string;
}

// Global httpRequest function declaration
declare var httpRequest: HttpRequestFunction;

/**
 * Files class providing file system access functionality
 * 
 * Note: In Chrome Extension Manifest v3, file:// URL access requires
 * the "file://*" permission in the manifest.json file.
 */
class Files {
  /**
   * Parses HTML directory listing data to extract file and directory information
   * 
   * This function expects HTML content that contains JavaScript addRow() calls
   * which is typical of browser-generated directory listings for file:// URLs.
   * 
   * @param data HTML string containing directory listing
   * @returns Array of FileEntry objects with name and type information
   */
  static parseHTML(data: string): FileEntry[] {
    if (!data || typeof data !== 'string') {
      console.warn('Files.parseHTML: Invalid data provided');
      return [];
    }

    try {
      // Extract addRow("...") patterns from HTML
      const matches = data.match(/addRow\(\".*?(?=\);)/g);
      
      if (!matches || matches.length === 0) {
        console.warn('Files.parseHTML: No addRow patterns found in HTML data');
        return [];
      }

      return matches
        .map((match): FileEntry | null => {
          try {
            // Extract JSON data from addRow("...") call
            const jsonPart = match.slice(7); // Remove 'addRow("' prefix
            const jsonString = '[' + jsonPart.replace(/\\?\);.*/, ']');
            
            const parsed = JSON.parse(jsonString) as any[];
            
            if (!Array.isArray(parsed) || parsed.length < 4) {
              console.warn('Files.parseHTML: Invalid parsed data structure');
              return null;
            }

            const [name, , isDirectory, size] = parsed;
            
            if (typeof name !== 'string') {
              console.warn('Files.parseHTML: Invalid file name in parsed data');
              return null;
            }

            return {
              name: name,
              type: isDirectory ? 'Directory' : `File (${size || 'unknown size'})`
            };
          } catch (parseError) {
            console.error('Files.parseHTML: Error parsing individual entry:', parseError);
            return null;
          }
        })
        .filter((entry): entry is FileEntry => entry !== null);
    } catch (error) {
      console.error('Files.parseHTML: Error parsing HTML data:', error);
      return [];
    }
  }

  /**
   * Gets directory listing for the specified path
   * 
   * Makes an HTTP request to a file:// URL to retrieve directory contents.
   * The path is processed to ensure it points to a directory.
   * 
   * @param path File system path to directory
   * @param callback Function to call with the file entries or error
   */
  static getPath(
    path: string, 
    callback: (entries: FileEntry[], error?: FileAccessError) => void
  ): void {
    // Validate input parameters
    if (!path || typeof path !== 'string') {
      const error: FileAccessError = {
        message: 'Invalid path provided',
        code: 'INVALID_PATH'
      };
      callback([], error);
      return;
    }

    if (!callback || typeof callback !== 'function') {
      console.error('Files.getPath: Invalid callback provided');
      return;
    }

    // Process path to ensure it points to a directory
    const directoryPath = path.replace(/[^/]*$/, '');
    
    if (!directoryPath) {
      const error: FileAccessError = {
        message: 'Unable to determine directory path',
        code: 'INVALID_DIRECTORY_PATH',
        url: path
      };
      callback([], error);
      return;
    }

    // Check if httpRequest function is available
    if (typeof httpRequest !== 'function') {
      const error: FileAccessError = {
        message: 'httpRequest function not available',
        code: 'MISSING_DEPENDENCY'
      };
      callback([], error);
      return;
    }

    const fileUrl = 'file://' + directoryPath;

    // Make HTTP request to file:// URL
    httpRequest({ url: fileUrl })
      .then((data: string) => {
        try {
          const entries = Files.parseHTML(data);
          callback(entries);
        } catch (parseError) {
          const error: FileAccessError = {
            message: 'Failed to parse directory listing',
            code: 'PARSE_ERROR',
            url: fileUrl
          };
          callback([], error);
        }
      })
      .catch((requestError: any) => {
        const error: FileAccessError = {
          message: requestError?.message || 'Failed to access file system',
          code: 'REQUEST_FAILED',
          url: fileUrl
        };
        callback([], error);
      });
  }

  /**
   * Async version of getPath for modern usage patterns
   * 
   * @param path File system path to directory
   * @returns Promise resolving to FileEntry array
   */
  static async getPathAsync(path: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      Files.getPath(path, (entries: FileEntry[], error?: FileAccessError) => {
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(entries);
        }
      });
    });
  }

  /**
   * Check if file system access is supported
   * 
   * @returns boolean indicating if file:// URLs can be accessed
   */
  static isFileSystemAccessSupported(): boolean {
    // Check if httpRequest function is available
    if (typeof httpRequest !== 'function') {
      return false;
    }

    // In Manifest v3, file:// access requires explicit permissions
    // This is a basic check - actual permission verification would require
    // chrome.permissions API calls
    return true;
  }

  /**
   * Validates a file system path
   * 
   * @param path Path to validate
   * @returns boolean indicating if path is valid
   */
  static isValidPath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Basic path validation
    // Reject paths with dangerous patterns
    const dangerousPatterns = [
      /\.\./,  // Parent directory traversal
      /[<>"|?*]/,  // Invalid filename characters
      /^[a-zA-Z]:\\.{0,2}$/  // Root drive access without specific path
    ];

    return !dangerousPatterns.some(pattern => pattern.test(path));
  }
}

// For backward compatibility, create an object that matches the original interface
const FilesLegacy = {
  parseHTML: Files.parseHTML,
  getPath: Files.getPath
};

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Files = FilesLegacy;
}

// Modern export for TypeScript modules
export default Files;
export { FilesLegacy, FileEntry, FileAccessError, HttpRequestOptions };