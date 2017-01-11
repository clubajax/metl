require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"dom":[function(require,module,exports){
/* UMD.define */ (function (root, factory) {
    if (typeof customLoader === 'function'){ customLoader(factory, 'dom'); }else if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof exports === 'object') { module.exports = factory(); } else { root.returnExports = factory(); window.dom = factory(); }
}(this, function () {
    //  convenience library for common DOM methods
    //      dom()
    //          create dom nodes
    //      dom.style()
    //          set/get node style
    //      dom.attr()
    //          set/get attributes
    //      dom.destroy()
    //          obliterates a node
    //      dom.box()
    //          get node dimensions
    //      dom.uid()
    //          get a unique ID (not dom specific)
    //
    var
        isFloat = {
            opacity: 1,
            zIndex: 1,
            'z-index': 1
        },
        isDimension = {
            width:1,
            height:1,
            top:1,
            left:1,
            right:1,
            bottom:1,
            maxWidth:1,
            'max-width':1,
            minWidth:1,
            'min-width':1,
            maxHeight:1,
            'max-height':1
        },
        uids = {},
        destroyer = document.createElement('div');

    function uid (type){
        if(!uids[type]){
            uids[type] = [];
        }
        var id = type + '-' + (uids[type].length + 1);
        uids[type].push(id);
        return id;
    }

    function isNode (item){
        // safer test for custom elements in FF (with wc shim)
        return !!item && typeof item === 'object' && typeof item.innerHTML === 'string';
    }

    function getNode (item){

        if(!item){ return item; }
        if(typeof item === 'string'){
            return document.getElementById(item);
        }
        // de-jqueryify
        return item.get ? item.get(0) :
            // item is a dom node
            item;
    }

    function byId (id){
        return getNode(id);
    }

    function style (node, prop, value){
        // get/set node style(s)
        //      prop: string or object
        //
        var key, computed;
        if(typeof prop === 'object'){
            // object setter
            for(key in prop){
                if(prop.hasOwnProperty(key)){
                    style(node, key, prop[key]);
                }
            }
            return null;
        }else if(value !== undefined){
            // property setter
            if(typeof value === 'number' && isDimension[prop]){
                value += 'px';
            }
            node.style[prop] = value;

            if(prop === 'userSelect'){
                value = !!value ? 'text' : 'none';
                style(node, {
                    webkitTouchCallout: value,
                    webkitUserSelect: value,
                    khtmlUserSelect: value,
                    mozUserSelect: value,
                    msUserSelect: value
                });
            }
        }

        // getter, if a simple style
        if(node.style[prop]){
            if(isDimension[prop]){
                return parseInt(node.style[prop], 10);
            }
            if(isFloat[prop]){
                return parseFloat(node.style[prop]);
            }
            return node.style[prop];
        }

        // getter, computed
        computed = getComputedStyle(node, prop);
        if(computed[prop]){
            if(/\d/.test(computed[prop])){
                if(!isNaN(parseInt(computed[prop], 10))){
                    return parseInt(computed[prop], 10);
                }
                return computed[prop];
            }
            return computed[prop];
        }
        return '';
    }

    function attr (node, prop, value){
        // get/set node attribute(s)
        //      prop: string or object
        //
        var key;
        if(typeof prop === 'object'){
            for(key in prop){
                if(prop.hasOwnProperty(key)){
                    attr(node, key, prop[key]);
                }
            }
            return null;
        }
        else if(value !== undefined){
            if(prop === 'text' || prop === 'html' || prop === 'innerHTML'){
                node.innerHTML = value;
            }else{
                node.setAttribute(prop, value);
            }
        }

        return node.getAttribute(prop);
    }

    function box (node){
        if(node === window){
            node = document.documentElement;
        }
        // node dimensions
        // returned object is immutable
        // add scroll positioning and convenience abbreviations
        var
            dimensions = getNode(node).getBoundingClientRect();
        return {
            top: dimensions.top,
            right: dimensions.right,
            bottom: dimensions.bottom,
            left: dimensions.left,
            height: dimensions.height,
            h: dimensions.height,
            width: dimensions.width,
            w: dimensions.width,
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            x: dimensions.left + window.pageXOffset,
            y: dimensions.top + window.pageYOffset
        };
    }

    function query (node, selector){
        if(!selector){
            selector = node;
            node = document;
        }
        return node.querySelector(selector);
    }
    
    function queryAll (node, selector){
        if(!selector){
            selector = node;
            node = document;
        }
        var nodes = node.querySelectorAll(selector);

        if(!nodes.length){ return []; }

        // convert to Array and return it
        return Array.prototype.slice.call(nodes);
    }

    function toDom (html, options, parent){
        // create a node from an HTML string
        var node = dom('div', {html: html});
        parent = byId(parent || options);
        if(parent){
            while(node.firstChild){
                parent.appendChild(node.firstChild);
            }
            return node.firstChild;
        }
        if(html.indexOf('<') !== 0){
            return node;
        }
        return node.firstChild;
    }

    function fromDom (node) {
        function getAttrs (node) {
            var att, i, attrs = {};
            for(i = 0; i < node.attributes.length; i++){
                att = node.attributes[i];
                attrs[att.localName] = normalize(att.value === '' ? true : att.value);
            }
            return attrs;
        }
        function getText (node) {
            var i, t, text = '';
            for(i = 0; i < node.childNodes.length; i++){
                t = node.childNodes[i];
                if(t.nodeType === 3 && t.textContent.trim()){
                    text += t.textContent.trim();
                }
            }
            return text;
        }
        var i, object = getAttrs(node);
        object.text = getText(node);
        object.children = [];
        if(node.children.length){
            for(i = 0; i < node.children.length; i++){
                object.children.push(fromDom(node.children[i]));
            }
        }
        return object;
    }

    function addChildren (node, children) {
        if(Array.isArray(children)){
            for(var i = 0; i < children.length; i++){
                node.appendChild(children[i]);
            }
        }
        else{
            node.appendChild(children);
        }
    }

    function addContent (node, options) {
        var html;
        if(options.html !== undefined || options.innerHTML !== undefined){
            html = options.html || options.innerHTML || '';
            if(typeof html === 'object'){
                addChildren(node, html);
            }else{
                node.innerHTML = html;
            }

            // misses some HTML, such as entities (&npsp;)
            //else if(html.indexOf('<') === 0) {
            //    node.innerHTML = html;
            //}
            //else{
            //    node.appendChild(document.createTextNode(html));
            //}
        }
        if(options.text){
            node.appendChild(document.createTextNode(options.text));
        }
        if(options.children){
            addChildren(node, options.children);
        }
    }
    
    function dom (nodeType, options, parent, prepend){
        // create a node
        // if first argument is a string and starts with <, it is assumed
        // to use toDom, and creates a node from HTML. Optional second arg is
        // parent to append to
        // else:
        //      nodeType: string, type of node to create
        //      options: object with style, className, or attr properties
        //          (can also be objects)
        //      parent: Node, optional node to append to
        //      prepend: truthy, to append node as the first child
        //
        if(nodeType.indexOf('<') === 0){
            return toDom(nodeType, options, parent);
        }

        options = options || {};
        var
            className = options.css || options.className || options.class,
            node = document.createElement(nodeType);

        parent = getNode(parent);

        if(className){
            node.className = className;
        }
        
        addContent(node, options);
        
        if(options.cssText){
            node.style.cssText = options.cssText;
        }

        if(options.id){
            node.id = options.id;
        }

        if(options.style){
            style(node, options.style);
        }

        if(options.attr){
            attr(node, options.attr);
        }

        if(parent && isNode(parent)){
            if(prepend && parent.hasChildNodes()){
                parent.insertBefore(node, parent.children[0]);
            }else{
                parent.appendChild(node);
            }
        }

        return node;
    }

    function getNextSibling (node) {
        var sibling = node;
        while(sibling){
            sibling = sibling.nextSibling;
            if(sibling && sibling.nodeType === 1){
                return sibling;
            }
        }
        return null;
    }

    function insertAfter (refNode, node) {
        var sibling = getNextSibling(refNode);
        if(!sibling){
            refNode.parentNode.appendChild(node);
        }else{
            refNode.parentNode.insertBefore(node, sibling);
        }
        return sibling;
    }

    function destroy (node){
        // destroys a node completely
        //
        if(node) {
            destroyer.appendChild(node);
            destroyer.innerHTML = '';
        }
    }

    function clean (node, dispose){
        //	Removes all child nodes
        //		dispose: destroy child nodes
        if(dispose){
            while(node.children.length){
                destroy(node.children[0]);
            }
            return;
        }
        while(node.children.length){
            node.removeChild(node.children[0]);
        }
    }

    function ancestor (node, selector){
        // TODO: replace this with 'closest' and 'matches'
        // gets the ancestor of node based on selector criteria
        // useful for getting the target node when a child node is clicked upon
        //
        // USAGE
        //      on.selector(childNode, '.app.active');
        //      on.selector(childNode, '#thinger');
        //      on.selector(childNode, 'div');
        //	DOES NOT SUPPORT:
        //		combinations of above
        var
            test,
            parent = node;

        if(selector.indexOf('.') === 0){
            // className
            selector = selector.replace('.', ' ').trim();
            test = function(n){
                return n.classList.contains(selector);
            };
        }
        else if(selector.indexOf('#') === 0){
            // node id
            selector = selector.replace('#', '').trim();
            test = function(n){
                return n.id === selector;
            };
        }
        else if(selector.indexOf('[') > -1){
            // attribute
            console.error('attribute selectors are not yet supported');
        }
        else{
            // assuming node name
            selector = selector.toUpperCase();
            test = function(n){
                return n.nodeName === selector;
            };
        }

        while(parent){
            if(parent === document.body || parent === document){ return false; }
            if(test(parent)){ break; }
            parent = parent.parentNode;
        }

        return parent;
    }

    dom.classList = {
        remove: function (node, names){
            toArray(names).forEach(function(name){
                node.classList.remove(name);
            });
        },
        add: function (node, names){
            toArray(names).forEach(function(name){
                node.classList.add(name);
            });
        },
        contains: function (node, names){
            return toArray(names).every(function (name) {
                return node.classList.contains(name);
            });
        },
        toggle: function (node, names, value){
            names = toArray(names);
            if(typeof value === 'undefined') {
                // use standard functionality, supported by IE
                names.forEach(function (name) {
                    node.classList.toggle(name, value);
                });
            }
            // IE11 does not support the second parameter  
            else if(value){
                names.forEach(function (name) {
                    node.classList.add(name);
                });
            }
            else{
                names.forEach(function (name) {
                    node.classList.remove(name);
                });
            }
        }
    };

    function toArray (names){
        if(!names){
            console.error('dom.classList should include a node and a className');
            return [];
        }
        return names.split(' ').map(function (name) {
            return name.trim();
        });
    }

    if (!window.requestAnimationFrame) {
        dom.requestAnimationFrame = function(callback){
            setTimeout(callback, 0);
        };
    }else{
        dom.requestAnimationFrame = function(cb){
            window.requestAnimationFrame(cb);
        };
    }
    
    function normalize (val){
        if(val === 'false'){
            return false;
        }else if(val === 'true'){
            return true;
        }
        if(!isNaN(parseFloat(val))){
            return parseFloat(val);
        }
        return val;
    }

    dom.normalize = normalize;
    dom.clean = clean;
    dom.query = query;
    dom.queryAll = queryAll;
    dom.byId = byId;
    dom.attr = attr;
    dom.box = box;
    dom.style = style;
    dom.destroy = destroy;
    dom.uid = uid;
    dom.isNode = isNode;
    dom.ancestor = ancestor;
    dom.toDom = toDom;
    dom.fromDom = fromDom;
    dom.insertAfter = insertAfter;
    dom.getNextSibling = getNextSibling;

    return dom;
}));

},{}],"key-nav":[function(require,module,exports){
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['on'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('on'));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
        root['keys'] = factory(root.on);
    }
}(this, function (on) {
        
        'use strict';

        function keys (listNode, options) {

            options = options || {};

            // TODO options:
            // search an option?
            // space select an option?
            // add aria
            // handle cell navigation

            var
                controller = {
                    setSelected: function (node) {
                        highlight(select(node));
                        on.fire(listNode, 'key-select', {value: selected});
                    },
                    getSelected: function () {
                        return selected;
                    },
                    destroy: function () {
                        select();
                        highlight();
                        this.handles.forEach(function (h) { h.remove(); });
                        if(observer) {
                            observer.disconnect();
                        }
                    }
                },
                shift = false,
                meta = false,
                observer,
                searchString = '',
                searchStringTimer,
                searchStringTime = options.searchTime || 1000,
                // children is a live NodeList, so the reference will update if nodes are added or removed
                children = listNode.children,
                selected = select(getSelected(children)),
                highlighted = highlight(fromArray(selected)),
                nodeType = (highlighted || children[0]).localName;

            function highlight (node) {
                node = fromArray(node);
                if(highlighted){
                    highlighted.removeAttribute('highlighted');
                }
                if(node) {
                    highlighted = node;
                    highlighted.setAttribute('highlighted', 'true');
                }
                return highlighted;
            }

            function select (node) {
                if(options.multiple){
                    if(selected){
                        if(!shift && !meta) {
                            selected.forEach(function (sel) {
                                sel.removeAttribute('selected');
                            });

                            if (node) {
                                selected = [node];
                                node.setAttribute('selected', 'true');
                            }
                        }
                        else if(shift && node){
                            selected = findShiftNodes(children, selected, node);
                        }
                        else if(meta && node){

                            if(!selected){
                                selected = [node];
                            }else{
                                selected.push(node);
                            }
                            node.setAttribute('selected', 'true');
                        }
                    }else{
                        selected = [node];
                    }

                }else{
                    if(selected){
                        selected.removeAttribute('selected');
                    }
                    if(node) {
                        selected = node;
                        selected.setAttribute('selected', 'true');
                    }
                }
                return selected;
            }

            on.fire(listNode, 'key-highlight', {value: highlighted});
            on.fire(listNode, 'key-select', {value: highlighted});

            controller.handles = [
                on(listNode, 'mouseover', nodeType, function (e, node) {
                    highlight(node);
                    on.fire(listNode, 'key-highlight', {value: highlighted});
                }),
                on(listNode, 'mouseout', function (e) {
                    highlight(null);
                    on.fire(listNode, 'key-highlight', {value: null});
                }),
                on(listNode, 'blur', function (e) {
                    highlight(null);
                    on.fire(listNode, 'key-highlight', {value: null});
                }),
                on(listNode, 'click', nodeType, function (e, node) {
                    highlight(node);
                    select(node);
                    on.fire(listNode, 'key-select', {value: selected});
                }),
                on(document, 'keyup', function (e) {
                    if (e.defaultPrevented) { return; }
                    shift = false;
                    meta = false;
                }),
                on(document, 'keydown', function (e) {
                    if (e.defaultPrevented) { return; }
                    switch (e.key) {
                        case 'Meta':
                        case 'Control':
                        case 'Command':
                            meta = true;
                            break;
                        case 'Shift':
                            shift = true;
                            break;
                    }
                }),
                on(listNode, 'keydown', function (e) {
                    if (e.defaultPrevented) { return; }

                    switch (e.key) {
                        case 'Enter':
                            select(highlighted);
                            on.fire(listNode, 'key-select', {value: selected});
                            break;
                        case 'Escape':
                            // consult options?
                            select(null);
                            break;
                        case 'ArrowRight':
                        case 'ArrowDown':
                            highlight(getNode(children, highlighted || selected, 'down'));
                            on.fire(listNode, 'key-highlight', {value: highlighted});
                            break;
                        case 'ArrowLeft':
                        case 'ArrowUp':
                            highlight(getNode(children, highlighted || selected, 'up'));
                            on.fire(listNode, 'key-highlight', {value: highlighted});
                            break;
                        default:
                            console.log('key', e.key);
                            // the event is not handled
                            if(on.isAlphaNumeric(e.key)){
                                searchString += e.key;
                                var searchNode = searchHtmlContent(children, searchString);
                                if(searchNode){
                                    highlight(select(searchNode));
                                }
                                break;
                            }
                            return;
                    }

                    clearTimeout(searchStringTimer);
                    searchStringTimer = setTimeout(function () {
                        searchString = '';
                    }, searchStringTime);
                    e.preventDefault();
                    return false;
                })
            ];

            if(options.roles){
                addRoles(listNode);
                if(typeof MutationObserver !== 'undefined') {
                    observer = new MutationObserver(function (mutations) {
                        mutations.forEach(function (event) {
                            if(event.addedNodes.length){
                                addRoles(listNode);
                            }
                        });
                    });
                    observer.observe(listNode, {childList: true});
                }
            }

            return controller;
        }

        function isSelected(node){
            if(!node){
                return false;
            }
            return node.selected || node.getAttribute('selected');
        }

        function getSelected(children){
            for(var i = 0; i < children.length; i++){
                if(isSelected(children[i])){
                    return children[i];
                }
            }
            return children[0];
        }

        function getNext(children, index){
            var
                norecurse = children.length + 2,
                node = children[index];
            while(node){
                index++;
                if(index > children.length - 1){
                    index = -1;
                }else if(children[index] && !children[index].parentNode.disabled){
                    node = children[index];
                    break;
                }
                if(norecurse-- < 0){
                    console.log('RECURSE');
                    break;
                }
            }
            return node;
        }

        function getPrev(children, index){
            var
                norecurse = children.length + 2,
                node = children[index];
            while(node){
                index--;
                if(index < 0){
                    index = children.length;
                }else if(children[index] && !children[index].parentNode.disabled){
                    node = children[index];
                    break;
                }
                if(norecurse-- < 0){
                    console.log('RECURSE');
                    break;
                }
            }
            return node;
        }

        function getNode(children, highlighted, dir){
            var i;
            for(i = 0; i < children.length; i++){
                if(children[i] === highlighted){
                    break;
                }
            }
            if(dir === 'down'){
                return getNext(children, i);
            }else if(dir === 'up'){
                return getPrev(children, i);
            }
        }

        function searchHtmlContent (children, str) {
            for(var i = 0; i < children.length; i++){
                if(children[i].innerHTML.indexOf(str) === 0){
                    return children[i];
                }
            }
            return null;
        }

        function findShiftNodes (children, selected, node) {
            var i, a, b, c, lastNode = selected[selected.length-1], newIndex, lastIndex, selection = [];
            selected.forEach(function (sel) {
                sel.removeAttribute('selected');
            });
            for(i = 0; i < children.length; i++){
                c = children[i];
                if(c === node){
                    newIndex = i;
                }else if(c === lastNode ){
                    lastIndex = i;
                }
            }
            if(newIndex < lastIndex){
                a = newIndex;
                b = lastIndex;
            }else{
                b = newIndex;
                a = lastIndex;
            }

            while (a <= b) {
                children[a].setAttribute('selected', '');
                selection.push(children[a]);
                a++;
            }
            return selection;
        }

        function addRoles(node){
            // https://www.w3.org/TR/wai-aria/roles#listbox
            for(var i = 0; i < node.children.length; i++){
                node.children[i].setAttribute('role', 'listitem');
            }
            node.setAttribute('role', 'listbox');
        }

        function fromArray (thing) {
            return Array.isArray(thing) ? thing[0] : thing;
        }

    return keys;

}));
},{"on":"on"}],"keyboardevent-key-polyfill":[function(require,module,exports){
/* global define, KeyboardEvent, module */

(function () {

  var keyboardeventKeyPolyfill = {
    polyfill: polyfill,
    keys: {
      3: 'Cancel',
      6: 'Help',
      8: 'Backspace',
      9: 'Tab',
      12: 'Clear',
      13: 'Enter',
      16: 'Shift',
      17: 'Control',
      18: 'Alt',
      19: 'Pause',
      20: 'CapsLock',
      27: 'Escape',
      28: 'Convert',
      29: 'NonConvert',
      30: 'Accept',
      31: 'ModeChange',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      41: 'Select',
      42: 'Print',
      43: 'Execute',
      44: 'PrintScreen',
      45: 'Insert',
      46: 'Delete',
      48: ['0', ')'],
      49: ['1', '!'],
      50: ['2', '@'],
      51: ['3', '#'],
      52: ['4', '$'],
      53: ['5', '%'],
      54: ['6', '^'],
      55: ['7', '&'],
      56: ['8', '*'],
      57: ['9', '('],
      91: 'OS',
      93: 'ContextMenu',
      144: 'NumLock',
      145: 'ScrollLock',
      181: 'VolumeMute',
      182: 'VolumeDown',
      183: 'VolumeUp',
      186: [';', ':'],
      187: ['=', '+'],
      188: [',', '<'],
      189: ['-', '_'],
      190: ['.', '>'],
      191: ['/', '?'],
      192: ['`', '~'],
      219: ['[', '{'],
      220: ['\\', '|'],
      221: [']', '}'],
      222: ["'", '"'],
      224: 'Meta',
      225: 'AltGraph',
      246: 'Attn',
      247: 'CrSel',
      248: 'ExSel',
      249: 'EraseEof',
      250: 'Play',
      251: 'ZoomOut'
    }
  };

  // Function keys (F1-24).
  var i;
  for (i = 1; i < 25; i++) {
    keyboardeventKeyPolyfill.keys[111 + i] = 'F' + i;
  }

  // Printable ASCII characters.
  var letter = '';
  for (i = 65; i < 91; i++) {
    letter = String.fromCharCode(i);
    keyboardeventKeyPolyfill.keys[i] = [letter.toLowerCase(), letter.toUpperCase()];
  }

  function polyfill () {
    if (!('KeyboardEvent' in window) ||
        'key' in KeyboardEvent.prototype) {
      return false;
    }

    // Polyfill `key` on `KeyboardEvent`.
    var proto = {
      get: function (x) {
        var key = keyboardeventKeyPolyfill.keys[this.which || this.keyCode];

        if (Array.isArray(key)) {
          key = key[+this.shiftKey];
        }

        return key;
      }
    };
    Object.defineProperty(KeyboardEvent.prototype, 'key', proto);
    return proto;
  }

  if (typeof define === 'function' && define.amd) {
    define('keyboardevent-key-polyfill', keyboardeventKeyPolyfill);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = keyboardeventKeyPolyfill;
  } else if (window) {
    window.keyboardeventKeyPolyfill = keyboardeventKeyPolyfill;
  }

})();

},{}],"on":[function(require,module,exports){
/* global define, KeyboardEvent, module */

(function () {

  var keyboardeventKeyPolyfill = {
    polyfill: polyfill,
    keys: {
      3: 'Cancel',
      6: 'Help',
      8: 'Backspace',
      9: 'Tab',
      12: 'Clear',
      13: 'Enter',
      16: 'Shift',
      17: 'Control',
      18: 'Alt',
      19: 'Pause',
      20: 'CapsLock',
      27: 'Escape',
      28: 'Convert',
      29: 'NonConvert',
      30: 'Accept',
      31: 'ModeChange',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      41: 'Select',
      42: 'Print',
      43: 'Execute',
      44: 'PrintScreen',
      45: 'Insert',
      46: 'Delete',
      48: ['0', ')'],
      49: ['1', '!'],
      50: ['2', '@'],
      51: ['3', '#'],
      52: ['4', '$'],
      53: ['5', '%'],
      54: ['6', '^'],
      55: ['7', '&'],
      56: ['8', '*'],
      57: ['9', '('],
      91: 'OS',
      93: 'ContextMenu',
      144: 'NumLock',
      145: 'ScrollLock',
      181: 'VolumeMute',
      182: 'VolumeDown',
      183: 'VolumeUp',
      186: [';', ':'],
      187: ['=', '+'],
      188: [',', '<'],
      189: ['-', '_'],
      190: ['.', '>'],
      191: ['/', '?'],
      192: ['`', '~'],
      219: ['[', '{'],
      220: ['\\', '|'],
      221: [']', '}'],
      222: ["'", '"'],
      224: 'Meta',
      225: 'AltGraph',
      246: 'Attn',
      247: 'CrSel',
      248: 'ExSel',
      249: 'EraseEof',
      250: 'Play',
      251: 'ZoomOut'
    }
  };

  // Function keys (F1-24).
  var i;
  for (i = 1; i < 25; i++) {
    keyboardeventKeyPolyfill.keys[111 + i] = 'F' + i;
  }

  // Printable ASCII characters.
  var letter = '';
  for (i = 65; i < 91; i++) {
    letter = String.fromCharCode(i);
    keyboardeventKeyPolyfill.keys[i] = [letter.toLowerCase(), letter.toUpperCase()];
  }

  function polyfill () {
    if (!('KeyboardEvent' in window) ||
        'key' in KeyboardEvent.prototype) {
      return false;
    }

    // Polyfill `key` on `KeyboardEvent`.
    var proto = {
      get: function (x) {
        var key = keyboardeventKeyPolyfill.keys[this.which || this.keyCode];

        if (Array.isArray(key)) {
          key = key[+this.shiftKey];
        }

        return key;
      }
    };
    Object.defineProperty(KeyboardEvent.prototype, 'key', proto);
    return proto;
  }

  if (typeof define === 'function' && define.amd) {
    define('keyboardevent-key-polyfill', keyboardeventKeyPolyfill);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = keyboardeventKeyPolyfill;
  } else if (window) {
    window.keyboardeventKeyPolyfill = keyboardeventKeyPolyfill;
  }

})();
/* UMD.define */ (function (root, factory) {
	if (typeof customLoader === 'function'){ customLoader(factory, 'on'); }else if (typeof define === 'function' && define.amd){ define([], factory); }else if(typeof exports === 'object'){ module.exports = factory(); }else{ root.returnExports = factory(); window.on = factory(); }
}(this, function () {
	// `on` is a simple library for attaching events to nodes. Its primary feature
	// is it returns a handle, from which you can pause, resume and remove the
	// event. Handles are much easier to manipulate than using removeEventListener
	// and recreating (sometimes complex or recursive) function signatures.
	//
	// `on` is touch-friendly and will normalize touch events.
	//
	// `on` also supports a custom `clickoff` event, to detect if you've clicked
	// anywhere in the document other than the passed node
	//
	// USAGE
	//      var handle = on(node, 'clickoff', callback);
	//      //  callback fires if something other than node is clicked
	//
	// USAGE
	//      var handle = on(node, 'mousedown', onStart);
	//      handle.pause();
	//      handle.resume();
	//      handle.remove();
	//
	//  `on` also supports multiple event types at once. The following example is
	//  useful for handling both desktop mouseovers and tablet clicks:
	//
	// USAGE
	//      var handle = on(node, 'mouseover,click', onStart);
	//
	// `on` supports selector filters. The targeted element will be in the event
	// as filteredTarget
	//
	// USAGE
	//      on(node, 'click', 'div.tab span', callback);
	//

	'use strict';

	// v1.7.5

	try{
		if (typeof require === 'function') {
			require('keyboardevent-key-polyfill');
		} else {
			window.keyboardeventKeyPolyfill = keyboardeventKeyPolyfill;
		}
	}catch(e){
		console.error('on/src/key-poly is required for the event.key property');
	}

	function hasWheelTest(){
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return  "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	}

	var
		INVALID_PROPS,
		matches,
		hasWheel = hasWheelTest(),
		isWin = navigator.userAgent.indexOf('Windows')>-1,
		FACTOR = isWin ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle;


	['matches', 'matchesSelector', 'webkit', 'moz', 'ms', 'o'].some(function (name) {
		if (name.length < 7) { // prefix
			name += 'MatchesSelector';
		}
		if (Element.prototype[name]) {
			matches = name;
			return true;
		}
		return false;
	});

	function closest (element, selector, parent) {
		while (element) {
			if (element[matches] && element[matches](selector)) {
				return element;
			}
			if (element === parent) {
				break;
			}
			element = element.parentElement;
		}
		return null;
	}

	function closestFilter (element, selector) {
		return function (e) {
			return closest(e.target, selector, element);
		};
	}

	function makeMultiHandle (handles){
		return {
			remove: function(){
				handles.forEach(function(h){
					// allow for a simple function in the list
					if(h.remove) {
						h.remove();
					}else if(typeof h === 'function'){
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function(){};
			},
			pause: function(){
				handles.forEach(function(h){ if(h.pause){ h.pause(); }});
			},
			resume: function(){
				handles.forEach(function(h){ if(h.resume){ h.resume(); }});
			}
		};
	}

	function onClickoff (node, callback){
		// important note!
		// starts paused
		//
		var
			handle,
			bHandle = on(document.body, 'click', function(event){
				var target = event.target;
				if(target.nodeType !== 1){
					target = target.parentNode;
				}
				if(target && !node.contains(target)) {
					callback(event);
				}
			});

		handle = {
			resume: function () {
				setTimeout(function () {
					bHandle.resume();
				}, 100);
			},
			pause: function () {
				bHandle.pause();
			},
			remove: function () {
				bHandle.remove();
			}
		};

		handle.pause();

		return handle;
	}

	function onImageLoad (img, callback) {
		function onImageLoad (e) {
				var h = setInterval(function () {
					if(img.naturalWidth){
						e.width = img.naturalWidth;
						e.naturalWidth = img.naturalWidth;
						e.height = img.naturalHeight;
						e.naturalHeight = img.naturalHeight;
						callback(e);
						clearInterval(h);
					}
				}, 100);
			img.removeEventListener('load', onImageLoad);
			img.removeEventListener('error', callback);
		}
		img.addEventListener('load', onImageLoad);
		img.addEventListener('error', callback);
		return {
			pause: function () {},
			resume: function () {},
			remove: function () {
				img.removeEventListener('load', onImageLoad);
				img.removeEventListener('error', callback);
			}
		}
	}

	function getNode(str){
		if(typeof str !== 'string'){
			return str;
		}
		var node;
		if(/\#|\.|\s/.test(str)){
			node = document.body.querySelector(str);
		}else{
			node = document.getElementById(str);
		}
		if(!node){
			console.error('localLib/on Could not find:', str);
		}
		return node;
	}

	function normalizeWheelEvent (callback){
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function(e){
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function(){
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function on (node, eventType, filter, handler){
		//  USAGE
		//      var handle = on(this.node, 'mousedown', this, 'onStart');
		//      handle.pause();
		//      handle.resume();
		//      handle.remove();
		//
		var
			callback,
			handles,
			handle;

		if(/,/.test(eventType)){
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventType.split(',').forEach(function(eStr){
				handles.push(on(node, eStr.trim(), filter, handler));
			});
			return makeMultiHandle(handles);
		}

		node = getNode(node);

		if(filter && handler){
			if (typeof filter == 'string') {
				filter = closestFilter(node, filter);
			}
			// else it is a custom function
			callback = function (e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		}else{
			callback = filter || handler;
		}

		if(eventType === 'clickoff'){
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if (eventType === 'load' && node.localName === 'img'){
			return onImageLoad(node, callback);
		}

		if(eventType === 'wheel'){
			// mousewheel events, natch
			if(hasWheel){
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			}else{
				// old Firefox, old IE, Chrome
				return makeMultiHandle([
					on(node, 'DOMMouseScroll', normalizeWheelEvent(callback)),
					on(node, 'mousewheel', normalizeWheelEvent(callback))
				]);
			}
		}

		node.addEventListener(eventType, callback, false);

		handle = {
			remove: function() {
				node.removeEventListener(eventType, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function(){};
			},
			pause: function(){
				node.removeEventListener(eventType, callback, false);
			},
			resume: function(){
				node.addEventListener(eventType, callback, false);
			}
		};

		return handle;
	}

	on.once = function (node, eventType, filter, callback){
		var h;
		if(filter && callback){
			h = on(node, eventType, filter, function () {
				callback.apply(window, arguments);
				h.remove();
			});
		}else{
			h = on(node, eventType, function () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	INVALID_PROPS = {
		isTrusted:1
	};
	function mix(object, value){
		if(!value){
			return object;
		}
		if(typeof value === 'object') {
			Object.keys(value).forEach(function (key) {
				if(!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			});
		}else{
			object.value = value;
		}
		return object;
	}

	on.emit = function (node, eventName, value) {
		node = getNode(node);
		var event = document.createEvent('HTMLEvents');
		event.initEvent(eventName, true, true); // event type, bubbling, cancelable
		return node.dispatchEvent(mix(event, value));
	};

	on.fire = function (node, eventName, eventDetail, bubbles) {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable
		return node.dispatchEvent(event);
	};

	on.isAlphaNumeric = function (str) {
		if(str.length > 1){ return false; }
		if(str === ' '){ return false; }
		if(!isNaN(Number(str))){ return true; }
		var code = str.toLowerCase().charCodeAt(0);
		return code >= 97 && code <= 122;
	};

	on.makeMultiHandle = makeMultiHandle;
	on.closest = closest;
	on.matches = matches;

	return on;

}));

},{"keyboardevent-key-polyfill":"keyboardevent-key-polyfill"}],"store":[function(require,module,exports){
/* UMD.define */ (function (root, factory) {
    if (typeof customLoader === 'function'){ customLoader(factory, 'store'); }else if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof exports === 'object') { module.exports = factory(); } else { root.returnExports = factory(); window.store = factory(); }
}(this, function () {


    'use strict';

    function store(options) {
        options = options || {};
        var
            defaults = {
                identifier: 'id'
            },
            plugins = [],
            lastParams = '',
            currentParams = {},
            lastQueriedItems,
            dataStore,
            changes = true;

        options.identifier = options.identifier || defaults.identifier;

        dataStore = {

            get: function (value, optionalIdentifier) {
                // always returns one item or null
                if (!value || !this.items) {
                    return null;
                }
                var i, key = optionalIdentifier || options.identifier;
                value += '';
                for (i = 0; i < this.items.length; i++) {
                    if (this.items[i][key]+'' === value) {
                        return this.items[i];
                    }
                }
                return null;
            },

            set: function (items) {
                // sets all items - overwrites existing items, if any
                this.clear();
                if(!items){
                    this.items = [];
                }
                else if(!Array.isArray(items)){
                    this.items = [items];
                }
                else {
                    this.items = items.concat([]);
                }
                lastParams = '';
                currentParams = {};
                changes = true;
            },

            getIndex: function (item) {
                if(typeof item !== 'object'){
                    item = this.get(item);
                }
                var items = lastQueriedItems || this.items;
                return items.indexOf(item);
            },

            getItemByIndex: function (index) {
                var items = lastQueriedItems || this.items;
                return items[index];
            },

            add: function (itemOrItems) {
                // add item or items to existing
                if (!this.items) {
                    return this.set(itemOrItems);
                }
                if (Array.isArray(itemOrItems)) {
                    this.items = this.items.concat(itemOrItems);
                }
                else {
                    this.items.push(itemOrItems);
                }
                lastParams = '';
                currentParams = {};
                changes = true;
            },

            remove: function (itemsOrIdOrIds) {
                // Removes an item or items. Expects: an ID, an item, an array of IDs, or an array of items.
                var
                    i, k, items = this.items,
                    key = options.identifier,
                    arr = Array.isArray(itemsOrIdOrIds) ? itemsOrIdOrIds : [itemsOrIdOrIds],
                    isId = typeof arr[0] === 'string' || typeof arr[0] === 'number';

                for (i = 0; i < arr.length; i++) {
                    for (k = items.length - 1; k >= 0; k--) {
                        if ((isId && arr[i] === items[k][key]) || (arr[i] === items[k])) {
                            items.splice(k, 1);
                            k = items.length - 1;
                            break;
                        }
                    }
                }
                lastParams = '';
                currentParams = {};
                changes = true;
            },

            clear: function () {
                // resets internally.
                this.items = [];
                lastParams = '';
                currentParams = {};
                changes = true;
            },

            fetch: function () {
                console.error('please use query');
            },

            get hasListChanged () {
                return changes;
            },

            query: function (params, altItems) {
                //this.params = {
                //    filter:{
                //
                //    },
                //    sort: {
                //
                //    },
                //    paginate: {
                //
                //    }
                //};
                if (!this.items && !altItems) {
                    return [];
                }

                var i,
                    strParams,
                    items = altItems ? altItems.concat([]) : this.items.concat([]);

                currentParams = mix(currentParams, params);
                strParams = JSON.stringify(currentParams);
                if (items && !altItems && strParams === lastParams && lastQueriedItems) {
                    return lastQueriedItems;
                }

                for (i = 0; i < plugins.length; i++) {
                    items = plugins[i](items, currentParams, this);
                }
                if(!altItems) {
                    lastParams = strParams;
                    lastQueriedItems = items;
                    changes = false;
                }
                return items;
            },

            load: function (url) {
                // memory store, fetch initial data
                // need loaded, or is ready?
            }
        };

        dataStore.options = options; // for plugins access

        toArray(options.plugins).forEach(function (pluginName) {
            var
                i,
                plugin = store.plugins[pluginName],
                order;

            if (!plugin) {
                throw Error('plugin not found: ' + pluginName);
            }

            order = plugin.order;

            if (order === 'mixin') {
                plugin(dataStore);
                return;
            }

            if (!plugins.length) {
                plugins.push(plugin);
            }
            else if (plugins.length === 1) {
                if (plugins[0].order <= order) {
                    plugins.push(plugin);
                }
                else {
                    plugins.unshift(plugin);
                }
            }
            else if (plugins[0].order > order) {
                // is first
                plugins.unshift(plugin);
            }
            else {
                // is between first and last
                for (i = 1; i < plugins.length; i++) {
                    if (order === plugins[i - 1].order || (order > plugins[i - 1].order && order < plugins[i].order)) {
                        plugins.splice(i, 0, plugin);
                        // inserted, continue forEach loop
                        return;
                    }
                }
                // was not inserted...
                plugins.push(plugin);
            }
            dataStore.plugins = plugins;
        });

        return dataStore;
    }

    store.plugins = {};
    store.addPlugin = function (type, plugin, order) {
        plugin.order = order || 100;
        store.plugins[type] = plugin;
    };

    function mix(o, p) {
        if (p) {
            Object.keys(p).forEach(function (key) {
                o[key] = p[key];
            });
        }
        return o;
    }

    function toArray(object) {
        if (!object) {
            return [];
        }
        if (Array.isArray(object)) {
            return object;
        }
        if (typeof object === 'string') {
            return object.split(',').map(function (s) {
                return s.trim();
            })
        }
        console.warn('unknown plugins type:', object);
        return [];
    }

    




    // simple filter:
    // {type:'alpha'}
    // OR filter
    // {type:'alpha||beta'}
    // AND filter
    // {type: 'alpha', category: 'greek'}

    function filter (items, params, store) {
        var i, filtered = [], value, propCount, propTotal;
        if(!params.filter){
            return items;
        }
        propTotal = Object.keys(params.filter).length;
        for(i = 0; i < items.length; i++){
            propCount = 0;
            Object.keys(params.filter).forEach(function (key) {
                value = params.filter[key];
                if(value.indexOf('||') > -1){
                    value.split('||').forEach(function (v) {
                        v = v.trim();
                        if (items[i][key] === v) {
                            propCount++;
                        }
                    });

                }else{
                    if (items[i][key] === value) {
                        propCount++;
                    }
                }
            });
            if(propCount === propTotal){
                filtered.push(items[i]);
            }
        }
        return filtered;
    }

    store.addPlugin('filter', filter, 10);



    // paginate:
    // {start:0, count:10}

    function paginate (items, params, store) {
        var key, paginated = [];
        if(params.paginate){
            return items.slice(params.paginate.start, params.paginate.start + params.paginate.count);
        }
        return items;
    }

    store.addPlugin('paginate', paginate, 30);



    function after (obj, method, fn) {
        var _old = obj[method];
        obj[method] = function (a,b,c) {
            _old.call(obj, a,b,c);
            fn.call(obj, a,b,c);
        }
    }

    function before (obj, method, fn) {
        var _old = obj[method];
        obj[method] = function (a,b,c) {
            fn.call(obj, a,b,c);
            _old.call(obj, a,b,c);
        }
    }

    function findSelected (arr, multiple) {
        arr = Array.isArray(arr) ? arr : [arr];
        if(multiple){
            return arr.filter(function (item) {
                return item.selected;
            });
        }
        for(var i = 0; i < arr.length; i++){
            if(arr[i].selected){
                return arr[i];
            }
        }
        return null;
    }

    function selection (dataStore) {

        var
            opts = dataStore.options.selection || {},
            multiple = !!opts.multiple,
            selected,
            lastSelected;

        function isSelected (item) {
            if(!Array.isArray(selected)){
                return item === selected;
            }
            for(var i = 0; i < selected.length; i++){
                if(selected[i] === item){
                    return true;
                }
            }
            return false;
        }

        function select (item) {
            // handle item property?
            //item.selected = true;

            if(!multiple){
                dataStore.control = false;
                dataStore.shift = false;
            }

            if(multiple || dataStore.control || dataStore.shift){
                if(!item){
                    return;
                }
                if(dataStore.control || (multiple && !dataStore.shift)) {
                    if (Array.isArray(selected)) {
                        if (selected.indexOf(item) === -1) {
                            selected.push(item);
                            lastSelected = item;
                        }
                        else {
                            return;
                        }
                    }
                    else if(selected){
                        selected = [selected, item];
                    }
                    else {
                        selected = [item];
                    }
                }
                if(dataStore.shift){
                    var
                        a, b, i,
                        lastItem = dataStore.getLastSelected(),
                        lastIndex, itemIndex;

                    if(!lastItem){
                        selected = [item];
                    }else{
                        if(selected && !Array.isArray(selected)){
                            selected = [selected];
                        }
                        lastIndex = dataStore.getIndex(lastItem);
                        itemIndex = dataStore.getIndex(item);
                        if(lastIndex < itemIndex){
                            a = lastIndex;
                            b = itemIndex;
                        }else{
                            b = lastIndex;
                            a = itemIndex;
                        }
                        for(i = a; i <= b; i++){
                            selected.push(dataStore.getItemByIndex(i));
                        }
                    }
                }
            }else{
                //if(selected){
                //    selected.selected = false;
                //}
                selected = item;

            }
            lastSelected = item;
        }

        dataStore.getLastSelected = function () {
            if(lastSelected) {
                return lastSelected;
            }
            if(selected){
                if(Array.isArray(selected)){
                    return selected[selected.length-1];
                }else{
                    return selected;
                }
            }
            return null;
        };

        function unselect (item) {
            // handle item property?
            //item.selected = false;
            if(Array.isArray(selected)){
                selected = selected.filter(function (m) {
                    return m !== item;
                });
            }else if(item === selected){
                selected = null;
            }
        }

        after(dataStore, 'add', function (itemOrItems) {
            var items = findSelected(itemOrItems);
            if(items) {
                select(items);
            }
        });
        after(dataStore, 'set', function (itemOrItems) {
            var items = findSelected(itemOrItems);
            if(items) {
                select(items);
            }
        });
        before(dataStore, 'remove', function (itemOrIdOrItemsOrIds) {
            var arr = Array.isArray(itemOrIdOrItemsOrIds) ? itemOrIdOrItemsOrIds : [itemOrIdOrItemsOrIds];
            arr.forEach(function (itemOrId) {
                var item = typeof itemOrId === 'object' ? itemOrId : dataStore.get(itemOrId);
                if(isSelected(item)){
                    unselect(item);
                }
            });
        });
        after(dataStore, 'clear', function (itemOrItems) {
            selected = null;
        });

        // hasSelectionChanged: can't realistically determine this

        Object.defineProperty(dataStore, 'selection', {
            get: function () {
                if(!selected){
                    return null;
                }
                if(Array.isArray(selected)){
                    return dataStore.query(0, selected);
                }
                // TODO, this may need to be queried as well
                return multiple ? [selected] : selected;

            },
            set: function (itemOrId) {
                function setter (itemOrId) {
                    var item;
                    if (typeof itemOrId !== 'object') {
                        item = dataStore.get(itemOrId);
                    }
                    else {
                        item = itemOrId;
                    }
                    if (selected === item) {
                        return;
                    }

                    select(item);
                }

                if(Array.isArray(itemOrId)){
                    if(!dataStore.control){
                        selected = null;
                    }
                    itemOrId.forEach(setter);

                }else{
                    if(!dataStore.control && !dataStore.shift){
                        selected = null;
                    }
                    setter(itemOrId);
                }
            }
        });
    }

    store.addPlugin('selection', selection, 'mixin');




    // sort:
    // {key:'value', dir: 'asc'} // dir defaults to desc

    var example = "store.query({sort:{dir:'asc', key:'id'}});";

    function sort (items, params, store) {
        var key, result;
        if(!params.sort){
            return items;
        }

        if(params.sort.asc || !params.sort.key){
            console.error('Missing sort params. Did you mean:', example);
        }
        Object.keys(params.sort).forEach(function (k) {
            if(k !== 'dir') {
                key = params.sort[k];
            }
        });
        result = params.sort.dir === 'asc' ? -1 : 1;
        items.sort(function (a,b) {
            if(a[key] < b[key]){
                return -result;
            }else if(a[key] > b[key]){
                return result;
            }
            return 0;
        });
        return items;
    }

    store.addPlugin('sort', sort, 20);


    return store;

}));
},{}]},{},[]);
