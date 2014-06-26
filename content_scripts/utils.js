var log = console.log.bind(console);

var cVimError = function(message) {
  log(message);
};

var httpRequest = function(request) {
  return new Promise(function(acc, rej) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', request.url);
    xhr.addEventListener('load', function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        acc(request.json ? JSON.parse(xhr.responseText) : xhr.responseText);
      }
    });
    xhr.addEventListener('error', function() {
      rej(Error('cVim Error: Unable to resolve ' + request.url));
    });
    xhr.send();
  });
};

function isValidB64(a) {
  try {
    window.atob(a);
  } catch(e) {
    return false;
  }
  return true;
}

function reverseImagePost(url) {
  return '<html><head><title>cVim reverse image search</title></head><body><form id="f" method="POST" action="https://www.google.com/searchbyimage/upload" enctype="multipart/form-data"><input type="hidden" name="image_content" value="' + url.substring(url.indexOf(',') + 1).replace(/\+/g, '-').replace(/\//g, '_').replace(/\./g, '=') + '"><input type="hidden" name="filename" value=""><input type="hidden" name="image_url" value=""><input type="hidden" name="sbisrc" value=""></form><script>document.getElementById("f").submit();\x3c/script></body></html>';
}

// Based off of the 'Search by Image' Chrome Extension by Google
function googleReverseImage(url, source) {
  if (void 0 !== url && url.indexOf('data:') === 0) {
    if (url.search(/data:image\/(bmp|gif|jpe?g|png|webp|tiff|x-ico)/i) === 0) {
      var commaIndex = url.indexOf(',');
      if (commaIndex !== -1 && isValidB64(url.substring(commaIndex + 1))) {
        return 'data:text/html;charset=utf-8;base64,' + window.btoa(reverseImagePost(url, source));
      }
    }
  } else {
    if (url.indexOf('file://') === 0 || url.indexOf('chrome') === 0) {
      chrome.runtime.sendMessage({action: 'urlToBase64', url: url});
      return;
    }
    return 'https://www.google.com/searchbyimage?image_url=' + url;
  }
}

HTMLElement.prototype.isInput = function() {
  return (
      (this.localName === 'textarea' || this.localName === 'input' || this.getAttribute('contenteditable') === 'true') && !this.disabled &&
      !/button|radio|file|image|checkbox|submit/i.test(this.getAttribute('type'))
  );
};

function getVisibleBoundingRect(node) {
  var computedStyle = getComputedStyle(node);
  if (computedStyle.opacity === '0' || computedStyle.visibility !== 'visible' || computedStyle.display === 'none' || node.hasAttribute('disabled')) {
    return false;
  }
  var boundingRect = node.getClientRects()[0] || node.getBoundingClientRect();
  if (boundingRect.top > window.innerHeight || boundingRect.left > window.innerWidth) {
    return false;
  }
  if (boundingRect.width === 0 || boundingRect.height === 0) {
    var children = node.children;
    var visibleChildNode = false;
    for (var i = 0, l = children.length; i < l; ++i) {
      boundingRect = children[i].getClientRects()[0] || children[i].getBoundingClientRect();
      if (boundingRect.width > 1 && boundingRect.height > 1) {
        visibleChildNode = true;
        break;
      }
    }
    if (visibleChildNode === false) {
      return false;
    }
  }
  if (boundingRect.top + boundingRect.height < 10 || boundingRect.left + boundingRect.width < -10) {
    return false;
  }
  return boundingRect;
}

HTMLCollection.prototype.toArray = function() {
  var nodes = [];
  for (var i = 0, l = this.length; i < l; ++i) {
    nodes.push(this[i]);
  }
  return nodes;
};

HTMLElement.prototype.isVisible = function() {
  return this.offsetParent && !this.disabled &&
         this.getAttribute('type') !== 'hidden' &&
         getComputedStyle(this).visibility !== 'hidden' &&
         this.getAttribute('display') !== 'none';
};

function isVisible(el) {
  return el.offsetParent && !el.disabled &&
         el.getAttribute('type') !== 'hidden' &&
         getComputedStyle(el).visibility !== 'hidden' &&
         el.getAttribute('display') !== 'none';
}

Array.prototype.unique = function() {
  var a = [];
  for (var i = 0, l = this.length; i < l; ++i) {
    if (a.indexOf(this[i]) === -1) {
      a.push(this[i]);
    }
  }
  return a;
};

String.prototype.trimAround = function() {
  return this.replace(/^(\s+)?(.*\S)?(\s+)?$/g, '$2');
};

String.prototype.escape = function() {
  return this.replace(/&/g, '&amp;')
             .replace(/'/g, '&quot;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
};

String.prototype.isBoolean = function() {
  return /^(true|false|0|1)$/i.test(this);
};

Number.prototype.mod = function(n) {
  return ((this % n) + n) % n;
};

Object.clone = function(obj) {
  var old = history.state;
  history.replaceState(obj);
  var clone = history.state;
  history.replaceState(old);
  return clone;
};

function sameType(a, b) {
  return a.constructor === b.constructor;
}

function simulateMouseEvents(element, events) {
  for (var i = 0; i < events.length; ++i) {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent(events[i], true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    element.dispatchEvent(ev);
  }
}

HTMLElement.prototype.hover = function() {
  simulateMouseEvents(this, ['mouseover', 'mouseenter']);
};

HTMLElement.prototype.unhover = function() {
  simulateMouseEvents(this, ['mouseout', 'mouseleave']);
};

HTMLElement.prototype.simulateClick = function() {
  simulateMouseEvents(this, ['mouseover', 'mousedown', 'mouseup', 'click']);
};

String.prototype.rxp = function() {
  return new RegExp(this, Array.prototype.slice.call(arguments));
};

String.prototype.convertLink = function() {
  var url = this.trimAround();
  if (url.length === 0) {
    return 'chrome://newtab';
  }
  if (/^\//.test(url)) {
    url = 'file://' + url;
  }
  if (/^(chrome|chrome-extension|file):\/\/\S+$/.test(url)) {
    return url;
  }
  var pattern = new RegExp('^((https?|ftp):\\/\\/)?'+
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
    '((\\d{1,3}\\.){3}\\d{1,3})|'+
    'localhost)' +
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
    '(\\?[;&a-z\\d%_.~+=-]*)?'+
    '(\\#[-a-z\\d_]*)?$','i');
  if (pattern.test(url)) {
    return (/:\/\//.test(url) ? '' : 'http://') + url;
  }
  return 'https://www.google.com/search?q=' + url;
};

function matchLocation(url, pattern) { // Uses @match syntax
  // See https://code.google.com/p/chromium/codesearch#chromium/src/extensions/common/url_pattern.h&sq=package:chromium
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return false;
  }
  var protocol = (pattern.match(/.*:\/\//) || [''])[0].slice(0, -2),
      hostname, path, pathMatch, hostMatch;
  url = new URL(url);
  if (/\*\*/.test(pattern)) {
    console.error('cVim Error: Invalid pattern: "%s"', pattern);
    return false;
  }
  if (!protocol.length) {
    console.error('cVim Error: Invalid protocol in pattern: "%s"', pattern);
    return false;
  }
  pattern = pattern.replace(/.*:\/\//, '');
  if (protocol !== '*:' && url.protocol !== protocol) {
    return false;
  }
  if (url.protocol !== 'file:') {
    hostname = pattern.match(/^[^\/]+\//g);
    if (!hostname) {
      console.error('cVim Error: Invalid host in pattern: "%s"', pattern);
      return false;
    }
    var origHostname = hostname;
    hostname = hostname[0].slice(0, -1).replace(/([.])/g, '\\$1').replace(/\*/g, '.*');
    hostMatch = url.hostname.match(new RegExp(hostname, 'i'));
    if (!hostMatch || hostMatch[0].length !== url.hostname.length) {
      return false;
    }
    pattern = '/' + pattern.slice(origHostname[0].length);
  }
  if (pattern.length) {
    path = pattern.replace(/([.&\\\/\(\)\[\]!?])/g, '\\$1').replace(/\*/g, '.*');
    pathMatch = url.pathname.match(new RegExp(path));
    if (!pathMatch || pathMatch[0].length !== url.pathname.length) {
      return false;
    }
  }
  return true;
}

function waitForLoad(callback, constructor) {
  if ((document.readyState === 'interactive' || document.readyState === 'complete') && document.activeElement) {
    return callback.call(constructor);
  }
  window.setTimeout(function() {
    waitForLoad(callback, constructor);
  }, 5);
}

Object.extend = function() {
  var _ret = {};
  for (var i = 0, l = arguments.length; i < l; ++i) {
    for (var key in arguments[i]) {
      _ret[key] = arguments[i][key];
    }
  }
  return _ret;
};

Array.prototype.compress = function() {
  return this.filter(function(e) {
    return e;
  });
};

Array.prototype.last = function() {
  return this[this.length - 1];
};

function decodeHTMLEntities(string) {
  var el = document.createElement('div');
  el.innerHTML = string;
  return el.textContent;
}
