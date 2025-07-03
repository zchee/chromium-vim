/**
 * Visual mode functionality for cVim Chrome Extension
 * Provides visual selection, caret mode, and line visual mode
 * Supports Vim-like visual mode commands and navigation
 */

// Extend Selection interface to include non-standard but widely supported properties
interface ExtendedSelection extends Selection {
  baseNode: Node | null;
  extentNode: Node | null;
  baseOffset: number;
  extentOffset: number;
}

// External dependency declarations
declare const Find: {
  matches: any[];
  index: number;
  getSelectedTextNode(): Text | null;
};

declare const HUD: {
  hide(): void;
  display(message: string): void;
  setMessage(message: string): void;
};

declare const Mappings: {
  actions: {
    nextSearchResult(count: number): void;
    previousSearchResult(count: number): void;
  };
};

declare const Clipboard: {
  copy(text: string): void;
  paste(before?: boolean): void;
};

/**
 * Movement direction and granularity mapping for visual mode navigation
 */
type MovementDirection = 'left' | 'right';
type MovementGranularity = 'character' | 'word' | 'line' | 'lineboundary' | 'documentboundary';
type MovementConfig = [MovementDirection, MovementGranularity];

/**
 * Interface for Visual mode object
 * Manages visual selection, caret mode, and line visual mode
 */
interface VisualInterface {
  /** Command queue for multi-key commands like 'gg' */
  queue: string;

  /** Whether visual mode is currently active */
  visualModeActive: boolean;

  /** Whether caret mode is currently active */
  caretModeActive: boolean;

  /** Array of text nodes in the document */
  textNodes: Text[];

  /** Current document selection object */
  selection?: ExtendedSelection | null;

  /** Whether line visual mode is active */
  lineMode?: boolean;

  /** Whether this is the first line in line mode */
  firstLine?: boolean;

  /** First extent node in line mode for reference */
  firstExtentNode?: Node | null;

  /** Movement mappings for visual mode navigation */
  movements: { [key: string]: MovementConfig };

  /**
   * Get all text nodes in the document
   * @param callback - Optional callback to execute after getting nodes
   */
  getTextNodes(callback?: () => void): void;

  /**
   * Exit visual/caret mode and return to normal mode
   */
  exit(): void;

  /**
   * Focus on search result and enter visual mode
   * @param lineMode - Whether to enter line visual mode
   */
  focusSearchResult(lineMode?: boolean): boolean | void;

  /**
   * Collapse the current selection based on direction
   */
  collapse(): void;

  /**
   * Find the closest visible text node
   */
  closestNode(): Text | undefined;

  /**
   * Select a specific text node by index
   * @param index - Index of the text node to select
   */
  selectNode(index: number): void;

  /**
   * Scroll the current selection into view
   */
  scrollIntoView(): boolean | void;

  /**
   * Enter line visual mode
   */
  enterLineMode(): boolean | void;

  /**
   * Fill the current line with selection
   */
  fillLine(): void;

  /**
   * Handle line mode specific actions
   * @param key - The key pressed
   */
  lineAction(key: string): void;

  /**
   * Main action handler for visual mode
   * @param key - The key pressed
   */
  action(key: string): void;
}

/**
 * Visual mode object for managing text selection and visual operations
 * Provides Vim-like visual mode functionality with character, word, and line selection
 */
export const Visual: VisualInterface = {
  queue: '',
  visualModeActive: false,
  caretModeActive: false,
  textNodes: [],

  /**
   * Get all text nodes in the document using TreeWalker
   * Filters out empty text nodes and stores them for visual mode operations
   * @param callback - Optional callback to execute after collecting nodes
   */
  getTextNodes(callback?: () => void): void {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    let node: Node | null;
    this.textNodes = [];

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '') {
        this.textNodes.push(node as Text);
      }
    }

    if (callback) {
      return callback();
    }
  },

  /**
   * Exit visual/caret mode and return to normal mode
   * Resets mode flags, disables design mode, and updates HUD display
   */
  exit(): void {
    this.caretModeActive = false;
    this.visualModeActive = false;
    document.designMode = 'off';

    if (!Find.matches.length) {
      HUD.hide();
    } else {
      HUD.display(Find.index + 1 + ' / ' + Find.matches.length);
    }

    document.body.spellcheck = true;
  },

  /**
   * Focus on search result and enter visual mode
   * Positions selection at the found text and optionally enters line mode
   * @param lineMode - Whether to enter line visual mode instead of character mode
   */
  focusSearchResult(lineMode?: boolean): boolean | void {
    const node = Find.getSelectedTextNode();
    if (!node || node.data.length === 0) {
      return false;
    }

    this.selection = document.getSelection() as ExtendedSelection | null;
    if (!this.selection) return false;

    this.selection.setPosition(node, 0);

    if (lineMode) {
      this.lineMode = true;
      this.visualModeActive = true;
      if (this.selection.baseNode) {
        this.selection.setPosition(this.selection.baseNode, 0);
        this.selection.extend(this.selection.baseNode, (this.selection.baseNode as Text).length);
      }
      HUD.display(' -- VISUAL LINE -- ');
      return this.enterLineMode();
    }

    HUD.display(' -- VISUAL -- ');
    this.selection = document.getSelection() as ExtendedSelection | null;
    if (this.selection) {
      this.selection.extend(node, node.data.replace(/\s+$/, '').length);
    }
    this.visualModeActive = true;
  },

  /**
   * Collapse the current selection based on direction
   * Determines whether to collapse to start or end based on selection direction
   */
  collapse(): void {
    this.visualModeActive = false;
    if (!this.selection || !this.selection.anchorNode || !this.selection.extentNode) return;

    const b = this.textNodes.indexOf(this.selection.anchorNode as Text);
    const e = this.textNodes.indexOf(this.selection.extentNode as Text);

    if ((b === e && this.selection.extentOffset < this.selection.baseOffset) || (e < b)) {
      this.selection.collapseToStart();
    } else if (this.selection.isCollapsed === false) {
      this.selection.collapseToEnd();
    }
  },

  /**
   * Find the closest visible text node to the current viewport
   * @returns The first text node that is visible in the viewport
   */
  closestNode(): Text | undefined {
    for (let i = 0; i < this.textNodes.length; ++i) {
      const node = this.textNodes[i];
      const ee = node?.parentElement;
      if (ee) {
        const br = ee.getBoundingClientRect();
        if (br.top > 0) {
          return node;
        }
      }
    }
    return undefined;
  },

  /**
   * Select a specific text node by index
   * @param index - Index of the text node in the textNodes array
   */
  selectNode(index: number): void {
    if (!this.selection || index >= this.textNodes.length || index < 0) return;

    const node = this.textNodes[index];
    if (!node) return;

    this.selection.setPosition(node, 0);
    this.selection.extend(node, node.data.replace(/\s+$/, '').length);
    this.visualModeActive = true;
  },

  /**
   * Scroll the current selection into view
   * Adjusts viewport if selection is outside visible area
   */
  scrollIntoView(): boolean | void {
    if (!this.selection?.extentNode) {
      return false;
    }

    const extentParent = this.selection.extentNode.parentElement;
    if (!extentParent) return false;

    const br = extentParent.getBoundingClientRect();
    if (br.top < 0) {
      window.scrollBy(0, br.top);
    } else if (br.top + br.height > document.documentElement.clientHeight) {
      window.scrollBy(0, br.top + br.height - document.documentElement.clientHeight);
    }
  },

  /**
   * Enter line visual mode
   * Sets up selection to span entire lines rather than characters
   */
  enterLineMode(): boolean | void {
    this.selection = document.getSelection() as ExtendedSelection | null;
    if (!this.selection || !this.selection.baseNode) return false;

    this.firstLine = true;
    const base = this.textNodes[this.textNodes.indexOf(this.selection.baseNode as Text)];

    if (base === undefined) {
      HUD.setMessage(' -- VISUAL -- ');
      return this.lineMode = false;
    }

    if (this.selection.type === 'Caret') {
      this.selection.setPosition(base, 0);
      this.selection.extend(base, base.length);
    } else {
      const bnode = this.selection.baseNode;
      const enode = this.selection.extentNode;

      if (bnode?.parentNode && enode?.parentNode) {
        const bnodeRect = (bnode.parentNode as Element).getBoundingClientRect();
        const enodeRect = (enode.parentNode as Element).getBoundingClientRect();

        if (bnodeRect.top > enodeRect.top) {
          this.selection.setPosition(bnode, (bnode as Text).length);
          this.selection.extend(enode, 0);
          this.selection.modify('extend', 'left', 'lineboundary');
        } else {
          this.selection.setPosition(bnode, 0);
          this.selection.extend(enode, (enode as Text).length);
          this.selection.modify('extend', 'right', 'lineboundary');
        }

        this.firstExtentNode = this.selection.extentNode;
      }
    }
  },

  /**
   * Fill the current line with selection
   * Extends selection to cover the entire line
   */
  fillLine(): void {
    this.selection = document.getSelection() as ExtendedSelection | null;
    if (!this.selection || !this.selection.baseNode) return;

    if (this.selection.type === 'Caret') {
      this.selection.setPosition(this.selection.baseNode, 0);
      this.selection.modify('extend', 'right', 'lineboundary');
    }
  },

  /**
   * Handle line mode specific actions
   * @param key - The key pressed (j, k, p, P, y, G)
   */
  lineAction(key: string): void {
    this.selection = document.getSelection() as ExtendedSelection | null;
    if (!this.selection || !this.selection.baseNode) return;

    switch (key) {
      case 'j':
        if (this.firstLine || this.selection.extentNode === this.firstExtentNode ||
          this.selection.baseNode === this.selection.extentNode) {
          this.selection.setPosition(this.selection.baseNode, 0);
          this.firstLine = false;
        }
        this.selection.modify('extend', 'right', 'line');
        this.selection.modify('extend', 'left', 'lineboundary');
        this.fillLine();
        break;

      case 'k':
        if (this.firstLine || this.selection.extentNode === this.firstExtentNode ||
          this.selection.baseNode === this.selection.extentNode) {
          this.selection.setPosition(this.selection.baseNode, (this.selection.baseNode as Text).length);
          this.firstLine = false;
        }
        this.selection.modify('extend', 'left', 'line');
        this.selection.modify('extend', 'right', 'lineboundary');
        this.fillLine();
        break;

      case 'p':
      case 'P':
        Clipboard.copy(this.selection.toString());
        Clipboard.paste(key === 'P');
        this.exit();
        break;

      case 'y':
        Clipboard.copy(this.selection.toString());
        Visual.collapse();
        break;

      case 'G':
        this.selection.modify('extend', 'right', 'documentboundary');
        break;
    }

    Visual.scrollIntoView();
  },

  /**
   * Movement mappings for visual mode navigation
   * Maps keys to [direction, granularity] tuples for Selection.modify()
   */
  movements: {
    l: ['right', 'character'],
    h: ['left', 'character'],
    k: ['left', 'line'],
    j: ['right', 'line'],
    w: ['right', 'word'],
    b: ['left', 'word'],
    '0': ['left', 'lineboundary'],
    '^': ['left', 'lineboundary'],
    '$': ['right', 'lineboundary'],
    G: ['right', 'documentboundary']
  },

  /**
   * Main action handler for visual mode
   * Processes key input and performs appropriate visual mode actions
   * @param key - The key pressed
   */
  action(key: string): void {
    this.selection = document.getSelection() as ExtendedSelection | null;
    if (!this.selection) return;

    switch (key) {
      case 'g':
        if (!this.queue.length) {
          this.queue += 'g';
        } else {
          this.queue = '';
          this.selection.modify(
            (this.visualModeActive ? 'extend' : 'move'),
            'left',
            'documentboundary'
          );
          this.scrollIntoView();
        }
        return;

      case 'v':
        if (this.lineMode) {
          HUD.setMessage(' -- VISUAL -- ');
          this.lineMode = false;
          return;
        }
        this.visualModeActive = !this.visualModeActive;
        HUD.setMessage(' -- ' +
          (this.visualModeActive ? 'VISUAL' : 'CARET') +
          ' -- ');
        break;

      case 'V':
        this.lineMode = !this.lineMode;
        this.visualModeActive = true;
        this.enterLineMode();
        HUD.setMessage(' -- VISUAL LINE -- ');
        return;

      default:
        this.queue = '';
    }

    if (this.lineMode) {
      this.lineAction(key);
      return;
    }

    if (this.selection.type === 'Range') {
      this.visualModeActive = true;
    }

    const movementType =
      (this.selection.type === 'Range' || this.visualModeActive) ?
        'extend' : 'move';

    if (this.movements.hasOwnProperty(key)) {
      const movement = this.movements[key];
      if (movement) {
        this.selection.modify(movementType, movement[0], movement[1]);
      }
      return;
    }

    switch (key) {
      case 'n':
      case 'N':
        if (key === 'N') {
          Mappings.actions.previousSearchResult(1);
        } else {
          Mappings.actions.nextSearchResult(1);
        }
        this.focusSearchResult();
        break;

      case 'p':
      case 'P':
        Clipboard.copy(this.selection.toString());
        this.selection.collapseToEnd();
        Clipboard.paste(key === 'P');
        this.exit();
        break;

      case 'y':
        if (movementType === 'extend') {
          Clipboard.copy(this.selection.toString());
          Visual.collapse();
        }
        break;
    }

    Visual.scrollIntoView();
  }
};

// Make Visual globally available for compatibility with existing code
declare global {
  interface Window {
    Visual: VisualInterface;
  }
}

(window as any).Visual = Visual;
