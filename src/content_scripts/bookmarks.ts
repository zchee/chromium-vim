import { searchArray } from './utils';
// Import messaging functions from messenger module
import { RUNTIME, PORT } from './messenger';

interface BookmarkItem {
  title: string;
  url: string;
  children?: BookmarkItem[];
}

interface BookmarkTuple extends Array<string> {
  0: string; // title
  1: string; // url
}

interface FileTuple extends Array<string | boolean> {
  0: string;  // filename
  1: boolean; // isDirectory
}

interface QuickMarks {
  [key: string]: string[];
}

interface Command {
  input: {
    value: string;
  };
  completions: {
    files: FileTuple[];
  };
  updateCompletions(): void;
}

interface Status {
  setMessage(message: string, timeout?: number, type?: string): void;
}

interface Settings {
  searchlimit: number;
  homedirectory?: string;
}

interface OpenLinkOptions {
  url?: string;
  tab: {
    tabbed?: boolean;
    newWindow?: boolean;
  };
}

// Chrome Extension messaging functions now imported from messenger module

declare global {
  const command: Command;
  const _status: Status;
  const settings: Settings;
}

interface MarksModule {
  filePath(_files?: FileTuple[]): void;
  addQuickMark(ch: string): void;
  openQuickMark(ch: string, opts: OpenLinkOptions, repeats: number): void;
  parseQuickMarks(marks: Record<string, string | string[]>): void;
  parse(marks: BookmarkItem[]): void;
  match(search: string, callback: (results: BookmarkTuple[]) => void, limit?: number): void;
  parseFileCommand(search: string): void;
  matchPath(path: string): void;
}

class MarksImplementation implements MarksModule {
  private bookmarks: BookmarkTuple[] = [];
  private quickMarks: QuickMarks = {};
  private files: FileTuple[] = [];
  private lastFileSearch: string | undefined;
  private lastSearchLength: number | undefined;

  filePath(_files?: FileTuple[]): void {
    this.files = _files || this.files;
    const input = command.input.value.replace(/.*\//, '');
    command.completions = { files: [] };

    if (!this.files) {
      return;
    }

    let count = 0;
    for (let i = 0; i < this.files.length; ++i) {
      const file = this.files[i];
      if (file && file[0] && file[0].indexOf(input) === 0) {
        if (!input && file[0] !== '..' && file[0][0] === '.') {
          continue;
        }
        command.completions.files.push([file[0], file[1] as boolean]);
        if (++count > settings.searchlimit) {
          break;
        }
      }
    }

    if (count <= settings.searchlimit && !input) {
      for (let i = 0; i < this.files.length; ++i) {
        const file = this.files[i];
        if (file && file[0] !== '..' && file[0][0] === '.') {
          command.completions.files.push([file[0], !file[1] as boolean]);
          if (++count > settings.searchlimit) {
            break;
          }
        }
      }
    }

    command.updateCompletions();
  }

  addQuickMark(ch: string): void {
    if (this.quickMarks[ch] === undefined) {
      Status.setMessage('New QuickMark "' + ch + '" added', 1);
      this.quickMarks[ch] = [document.URL];
    } else if (this.quickMarks[ch].indexOf(document.URL) === -1) {
      Status.setMessage('Current URL added to QuickMark "' + ch + '"', 1);
      this.quickMarks[ch].push(document.URL);
    } else {
      this.quickMarks[ch].splice(this.quickMarks[ch].indexOf(document.URL), 1);
      if (this.quickMarks[ch].length === 0) {
        Status.setMessage('Quickmark "' + ch + '" removed', 1);
        delete this.quickMarks[ch];
      } else {
        Status.setMessage('Current URL removed from existing QuickMark "' + ch + '"', 1);
      }
    }
    RUNTIME('updateMarks', { marks: this.quickMarks });
  }

  openQuickMark(ch: string, opts: OpenLinkOptions, repeats: number): void {
    if (!this.quickMarks.hasOwnProperty(ch)) {
      return Status.setMessage('mark not set', 1, 'error');
    }

    if (repeats !== 1 || (!opts.tab.tabbed && !opts.tab.newWindow)) {
      if (this.quickMarks[ch]![repeats - 1]) {
        opts.url = this.quickMarks[ch]![repeats - 1];
        RUNTIME('openLink', opts);
      } else {
        opts.url = this.quickMarks[ch]![0];
        RUNTIME('openLink', opts);
      }
    } else if (opts.tab.tabbed) {
      for (let i = 0, l = this.quickMarks[ch]!.length; i < l; ++i) {
        opts.url = this.quickMarks[ch]![i];
        RUNTIME('openLink', opts);
      }
    } else if (opts.tab.newWindow) {
      RUNTIME('openLinksWindow', {
        urls: this.quickMarks[ch]
      });
    }
  }

  parseQuickMarks(marks: Record<string, string | string[]>): void {
    this.quickMarks = {};
    for (const key in marks) {
      if (Array.isArray(marks[key])) {
        this.quickMarks[key] = marks[key] as string[];
      } else if (typeof marks[key] === 'string') {
        this.quickMarks[key] = [marks[key] as string];
      }
    }
  }

  parse(marks: BookmarkItem[]): void {
    this.bookmarks = [];
    const recurse = (bookmarks: BookmarkItem[]): void => {
      bookmarks.forEach((bookmark) => {
        if (bookmark.url) {
          this.bookmarks.push([bookmark.title, bookmark.url] as BookmarkTuple);
        }
        if (bookmark.children) {
          recurse(bookmark.children);
        }
      });
    };
    recurse(marks);
  }

  match(search: string, callback: (results: BookmarkTuple[]) => void, limit?: number): void {
    if (search.trim() === '') {
      callback(this.bookmarks.slice(0, settings.searchlimit + 1));
      return;
    }
    callback(searchArray({
      array: this.bookmarks,
      search: search,
      limit: limit,
      fn: (item: BookmarkTuple) => item.join(' ')
    }));
  }

  parseFileCommand(search: string): void {
    const needsUpdate = (search.slice(-1) === '/' && (this.lastSearchLength ?? 0) < search.length) ||
      (this.lastSearchLength ?? 0) > search.length ||
      (!(this.lastFileSearch && this.lastFileSearch.replace(/[^\/]+$/, '') === search) &&
        (search.slice(-1) === '/' && !(this.lastFileSearch && this.lastFileSearch.slice(-1) === '/')));

    if (needsUpdate) {
      this.lastFileSearch = search;
      this.lastSearchLength = search.length;
      if (settings.homedirectory) {
        search = search.replace('~', settings.homedirectory);
      }
      RUNTIME('getFilePath', { path: search }, (data: FileTuple[]) => {
        this.filePath(data);
      });
    } else {
      this.lastFileSearch = search;
      this.filePath();
    }
  }

  matchPath(path: string): void {
    PORT('getBookmarkPath', { path: path });
  }
}

export const Marks = new MarksImplementation();
