declare const RCParser: any;

/**
 * Global LOG function bound to console.log for debugging
 * Maintains compatibility with original cVim implementation
 */
declare global {
  var LOG: (...args: any[]) => void;
}

globalThis.LOG = console.log.bind(console);

interface CachedFunction<T, R> {
  (arg: T): R;
  clearCache(): void;
}

interface SearchOptions<T> {
  array: T[];
  search: string;
  limit?: number;
  fn?: (item: T) => string;
}

interface ParseConfigResult {
  error: {
    lineno: number;
    message: string;
  } | null;
  value: any;
}


export const Utils = {
  cacheFunction<T, R>(callback: (arg: T) => R): CachedFunction<T, R> {
    const cache = new Map<T, R>();
    const result = function(arg: T): R {
      if (cache.has(arg))
        return cache.get(arg)!;
      const retval = callback(arg);
      cache.set(arg, retval);
      return retval;
    };
    result.clearCache = function() {
      cache.clear();
    };
    return result;
  },

  trueModulo(a: number, b: number): number {
    return ((a % b) + b) % b;
  },

  uniqueElements<T>(array: T[]): T[] {
    const result: T[] = [];
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (item !== undefined && result.indexOf(item) === -1)
        result.push(item);
    }
    return result;
  },

  compressArray<T>(array: T[]): T[] {
    const result: T[] = [];
    // faster than using [].filter
    for (let i = 0; i < array.length; i++) {
      if (array[i])
        result.push(array[i]!);
    }
    return result;
  },

  split(string: string, pattern: string | RegExp): string[] {
    return this.compressArray(string.split(pattern));
  },

  trim(string: string): string {
    return string.replace(/^(\s+)?(.*\S)?(\s+)?$/g, '$2');
  },

  format(string: string, value: string): string {
    const index = string.lastIndexOf('%s');
    if (index < 0)
      return string + value;
    return string.slice(0, index) + value + string.slice(index + 2);
  },

  toSearchURL(query: string, engineUrl?: string): string {
    if (Utils.isValidURL(query)) {
      return (!/^[a-zA-Z\-]+:/.test(query) ? 'http://' : '') + query;
    }
    engineUrl = engineUrl || 'https://www.google.com/search?q=';
    return Utils.format(engineUrl, encodeURIComponent(query));
  },

  isValidURL: (function() {
    const TLDs = ['abogado', 'ac', 'academy', 'accountants', 'active', 'actor', 'ad', 'adult', 'ae', 'aero', 'af', 'ag', 'agency', 'ai', 'airforce', 'al', 'allfinanz', 'alsace', 'am', 'amsterdam', 'an', 'android', 'ao', 'aq', 'aquarelle', 'ar', 'archi', 'army', 'arpa', 'as', 'asia', 'associates', 'at', 'attorney', 'au', 'auction', 'audio', 'autos', 'aw', 'ax', 'axa', 'az', 'ba', 'band', 'bank', 'bar', 'barclaycard', 'barclays', 'bargains', 'bayern', 'bb', 'bd', 'be', 'beer', 'berlin', 'best', 'bf', 'bg', 'bh', 'bi', 'bid', 'bike', 'bio', 'biz', 'bj', 'black', 'blackfriday', 'bloomberg', 'blue', 'bm', 'bmw', 'bn', 'bnpparibas', 'bo', 'boo', 'boutique', 'br', 'brussels', 'bs', 'bt', 'budapest', 'build', 'builders', 'business', 'buzz', 'bv', 'bw', 'by', 'bz', 'bzh', 'ca', 'cab', 'cal', 'camera', 'camp', 'cancerresearch', 'capetown', 'capital', 'caravan', 'cards', 'care', 'career', 'careers', 'cartier', 'casa', 'cash', 'cat', 'catering', 'cc', 'cd', 'center', 'ceo', 'cern', 'cf', 'cg', 'ch', 'channel', 'cheap', 'christmas', 'chrome', 'church', 'ci', 'citic', 'city', 'ck', 'cl', 'claims', 'cleaning', 'click', 'clinic', 'clothing', 'club', 'cm', 'cn', 'co', 'coach', 'codes', 'coffee', 'college', 'cologne', 'com', 'community', 'company', 'computer', 'condos', 'construction', 'consulting', 'contractors', 'cooking', 'cool', 'coop', 'country', 'cr', 'credit', 'creditcard', 'cricket', 'crs', 'cruises', 'cu', 'cuisinella', 'cv', 'cw', 'cx', 'cy', 'cymru', 'cz', 'dabur', 'dad', 'dance', 'dating', 'day', 'dclk', 'de', 'deals', 'degree', 'delivery', 'democrat', 'dental', 'dentist', 'desi', 'design', 'dev', 'diamonds', 'diet', 'digital', 'direct', 'directory', 'discount', 'dj', 'dk', 'dm', 'dnp', 'do', 'docs', 'domains', 'doosan', 'durban', 'dvag', 'dz', 'eat', 'ec', 'edu', 'education', 'ee', 'eg', 'email', 'emerck', 'energy', 'engineer', 'engineering', 'enterprises', 'equipment', 'er', 'es', 'esq', 'estate', 'et', 'eu', 'eurovision', 'eus', 'events', 'everbank', 'exchange', 'expert', 'exposed', 'fail', 'farm', 'fashion', 'feedback', 'fi', 'finance', 'financial', 'firmdale', 'fish', 'fishing', 'fit', 'fitness', 'fj', 'fk', 'flights', 'florist', 'flowers', 'flsmidth', 'fly', 'fm', 'fo', 'foo', 'forsale', 'foundation', 'fr', 'frl', 'frogans', 'fund', 'furniture', 'futbol', 'ga', 'gal', 'gallery', 'garden', 'gb', 'gbiz', 'gd', 'ge', 'gent', 'gf', 'gg', 'ggee', 'gh', 'gi', 'gift', 'gifts', 'gives', 'gl', 'glass', 'gle', 'global', 'globo', 'gm', 'gmail', 'gmo', 'gmx', 'gn', 'goog', 'google', 'gop', 'gov', 'gp', 'gq', 'gr', 'graphics', 'gratis', 'green', 'gripe', 'gs', 'gt', 'gu', 'guide', 'guitars', 'guru', 'gw', 'gy', 'hamburg', 'hangout', 'haus', 'healthcare', 'help', 'here', 'hermes', 'hiphop', 'hiv', 'hk', 'hm', 'hn', 'holdings', 'holiday', 'homes', 'horse', 'host', 'hosting', 'house', 'how', 'hr', 'ht', 'hu', 'ibm', 'id', 'ie', 'ifm', 'il', 'im', 'immo', 'immobilien', 'in', 'industries', 'info', 'ing', 'ink', 'institute', 'insure', 'int', 'international', 'investments', 'io', 'iq', 'ir', 'irish', 'is', 'it', 'iwc', 'jcb', 'je', 'jetzt', 'jm', 'jo', 'jobs', 'joburg', 'jp', 'juegos', 'kaufen', 'kddi', 'ke', 'kg', 'kh', 'ki', 'kim', 'kitchen', 'kiwi', 'km', 'kn', 'koeln', 'kp', 'kr', 'krd', 'kred', 'kw', 'ky', 'kyoto', 'kz', 'la', 'lacaixa', 'land', 'lat', 'latrobe', 'lawyer', 'lb', 'lc', 'lds', 'lease', 'legal', 'lgbt', 'li', 'lidl', 'life', 'lighting', 'limited', 'limo', 'link', 'lk', 'loans', 'london', 'lotte', 'lotto', 'lr', 'ls', 'lt', 'ltda', 'lu', 'luxe', 'luxury', 'lv', 'ly', 'ma', 'madrid', 'maison', 'management', 'mango', 'market', 'marketing', 'marriott', 'mc', 'md', 'me', 'media', 'meet', 'melbourne', 'meme', 'memorial', 'menu', 'mg', 'mh', 'miami', 'mil', 'mini', 'mk', 'ml', 'mm', 'mn', 'mo', 'mobi', 'moda', 'moe', 'monash', 'money', 'mormon', 'mortgage', 'moscow', 'motorcycles', 'mov', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'museum', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nagoya', 'name', 'navy', 'nc', 'ne', 'net', 'network', 'neustar', 'new', 'nexus', 'nf', 'ng', 'ngo', 'nhk', 'ni', 'ninja', 'nl', 'no', 'np', 'nr', 'nra', 'nrw', 'nu', 'nyc', 'nz', 'okinawa', 'om', 'one', 'ong', 'onl', 'ooo', 'org', 'organic', 'osaka', 'otsuka', 'ovh', 'pa', 'paris', 'partners', 'parts', 'party', 'pe', 'pf', 'pg', 'ph', 'pharmacy', 'photo', 'photography', 'photos', 'physio', 'pics', 'pictures', 'pink', 'pizza', 'pk', 'pl', 'place', 'plumbing', 'pm', 'pn', 'pohl', 'poker', 'porn', 'post', 'pr', 'praxi', 'press', 'pro', 'prod', 'productions', 'prof', 'properties', 'property', 'ps', 'pt', 'pub', 'pw', 'py', 'qa', 'qpon', 'quebec', 're', 'realtor', 'recipes', 'red', 'rehab', 'reise', 'reisen', 'reit', 'ren', 'rentals', 'repair', 'report', 'republican', 'rest', 'restaurant', 'reviews', 'rich', 'rio', 'rip', 'ro', 'rocks', 'rodeo', 'rs', 'rsvp', 'ru', 'ruhr', 'rw', 'ryukyu', 'sa', 'saarland', 'sale', 'samsung', 'sarl', 'sb', 'sc', 'sca', 'scb', 'schmidt', 'schule', 'schwarz', 'science', 'scot', 'sd', 'se', 'services', 'sew', 'sexy', 'sg', 'sh', 'shiksha', 'shoes', 'shriram', 'si', 'singles', 'sj', 'sk', 'sky', 'sl', 'sm', 'sn', 'so', 'social', 'software', 'sohu', 'solar', 'solutions', 'soy', 'space', 'spiegel', 'sr', 'st', 'su', 'supplies', 'supply', 'support', 'surf', 'surgery', 'suzuki', 'sv', 'sx', 'sy', 'sydney', 'systems', 'sz', 'taipei', 'tatar', 'tattoo', 'tax', 'tc', 'td', 'technology', 'tel', 'temasek', 'tf', 'tg', 'th', 'tienda', 'tips', 'tires', 'tirol', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'today', 'tokyo', 'tools', 'top', 'town', 'toys', 'tp', 'tr', 'trade', 'training', 'travel', 'trust', 'tt', 'tui', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'university', 'uno', 'uol', 'us', 'uy', 'uz', 'va', 'vacations', 'vc', 've', 'vegas', 'ventures', 'versicherung', 'vet', 'vg', 'vi', 'viajes', 'video', 'villas', 'vision', 'vlaanderen', 'vn', 'vodka', 'vote', 'voting', 'voto', 'voyage', 'vu', 'wales', 'wang', 'watch', 'webcam', 'website', 'wed', 'wedding', 'wf', 'whoswho', 'wien', 'wiki', 'williamhill', 'wme', 'work', 'works', 'world', 'ws', 'wtc', 'wtf', 'xn--1qqw23a', 'xn--3bst00m', 'xn--3ds443g', 'xn--3e0b707e', 'xn--45brj9c', 'xn--45q11c', 'xn--4gbrim', 'xn--55qw42g', 'xn--55qx5d', 'xn--6frz82g', 'xn--6qq986b3xl', 'xn--80adxhks', 'xn--80ao21a', 'xn--80asehdb', 'xn--80aswg', 'xn--90a3ac', 'xn--b4w605ferd', 'xn--c1avg', 'xn--cg4bki', 'xn--clchc0ea0b2g2a9gcd', 'xn--czr694b', 'xn--czrs0t', 'xn--czru2d', 'xn--d1acj3b', 'xn--d1alf', 'xn--fiq228c5hs', 'xn--fiq64b', 'xn--fiqs8s', 'xn--fiqz9s', 'xn--flw351e', 'xn--fpcrj9c3d', 'xn--fzc2c9e2c', 'xn--gecrj9c', 'xn--h2brj9c', 'xn--hxt814e', 'xn--i1b6b1a6a2e', 'xn--io0a7i', 'xn--j1amh', 'xn--j6w193g', 'xn--kprw13d', 'xn--kpry57d', 'xn--kput3i', 'xn--l1acc', 'xn--lgbbat1ad8j', 'xn--mgb9awbf', 'xn--mgba3a4f16a', 'xn--mgbaam7a8h', 'xn--mgbab2bd', 'xn--mgbayh7gpa', 'xn--mgbbh1a71e', 'xn--mgbc0a9azcg', 'xn--mgberp4a5d4ar', 'xn--mgbx4cd0ab', 'xn--ngbc5azd', 'xn--node', 'xn--nqv7f', 'xn--nqv7fs00ema', 'xn--o3cw4h', 'xn--ogbpf8fl', 'xn--p1acf', 'xn--p1ai', 'xn--pgbs0dh', 'xn--q9jyb4c', 'xn--qcka1pmc', 'xn--rhqv96g', 'xn--s9brj9c', 'xn--ses554g', 'xn--unup4y', 'xn--vermgensberater-ctb', 'xn--vermgensberatung-pwb', 'xn--vhquv', 'xn--wgbh1c', 'xn--wgbl6a', 'xn--xhq521b', 'xn--xkc2al3hye2a', 'xn--xkc2dl3a5ee0h', 'xn--yfro4i67o', 'xn--ygbi2ammx', 'xn--zfr164b', 'xxx', 'xyz', 'yachts', 'yandex', 'ye', 'yoga', 'yokohama', 'youtube', 'yt', 'za', 'zip', 'zm', 'zone', 'zuerich', 'zw'];
    const PROTOCOLS = ['http:', 'https:', 'file:', 'ftp:', 'chrome:', 'chrome-extension:'];
    return function(url: string): boolean {
      url = Utils.trim(url);
      if (~url.indexOf(' '))
        return false;
      if (~url.search(/^(about|file):[^:]/))
        return true;
      const protocol = (url.match(/^([a-zA-Z\-]+:)[^:]/) || [''])[0].slice(0, -1);
      const protocolMatch = PROTOCOLS.indexOf(protocol) !== -1;
      if (protocolMatch)
        url = url.replace(/^[a-zA-Z\-]+:\/*/, '');
      const hasPath = /.*[a-zA-Z].*\//.test(url);
      const urlParts = url.replace(/(:[0-9]+)?([#\/].*|$)/g, '').split('.');
      if (protocolMatch && /^[a-zA-Z0-9@!]+$/.test(url))
        return true;
      if (protocol && !protocolMatch && protocol !== 'localhost:')
        return false;
      const isIP = urlParts.every(function(e) {
        return /^[0-9]+$/.test(e) && +e >= 0 && +e < 256;
      });
      if ((isIP && !protocol && urlParts.length === 4) || (isIP && protocolMatch))
        return true;
      return (urlParts.every(function(e) { return /^[a-z0-9\-]+$/i.test(e); }) &&
        (urlParts.length > 1 && TLDs.indexOf(urlParts[urlParts.length - 1]!) !== -1)) ||
        (urlParts.length === 1 && urlParts[0] === 'localhost') || hasPath;
    };
  })(),
};

declare global {
  interface ObjectConstructor {
    clone<T>(node: T): T;
    compare(a: any, b: any, keys?: string[]): boolean;
    extend(...args: any[]): any;
    merge(a: Record<string, any>, b: Record<string, any>): void;
  }
}

Object.clone = function <T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map(function(e) {
      return Object.clone(e);
    }) as unknown as T;
  } else if (typeof node === 'object') {
    const o: any = {};
    for (const key in node) {
      o[key] = Object.clone((node as any)[key]);
    }
    return o;
  } else {
    return node;
  }
};

Object.compare = function(a: any, b: any, keys?: string[]): boolean {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  if (!Array.isArray(keys)) {
    for (const key in a) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
  } else {
    return keys.every(function(e) { return a[e] === b[e]; });
  }
  return true;
};

export const matchLocation = function(url: string, pattern: string): boolean {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return false;
  }
  const protocol = (pattern.match(/.*:\/\//) || [''])[0].slice(0, -2);
  let hostname: RegExpMatchArray | null, path: string, pathMatch: RegExpMatchArray | null, hostMatch: RegExpMatchArray | null;
  const urlObj = new URL(url);
  if (/\*\*/.test(pattern)) {
    console.error('cVim Error: Invalid pattern: "%s"', pattern);
    return false;
  }
  if (!protocol.length) {
    console.error('cVim Error: Invalid protocol in pattern: "%s"', pattern);
    return false;
  }
  pattern = pattern.replace(/.*:\/\//, '');
  if (protocol !== '*:' && urlObj.protocol !== protocol) {
    return false;
  }
  if (urlObj.protocol !== 'file:') {
    hostname = pattern.match(/^[^\/]+/g);
    if (!hostname) {
      console.error('cVim Error: Invalid host in pattern: "%s"', pattern);
      return false;
    }
    const origHostname = hostname;
    const hostnamePattern = hostname[0].replace(/([.])/g, '\\$1').replace(/\*/g, '.*');
    hostMatch = urlObj.hostname.match(new RegExp(hostnamePattern, 'i'));
    if (!hostMatch || hostMatch[0].length !== urlObj.hostname.length) {
      return false;
    }
    pattern = pattern.slice(origHostname[0].length);
  }
  if (pattern.length) {
    path = pattern.replace(/([.&\\\/\(\)\[\]!?])/g, '\\$1').replace(/\*/g, '.*');
    pathMatch = urlObj.pathname.match(new RegExp(path));
    if (!pathMatch || pathMatch[0].length !== urlObj.pathname.length) {
      return false;
    }
  }
  return true;
};

export const waitForLoad = function(callback: () => void, constructor?: any): void {
  if (document.body)
    return callback.call(constructor);
  window.setTimeout(function() {
    waitForLoad(callback, constructor);
  }, 5);
};

export const eachUntil = function <T>(array: T[], callback: (item: T, index: number, array: T[]) => boolean): void {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (item !== undefined && callback(item, i, array)) {
      break;
    }
  }
};

export const searchArray = function <T>(opt: SearchOptions<T>): T[] {
  const split = /[\/?:.\-\s]+/;
  const search = Utils.split(opt.search.toLowerCase(), split);
  const fn = opt.fn || function(item: T): string { return String(item); };
  const matches: T[] = [];
  eachUntil(opt.array, function(item: T): boolean {
    if (item === undefined) return false;
    const text = fn(item).split(split);
    if (search.every(function(searchTerm) {
      return text.some(function(textTerm) {
        return textTerm.toLowerCase().indexOf(searchTerm) === 0;
      });
    })) {
      matches.push(item);
      return matches.length === opt.limit;
    }
    return false;
  });
  return matches;
};

Object.extend = function(...args: any[]): any {
  const _ret: any = {};
  for (let i = 0, l = args.length; i < l; ++i) {
    for (const key in args[i]) {
      _ret[key] = args[i][key];
    }
  }
  return _ret;
};

Object.merge = function(a: Record<string, any>, b: Record<string, any>): void {
  Object.keys(b).forEach(function(key) {
    if (typeof b[key] === 'object' && !Array.isArray(b[key]) &&
      typeof a[key] === 'object' && !Array.isArray(a[key])) {
      Object.merge(a[key], b[key]);
    } else {
      a[key] = b[key];
    }
  });
};

export class TrieNode {
  parent: TrieNode | null;
  children: { [key: string]: TrieNode };
  value: any;

  constructor(parent: TrieNode | null, value?: any) {
    this.parent = parent;
    this.children = {};
    this.value = value || null;
  }

  remove(): void {
    this.value = null;
    const parent = this.parent;
    if (parent && Object.keys(this.children).length === 0) {
      parent.removeChild(this);
      if (parent.value === null)
        parent.remove();
    }
  }

  removeByKey(keys: string[]): boolean {
    const node = this.find(keys);
    if (node !== null)
      node.remove();
    return node !== null;
  }

  removeChild(node: TrieNode): void {
    for (const key in this.children) {
      if (this.children[key] === node) {
        delete this.children[key];
        break;
      }
    }
  }

  insert(keys: string[], value: any): void {
    let node: TrieNode = this;
    keys.forEach(function(e) {
      node.value = null;
      node = node.children[e] || (node.children[e] = new TrieNode(node));
    });
    node.value = value;
  }

  find(keys: string[]): TrieNode | null {
    let node: TrieNode = this;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!key || !node.hasKey(key))
        return null;
      const nextNode = node.getKey(key);
      if (!nextNode) return null;
      node = nextNode;
    }
    return node;
  }

  hasKey(key: string): boolean {
    return this.children.hasOwnProperty(key);
  }

  getKey(key: string): TrieNode | null {
    return this.children[key] || null;
  }

  findValue(keys: string[]): any {
    return (this.find(keys) || {}).value || null;
  }
}

export class Trie extends TrieNode {
  constructor() {
    super(null);
  }
}

export const traverseDOM = function(root: Node, accept: (node: Node) => boolean): Node[] {
  const nodes = [root];
  for (let i = 0; i < nodes.length; i++) {
    const parentNode = nodes[i];
    if (parentNode) {
      let node = parentNode.firstChild;
      while (node !== null) {
        nodes.push(node);
        node = node.nextSibling;
      }
    }
  }
  nodes.shift();
  return nodes.filter(accept);
};

export const mapDOM = function <T>(root: Node, accept: (node: Node) => T | null): T[] {
  const nodes = [root];
  for (let i = 0; i < nodes.length; i++) {
    const parentNode = nodes[i];
    if (parentNode) {
      let node = parentNode.firstChild;
      while (node !== null) {
        nodes.push(node);
        node = node.nextSibling;
      }
    }
  }
  const acceptedValues: T[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const currentNode = nodes[i];
    if (currentNode) {
      const value = accept(currentNode);
      if (value !== null)
        acceptedValues.push(value);
    }
  }
  return acceptedValues;
};

export const hasAttributes = function(node: Element, ...attributes: string[]): boolean {
  if (attributes.length === 0)
    return false;
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    if (attr && node.hasAttribute(attr))
      return true;
  }
  return false;
};

export const getLinkableElements = (function() {
  const visible = function(node: Element): boolean {
    const cs = getComputedStyle(node, null);
    return cs.opacity !== '0' &&
      cs.visibility === 'visible' &&
      cs.display !== 'none';
  };
  return function(): Element[] {
    return traverseDOM(document.body, function(node: Node): boolean {
      if (node.nodeType !== Node.ELEMENT_NODE || !visible(node as Element))
        return false;
      switch ((node as Element).localName.toLowerCase()) {
        case 'a':
        case 'button':
          return true;
        default:
          return hasAttributes(node as Element, 'jsaction', 'onclick');
      }
    }) as Element[];
  };
})();

export const findFirstOf = function <T>(array: T[], callback: (item: T, index: number, array: T[]) => boolean): T | null {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (item !== undefined && callback(item, i, array))
      return item;
  }
  return null;
};

declare global {
  interface Window {
    parseConfig(value: string): ParseConfigResult;
  }
}

window.parseConfig = (function() {
  const formatConfig = function(configText: string, config: any): any {
    const result: any = {
      MAPPINGS: [],
    };
    for (const key in config) {
      if (key === 'MAPPINGS') {
        result.MAPPINGS.push(config[key]);
      } else if (config[key].constructor === Object) {
        result[key] = Object.extend(result[key], config[key]);
      } else {
        result[key] = config[key];
      }
    }
    result.MAPPINGS = result.MAPPINGS.join('\n');
    result.RC = configText;
    return result;
  };
  return function(value: string): ParseConfigResult {
    try {
      return {
        error: null,
        value: formatConfig(value, RCParser.parse(value))
      };
    } catch (e: any) {
      return {
        error: {
          lineno: e.line,
          message: e.message
        },
        value: null
      };
    }
  };
})();
