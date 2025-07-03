declare const HUD: {
  display(message: string | number, time?: number): void;
};

declare const DOM: {
  isVisible(element: Element): boolean;
};

declare const Utils: {
  trueModulo(a: number, b: number): number;
};

declare const Command: {
  active: boolean;
  barPaddingBottom: number;
  barPaddingTop: number;
};

declare const Hints: {
  type: string;
};

declare const settings: {
  regexp: boolean;
  ignorecase: boolean;
  smartcase: boolean;
};

interface HighlightParams {
  base?: Element;
  search: string;
  mode?: string;
  setIndex?: boolean;
  executeSearch?: boolean;
  saveSearch?: boolean;
}

interface FindInterface {
  highlights: Element[];
  matches: HTMLElement[];
  index: number;
  tries: number;
  mode: string;
  lastSearch?: string;

  setIndex(): void;
  getSelectedTextNode(): Node | false;
  focusParentLink(node: Element): boolean;
  getCurrentMatch(): HTMLElement | null;
  search(mode?: string, repeats?: number, ignoreFocus?: boolean): void;
  highlight(params: HighlightParams): void;
  clear(): void;
}

declare global {
  interface Window {
    Find: FindInterface;
  }
}

export const Find: FindInterface = {
  highlights: [],
  matches: [],
  index: 0,
  tries: 0,
  mode: '/',

  setIndex(): void {
    this.index = 0;
    for (let i = 0; i < this.matches.length; i++) {
      const br = this.matches[i]!.getBoundingClientRect();
      if (br.top > 0 && br.left > 0) {
        this.index = i;
        HUD.display(this.index + 1 + ' / ' + this.matches.length);
        break;
      }
    }
  },

  getSelectedTextNode(): Node | false {
    return (this.matches.length &&
      this.matches[this.index] &&
      this.matches[this.index]!.firstChild)
      || false;
  },

  focusParentLink(node: Element): boolean {
    let currentNode: Element | null = node;
    do {
      if (currentNode.hasAttribute('href')) {
        (currentNode as HTMLElement).focus();
        return true;
      }
    } while (currentNode = currentNode.parentElement);
    return false;
  },

  getCurrentMatch(): HTMLElement | null {
    return this.matches[this.index] || null;
  },

  search(mode = '/', repeats = 1, ignoreFocus = false): void {
    if (this.matches.length === 0)
      return;

    let reverse = repeats < 0;
    if (reverse)
      repeats = Math.abs(repeats);
    if (mode === '?')
      reverse = !reverse;

    if (!this.matches.length)
      return HUD.display('No matches', 1);

    if (this.index >= this.matches.length)
      this.index = 0;
    if (this.index >= 0 && this.matches[this.index])
      this.matches[this.index]!.removeAttribute('active');

    if (reverse && repeats === 1 && this.index === 0) {
      this.index = this.matches.length - 1;
    } else if (!reverse && repeats === 1 &&
      this.index + 1 === this.matches.length) {
      this.index = 0;
    } else {
      this.index = (this.index + (reverse ? -1 : 1) * repeats);
      this.index = Utils.trueModulo(this.index, this.matches.length);
    }

    const currentMatch = this.matches[this.index];
    if (!currentMatch || !DOM.isVisible(currentMatch)) {
      this.matches.splice(this.index, 1);
      this.tries++;
      if (this.tries > this.matches.length) {
        return;
      }
      return this.search(mode, 1);
    } else {
      this.tries = 0;
    }

    const br = currentMatch.getBoundingClientRect();
    const origTop = document.scrollingElement?.scrollTop || 0;

    if (!ignoreFocus) {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    }

    const isLink = ignoreFocus ? false : this.focusParentLink(currentMatch);
    currentMatch.setAttribute('active', '');
    HUD.display(this.index + 1 + ' / ' + this.matches.length);

    let paddingTop = 0;
    let paddingBottom = 0;
    if (Command.active) {
      paddingBottom = Command.barPaddingBottom;
      paddingTop = Command.barPaddingTop;
    }

    const documentZoom = parseFloat(document.body.style.zoom) || 1;

    if (br.top * documentZoom + br.height * documentZoom >
      window.innerHeight - paddingBottom) {
      if (isLink && !reverse) {
        window.scrollTo(0, origTop + br.height * documentZoom);
      }
      window.scrollTo(0, origTop + paddingTop + paddingBottom);
      window.scrollBy(0, br.top * documentZoom + br.height *
        documentZoom - window.innerHeight);
    } else if (br.top < paddingTop) {
      window.scrollTo(0, origTop - paddingTop - paddingBottom);
      window.scrollBy(0, br.top * documentZoom);
    }
  },

  highlight(params: HighlightParams): void {
    params.base = params.base || document.body;
    const self = this;
    let regexMode = '';
    const containsCap = params.search.search(/[A-Z]/) !== -1;
    let useRegex = settings.regexp;
    const markBase = document.createElement('mark');
    const nodes: Text[] = [];
    let linksOnly = false;

    markBase.className = 'cVim-find-mark';

    this.mode = params.mode || '/';
    if (params.saveSearch)
      this.lastSearch = params.search;

    let search: string | RegExp = params.search;

    if ((settings.ignorecase || /\/i$/.test(params.search)) &&
      !(settings.smartcase && containsCap)) {
      search = (search as string).replace(/\/i$/, '');
      regexMode = 'i';
    }

    if (useRegex) {
      if (params.mode === '$') {
        linksOnly = true;
      }
      try {
        const rxp = new RegExp(search as string, 'g' + regexMode);
        const mts = rxp.exec('.');
        if (!mts || (mts && mts[0] !== '')) {
          search = rxp;
        } else {
          useRegex = false;
        }
      } catch (e) {
        useRegex = false;
      }
    }

    const acceptNode = (node: Text): number => {
      if (!node.data.trim())
        return NodeFilter.FILTER_REJECT;
      if (!node.parentNode)
        return NodeFilter.FILTER_REJECT;

      const parentElement = node.parentNode as Element;
      switch (parentElement.localName?.toLowerCase()) {
        case 'script':
        case 'style':
        case 'noscript':
        case 'mark':
          return NodeFilter.FILTER_REJECT;
      }
      return DOM.isVisible(parentElement) ?
        NodeFilter.FILTER_ACCEPT :
        NodeFilter.FILTER_REJECT;
    };

    const acceptLinkNode = (node: Text): number => {
      if (!node.data.trim())
        return NodeFilter.FILTER_REJECT;
      Hints.type = '';
      if (!node.parentNode)
        return NodeFilter.FILTER_REJECT;
      if (node.parentNode.nodeType !== Node.ELEMENT_NODE ||
        (node.parentNode as Element).localName !== 'a') {
        return NodeFilter.FILTER_REJECT;
      }
      return DOM.isVisible(node.parentNode as Element) ?
        NodeFilter.FILTER_ACCEPT :
        NodeFilter.FILTER_REJECT;
    };

    const nodeIterator = document.createNodeIterator(
      params.base!,
      NodeFilter.SHOW_TEXT, {
      acceptNode: linksOnly ? acceptLinkNode : acceptNode
    }
    );

    let node: Text | null;
    while (node = nodeIterator.nextNode() as Text | null) {
      if (node) {
        nodes.push(node);
      }
    }

    const processNode = useRegex ?
      (node: Text): void => {
        const matches = node.data.match(search as RegExp) || [];
        matches.forEach((match) => {
          const mark = markBase.cloneNode(false) as HTMLElement;
          const mid = node.splitText(node.data.indexOf(match));
          const end = mid.splitText(match.length);
          if (node.data.length === 0)
            node.remove();
          if (end.data.length === 0)
            end.remove();
          mark.appendChild(mid.cloneNode(true));
          mid.parentNode?.replaceChild(mark, mid);
          self.matches.push(mark);
          node = mark.nextSibling as Text;
        });
      } :
      (node: Text): void => {
        const searchStr = search as string;
        const pos = containsCap || !settings.ignorecase ?
          node.data.indexOf(searchStr) :
          node.data.toLowerCase().indexOf(searchStr);
        if (pos !== -1) {
          const mark = markBase.cloneNode(false) as HTMLElement;
          const mid = node.splitText(pos);
          mid.splitText(searchStr.length);
          mark.appendChild(mid.cloneNode(true));
          mid.parentNode?.replaceChild(mark, mid);
          self.matches.push(mark);
        }
      };

    nodes.forEach(processNode);

    document.body.normalize();
    HUD.display(this.matches.length || 'No matches');
    if (params.setIndex)
      this.setIndex();
    if (params.executeSearch)
      this.search(params.mode, 1);
  },

  clear(): void {
    const nodes = this.matches;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node && node.parentNode && node.firstChild) {
        node.parentNode.replaceChild(node.firstChild, node);
      }
    }
    document.documentElement.normalize();
    this.matches = [];
  }
};

window.Find = Find;
