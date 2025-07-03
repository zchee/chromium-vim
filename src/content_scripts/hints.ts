declare const HUD: {
  display(message: string, time?: number): void;
  hide(): void;
};

declare const DOM: {
  isVisible(element: Element): boolean;
  isEditable(element: Element): boolean;
  mouseEvent(type: 'hover' | 'unhover' | 'click', element: Element): void;
  getVisibleBoundingRect(node: Element): DOMRect | null;
  getVisibleBoundingAreaRect(node: Element): DOMRect | null;
};

declare const Utils: {
  compressArray<T>(array: (T | null | undefined)[]): T[];
  cacheFunction<T, R>(callback: (arg: T) => R): {
    (arg: T): R;
    clearCache(): void;
  };
};

declare const Command: {
  domElementsLoaded: boolean;
  callOnCvimLoad(callback: () => void): void;
  css: HTMLElement;
  mainCSS?: string;
};

declare const Clipboard: {
  copy(text: string, multi?: boolean): void;
};

declare const Status: {
  setMessage(message: string, time: number): void;
};

declare const Mappings: {
  insertFunctions: {
    __setElement__(element: Element): void;
  };
};

declare const KeyHandler: {
  shiftKey: boolean;
};

declare const settings: {
  nextmatchpattern: string;
  numerichints: boolean;
  typelinkhints: boolean;
  typelinkhintsdelay: number;
  linkanimations: boolean;
  dimhintcharacters: boolean;
  hintcharacters: string;
  sortlinkhints: boolean;
  scalehints: boolean;
  hud: boolean;
  FUNCTIONS: { [key: string]: string };
};

declare function RUNTIME(action: string, data: any): void;
declare function PORT(action: string, data: any): void;
declare function matchLocation(url: string, pattern: string): boolean;
declare function findFirstOf<T>(array: T[], callback: (item: T) => boolean): T | null;
declare function getLinkableElements(): Element[];
declare function mapDOM<T>(root: Node, accept: (node: Node) => T | null): T[];
declare function httpRequest(options: { url: string }, callback: (data: string) => void): void;

interface HintElement extends HTMLDivElement {
  cVim?: boolean;
}

interface LinkInfo {
  node: Element;
  rect: DOMRect;
  linkType: number;
  hint?: HintElement;
  text?: string;
}

interface HintFilter {
  shouldAccept(node: Element): boolean;
  shouldReject(node: Element): boolean;
}

interface SiteFilter {
  reject?: string[];
  accept?: string[];
}

interface MatchPatternFilter {
  next: string;
  prev: string;
}

interface HintsInterface {
  // Properties
  type?: string;
  multi?: boolean;
  active?: boolean;
  currentString: string;
  linkArr: Array<[HintElement, Element, string?, string?]>;
  linkHints: any[];
  permutations: string[];
  numericMatch?: Element;
  shouldShowLinkInfo: boolean;
  lastClicked?: Element;
  lastHover?: Element;
  linkIndex: number;
  linkElementBase?: HintElement;
  shadowDOM?: ShadowRoot;
  documentZoom: number;
  hintFilter?: HintFilter;
  keyDelay?: boolean;
  scriptFunction?: string;
  acceptLink?: ((shift?: boolean) => void) | null;

  // Constants
  NON_LINK_TYPE: number;
  WEAK_LINK_TYPE: number;
  LINK_TYPE: number;
  INPUT_LINK: number;

  // Site-specific filters
  matchPatternFilters: { [pattern: string]: MatchPatternFilter };
  siteFilters: { [pattern: string]: SiteFilter };

  // Methods
  tryGooglePattern(forward: boolean): boolean;
  matchPatterns(pattern: string | RegExp): void;
  hideHints(reset?: boolean, multi?: boolean, useKeyDelay?: boolean): void;
  changeFocus(): void;
  removeContainer(): void;
  dispatchAction(link: Element, shift?: boolean): boolean | void;
  showLinkInfo(hint: [HintElement, Element]): boolean;
  handleHintFeedback(): void;
  handleHint(key: string): void;
  evaluateLink(item: LinkInfo): void;
  createHintFilter(url: string): HintFilter;
  getLinkType(node: Node): number;
  isClickable(info: LinkInfo): boolean;
  getLinkInfo(node: Node): LinkInfo | null;
  getLinks(): LinkInfo[];
  genHints(M: number): string[];
  create(type?: string, multi?: boolean): void;
}

export const Hints: HintsInterface = {
  // Initialize properties
  currentString: '',
  linkArr: [],
  linkHints: [],
  permutations: [],
  shouldShowLinkInfo: false,
  linkIndex: 0,
  documentZoom: 1,

  // Constants
  NON_LINK_TYPE: 1,
  WEAK_LINK_TYPE: 2,
  LINK_TYPE: 4,
  INPUT_LINK: 8,

  // Site-specific pattern filters
  matchPatternFilters: {
    '*://*.ebay.com/*': {
      'next': 'td a.next',
      'prev': 'td a.prev'
    },
    '*://mail.google.com/*': {
      'next': 'div[role="button"][data-tooltip="Older"]:not([aria-disabled="true"])',
      'prev': 'div[role="button"][data-tooltip="Newer"]:not([aria-disabled="true"])'
    },
    '*://*.reddit.com/*': {
      'next': 'a[rel$="next"]',
      'prev': 'a[rel$="prev"]'
    },
  },

  siteFilters: {
    '*://*.reddit.com/*': {
      reject: [
        'a:not([href])',
        '*[onclick^=click_thing]',
      ],
      accept: [
        '.grippy'
      ],
    },
    '*://*.google.*/*': {
      reject: [
        'li[class$="_dropdownitem"]',
        'div[class$="_dropdown"]',
        'div[aria-label="Apps"]',
        '.hdtbna.notl',
        '.irc_rit',
        'a[href^="imgres"]',
        'div[id=hdtbMenus]',
        'div[aria-label="Account Information"]',
        'img[jsaction^="load:"]'
      ],
    },
    '*://github.com/*': {
      reject: [
        '.select-menu-modal-holder.js-menu-content'
      ],
      accept: [
        '.js-menu-close',
      ],
    },
    '*://twitter.com/*': {
      accept: [
        '.new-tweets-bar.js-new-tweets-bar'
      ],
    },
    '*://imgur.com/*': {
      accept: [
        '.thumb-title',
        '.carousel-button'
      ],
    },
  },

  tryGooglePattern(forward: boolean): boolean {
    if (location.hostname.indexOf('www.google.'))
      return false;
    const target = document.getElementById(forward ? 'pnnext' : 'pnprev');
    if (target)
      target.click();
    return !!target;
  },

  matchPatterns(pattern: string | RegExp): void {
    const direction = pattern === settings.nextmatchpattern ? 'next' : 'prev';
    let applicableFilters = Object.keys(this.matchPatternFilters)
      .filter((key) => matchLocation(document.URL, key))
      .map((key) => this.matchPatternFilters[key]![direction]);
    applicableFilters = Utils.compressArray(applicableFilters);

    let link: Element | null = null;
    for (let i = 0; i < applicableFilters.length; i++) {
      link = findFirstOf(Array.from(document.querySelectorAll(applicableFilters[i]!)), (e) => {
        return DOM.isVisible(e);
      });
      if (link !== null)
        break;
    }
    if (link === null) {
      if (this.tryGooglePattern(pattern === settings.nextmatchpattern))
        return;
      let regexPattern: RegExp;
      if (typeof pattern === 'string')
        regexPattern = new RegExp('^' + pattern + '$', 'i');
      else
        regexPattern = pattern;
      link = findFirstOf(getLinkableElements(), (e) => {
        const textContent = e.textContent?.trim();
        const attrValue = e.getAttribute('value');
        return !!(textContent &&
          (regexPattern.test(e.textContent || '') || regexPattern.test(attrValue || '')));
      });
    }
    if (link) {
      DOM.mouseEvent('hover', link);
      DOM.mouseEvent('click', link);
    }
  },

  hideHints(reset = false, multi = false, useKeyDelay = false): void {
    const container = document.getElementById('cVim-link-container');
    if (reset && container !== null) {
      container.parentNode?.removeChild(container);
    } else if (container !== null) {
      if (!multi)
        HUD.hide();
      if (settings.linkanimations) {
        this.shadowDOM?.addEventListener('transitionend', () => {
          const m = document.getElementById('cVim-link-container');
          if (m !== null) {
            m.parentNode?.removeChild(m);
          }
        });
        if (this.shadowDOM?.host instanceof HTMLElement) {
          this.shadowDOM.host.style.opacity = '0';
        }
      } else {
        container.parentNode?.removeChild(container);
      }
    }
    this.numericMatch = undefined;
    this.shouldShowLinkInfo = false;
    this.active = reset;
    this.currentString = '';
    this.linkArr = [];
    this.linkHints = [];
    this.permutations = [];
    if (useKeyDelay && !this.active &&
      settings.numerichints && settings.typelinkhints) {
      this.keyDelay = true;
      window.setTimeout(() => {
        this.keyDelay = false;
      }, settings.typelinkhintsdelay);
    }
  },

  changeFocus(): void {
    this.linkArr.forEach((item) => {
      item[0].style.zIndex = (1 - +item[0].style.zIndex).toString();
    });
  },

  removeContainer(): void {
    const hintContainer = document.getElementById('cVim-link-container');
    if (hintContainer !== null)
      hintContainer.parentNode?.removeChild(hintContainer);
  },

  dispatchAction(link: Element, shift = false): boolean | void {
    if (!link)
      return false;
    const node = link.localName;
    this.lastClicked = link;

    if (settings.numerichints && settings.typelinkhints) {
      this.keyDelay = true;
      window.setTimeout(() => {
        this.keyDelay = false;
      }, settings.typelinkhintsdelay);
    }

    if (shift || KeyHandler.shiftKey) {
      switch (this.type) {
        case undefined:
          this.type = 'tabbed';
          break;
      }
    }

    switch (this.type) {
      case 'yank':
      case 'multiyank':
        const text = (link as HTMLAnchorElement).href ||
          (link as HTMLInputElement).value ||
          link.getAttribute('placeholder');
        if (text) {
          Clipboard.copy(text, this.multi);
          Status.setMessage(text, 2);
        }
        break;
      case 'fullimage':
        RUNTIME('openLinkTab', {
          active: false,
          url: (link as HTMLImageElement).src,
          noconvert: true
        });
        break;
      case 'image':
      case 'multiimage':
        const url = 'https://www.google.com/searchbyimage?image_url=' + (link as HTMLImageElement).src;
        if (url) {
          RUNTIME('openLinkTab', { active: false, url: url, noconvert: true });
        }
        break;
      case 'hover':
        if (this.lastHover) {
          DOM.mouseEvent('unhover', this.lastHover);
          if (this.lastHover === link) {
            this.lastHover = undefined;
            break;
          }
        }
        DOM.mouseEvent('hover', link);
        this.lastHover = link;
        break;
      case 'edit':
        Mappings.insertFunctions.__setElement__(link);
        (link as HTMLElement).focus();
        PORT('editWithVim', {
          text: (link as HTMLInputElement).value || link.textContent
        });
        break;
      case 'unhover':
        DOM.mouseEvent('unhover', link);
        break;
      case 'window':
        RUNTIME('openLinkWindow', {
          focused: true,
          url: (link as HTMLAnchorElement).href,
          noconvert: true
        });
        break;
      case 'script':
        if (this.scriptFunction && settings.FUNCTIONS[this.scriptFunction]) {
          eval(settings.FUNCTIONS[this.scriptFunction]!)(link);
        }
        break;
      default:
        if (node === 'textarea' || (node === 'input' &&
          /^(text|password|email|search)$/i.test((link as HTMLInputElement).type)) ||
          link.hasAttribute('contenteditable')) {
          setTimeout(() => {
            (link as HTMLElement).focus();
            if (link.hasAttribute('readonly')) {
              (link as HTMLInputElement).select();
            }
          }, 0);
          break;
        }
        if (node === 'select') {
          (link as HTMLElement).focus();
          break;
        }
        if (node === 'input' ||
          /^(checkbox|menu)$/.test(link.getAttribute('role') || '')) {
          window.setTimeout(() => { DOM.mouseEvent('click', link); }, 0);
          break;
        }
        if ((/tabbed/.test(this.type || '') || this.type === 'multi') && (link as HTMLAnchorElement).href) {
          RUNTIME('openLinkTab', {
            active: this.type === 'tabbedActive',
            url: (link as HTMLAnchorElement).href,
            noconvert: true
          });
        } else {
          if (link.hasAttribute('tabindex'))
            (link as HTMLElement).focus();
          DOM.mouseEvent('hover', link);
          if (link.hasAttribute('href')) {
            (link as HTMLElement).click();
          } else {
            DOM.mouseEvent('click', link);
          }
        }
        break;
    }

    if (this.multi) {
      this.removeContainer();
      window.setTimeout(() => {
        if (!DOM.isEditable(document.activeElement as Element))
          this.create(this.type, true);
      }, 0);
    } else {
      this.hideHints(false, false, true);
    }
  },

  showLinkInfo(hint: [HintElement, Element]): boolean {
    const loc = (hint[1] as HTMLAnchorElement).href ||
      (hint[1] as HTMLImageElement).src ||
      (hint[1] as any).onclick;
    if (!loc) {
      return false;
    }
    hint[0].textContent = loc;
    return true;
  },

  handleHintFeedback(): void {
    let linksFound = 0;
    let index: string;
    let link: HintElement;
    let i: number;
    let span: HTMLSpanElement;

    if (!settings.numerichints) {
      for (i = 0; i < this.permutations.length; i++) {
        link = this.linkArr[i]![0];
        if (this.permutations[i]!.indexOf(this.currentString) === 0) {
          if (link.children.length) {
            link.replaceChild(link.firstChild!.firstChild!, link.firstChild!);
            link.normalize();
          }
          if (settings.dimhintcharacters) {
            span = document.createElement('span');
            span.setAttribute('cVim', 'true');
            span.className = 'cVim-link-hint_match';
            (link.firstChild as Text).splitText(this.currentString.length);
            span.appendChild(link.firstChild!.cloneNode(true));
            link.replaceChild(span, link.firstChild!);
          } else if (link.textContent!.length !== 1) {
            (link.firstChild as Text).deleteData(0, 1);
          }
          index = i.toString();
          linksFound++;
        } else if (link.parentNode) {
          link.style.opacity = '0';
        }
      }
    } else {
      let containsNumber: boolean;
      let validMatch: boolean;
      let stringNum: string;
      let string: string;
      this.numericMatch = undefined;
      this.currentString = this.currentString.toLowerCase();
      string = this.currentString;
      containsNumber = /\d+$/.test(string);
      if (containsNumber) {
        stringNum = this.currentString.match(/[0-9]+$/)![0];
      }
      if ((!string) || (!settings.typelinkhints && /\D/.test(string.slice(-1)))) {
        return this.hideHints(false);
      }
      for (i = 0; i < this.linkArr.length; ++i) {
        link = this.linkArr[i]![0];

        if (link.style.opacity === '0') {
          continue;
        }
        validMatch = false;

        if (settings.typelinkhints) {
          if (containsNumber && link.textContent!.indexOf(stringNum!) === 0) {
            validMatch = true;
          } else if (!containsNumber && this.linkArr[i]![2] &&
            this.linkArr[i]![2]!.toLowerCase().indexOf(string.replace(/.*\d/g, '')) !== -1) {
            validMatch = true;
          }
        } else if (link.textContent!.indexOf(string) === 0) {
          validMatch = true;
        }

        if (validMatch) {
          if (link.children.length) {
            link.replaceChild(link.firstChild!.firstChild!, link.firstChild!);
            link.normalize();
          }
          if (settings.typelinkhints && !containsNumber) {
            let c = 0;
            for (let j = 0; j < this.linkArr.length; ++j) {
              if (this.linkArr[j]![0].style.opacity !== '0') {
                this.linkArr[j]![0].textContent = (c + 1).toString() +
                  (this.linkArr[j]![3] ? ': ' + this.linkArr[j]![3] : '');
                c++;
              }
            }
          }
          if (!this.numericMatch || link.textContent === string) {
            this.numericMatch = this.linkArr[i]![1];
          }
          if (containsNumber) {
            if (settings.dimhintcharacters) {
              span = document.createElement('span');
              span.setAttribute('cVim', 'true');
              span.className = 'cVim-link-hint_match';
              (link.firstChild as Text).splitText(stringNum!.length);
              span.appendChild(link.firstChild!.cloneNode(true));
              link.replaceChild(span, link.firstChild!);
            } else if (link.textContent!.length !== 1) {
              span = document.createElement('span');
              span.setAttribute('cVim', 'true');
              span.className = 'cVim-link-hint_match_hidden';
              (link.firstChild as Text).splitText(stringNum!.length);
              span.appendChild(link.firstChild!.cloneNode(true));
              link.replaceChild(span, link.firstChild!);
            }
          }
          index = i.toString();
          linksFound++;
        } else if (link.parentNode) {
          link.style.opacity = '0';
        }
      }
    }

    if (linksFound === 0) {
      this.hideHints(false, false, true);
    }
    if (linksFound === 1) {
      if (this.shouldShowLinkInfo && this.showLinkInfo(this.linkArr[+index!]! as [HintElement, Element])) {
        this.acceptLink = (shift?: boolean) => {
          this.dispatchAction(this.linkArr[+index!]![1], shift);
          this.hideHints(false);
          this.acceptLink = null;
        };
      } else {
        this.dispatchAction(this.linkArr[+index!]![1]);
        this.hideHints(false);
      }
    }
  },

  handleHint(key: string): void {
    key = key.replace('<Space>', ' ');
    switch (key) {
      case '/':
        const container = document.getElementById('cVim-link-container');
        if (container) container.style.opacity = '0';
        return;
      case '<Tab>':
        this.shouldShowLinkInfo = !this.shouldShowLinkInfo;
        return;
    }
    if (settings.numerichints && key === '<Enter>') {
      if (this.numericMatch) {
        this.dispatchAction(this.numericMatch);
      } else {
        this.hideHints(false);
      }
      return;
    }
    if (settings.numerichints || settings.hintcharacters.split('').indexOf(key.toLowerCase()) !== -1) {
      this.currentString += key.toLowerCase();
      this.handleHintFeedback();
    } else {
      this.hideHints(false, false, true);
    }
  },

  evaluateLink(item: LinkInfo): void {
    this.linkIndex += 1;
    const node = item.node;
    const rect = item.rect;

    const hint = this.linkElementBase!.cloneNode(false) as HintElement;
    const style = hint.style;
    style.zIndex = this.linkIndex.toString();
    style.top = (document.scrollingElement?.scrollTop || 0) + rect.top + 'px';
    style.left = (document.scrollingElement?.scrollLeft || 0) + rect.left + 'px';

    item.hint = hint;

    if (settings && settings.numerichints) {
      if (!settings.typelinkhints) {
        this.linkArr.push([hint, node]);
      } else {
        let textValue = '';
        let alt = '';
        if ((node as HTMLElement).firstElementChild &&
          (node as HTMLElement).firstElementChild!.getAttribute('alt')) {
          textValue = (node as HTMLElement).firstElementChild!.getAttribute('alt')!;
          alt = textValue;
        } else {
          textValue = node.textContent ||
            (node as HTMLInputElement).value ||
            (node as HTMLImageElement).alt || '';
        }
        item.text = textValue;
        this.linkArr.push([hint, node, textValue, alt]);
      }
    } else {
      this.linkArr.push([hint, node]);
    }
  },

  createHintFilter(url: string): HintFilter {
    const rejectList: Element[] = [];
    const acceptList: Element[] = [];
    Object.getOwnPropertyNames(this.siteFilters).forEach((e) => {
      if (!matchLocation(url, e))
        return;
      const reject = this.siteFilters[e]!.reject || [];
      const accept = this.siteFilters[e]!.accept || [];
      accept.forEach((selector) => {
        const items = Array.from(document.querySelectorAll(selector));
        acceptList.push(...items);
      });
      reject.forEach((selector) => {
        const items = Array.from(document.querySelectorAll(selector));
        rejectList.push(...items);
      });
    });
    return {
      shouldAccept: (node: Element): boolean => {
        return acceptList.indexOf(node) !== -1;
      },
      shouldReject: (node: Element): boolean => {
        return rejectList.indexOf(node) !== -1;
      },
    };
  },

  getLinkType(node: Node): number {
    if (node.nodeType !== Node.ELEMENT_NODE)
      return this.NON_LINK_TYPE;

    const element = node as Element;
    if (element.getAttribute('aria-hidden') === 'true')
      return this.NON_LINK_TYPE;

    const name = element.localName.toLowerCase();

    if (this.type) {
      if (this.type.indexOf('yank') !== -1) {
        if (name === 'a')
          return this.LINK_TYPE;
        if (name === 'textarea' || name === 'input')
          return this.LINK_TYPE | this.INPUT_LINK;
        return this.NON_LINK_TYPE;
      } else if (this.type.indexOf('image') !== -1) {
        if (name === 'img')
          return this.LINK_TYPE;
        return this.NON_LINK_TYPE;
      } else if (this.type === 'edit') {
        if (DOM.isEditable(element))
          return this.LINK_TYPE | this.INPUT_LINK;
        return this.NON_LINK_TYPE;
      }
    }

    switch (name) {
      case 'a':
      case 'button':
      case 'area':
        return this.LINK_TYPE;
      case 'select':
      case 'textarea':
      case 'input':
        return this.LINK_TYPE | this.INPUT_LINK;
    }

    switch (true) {
      case element.hasAttribute('contenteditable'):
        return this.LINK_TYPE | this.INPUT_LINK;
      case element.hasAttribute('tabindex'):
      case element.hasAttribute('onclick'):
        return this.LINK_TYPE;
      case element.hasAttribute('aria-haspopup'):
      case element.hasAttribute('data-cmd'):
      case element.hasAttribute('jsaction'):
      case element.hasAttribute('data-ga-click'):
      case element.hasAttribute('aria-selected'):
        return this.WEAK_LINK_TYPE;
    }

    const role = element.getAttribute('role');
    if (role) {
      if (role === 'button' ||
        role === 'option' ||
        role === 'checkbox' ||
        role.indexOf('menuitem') !== -1) {
        return this.LINK_TYPE;
      }
    }

    if ((element.getAttribute('class') || '').indexOf('button') !== -1) {
      return this.WEAK_LINK_TYPE;
    }

    return this.NON_LINK_TYPE;
  },

  isClickable(info: LinkInfo): boolean {
    const rect = info.rect;
    const locs: [number, number][] = [
      [rect.left + 1, rect.top + 1],
      [rect.right - 1, rect.top + 1],
      [rect.left + 1, rect.bottom - 1],
      [rect.right - 1, rect.bottom - 1],
      [(rect.right - rect.left) / 2, (rect.top - rect.bottom) / 2],
    ];
    for (let i = 0; i < locs.length; i++) {
      const x = locs[i]![0], y = locs[i]![1];
      const elem = document.elementFromPoint(x, y);
      if (!elem)
        continue;
      if (elem === info.node || info.node.contains(elem))
        return true;
      if (!DOM.isVisible(elem))
        return true;
    }
    return false;
  },

  getLinkInfo: Utils.cacheFunction((node: Node): LinkInfo | null => {
    const info: Partial<LinkInfo> = {
      node: node as Element,
      linkType: Hints.LINK_TYPE,
    };

    if (!Hints.hintFilter!.shouldAccept(node as Element)) {
      if (Hints.hintFilter!.shouldReject(node as Element))
        return null;
      info.linkType = Hints.getLinkType(node);
    }

    if (info.linkType === Hints.NON_LINK_TYPE)
      return null;

    if ((node as Element).localName.toLowerCase() === 'area') {
      info.rect = DOM.getVisibleBoundingAreaRect(node as Element) || undefined;
    } else {
      info.rect = DOM.getVisibleBoundingRect(node as Element) || undefined;
    }

    if (!info.rect)
      return null;

    return info as LinkInfo;
  }),

  getLinks(): LinkInfo[] {
    (this.getLinkInfo as any).clearCache?.();
    this.hintFilter = this.createHintFilter(document.URL);
    let links = mapDOM(document.body, this.getLinkInfo);
    if (settings.sortlinkhints) {
      links = links.map((item) => {
        const rect = item.rect;
        return [item, Math.sqrt(rect.top * rect.top + rect.left * rect.left)] as [LinkInfo, number];
      }).sort((a, b) => {
        return a[1] - b[1];
      }).map((e) => {
        return e[0];
      });
    }

    links = links.filter((info, index) => {
      if ((info.linkType & this.WEAK_LINK_TYPE) === 0)
        return true;
      for (let i = index + 1; i < links.length; i++) {
        let depth = 0;
        let node: Node | null = links[i]!.node;
        while (node && node !== info.node) {
          depth++;
          node = node.parentNode;
        }
        if (depth > 3)
          continue;
        if (info.node.contains(links[i]!.node))
          return false;
      }
      return true;
    });

    return links;
  },

  genHints(M: number): string[] {
    const base = settings.hintcharacters.length;
    if (M <= base) {
      return settings.hintcharacters.slice(0, M).split('');
    }
    const codeWord = (n: number, b: number): string => {
      const word: string[] = [];
      for (let i = 0; i < b; i++) {
        word.push(settings.hintcharacters.charAt(n % base));
        n = ~~(n / base);
      }
      return word.reverse().join('');
    };

    const b = Math.ceil(Math.log(M) / Math.log(base));
    const cutoff = Math.pow(base, b) - M;
    const codes0: string[] = [];
    const codes1: string[] = [];

    let i: number;
    for (i = 0; i < ~~(cutoff / (base - 1)); i++)
      codes0.push(codeWord(i, b - 1));
    codes0.sort();
    for (; i < M; i++)
      codes1.push(codeWord(i + cutoff, b));
    codes1.sort();
    return codes0.concat(codes1);
  },

  create(type?: string, multi = false): void {
    const self = this;
    window.setTimeout(() => {
      if (!Command.domElementsLoaded) {
        Command.callOnCvimLoad(() => {
          self.create(type, multi);
        });
        return;
      }
      if (Command.css.parentNode === null) {
        document.head.appendChild(Command.css);
      }
      let main: HTMLDivElement;
      let frag: DocumentFragment;
      let i: number;
      let l: number;
      self.linkIndex = 0;
      self.type = type;
      self.hideHints(true, multi);
      if (document.body && document.body.style) {
        this.documentZoom = +document.body.style.zoom || 1;
      } else {
        this.documentZoom = 1;
      }
      this.linkElementBase = document.createElement('div') as HintElement;
      this.linkElementBase.cVim = true;
      this.linkElementBase.className = 'cVim-link-hint';
      if (settings.scalehints) {
        this.linkElementBase.className += ' cVim-hint-scale';
      }
      self.getLinks().forEach((link) => {
        self.evaluateLink(link);
      });
      if (type && type.indexOf('multi') !== -1) {
        self.multi = true;
      } else {
        self.multi = false;
      }
      if (self.linkArr.length === 0) {
        return self.hideHints();
      }

      main = document.createElement('div');
      if (settings && settings.linkanimations) {
        main.style.opacity = '0';
      }
      (main as any).cVim = true;
      frag = document.createDocumentFragment();

      main.id = 'cVim-link-container';
      (main as any).top = (document.scrollingElement?.scrollTop || 0) + 'px';
      (main as any).left = (document.scrollingElement?.scrollLeft || 0) + 'px';
      this.shadowDOM = main.attachShadow({ mode: 'open' });

      try {
        document.documentElement.appendChild(main);
      } catch (e) {
        document.body.appendChild(main);
      }

      if (!multi && settings && settings.hud) {
        HUD.display('Follow link ' + (() => {
          const typeMessages: { [key: string]: string } = {
            yank: '(yank)',
            multiyank: '(multi-yank)',
            image: '(reverse-image)',
            fullimage: '(full image)',
            tabbed: '(tabbed)',
            tabbedActive: '(tabbed)',
            window: '(window)',
            edit: '(edit)',
            hover: '(hover)',
            unhover: '(unhover)',
            multi: '(multi)',
            script: `(script: "${self.scriptFunction}")`
          };
          return typeMessages[type || ''] || '';
        })());
      }

      if (!settings.numerichints) {
        self.permutations = self.genHints(self.linkArr.length);
        for (i = self.linkArr.length - 1; i >= 0; --i) {
          self.linkArr[i]![0].textContent = self.permutations[i]!;
          frag.appendChild(self.linkArr[i]![0]);
        }
      } else {
        for (i = 0, l = self.linkArr.length; i < l; ++i) {
          self.linkArr[i]![0].textContent = (i + 1).toString() +
            (self.linkArr[i]![3] ? ': ' + self.linkArr[i]![3] : '');
          frag.appendChild(self.linkArr[i]![0]);
        }
      }

      Array.from(document.querySelectorAll('style')).forEach((e) => {
        if (e.textContent && e.textContent.indexOf('cVim') !== -1) {
          this.shadowDOM!.appendChild(e.cloneNode(true));
        }
      });

      const create = (): void => {
        this.shadowDOM!.appendChild(frag);
        const style = document.createElement('style');
        style.textContent = Command.mainCSS!;
        this.shadowDOM!.appendChild(style);
        main.style.opacity = '1';
      };

      if (Command.mainCSS === undefined) {
        httpRequest({
          url: chrome.runtime.getURL('content_scripts/main.css')
        }, (data) => {
          Command.mainCSS = data;
          create();
        });
      } else {
        create();
      }

    }, 0);
  }
};

declare global {
  interface Window {
    Hints: HintsInterface;
  }
}

window.Hints = Hints;
