// External dependency declarations
declare const PORT: (action: string, data?: any) => void;
declare const Utils: {
  compressArray<T>(array: (T | null | undefined)[]): T[];
  isValidURL(url: string): boolean;
  toSearchURL(query: string, engineUrl?: string): string;
  format(string: string, value: string): string;
};
declare const settings: {
  defaultengine: string;
};

declare global {
  interface Window {
    httpCallback: (id: string, response: any) => void;
    httpRequest: (request: HttpRequestOptions, callback: (response: any) => void) => void;
  }
}

// Type definitions
interface HttpRequestOptions {
  url: string;
  json?: boolean;
}

type HttpCallback = (response: any) => void;

interface EngineConfig {
  baseUrl: string;
  requestUrl: string;
  apiUrl?: string;
  formatRequest?(query: string): string;
  queryApi?(query: string, callback: (results: any[]) => void): void;
}

interface LocaleConfig {
  tld: string;
  requestUrl: string[];
  baseUrl: string[];
  apiUrl: string[];
}

interface CompleteType {
  locales: { [key: string]: LocaleConfig };
  aliases: { [key: string]: string };
  activeEngines: string[];
  engines: { [key: string]: EngineConfig };
  convertToLink(input: string, isURL?: boolean, isLink?: boolean): string;
  setLocale(locale: string): void;
  addEngine(name: string, props: string | EngineConfig): void;
  getEngine(name: string): EngineConfig | null;
  queryEngine(name: string, query: string, callback: HttpCallback): void;
  getMatchingEngines(prefix: string): string[];
  addAlias(alias: string, value: string): void;
  hasAlias(alias: string): boolean;
  getAlias(alias: string): string | undefined;
  hasEngine(name: string): boolean;
  enableEngine(name: string): void;
  engineEnabled(name: string): boolean;
}

// HTTP callback system implementation
(() => {
  const CALLBACKS: { [id: string]: HttpCallback } = {};

  window.httpCallback = (id: string, response: any): void => {
    if (typeof CALLBACKS[id] === 'function') {
      CALLBACKS[id](response);
    }
    delete CALLBACKS[id];
  };

  window.httpRequest = (request: HttpRequestOptions, callback: HttpCallback): void => {
    const id = Math.random().toString().slice(2);
    CALLBACKS[id] = callback;
    PORT('httpRequest', { request: request, id: id });
  };
})();

// Complete object implementation
export const Complete: CompleteType = {
  locales: {
    uk: {
      tld: 'co.uk',
      requestUrl: ['google', 'youtube'],
      baseUrl: ['google', 'youtube'],
      apiUrl: ['google', 'youtube']
    },
    jp: {
      tld: 'co.jp',
      requestUrl: ['google', 'youtube'],
      baseUrl: ['google', 'youtube'],
      apiUrl: ['google', 'youtube']
    },
    aus: {
      tld: 'com.au',
      requestUrl: ['google', 'youtube'],
      baseUrl: ['google', 'youtube'],
      apiUrl: ['google', 'youtube']
    }
  },

  aliases: {
    g: 'google'
  },

  activeEngines: [],

  convertToLink(input: string, isURL?: boolean, isLink?: boolean): string {
    const processedInput = input.replace(/@%/g, document.URL).split(/\s+/);
    const compressedInput = Utils.compressArray(processedInput).slice(1);

    if (compressedInput.length === 0)
      return '';

    compressedInput[0] = this.getAlias(compressedInput[0]!) || compressedInput[0]!;
    if (!this.hasEngine(compressedInput[0]!)) {
      if (!isLink && (isURL || Utils.isValidURL(compressedInput.join(' ')))) {
        const joinedInput = compressedInput.join(' ');
        return (!/^[a-zA-Z\-]+:/.test(joinedInput) ? 'http://' : '') + joinedInput;
      }
      const defaultEngine = this.getEngine(settings.defaultengine);
      return (defaultEngine ? defaultEngine.requestUrl :
        this.getEngine('google')!.requestUrl) +
        encodeURIComponent(compressedInput.join(' '));
    }

    const engine = this.getEngine(compressedInput[0]!)!;
    if (compressedInput.length <= 1)
      return engine.baseUrl;

    const prefix = engine.requestUrl;
    const suffix = engine.hasOwnProperty('formatRequest') ?
      engine.formatRequest!(compressedInput.slice(1).join(' ')) :
      encodeURIComponent(compressedInput.slice(1).join(' '));

    if (Utils.isValidURL(suffix))
      return Utils.toSearchURL(suffix);
    return Utils.format(prefix, suffix);
  },

  setLocale(locale: string): void {
    if (!this.locales.hasOwnProperty(locale))
      return;
    const localeConfig = this.locales[locale]!;
    const self = this;
    ['baseUrl', 'apiUrl', 'requestUrl'].forEach((prop) => {
      const propValue = localeConfig[prop as keyof LocaleConfig];
      if (Array.isArray(propValue)) {
        propValue.forEach((engineName) => {
          const engine = self.getEngine(engineName);
          if (engine) {
            (engine as any)[prop] = (engine as any)[prop].replace(/\.com/, '.' + localeConfig.tld);
          }
        });
      }
    });
  },

  addEngine(name: string, props: string | EngineConfig): void {
    if (typeof props === 'string') {
      this.engines[name] = {
        baseUrl: '',
        requestUrl: props
      };
    } else {
      this.engines[name] = props;
    }
    if (!this.engineEnabled(name))
      this.activeEngines.push(name);
  },

  getEngine(name: string): EngineConfig | null {
    return this.engines[name] || null;
  },

  queryEngine(name: string, query: string, callback: HttpCallback): void {
    const engine = this.engines[name];
    if (!engine || !engine.hasOwnProperty('queryApi'))
      callback([]);
    else
      engine.queryApi!(query, callback);
  },

  getMatchingEngines(prefix: string): string[] {
    return this.activeEngines.filter((name) => {
      return name.indexOf(prefix) === 0;
    });
  },

  addAlias(alias: string, value: string): void {
    this.aliases[alias] = value;
  },

  hasAlias(alias: string): boolean {
    return this.aliases.hasOwnProperty(alias);
  },

  getAlias(alias: string): string | undefined {
    return this.aliases[alias];
  },

  hasEngine(name: string): boolean {
    return this.engines.hasOwnProperty(name);
  },

  enableEngine(name: string): void {
    if (this.hasEngine(name))
      this.activeEngines.push(name);
  },

  engineEnabled(name: string): boolean {
    return this.activeEngines.indexOf(name) !== -1;
  },

  engines: {
    google: {
      baseUrl: 'https://www.google.com',
      requestUrl: 'https://www.google.com/search?q=',
      apiUrl: 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: true
        }, (response: any) => {
          const data = response[1].map((e: string, i: number) => {
            return {
              type: response[4]['google:suggesttype'][i],
              text: e
            };
          });
          callback(data.sort((a: any) => {
            return a.type !== 'NAVIGATION';
          }).map((e: any) => e.text));
        });
      }
    },

    wikipedia: {
      baseUrl: 'https://en.wikipedia.org/wiki/Main_Page',
      requestUrl: 'https://en.wikipedia.org/w/index.php?search=%s&title=Special:Search',
      apiUrl: 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=%s',
      formatRequest(query: string): string {
        return encodeURIComponent(query).split('%20').join('+');
      },
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: true
        }, (response: any) => {
          callback(response[1]);
        });
      }
    },

    'google-maps': {
      baseUrl: 'https://www.google.com/maps/preview',
      requestUrl: 'https://www.google.com/maps/search/',
      apiUrl: 'https://www.google.com/s?tbm=map&fp=1&gs_ri=maps&source=hp&suggest=p&authuser=0&hl=en&pf=p&tch=1&ech=2&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: false
        }, (response: any) => {
          let data = JSON.parse(JSON.parse(JSON.stringify(response.replace(/\/\*[^\*]+\*\//g, '')))).d;
          data = data.replace(/^[^,]+,/, '')
            .replace(/\n\][^\]]+\][^\]]+$/, '')
            .replace(/,+/g, ',')
            .replace(/\n/g, '')
            .replace(/\[,/g, '[');
          data = JSON.parse(data);
          data = data.map((e: any) => {
            return e[0][0][0];
          });
          callback(data);
        });
      }
    },

    'google-image': {
      baseUrl: 'http://www.google.com/imghp',
      requestUrl: 'https://www.google.com/search?site=imghp&tbm=isch&source=hp&q=',
      apiUrl: 'http://www.google.com/complete/search?client=img&hl=en&gs_rn=43&gs_ri=img&ds=i&cp=1&gs_id=8&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: false
        }, (response: any) => {
          let data = JSON.parse(JSON.parse(JSON.stringify(response.replace(/\/\*[^\*]+\*\//g, '')))).d;
          data = data.replace(/^[^,]+,/, '')
            .replace(/\n\][^\]]+\][^\]]+$/, '')
            .replace(/,+/g, ',')
            .replace(/\n/g, '')
            .replace(/\[,/g, '[');
          data = JSON.parse(data);
          data = data.map((e: any) => {
            return e[0][0][0];
          });
          callback(data);
        });
      }
    },

    'google-trends': {
      baseUrl: 'http://www.google.com/trends/',
      requestUrl: 'http://www.google.com/trends/explore#q=',
      apiUrl: 'http://www.google.com/trends/entitiesQuery?tn=10&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.entityList.map((e: any) => {
            return [e.title + ' - ' + e.type, this.requestUrl + encodeURIComponent(e.mid)];
          }));
        });
      }
    },

    'google-finance': {
      baseUrl: 'https://www.google.com/finance',
      requestUrl: 'https://www.google.com/finance?q=',
      apiUrl: 'https://www.google.com/finance/match?matchtype=matchall&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.matches.map((e: any) => {
            return [e.t + ' - ' + e.n + ' - ' + e.e, this.requestUrl + e.e + ':' + e.t];
          }));
        });
      }
    },

    amazon: {
      baseUrl: 'http://www.amazon.com',
      requestUrl: 'http://www.amazon.com/s/?field-keywords=',
      apiUrl: 'https://completion.amazon.com/search/complete?method=completion&search-alias=aps&client=amazon-search-ui&mkt=1&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response[1]);
        });
      }
    },

    yahoo: {
      baseUrl: 'https://search.yahoo.com',
      requestUrl: 'https://search.yahoo.com/search?p=',
      apiUrl: 'https://search.yahoo.com/sugg/gossip/gossip-us-ura/?output=sd1&appid=search.yahoo.com&nresults=20&command=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          const _ret: string[] = [];
          for (const key in response.r) {
            if (response.r[key].hasOwnProperty('k')) {
              _ret.push(response.r[key].k);
            }
          }
          callback(_ret);
        });
      }
    },

    answers: {
      baseUrl: 'https://answers.yahoo.com',
      requestUrl: 'https://answers.yahoo.com/search/search_result?p=',
      apiUrl: 'https://search.yahoo.com/sugg/ss/gossip-us_ss-vertical_ss/?output=sd1&pubid=1307&appid=yanswer&command=%s&nresults=20',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.r.map((e: any) => {
            return [e.k, 'https://answers.yahoo.com/question/index?qid=' + e.d.replace(/^{qid:|,.*/g, '')];
          }));
        });
      }
    },

    bing: {
      baseUrl: 'https://www.bing.com',
      requestUrl: 'https://www.bing.com/search?q=',
      apiUrl: 'http://api.bing.com/osjson.aspx?query=%s',
      formatRequest(query: string): string {
        return encodeURIComponent(query) + '&FORM=SEEMOR';
      },
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: true
        }, (response: any) => {
          callback(response[1].map((e: string) => {
            return e;
          }));
        });
      }
    },

    ebay: {
      baseUrl: 'http://www.ebay.com',
      requestUrl: 'https://www.ebay.com/sch/i.html?_sacat=0&_from=R40&_nkw=',
      apiUrl: 'https://autosug.ebay.com/autosug?kwd=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: false
        }, (response: any) => {
          const _ret = JSON.parse(response.replace(/^[^\(]+\(|\)$/g, ''));
          if (!_ret.res) {
            return;
          }
          callback(_ret.res.sug.map((e: string) => {
            return e;
          }));
        });
      }
    },

    youtube: {
      baseUrl: 'https://www.youtube.com',
      requestUrl: 'https://www.youtube.com/results?search_query=',
      apiUrl: 'https://clients1.google.com/complete/search?client=youtube&hl=en&gl=us&gs_rn=23&gs_ri=youtube&ds=yt&cp=2&gs_id=d&q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, query),
          json: false
        }, (response: any) => {
          const _ret = JSON.parse(response.replace(/^[^\(]+\(|\)$/g, ''));
          callback(_ret[1].map((e: any) => {
            return e[0];
          }));
        });
      }
    },

    wolframalpha: {
      baseUrl: 'https://www.wolframalpha.com',
      requestUrl: 'https://www.wolframalpha.com/input/?i=',
      apiUrl: 'https://www.wolframalpha.com/input/autocomplete.jsp?qr=0&i=%s',
      formatRequest(query: string): string {
        return encodeURIComponent(query).split('%20').join('+');
      },
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.results.map((e: any) => {
            return e.input;
          }));
        });
      }
    },

    webster: {
      baseUrl: 'http://www.merriam-webster.com',
      requestUrl: 'http://www.merriam-webster.com/dictionary/',
      apiUrl: 'http://www.merriam-webster.com/autocomplete?query=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.suggestions.map((e: string) => {
            return e;
          }));
        });
      }
    },

    wiktionary: {
      baseUrl: 'https://en.wiktionary.org/wiki/Wiktionary:Main_Page',
      requestUrl: 'http://en.wiktionary.org/wiki/',
      apiUrl: 'http://en.wiktionary.org/w/api.php?action=opensearch&limit=15&format=json&search=%s',
      formatRequest(query: string): string {
        return encodeURIComponent(query).split('%20').join('_');
      },
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response[1].map((e: string) => {
            return e;
          }));
        });
      }
    },

    duckduckgo: {
      baseUrl: 'https://duckduckgo.com',
      requestUrl: 'https://duckduckgo.com/?q=',
      apiUrl: 'https://duckduckgo.com/ac/?q=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          const phrases = response.map((e: any) => e.phrase);
          callback(Utils.compressArray(phrases));
        });
      }
    },

    urbandictionary: {
      baseUrl: 'http://www.urbandictionary.com',
      requestUrl: 'http://www.urbandictionary.com/define.php?term=',
      apiUrl: 'http://api.urbandictionary.com/v0/autocomplete?term=%s',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true
        }, (response: any) => {
          callback(response.slice(1).map((e: string) => {
            return e;
          }));
        });
      }
    },

    imdb: {
      baseUrl: 'http://www.imdb.com',
      requestUrl: 'http://www.imdb.com/find?s=all&q=',
      apiUrl: 'http://sg.media-imdb.com/suggests/',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: this.apiUrl! + query[0] + '/' + query.replace(/ /g, '_') + '.json',
          json: false
        }, (response: any) => {
          const _ret = JSON.parse(response.replace(/^[^\(]+\(|\)$/g, ''));
          callback(_ret.d.map((e: any) => {
            if (/:\/\//.test(e.id)) {
              return [e.l, e.id];
            }
            const _url = 'http://www.imdb.com/' + (e.id.indexOf('nm') === 0 ? 'name' : 'title') + '/' + e.id;
            if (e.q) {
              return [e.l + ' - ' + e.q + ', ' + e.s + ' (' + e.y + ')', _url];
            }
            return [e.l + ' - ' + e.s, _url];
          }));
        });
      }
    },

    themoviedb: {
      baseUrl: 'https://www.themoviedb.org',
      requestUrl: 'https://www.themoviedb.org/search?query=',
      apiUrl: 'https://www.themoviedb.org/search/remote/multi?query=%s&language=en',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
          json: true,
        }, (response: any) => {
          callback(response.map((e: any) => {
            const prettyType = (() => {
              switch (e.media_type) {
                case 'tv': return 'TV Series';
                case 'movie': return 'Movie';
                default: return e.media_type;
              }
            })();
            let title = e.name + ' - ' + prettyType;
            if (e.media_type === 'movie' || e.media_type === 'tv') {
              let year: string;
              const date = e.first_air_date || e.release_date;
              if (typeof date === 'string' && (year = date.replace(/-.*/, '')))
                title += ' (' + year + ')';
            }
            return [title, this.baseUrl + '/' + e.media_type + '/' + e.id];
          }));
        });
      }
    },

    baidu: {
      baseUrl: 'https://www.baidu.com/',
      requestUrl: 'https://www.baidu.com/s?wd=',
      apiUrl: 'http://suggestion.baidu.com/su?json=1&cb=&wd=',
      queryApi(query: string, callback: HttpCallback): void {
        window.httpRequest({
          url: Utils.format(this.apiUrl!, encodeURIComponent(query)),
        }, (response: any) => {
          const parsedResponse = JSON.parse(response.slice(1, -2));
          callback(parsedResponse.s);
        });
      }
    }
  }
};
