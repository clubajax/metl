/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/dist";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
"use strict";

// class/component rules
// always call super() first in the ctor. This also calls the extended class' ctor.
// cannot call NEW on a Component class

// Classes http://exploringjs.com/es6/ch_classes.html#_the-species-pattern-in-static-methods

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _on = __webpack_require__(2);
var dom = __webpack_require__(1);

var BaseComponent = function (_HTMLElement) {
    _inherits(BaseComponent, _HTMLElement);

    function BaseComponent() {
        _classCallCheck(this, BaseComponent);

        var _this = _possibleConstructorReturn(this, (BaseComponent.__proto__ || Object.getPrototypeOf(BaseComponent)).call(this));

        _this._uid = dom.uid(_this.localName);
        privates[_this._uid] = { DOMSTATE: 'created' };
        privates[_this._uid].handleList = [];

        plugin('init', _this);

        return _this;
    }

    _createClass(BaseComponent, [{
        key: 'connectedCallback',
        value: function connectedCallback() {

            privates[this._uid].DOMSTATE = 'connected';
            plugin('preConnected', this);

            nextTick(onCheckDomReady.bind(this));

            if (this.connected) {
                this.connected();
            }
            this.fire('connected');

            plugin('postConnected', this);
        }
    }, {
        key: 'disconnectedCallback',
        value: function disconnectedCallback() {
            privates[this._uid].DOMSTATE = 'disconnected';
            plugin('preDisconnected', this);
            if (this.disconnected) {
                this.disconnected();
            }
            this.fire('disconnected');
        }
    }, {
        key: 'attributeChangedCallback',
        value: function attributeChangedCallback(attrName, oldVal, newVal) {
            console.log(' *** attributeChangedCallback', attrName);
            plugin('preAttributeChanged', this, attrName, newVal, oldVal);
            if (this.attributeChanged) {
                this.attributeChanged(attrName, newVal, oldVal);
            }
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.fire('destroy');
            privates[this._uid].handleList.forEach(function (handle) {
                handle.remove();
            });
            dom.destroy(this);
        }
    }, {
        key: 'fire',
        value: function fire(eventName, eventDetail, bubbles) {
            return _on.fire(this, eventName, eventDetail, bubbles);
        }
    }, {
        key: 'emit',
        value: function emit(eventName, value) {
            return _on.emit(this, eventName, value);
        }
    }, {
        key: 'on',
        value: function on(node, eventName, selector, callback) {
            return this.registerHandle(typeof node != 'string' ? // no node is supplied
            _on(node, eventName, selector, callback) : _on(this, node, eventName, selector));
        }
    }, {
        key: 'once',
        value: function once(node, eventName, selector, callback) {
            return this.registerHandle(typeof node != 'string' ? // no node is supplied
            _on.once(node, eventName, selector, callback) : _on.once(this, node, eventName, selector, callback));
        }
    }, {
        key: 'registerHandle',
        value: function registerHandle(handle) {
            privates[this._uid].handleList.push(handle);
            return handle;
        }
    }, {
        key: 'DOMSTATE',
        get: function get() {
            return privates[this._uid].DOMSTATE;
        }
    }], [{
        key: 'clone',
        value: function clone(template) {
            if (template.content && template.content.children) {
                return document.importNode(template.content, true);
            }
            var frag = document.createDocumentFragment(),
                cloneNode = document.createElement('div');
            cloneNode.innerHTML = template.innerHTML;

            while (cloneNode.children.length) {
                frag.appendChild(cloneNode.children[0]);
            }
            return frag;
        }
    }, {
        key: 'addPlugin',
        value: function addPlugin(plug) {
            var i,
                order = plug.order || 100;
            if (!plugins.length) {
                plugins.push(plug);
            } else if (plugins.length === 1) {
                if (plugins[0].order <= order) {
                    plugins.push(plug);
                } else {
                    plugins.unshift(plug);
                }
            } else if (plugins[0].order > order) {
                plugins.unshift(plug);
            } else {

                for (i = 1; i < plugins.length; i++) {
                    if (order === plugins[i - 1].order || order > plugins[i - 1].order && order < plugins[i].order) {
                        plugins.splice(i, 0, plug);
                        return;
                    }
                }
                // was not inserted...
                plugins.push(plug);
            }
        }
    }]);

    return BaseComponent;
}(HTMLElement);

var privates = {},
    plugins = [];

function plugin(method, node, a, b, c) {
    plugins.forEach(function (plug) {
        if (plug[method]) {
            plug[method](node, a, b, c);
        }
    });
}

function onCheckDomReady() {
    if (this.DOMSTATE != 'connected') {
        return;
    }

    var count = 0,
        children = getChildCustomNodes(this),
        ourDomReady = onDomReady.bind(this);

    function addReady() {
        count++;
        if (count == children.length) {
            ourDomReady();
        }
    }

    // If no children, we're good - leaf node. Commence with onDomReady
    //
    if (!children.length) {
        ourDomReady();
    } else {
        // else, wait for all children to fire their `ready` events
        //
        children.forEach(function (child) {
            // check if child is already ready
            if (child.DOMSTATE == 'domready') {
                addReady();
            }
            // if not, wait for event
            child.on('domready', addReady);
        });
    }
}

function onDomReady() {
    privates[this._uid].DOMSTATE = 'domready';
    plugin('preDomReady', this);
    // call this.domReady first, so that the component
    // can finish initializing before firing any
    // subsequent events
    if (this.domReady) {
        this.domReady();
        // domReady should only ever fire once
        this.domReady = function () {};
    }

    this.fire('domready');

    plugin('postDomReady', this);
}

function getChildCustomNodes(node) {
    // collect any children that are custom nodes
    // used to check if their dom is ready before
    // determining if this is ready
    var i,
        nodes = [];
    for (i = 0; i < node.children.length; i++) {
        if (node.children[i].nodeName.indexOf('-') > -1) {
            nodes.push(node.children[i]);
        }
    }
    return nodes;
}

function nextTick(cb) {
    requestAnimationFrame(cb);
}

exports.default = BaseComponent;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* UMD.define */(function (root, factory) {
    if (typeof customLoader === 'function') {
        customLoader(factory, 'dom');
    } else if (true) {
        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();window.dom = factory();
    }
})(undefined, function () {
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
    var isFloat = {
        opacity: 1,
        zIndex: 1,
        'z-index': 1
    },
        isDimension = {
        width: 1,
        height: 1,
        top: 1,
        left: 1,
        right: 1,
        bottom: 1,
        maxWidth: 1,
        'max-width': 1,
        minWidth: 1,
        'min-width': 1,
        maxHeight: 1,
        'max-height': 1
    },
        uids = {},
        destroyer = document.createElement('div');

    function uid(type) {
        if (!uids[type]) {
            uids[type] = [];
        }
        var id = type + '-' + (uids[type].length + 1);
        uids[type].push(id);
        return id;
    }

    function isNode(item) {
        // safer test for custom elements in FF (with wc shim)
        return !!item && (typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object' && typeof item.innerHTML === 'string';
    }

    function getNode(item) {

        if (!item) {
            return item;
        }
        if (typeof item === 'string') {
            return document.getElementById(item);
        }
        // de-jqueryify
        return item.get ? item.get(0) :
        // item is a dom node
        item;
    }

    function byId(id) {
        return getNode(id);
    }

    function style(node, prop, value) {
        // get/set node style(s)
        //      prop: string or object
        //
        var key, computed;
        if ((typeof prop === 'undefined' ? 'undefined' : _typeof(prop)) === 'object') {
            // object setter
            for (key in prop) {
                if (prop.hasOwnProperty(key)) {
                    style(node, key, prop[key]);
                }
            }
            return null;
        } else if (value !== undefined) {
            // property setter
            if (typeof value === 'number' && isDimension[prop]) {
                value += 'px';
            }
            node.style[prop] = value;

            if (prop === 'userSelect') {
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
        if (node.style[prop]) {
            if (isDimension[prop]) {
                return parseInt(node.style[prop], 10);
            }
            if (isFloat[prop]) {
                return parseFloat(node.style[prop]);
            }
            return node.style[prop];
        }

        // getter, computed
        computed = getComputedStyle(node, prop);
        if (computed[prop]) {
            if (/\d/.test(computed[prop])) {
                if (!isNaN(parseInt(computed[prop], 10))) {
                    return parseInt(computed[prop], 10);
                }
                return computed[prop];
            }
            return computed[prop];
        }
        return '';
    }

    function attr(node, prop, value) {
        // get/set node attribute(s)
        //      prop: string or object
        //
        var key;
        if ((typeof prop === 'undefined' ? 'undefined' : _typeof(prop)) === 'object') {
            for (key in prop) {
                if (prop.hasOwnProperty(key)) {
                    attr(node, key, prop[key]);
                }
            }
            return null;
        } else if (value !== undefined) {
            if (prop === 'text' || prop === 'html' || prop === 'innerHTML') {
                node.innerHTML = value;
            } else {
                node.setAttribute(prop, value);
            }
        }

        return node.getAttribute(prop);
    }

    function box(node) {
        if (node === window) {
            return {
                width: node.innerWidth,
                height: node.innerHeight
            };
        }
        // node dimensions
        // returned object is immutable
        // add scroll positioning and convenience abbreviations
        var dimensions = getNode(node).getBoundingClientRect(),
            box = {
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

        return box;
    }

    function query(node, selector) {
        if (!selector) {
            selector = node;
            node = document;
        }
        return node.querySelector(selector);
    }

    function queryAll(node, selector) {
        if (!selector) {
            selector = node;
            node = document;
        }
        var nodes = node.querySelectorAll(selector);

        if (!nodes.length) {
            return [];
        }

        // convert to Array and return it
        return Array.prototype.slice.call(nodes);
    }

    function toDom(html, options, parent) {
        // create a node from an HTML string
        var node = dom('div', { html: html });
        parent = byId(parent || options);
        if (parent) {
            while (node.firstChild) {
                parent.appendChild(node.firstChild);
            }
            return node.firstChild;
        }
        if (html.indexOf('<') !== 0) {
            return node;
        }
        return node.firstChild;
    }

    function fromDom(node) {
        function getAttrs(node) {
            var att,
                i,
                attrs = {};
            for (i = 0; i < node.attributes.length; i++) {
                att = node.attributes[i];
                attrs[att.localName] = normalize(att.value === '' ? true : att.value);
            }
            return attrs;
        }
        function getText(node) {
            var i,
                t,
                text = '';
            for (i = 0; i < node.childNodes.length; i++) {
                t = node.childNodes[i];
                if (t.nodeType === 3 && t.textContent.trim()) {
                    text += t.textContent.trim();
                }
            }
            return text;
        }
        var i,
            object = getAttrs(node);
        object.text = getText(node);
        object.children = [];
        if (node.children.length) {
            for (i = 0; i < node.children.length; i++) {
                object.children.push(fromDom(node.children[i]));
            }
        }
        return object;
    }

    function toFrag(html) {
        var frag = document.createDocumentFragment();
        frag.innerHTML = html;
        return frag;
    }

    function addChildren(node, children) {
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                node.appendChild(children[i]);
            }
        } else {
            node.appendChild(children);
        }
    }

    function addContent(node, options) {
        var html;
        if (options.html !== undefined || options.innerHTML !== undefined) {
            html = options.html || options.innerHTML || '';
            if ((typeof html === 'undefined' ? 'undefined' : _typeof(html)) === 'object') {
                addChildren(node, html);
            } else {
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
        if (options.text) {
            node.appendChild(document.createTextNode(options.text));
        }
        if (options.children) {
            addChildren(node, options.children);
        }
    }

    function dom(nodeType, options, parent, prepend) {
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
        if (nodeType.indexOf('<') === 0) {
            return toDom(nodeType, options, parent);
        }

        options = options || {};
        var className = options.css || options.className || options.class,
            node = document.createElement(nodeType);

        parent = getNode(parent);

        if (className) {
            node.className = className;
        }

        addContent(node, options);

        if (options.cssText) {
            node.style.cssText = options.cssText;
        }

        if (options.id) {
            node.id = options.id;
        }

        if (options.style) {
            style(node, options.style);
        }

        if (options.attr) {
            attr(node, options.attr);
        }

        if (parent && isNode(parent)) {
            if (prepend && parent.hasChildNodes()) {
                parent.insertBefore(node, parent.children[0]);
            } else {
                parent.appendChild(node);
            }
        }

        return node;
    }

    function destroy(node) {
        // destroys a node completely
        //
        if (node) {
            destroyer.appendChild(node);
            destroyer.innerHTML = '';
        }
    }

    function clean(node, dispose) {
        //	Removes all child nodes
        //		dispose: destroy child nodes
        if (dispose) {
            while (node.children.length) {
                destroy(node.children[0]);
            }
            return;
        }
        while (node.children.length) {
            node.removeChild(node.children[0]);
        }
    }

    function ancestor(node, selector) {
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
        var test,
            parent = node;

        if (selector.indexOf('.') === 0) {
            // className
            selector = selector.replace('.', ' ').trim();
            test = function test(n) {
                return n.classList.contains(selector);
            };
        } else if (selector.indexOf('#') === 0) {
            // node id
            selector = selector.replace('#', '').trim();
            test = function test(n) {
                return n.id === selector;
            };
        } else if (selector.indexOf('[') > -1) {
            // attribute
            console.error('attribute selectors are not yet supported');
        } else {
            // assuming node name
            selector = selector.toUpperCase();
            test = function test(n) {
                return n.nodeName === selector;
            };
        }

        while (parent) {
            if (parent === document.body || parent === document) {
                return false;
            }
            if (test(parent)) {
                break;
            }
            parent = parent.parentNode;
        }

        return parent;
    }

    dom.classList = {
        remove: function remove(node, names) {
            toArray(names).forEach(function (name) {
                node.classList.remove(name);
            });
        },
        add: function add(node, names) {
            toArray(names).forEach(function (name) {
                node.classList.add(name);
            });
        },
        contains: function contains(node, names) {
            return toArray(names).every(function (name) {
                return node.classList.contains(name);
            });
        },
        toggle: function toggle(node, names, value) {
            names = toArray(names);
            if (typeof value === 'undefined') {
                // use standard functionality, supported by IE
                names.forEach(function (name) {
                    node.classList.toggle(name, value);
                });
            }
            // IE11 does not support the second parameter  
            else if (value) {
                    names.forEach(function (name) {
                        node.classList.add(name);
                    });
                } else {
                    names.forEach(function (name) {
                        node.classList.remove(name);
                    });
                }
        }
    };

    function toArray(names) {
        if (!names) {
            console.error('dom.classList should include a node and a className');
            return [];
        }
        return names.split(' ').map(function (name) {
            return name.trim();
        });
    }

    if (!window.requestAnimationFrame) {
        dom.requestAnimationFrame = function (callback) {
            setTimeout(callback, 0);
        };
    } else {
        dom.requestAnimationFrame = function (cb) {
            window.requestAnimationFrame(cb);
        };
    }

    function normalize(val) {
        if (val === 'false') {
            return false;
        } else if (val === 'true') {
            return true;
        }
        if (!isNaN(parseFloat(val))) {
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
    dom.toFrag = toFrag;

    return dom;
});

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* UMD.define */(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'on');
	} else if (true) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = factory();window.on = factory();
	}
})(undefined, function () {
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

	try {
		window.keyboardeventKeyPolyfill.polyfill();
	} catch (e) {
		console.error('on/src/key-poly is required for the event.key property');
	}

	function hasWheelTest() {
		var isIE = navigator.userAgent.indexOf('Trident') > -1,
		    div = document.createElement('div');
		return "onwheel" in div || "wheel" in div || isIE && document.implementation.hasFeature("Events.wheel", "3.0"); // IE feature detection
	}

	var INVALID_PROPS,
	    matches,
	    hasWheel = hasWheelTest(),
	    isWin = navigator.userAgent.indexOf('Windows') > -1,
	    FACTOR = isWin ? 10 : 0.1,
	    XLR8 = 0,
	    mouseWheelHandle;

	['matches', 'matchesSelector', 'webkit', 'moz', 'ms', 'o'].some(function (name) {
		if (name.length < 7) {
			// prefix
			name += 'MatchesSelector';
		}
		if (Element.prototype[name]) {
			matches = name;
			return true;
		}
		return false;
	});

	function closest(element, selector, parent) {
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

	function closestFilter(element, selector) {
		return function (e) {
			return closest(e.target, selector, element);
		};
	}

	function makeMultiHandle(handles) {
		return {
			remove: function remove() {
				handles.forEach(function (h) {
					// allow for a simple function in the list
					if (h.remove) {
						h.remove();
					} else if (typeof h === 'function') {
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function pause() {
				handles.forEach(function (h) {
					if (h.pause) {
						h.pause();
					}
				});
			},
			resume: function resume() {
				handles.forEach(function (h) {
					if (h.resume) {
						h.resume();
					}
				});
			}
		};
	}

	function onClickoff(node, callback) {
		// important note!
		// starts paused
		//
		var handle,
		    bHandle = on(document.body, 'click', function (event) {
			if (!node.contains(event.target)) {
				callback(event);
			}
		});

		handle = {
			resume: function resume() {
				setTimeout(function () {
					bHandle.resume();
				}, 100);
			},
			pause: function pause() {
				bHandle.pause();
			},
			remove: function remove() {
				bHandle.remove();
			}
		};

		handle.pause();

		return handle;
	}

	function onImageLoad(img, callback) {
		function onImageLoad(e) {
			var h = setInterval(function () {
				if (img.naturalWidth) {
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
			pause: function pause() {},
			resume: function resume() {},
			remove: function remove() {
				img.removeEventListener('load', onImageLoad);
				img.removeEventListener('error', callback);
			}
		};
	}

	function getNode(str) {
		if (typeof str !== 'string') {
			return str;
		}
		var node;
		if (/\#|\.|\s/.test(str)) {
			node = document.body.querySelector(str);
		} else {
			node = document.getElementById(str);
		}
		if (!node) {
			console.error('localLib/on Could not find:', str);
		}
		return node;
	}

	function normalizeWheelEvent(callback) {
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function (e) {
			XLR8 += FACTOR;
			var deltaY = Math.max(-1, Math.min(1, e.wheelDeltaY || e.deltaY)),
			    deltaX = Math.max(-10, Math.min(10, e.wheelDeltaX || e.deltaX));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function () {
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function on(node, eventType, filter, handler) {
		//  USAGE
		//      var handle = on(this.node, 'mousedown', this, 'onStart');
		//      handle.pause();
		//      handle.resume();
		//      handle.remove();
		//
		var callback, handles, handle;

		if (/,/.test(eventType)) {
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventType.split(',').forEach(function (eStr) {
				handles.push(on(node, eStr.trim(), filter, handler));
			});
			return makeMultiHandle(handles);
		}

		node = getNode(node);

		if (filter && handler) {
			if (typeof filter == 'string') {
				filter = closestFilter(node, filter);
			}
			// else it is a custom function
			callback = function callback(e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		} else {
			callback = filter || handler;
		}

		if (eventType === 'clickoff') {
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if (eventType === 'load' && node.localName === 'img') {
			return onImageLoad(node, callback);
		}

		if (eventType === 'wheel') {
			// mousewheel events, natch
			if (hasWheel) {
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			} else {
				// old Firefox, old IE, Chrome
				return makeMultiHandle([on(node, 'DOMMouseScroll', normalizeWheelEvent(callback)), on(node, 'mousewheel', normalizeWheelEvent(callback))]);
			}
		}

		node.addEventListener(eventType, callback, false);

		handle = {
			remove: function remove() {
				node.removeEventListener(eventType, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function pause() {
				node.removeEventListener(eventType, callback, false);
			},
			resume: function resume() {
				node.addEventListener(eventType, callback, false);
			}
		};

		return handle;
	}

	on.once = function (node, eventType, filter, callback) {
		var h;
		if (filter && callback) {
			h = on(node, eventType, filter, function () {
				callback.apply(window, arguments);
				h.remove();
			});
		} else {
			h = on(node, eventType, function () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	INVALID_PROPS = {
		isTrusted: 1
	};
	function mix(object, value) {
		if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
			Object.keys(value).forEach(function (key) {
				if (!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			});
		} else {
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
		if (str.length > 1) {
			return false;
		}
		if (str === ' ') {
			return false;
		}
		if (!isNaN(Number(str))) {
			return true;
		}
		var code = str.toLowerCase().charCodeAt(0);
		return code >= 97 && code <= 122;
	};

	on.makeMultiHandle = makeMultiHandle;
	on.closest = closest;
	on.matches = matches;

	return on;
});

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseComponent = __webpack_require__(0);

var TestLifecycle = function (_BaseComponent) {
    _inherits(TestLifecycle, _BaseComponent);

    function TestLifecycle() {
        _classCallCheck(this, TestLifecycle);

        return _possibleConstructorReturn(this, (TestLifecycle.__proto__ || Object.getPrototypeOf(TestLifecycle)).apply(this, arguments));
    }

    _createClass(TestLifecycle, [{
        key: 'connected',
        value: function connected() {
            on.fire(document, 'connected-called', this);
        }
    }, {
        key: 'domReady',
        value: function domReady() {
            on.fire(document, 'domready-called', this);
        }
    }, {
        key: 'disconnected',
        value: function disconnected() {
            on.fire(document, 'disconnected-called', this);
        }
    }, {
        key: 'foo',
        set: function set(value) {
            this.__foo = value;
        },
        get: function get() {
            return this.__foo;
        }
    }, {
        key: 'bar',
        set: function set(value) {
            this.__bar = value;
        },
        get: function get() {
            return this.__bar || 'NOTSET';
        }
    }], [{
        key: 'observedAttributes',


        //constructor(...args) {
        //    super();
        //}

        get: function get() {
            return ['foo', 'bar'];
        }
    }]);

    return TestLifecycle;
}(BaseComponent);

customElements.define('test-lifecycle', TestLifecycle);

var node1 = dom('test-lifecycle', { html: 'i am test-lifecycle' }, document.body);
node1.on('domready', function () {
    console.log('test-lifecycle.domready');
});

customElements.define('base-component', BaseComponent.default);
var node = dom('base-component', { html: 'i am base' }, document.body);
node.on('domready', function () {
    console.log('base-component.domready');
});

/***/ }
/******/ ]);
//# sourceMappingURL=app.js.map