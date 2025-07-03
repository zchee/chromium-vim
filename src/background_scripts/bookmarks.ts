// Chrome Extension Bookmarks - TypeScript conversion for Manifest v3

interface UtilsModule {
  compressArray: <T>(array: T[]) => T[];
}

// Global Utils module declaration
declare var Utils: UtilsModule;

class Bookmarks {
  /**
   * Gets the bookmark tree and returns the root children
   * @param callback Function to call with the bookmark tree children
   */
  static getMarks(callback: (marks: chrome.bookmarks.BookmarkTreeNode[]) => void): void {
    chrome.bookmarks.getTree((tree: chrome.bookmarks.BookmarkTreeNode[]) => {
      if (tree && tree[0] && tree[0].children) {
        callback(tree[0].children);
      } else {
        callback([]);
      }
    });
  }

  /**
   * Checks if a folder with the given path exists in the directory
   * @param path The folder name to search for
   * @param directory The directory node to search in
   * @returns The found bookmark node or undefined
   */
  static containsFolder(
    path: string, 
    directory: chrome.bookmarks.BookmarkTreeNode
  ): chrome.bookmarks.BookmarkTreeNode | undefined {
    const children = directory.children;
    if (!children) {
      return undefined;
    }

    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      if (child && child.title && path === child.title) {
        return child;
      }
    }
    return undefined;
  }

  /**
   * Gets all URLs from a bookmark folder path
   * @param path The folder path separated by '/'
   * @param callback Function to call with the found URLs
   */
  static getFolderLinks(
    path: string, 
    callback: (links: string[]) => void
  ): void {
    const pathArray = Utils.compressArray(path.split('/'));
    
    chrome.bookmarks.getTree((tree: chrome.bookmarks.BookmarkTreeNode[]) => {
      if (!tree || !tree[0]) {
        callback([]);
        return;
      }

      let dir: chrome.bookmarks.BookmarkTreeNode | undefined = tree[0];
      let currentPath = [...pathArray];

      while (dir && currentPath.length > 0 && currentPath[0]) {
        dir = Bookmarks.containsFolder(currentPath[0], dir);
        currentPath = currentPath.slice(1);
        
        if (!currentPath.length && dir && dir.children) {
          const links = dir.children
            .map((bookmark) => bookmark.url)
            .filter((url): url is string => url !== undefined);
          callback(Utils.compressArray(links));
          return;
        }
      }
      
      callback([]);
    });
  }

  /**
   * Recursively builds bookmark path completions
   * @param marks Array of bookmark nodes to search
   * @param path The path pattern to match
   * @param callback Function to call with the results
   * @param initialPath The initial path for building results
   * @returns false if path is invalid, otherwise void
   */
  static getPath(
    marks: chrome.bookmarks.BookmarkTreeNode[], 
    path: string, 
    callback: (results: [string, string, string][]) => void,
    initialPath?: string
  ): boolean | void {
    const result: [string, string, string][] = [];
    let folderNode: chrome.bookmarks.BookmarkTreeNode | null = null;
    let matchFound = false;

    if (!initialPath) {
      initialPath = path.replace(/\/[^/]+$/, '/').replace(/\/+/g, '/');
    }

    if (typeof path !== 'string' || path[0] !== '/') {
      return false;
    }

    const pathArray = Utils.compressArray(path.split(/\//));

    marks.forEach((item) => {
      if (!item.title) return;

      if (pathArray[0] && item.title === pathArray[0]) {
        folderNode = item;
      }

      if (pathArray[0] && 
          item.title.slice(0, pathArray[0].length).toLowerCase() === pathArray[0].toLowerCase()) {
        result.push([
          item.title, 
          item.url || 'folder', 
          initialPath!
        ]);
      }

      if (pathArray.length === 0) {
        if (!matchFound) {
          result.length = 0; // Clear array
        }
        matchFound = true;
        result.push([
          item.title, 
          item.url || 'folder', 
          initialPath!
        ]);
      }
    });

    if (pathArray.length === 0) {
      callback(result);
      return;
    }

    if (!folderNode) {
      callback(result);
      return;
    }

    // Now TypeScript knows folderNode is not null
    const node = folderNode as chrome.bookmarks.BookmarkTreeNode;
    if (node.children && node.children.length > 0) {
      this.getPath(
        node.children, 
        '/' + pathArray.slice(1).join('/'), 
        callback, 
        initialPath
      );
    } else {
      callback(result);
    }
  }
}

// Export for global usage (maintaining compatibility with existing code)
if (typeof window !== 'undefined') {
  (window as any).Bookmarks = Bookmarks;
}

export default Bookmarks;