(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

// class/component rules
// always call super() first in the ctor. This also calls the extended class' ctor.
// cannot call NEW on a Component class

// Classes http://exploringjs.com/es6/ch_classes.html#_the-species-pattern-in-static-methods

const on = require('on');
const dom = require('dom');

class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this._uid = dom.uid(this.localName);
        privates[this._uid] = {DOMSTATE: 'created'};
        privates[this._uid].handleList = [];
        plugin('init', this);
    }
    
    connectedCallback() {
        privates[this._uid].DOMSTATE = 'connected';
        plugin('preConnected', this);
        nextTick(onCheckDomReady.bind(this));
        if (this.connected) {
            this.connected();
        }
        this.fire('connected');
        plugin('postConnected', this);
    }

    disconnectedCallback() {
        privates[this._uid].DOMSTATE = 'disconnected';
        plugin('preDisconnected', this);
        if (this.disconnected) {
            this.disconnected();
        }
        this.fire('disconnected');
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        plugin('preAttributeChanged', this, attrName, newVal, oldVal);
        if (this.attributeChanged) {
            this.attributeChanged(attrName, newVal, oldVal);
        }
    }

    destroy() {
        this.fire('destroy');
        privates[this._uid].handleList.forEach(function (handle) {
            handle.remove();
        });
        dom.destroy(this);
    }

    fire(eventName, eventDetail, bubbles) {
        return on.fire(this, eventName, eventDetail, bubbles);
    }

    emit(eventName, value) {
        return on.emit(this, eventName, value);
    }

    on(node, eventName, selector, callback) {
        return this.registerHandle(
            typeof node != 'string' ? // no node is supplied
                on(node, eventName, selector, callback) :
                on(this, node, eventName, selector));
    }

    once(node, eventName, selector, callback) {
        return this.registerHandle(
            typeof node != 'string' ? // no node is supplied
                on.once(node, eventName, selector, callback) :
                on.once(this, node, eventName, selector, callback));
    }

    registerHandle(handle) {
        privates[this._uid].handleList.push(handle);
        return handle;
    }

    get DOMSTATE() {
        return privates[this._uid].DOMSTATE;
    }

    static clone(template) {
        if (template.content && template.content.children) {
            return document.importNode(template.content, true);
        }
        var
            frag = document.createDocumentFragment(),
            cloneNode = document.createElement('div');
        cloneNode.innerHTML = template.innerHTML;

        while (cloneNode.children.length) {
            frag.appendChild(cloneNode.children[0]);
        }
        return frag;
    }

    static addPlugin(plug) {
        var i, order = plug.order || 100;
        if (!plugins.length) {
            plugins.push(plug);
        }
        else if (plugins.length === 1) {
            if (plugins[0].order <= order) {
                plugins.push(plug);
            }
            else {
                plugins.unshift(plug);
            }
        }
        else if (plugins[0].order > order) {
            plugins.unshift(plug);
        }
        else {

            for (i = 1; i < plugins.length; i++) {
                if (order === plugins[i - 1].order || (order > plugins[i - 1].order && order < plugins[i].order)) {
                    plugins.splice(i, 0, plug);
                    return;
                }
            }
            // was not inserted...
            plugins.push(plug);
        }
    }
}

let
    privates = {},
    plugins = [];

function plugin(method, node, a, b, c) {
    plugins.forEach(function (plug) {
        if (plug[method]) {
            plug[method](node, a, b, c);
        }
    });
}

function onCheckDomReady() {
    if (this.DOMSTATE != 'connected' || privates[this._uid].domReadyFired) {
        return;
    }

    var
        count = 0,
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
    }
    else {
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
    // domReady should only ever fire once
    privates[this._uid].domReadyFired = true;
    plugin('preDomReady', this);
    // call this.domReady first, so that the component
    // can finish initializing before firing any
    // subsequent events
    if (this.domReady) {
        this.domReady();
        this.domReady = function () {};
    }

    this.fire('domready');

    plugin('postDomReady', this);
}

function getChildCustomNodes(node) {
    // collect any children that are custom nodes
    // used to check if their dom is ready before
    // determining if this is ready
    var i, nodes = [];
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

window.onDomReady = function (node, callback) {
    function onReady () {
        callback(node);
        node.removeEventListener('domready', onReady);
    }
    if(node.DOMSTATE === 'domready'){
        callback(node);
    }else{
        node.addEventListener('domready', onReady);
    }
};

module.exports = BaseComponent;
},{"dom":"dom","on":"on"}],2:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');
const dom = require('dom');

function walkDom (node, refs) {

    if(node.attributes) {
        for(let i = 0; i < node.attributes.length; i++){
            if(/\{\{/.test(node.attributes[i].value)){
                refs.attributes = refs.attributes || {};
                // could be more than one??
                // same with node?
                refs.attributes[node.attributes[i].name] = node;
            }
        }
    }

    if(!node.children.length){
        if(/\{\{/.test(node.innerHTML)){
            refs[node.innerHTML.replace('{{','').replace('}}','')] = node;
            node.innerHTML = '';
        }
        return;
    }
    for(let i = 0; i < node.children.length; i++){
        walkDom(node.children[i], refs);
    }
}

function updateItemTemplate (frag) {
    let refs = {};
    walkDom(frag, refs);
    return refs;
}

BaseComponent.prototype.renderList = function (items, container, itemTemplate) {
    let
        frag = document.createDocumentFragment(),
        tmpl = itemTemplate || this.itemTemplate,
        refs = tmpl.itemRefs,
        clone,
        defer;

    function warn (name) {
        clearTimeout(defer);
        defer = setTimeout(function () {
            console.warn('Attempted to set attribute from non-existent item property:', name);
        },1);
    }

    items.forEach(function (item) {
        Object.keys(item).forEach(function (key) {
            if(refs[key]){
                refs[key].innerHTML = item[key];
            }
        });
        if(refs.attributes){
            Object.keys(refs.attributes).forEach(function (name) {
                let node = refs.attributes[name];
                if(item[name] !== undefined) {
                    node.setAttribute(name, item[name]);
                }else{
                    warn(name);
                }
            });
        }

        clone = tmpl.cloneNode(true);
        frag.appendChild(clone);
    });

    container.appendChild(frag);
};

BaseComponent.addPlugin({
    name: 'item-template',
    order: 40,
    preDomReady: function (node) {
        node.itemTemplate = dom.query(node, 'template');
        if(node.itemTemplate){
            node.itemTemplate.parentNode.removeChild(node.itemTemplate);
            node.itemTemplate = BaseComponent.clone(node.itemTemplate);
            node.itemTemplate.itemRefs = updateItemTemplate(node.itemTemplate);
        }
    }
});

module.exports = {};
},{"./BaseComponent":1,"dom":"dom"}],3:[function(require,module,exports){
const BaseComponent  = require('./BaseComponent');
const dom = require('dom');

function setBoolean (node, prop) {
    Object.defineProperty(node, prop, {
        enumerable: true,
        get () {
            if(node.hasAttribute(prop)){
                return dom.normalize(node.getAttribute(prop));
            }
            return false;
        },
        set (value) {
            if(value){
                this.setAttribute(prop, '');
            }else{
                this.removeAttribute(prop);
            }
        }
    });
}

function setProperty (node, prop) {
    Object.defineProperty(node, prop, {
        enumerable: true,
        get () {
            return dom.normalize(this.getAttribute(prop));
        },
        set (value) {
            this.setAttribute(prop, value);
        }
    });
}

function setProperties (node) {
    let props = node.props || node.properties;
    if(props) {
        props.forEach(function (prop) {
            if(prop === 'disabled'){
                setBoolean(node, prop);
            }
            else{
                setProperty(node, prop);
            }
        });
    }
}

function setBooleans (node) {
    let props = node.bools || node.booleans;
    if(props) {
        props.forEach(function (prop) {
            setBoolean(node, prop);
        });
    }
}

BaseComponent.addPlugin({
    name: 'properties',
    order: 10,
    init: function (node) {
        setProperties(node);
        setBooleans(node);
    },
    preAttributeChanged: function (node, name, value) {
        this[name] = dom.normalize(value);
        if(!value && (node.bools || node.booleans || []).indexOf(name)){
            node.removeAttribute(name);
        }
    }
});

module.exports = {};
},{"./BaseComponent":1,"dom":"dom"}],4:[function(require,module,exports){
const BaseComponent  = require('./BaseComponent');
const dom = require('dom');

var
    lightNodes = {},
    inserted = {};

function insert (node) {
    if(inserted[node._uid] || !hasTemplate(node)){
        return;
    }
    collectLightNodes(node);
    insertTemplate(node);
    inserted[node._uid] = true;
}

function collectLightNodes(node){
    lightNodes[node._uid] = lightNodes[node._uid] || [];
    while(node.childNodes.length){
        lightNodes[node._uid].push(node.removeChild(node.childNodes[0]));
    }
}

function hasTemplate (node) {
    return !!node.getTemplateNode();
}

function insertTemplateChain (node) {
    var templates = node.getTemplateChain();
    templates.reverse().forEach(function (template) {
        getContainer(node).appendChild(BaseComponent.clone(template));
    });
    insertChildren(node);
}

function insertTemplate (node) {
    if(node.nestedTemplate){
        insertTemplateChain(node);
        return;
    }
    var
        templateNode = node.getTemplateNode();

    if(templateNode) {
        node.appendChild(BaseComponent.clone(templateNode));
    }
    insertChildren(node);
}

function getContainer (node) {
    var containers = node.querySelectorAll('[ref="container"]');
    if(!containers || !containers.length){
        return node;
    }
    return containers[containers.length - 1];
}

function insertChildren (node) {
    var i,
        container = getContainer(node),
        children = lightNodes[node._uid];

    if(container && children && children.length){
        for(i = 0; i < children.length; i++){
            container.appendChild(children[i]);
        }
    }
}

BaseComponent.prototype.getLightNodes = function () {
    return lightNodes[this._uid];
};

BaseComponent.prototype.getTemplateNode = function () {
    // caching causes different classes to pull the same template - wat?
    //if(!this.templateNode) {
        if (this.templateId) {
            this.templateNode = dom.byId(this.templateId.replace('#',''));
        }
        else if (this.templateString) {
            this.templateNode = dom.toDom('<template>' + this.templateString + '</template>');
        }
    //}
    return this.templateNode;
};

BaseComponent.prototype.getTemplateChain = function () {

    let
        context = this,
        templates = [],
        template;

    // walk the prototype chain; Babel doesn't allow using
    // `super` since we are outside of the Class
    while(context){
        context = Object.getPrototypeOf(context);
        if(!context){ break; }
        // skip prototypes without a template
        // (else it will pull an inherited template and cause duplicates)
        if(context.hasOwnProperty('templateString') || context.hasOwnProperty('templateId')) {
            template = context.getTemplateNode();
            if (template) {
                templates.push(template);
            }
        }
    }
    return templates;
};

BaseComponent.addPlugin({
    name: 'template',
    order: 20,
    preConnected: function (node) {
        insert(node);
    }
});

module.exports = {};
},{"./BaseComponent":1,"dom":"dom"}],5:[function(require,module,exports){
const BaseComponent  = require('BaseComponent');
// plugins
require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/item-template');

// library
let ml = require('./ml');
const keys = require('key-nav');
const store = require('store');
const dom = require('dom');

const ITEM_CLASS = 'ml-list';
const onDomReady = window.onDomReady;

// TODO

// store.save(item)?
// list without item IDs?
// first-item selection should be optional
// nav-keys would be different with cells
// virtual scrolling
// different row templates ---?
//  template props
//  each
//  if

// maybes:
// m-list instead of ml-list (css var for prefix?)

class List extends BaseComponent {

    static get observedAttributes() {
        return ['horizontal', 'value', 'disabled', 'keys', 'multiple', 'virtual', 'selectable', 'rowTemplateId'];
    }

    get props () {
        return ['value', 'rowTemplateId'];
    }

    get bools () {
        return ['horizontal', 'keys', 'multiple', 'virtual', 'selectable'];
    }

    constructor(...args) {
        super(args);
    }

    domReady() {
        dom.attr(this, 'tabindex', 0);
        if(this.children.length){
            this.add(formatItems([...this.children]));
        }
    }

    getNodeByItem (item) {
        let identifier = this.store.identifier,
            value = item[identifier],
            q = '[' + identifier + '=' + value + ']';
        return this.querySelector(q);
    }

    renderSelection () {
        let
            selected = this.store.selection,
            selNode;

        if(this.selectable) {
            dom.queryAll(this, '[selected]').forEach(function (node) {
                node.removeAttribute('selected');
            });

            if (selected) {
                if (this.multiple) {
                    selected.forEach(function (item) {
                        selNode = this.getNodeByItem(item);
                        selNode.setAttribute('selected', '');
                    }, this);
                }
                else {
                    selNode = this.getNodeByItem(selected);
                    selNode.setAttribute('selected', '');
                }

            }
            else {
                // default to first
                // TODO needs to be optional
                selNode = this.children[0];
                selNode.setAttribute('selected', '');
                this.store.selection = selNode.id;
            }

        }
    }

    render () {

        let
            changes = this.store.hasListChanged,
            frag,
            items;

        if(changes) {
            items = this.store.query();
            if (this.itemTemplate) {
                console.log('itemTemplate!');
                this.renderList(items, this);
            }else{
                frag = document.createDocumentFragment();
                items.forEach(function (item) {
                    frag.appendChild(toNode(item));
                });
                this.innerHTML = '';
                this.appendChild(frag);
            }
        }

        this.renderSelection(this);

        this.connectEvents();
    }

    add (itemOrItems) {
        let
            identifier = store.getIdentifier(itemOrItems),
            options = {
                plugins: 'filter,sort,paginate,selection',
                selection:{multiple: this.multiple}
            };

        if(identifier && identifier !== 'id'){
            options.identifier = identifier;
        }

        onDomReady(this, () => {
            if(!this.store){
                this.store = store(options);
            }
            this.store.add(formatItems(itemOrItems));
            this.render();
        });

    }

    set data (itemOrItems) {
        this.clear();
        this.add(itemOrItems);
    }

    clear () {
        if(this.store){
            this.store.clear();
        }
    }

    connectEvents() {
        if (this.children.length && this.selectable) { // && !isOwned(this tagname??)
            if(this.keys) {
                ml.keys(this, {multiple: this.multiple});
                this.on('change', this.render.bind(this));
            }
            this.connectEvents = function () {}
        }
    }
}
customElements.define('ml-list', List);


function toNode (item) {
    let attr = {
        value: item.value
    };
    if(item.selected){
        attr.selected = true;
    }
    return dom('li', {html: item.label, id: item.id, className: ITEM_CLASS, attr:attr});
}

function formatItems(itemOrItems) {
    return (Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]).map(function (item) {
        if(dom.isNode(item)){
            return {
                id: item.id,
                value: item.value,
                selected: item.selected,
                label: item.innerHTML
            }
        }else{
            return item;
        }
    });
}

function isEqual(v1, v2) {
    return v1 === v2 || v1 + '' === v2 + '' || +v1 === +v2;
}

function getValue(node) {
    if (node.value !== undefined) {
        return node.value;
    }
    if (node.hasAttribute('value')) {
        return node.getAttribute('value');
    }
    if (node.id) {
        return node.id;
    }
    if (node.label) {
        return node.label;
    }
    if (node.hasAttribute('label')) {
        return node.getAttribute('label');
    }
    return node.textContent;
}

//function getIdentifier(itemOrItems) {
//    //return !!node ? node.value || node.id || node : null;
//    let item = Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems;
//    if(item.id){
//        return 'id';
//    }
//    if (item.value !== undefined) {
//        return 'value';
//    }
//    if(item.name){
//        return 'name';
//    }
//    if (item.label) {
//        return 'label';
//    }
//    console.error('items must have use of the following identifiers: `id`, `value`, `name`, `label`');
//    return null;
//}

function isOwned(node, tagName) {
    while (node && node.localName !== 'body') {
        if (node.localName === tagName) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

module.exports = List;
},{"./ml":7,"BaseComponent":1,"BaseComponent/src/item-template":2,"BaseComponent/src/properties":3,"BaseComponent/src/template":4,"dom":"dom","key-nav":"key-nav","store":"store"}],6:[function(require,module,exports){
const BaseComponent = require('BaseComponent');
require('./List');
customElements.define('base-component', BaseComponent);


},{"./List":5,"BaseComponent":1}],7:[function(require,module,exports){
const keys = require('key-nav');
const store = require('store');

function getValue (node, identifier) {
    return node.getAttribute(identifier);
}

module.exports = {
    keys (node, options) {
        let controller = keys(node, {roles:true});
        node.registerHandle(on.makeMultiHandle(controller.handles));
        node.on('key-select', function (event) {
            let
                identifier = node.store.identifier,
                selNode = event.detail.value,
                value = getValue(selNode, identifier);
            node.store.selection = value;
            node.emit('change', {value: node.store.selection});
        });
        if(options.multiple){
            node.on(document, 'keydown', function (e) {
                switch (e.key) {
                    case 'Meta':
                    case 'Control':
                    case 'Command':
                        node.store.control = true;
                        break;
                    case 'Shift':
                        node.store.shift = true;
                        break;
                }
            });
            node.on(document, 'keyup', function (e) {
                node.store.control = false;
                node.store.shift = false;
            });
        }
    },
    
    convertBracesToRefs: function (frag) {
        var refs = {};
        walkDom(frag.children[0], refs);
        return refs;
    }
};

function walkDom (node, refs) {
    var i;
    if(!node.children.length){
        if(/\{\{/.test(node.innerHTML)){
            refs[node.innerHTML.replace('{{','').replace('}}','')] = node;
            node.innerHTML = '';
        }
        return;
    }
    for(i = 0; i < node.children.length; i++){
        walkDom(node.children[i], refs);
    }
}
},{"key-nav":"key-nav","store":"store"}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvQmFzZUNvbXBvbmVudC5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9pdGVtLXRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvdGVtcGxhdGUuanMiLCJzcmMvTGlzdC5qcyIsInNyYy9idWlsZC5qcyIsInNyYy9tbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIGNsYXNzL2NvbXBvbmVudCBydWxlc1xuLy8gYWx3YXlzIGNhbGwgc3VwZXIoKSBmaXJzdCBpbiB0aGUgY3Rvci4gVGhpcyBhbHNvIGNhbGxzIHRoZSBleHRlbmRlZCBjbGFzcycgY3Rvci5cbi8vIGNhbm5vdCBjYWxsIE5FVyBvbiBhIENvbXBvbmVudCBjbGFzc1xuXG4vLyBDbGFzc2VzIGh0dHA6Ly9leHBsb3Jpbmdqcy5jb20vZXM2L2NoX2NsYXNzZXMuaHRtbCNfdGhlLXNwZWNpZXMtcGF0dGVybi1pbi1zdGF0aWMtbWV0aG9kc1xuXG5jb25zdCBvbiA9IHJlcXVpcmUoJ29uJyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuY2xhc3MgQmFzZUNvbXBvbmVudCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fdWlkID0gZG9tLnVpZCh0aGlzLmxvY2FsTmFtZSk7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0gPSB7RE9NU1RBVEU6ICdjcmVhdGVkJ307XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdCA9IFtdO1xuICAgICAgICBwbHVnaW4oJ2luaXQnLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSAnY29ubmVjdGVkJztcbiAgICAgICAgcGx1Z2luKCdwcmVDb25uZWN0ZWQnLCB0aGlzKTtcbiAgICAgICAgbmV4dFRpY2sob25DaGVja0RvbVJlYWR5LmJpbmQodGhpcykpO1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJlKCdjb25uZWN0ZWQnKTtcbiAgICAgICAgcGx1Z2luKCdwb3N0Q29ubmVjdGVkJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSAnZGlzY29ubmVjdGVkJztcbiAgICAgICAgcGx1Z2luKCdwcmVEaXNjb25uZWN0ZWQnLCB0aGlzKTtcbiAgICAgICAgaWYgKHRoaXMuZGlzY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlyZSgnZGlzY29ubmVjdGVkJyk7XG4gICAgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgICAgICBwbHVnaW4oJ3ByZUF0dHJpYnV0ZUNoYW5nZWQnLCB0aGlzLCBhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVDaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZUNoYW5nZWQoYXR0ck5hbWUsIG5ld1ZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZmlyZSgnZGVzdHJveScpO1xuICAgICAgICBwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICAgICAgICBoYW5kbGUucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBkb20uZGVzdHJveSh0aGlzKTtcbiAgICB9XG5cbiAgICBmaXJlKGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpIHtcbiAgICAgICAgcmV0dXJuIG9uLmZpcmUodGhpcywgZXZlbnROYW1lLCBldmVudERldGFpbCwgYnViYmxlcyk7XG4gICAgfVxuXG4gICAgZW1pdChldmVudE5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvbi5lbWl0KHRoaXMsIGV2ZW50TmFtZSwgdmFsdWUpO1xuICAgIH1cblxuICAgIG9uKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuICAgICAgICAgICAgdHlwZW9mIG5vZGUgIT0gJ3N0cmluZycgPyAvLyBubyBub2RlIGlzIHN1cHBsaWVkXG4gICAgICAgICAgICAgICAgb24obm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIDpcbiAgICAgICAgICAgICAgICBvbih0aGlzLCBub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgb25jZShub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWdpc3RlckhhbmRsZShcbiAgICAgICAgICAgIHR5cGVvZiBub2RlICE9ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuICAgICAgICAgICAgICAgIG9uLm9uY2Uobm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIDpcbiAgICAgICAgICAgICAgICBvbi5vbmNlKHRoaXMsIG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSk7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJIYW5kbGUoaGFuZGxlKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdC5wdXNoKGhhbmRsZSk7XG4gICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgfVxuXG4gICAgZ2V0IERPTVNUQVRFKCkge1xuICAgICAgICByZXR1cm4gcHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURTtcbiAgICB9XG5cbiAgICBzdGF0aWMgY2xvbmUodGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKHRlbXBsYXRlLmNvbnRlbnQgJiYgdGVtcGxhdGUuY29udGVudC5jaGlsZHJlbikge1xuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICAgICAgY2xvbmVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNsb25lTm9kZS5pbm5lckhUTUwgPSB0ZW1wbGF0ZS5pbm5lckhUTUw7XG5cbiAgICAgICAgd2hpbGUgKGNsb25lTm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2xvbmVOb2RlLmNoaWxkcmVuWzBdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZztcbiAgICB9XG5cbiAgICBzdGF0aWMgYWRkUGx1Z2luKHBsdWcpIHtcbiAgICAgICAgdmFyIGksIG9yZGVyID0gcGx1Zy5vcmRlciB8fCAxMDA7XG4gICAgICAgIGlmICghcGx1Z2lucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBsdWdpbnMucHVzaChwbHVnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwbHVnaW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHBsdWdpbnNbMF0ub3JkZXIgPD0gb3JkZXIpIHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zLnB1c2gocGx1Zyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGx1Z2luc1swXS5vcmRlciA+IG9yZGVyKSB7XG4gICAgICAgICAgICBwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDE7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9yZGVyID09PSBwbHVnaW5zW2kgLSAxXS5vcmRlciB8fCAob3JkZXIgPiBwbHVnaW5zW2kgLSAxXS5vcmRlciAmJiBvcmRlciA8IHBsdWdpbnNbaV0ub3JkZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsdWdpbnMuc3BsaWNlKGksIDAsIHBsdWcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gd2FzIG5vdCBpbnNlcnRlZC4uLlxuICAgICAgICAgICAgcGx1Z2lucy5wdXNoKHBsdWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5sZXRcbiAgICBwcml2YXRlcyA9IHt9LFxuICAgIHBsdWdpbnMgPSBbXTtcblxuZnVuY3Rpb24gcGx1Z2luKG1ldGhvZCwgbm9kZSwgYSwgYiwgYykge1xuICAgIHBsdWdpbnMuZm9yRWFjaChmdW5jdGlvbiAocGx1Zykge1xuICAgICAgICBpZiAocGx1Z1ttZXRob2RdKSB7XG4gICAgICAgICAgICBwbHVnW21ldGhvZF0obm9kZSwgYSwgYiwgYyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gb25DaGVja0RvbVJlYWR5KCkge1xuICAgIGlmICh0aGlzLkRPTVNUQVRFICE9ICdjb25uZWN0ZWQnIHx8IHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyXG4gICAgICAgIGNvdW50ID0gMCxcbiAgICAgICAgY2hpbGRyZW4gPSBnZXRDaGlsZEN1c3RvbU5vZGVzKHRoaXMpLFxuICAgICAgICBvdXJEb21SZWFkeSA9IG9uRG9tUmVhZHkuYmluZCh0aGlzKTtcblxuICAgIGZ1bmN0aW9uIGFkZFJlYWR5KCkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICBpZiAoY291bnQgPT0gY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBvdXJEb21SZWFkeSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gY2hpbGRyZW4sIHdlJ3JlIGdvb2QgLSBsZWFmIG5vZGUuIENvbW1lbmNlIHdpdGggb25Eb21SZWFkeVxuICAgIC8vXG4gICAgaWYgKCFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgb3VyRG9tUmVhZHkoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGVsc2UsIHdhaXQgZm9yIGFsbCBjaGlsZHJlbiB0byBmaXJlIHRoZWlyIGByZWFkeWAgZXZlbnRzXG4gICAgICAgIC8vXG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBjaGlsZCBpcyBhbHJlYWR5IHJlYWR5XG4gICAgICAgICAgICBpZiAoY2hpbGQuRE9NU1RBVEUgPT0gJ2RvbXJlYWR5Jykge1xuICAgICAgICAgICAgICAgIGFkZFJlYWR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiBub3QsIHdhaXQgZm9yIGV2ZW50XG4gICAgICAgICAgICBjaGlsZC5vbignZG9tcmVhZHknLCBhZGRSZWFkeSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25Eb21SZWFkeSgpIHtcbiAgICBwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gJ2RvbXJlYWR5JztcbiAgICAvLyBkb21SZWFkeSBzaG91bGQgb25seSBldmVyIGZpcmUgb25jZVxuICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCA9IHRydWU7XG4gICAgcGx1Z2luKCdwcmVEb21SZWFkeScsIHRoaXMpO1xuICAgIC8vIGNhbGwgdGhpcy5kb21SZWFkeSBmaXJzdCwgc28gdGhhdCB0aGUgY29tcG9uZW50XG4gICAgLy8gY2FuIGZpbmlzaCBpbml0aWFsaXppbmcgYmVmb3JlIGZpcmluZyBhbnlcbiAgICAvLyBzdWJzZXF1ZW50IGV2ZW50c1xuICAgIGlmICh0aGlzLmRvbVJlYWR5KSB7XG4gICAgICAgIHRoaXMuZG9tUmVhZHkoKTtcbiAgICAgICAgdGhpcy5kb21SZWFkeSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cblxuICAgIHRoaXMuZmlyZSgnZG9tcmVhZHknKTtcblxuICAgIHBsdWdpbigncG9zdERvbVJlYWR5JywgdGhpcyk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ3VzdG9tTm9kZXMobm9kZSkge1xuICAgIC8vIGNvbGxlY3QgYW55IGNoaWxkcmVuIHRoYXQgYXJlIGN1c3RvbSBub2Rlc1xuICAgIC8vIHVzZWQgdG8gY2hlY2sgaWYgdGhlaXIgZG9tIGlzIHJlYWR5IGJlZm9yZVxuICAgIC8vIGRldGVybWluaW5nIGlmIHRoaXMgaXMgcmVhZHlcbiAgICB2YXIgaSwgbm9kZXMgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbltpXS5ub2RlTmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgICAgICAgbm9kZXMucHVzaChub2RlLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbmZ1bmN0aW9uIG5leHRUaWNrKGNiKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKTtcbn1cblxud2luZG93Lm9uRG9tUmVhZHkgPSBmdW5jdGlvbiAobm9kZSwgY2FsbGJhY2spIHtcbiAgICBmdW5jdGlvbiBvblJlYWR5ICgpIHtcbiAgICAgICAgY2FsbGJhY2sobm9kZSk7XG4gICAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignZG9tcmVhZHknLCBvblJlYWR5KTtcbiAgICB9XG4gICAgaWYobm9kZS5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jyl7XG4gICAgICAgIGNhbGxiYWNrKG5vZGUpO1xuICAgIH1lbHNle1xuICAgICAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2RvbXJlYWR5Jywgb25SZWFkeSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlQ29tcG9uZW50OyIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5mdW5jdGlvbiB3YWxrRG9tIChub2RlLCByZWZzKSB7XG5cbiAgICBpZihub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBpZigvXFx7XFx7Ly50ZXN0KG5vZGUuYXR0cmlidXRlc1tpXS52YWx1ZSkpe1xuICAgICAgICAgICAgICAgIHJlZnMuYXR0cmlidXRlcyA9IHJlZnMuYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgICAgICAgICAvLyBjb3VsZCBiZSBtb3JlIHRoYW4gb25lPz9cbiAgICAgICAgICAgICAgICAvLyBzYW1lIHdpdGggbm9kZT9cbiAgICAgICAgICAgICAgICByZWZzLmF0dHJpYnV0ZXNbbm9kZS5hdHRyaWJ1dGVzW2ldLm5hbWVdID0gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmKCFub2RlLmNoaWxkcmVuLmxlbmd0aCl7XG4gICAgICAgIGlmKC9cXHtcXHsvLnRlc3Qobm9kZS5pbm5lckhUTUwpKXtcbiAgICAgICAgICAgIHJlZnNbbm9kZS5pbm5lckhUTUwucmVwbGFjZSgne3snLCcnKS5yZXBsYWNlKCd9fScsJycpXSA9IG5vZGU7XG4gICAgICAgICAgICBub2RlLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgICB3YWxrRG9tKG5vZGUuY2hpbGRyZW5baV0sIHJlZnMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlSXRlbVRlbXBsYXRlIChmcmFnKSB7XG4gICAgbGV0IHJlZnMgPSB7fTtcbiAgICB3YWxrRG9tKGZyYWcsIHJlZnMpO1xuICAgIHJldHVybiByZWZzO1xufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5yZW5kZXJMaXN0ID0gZnVuY3Rpb24gKGl0ZW1zLCBjb250YWluZXIsIGl0ZW1UZW1wbGF0ZSkge1xuICAgIGxldFxuICAgICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICB0bXBsID0gaXRlbVRlbXBsYXRlIHx8IHRoaXMuaXRlbVRlbXBsYXRlLFxuICAgICAgICByZWZzID0gdG1wbC5pdGVtUmVmcyxcbiAgICAgICAgY2xvbmUsXG4gICAgICAgIGRlZmVyO1xuXG4gICAgZnVuY3Rpb24gd2FybiAobmFtZSkge1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVmZXIpO1xuICAgICAgICBkZWZlciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBdHRlbXB0ZWQgdG8gc2V0IGF0dHJpYnV0ZSBmcm9tIG5vbi1leGlzdGVudCBpdGVtIHByb3BlcnR5OicsIG5hbWUpO1xuICAgICAgICB9LDEpO1xuICAgIH1cblxuICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgT2JqZWN0LmtleXMoaXRlbSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZihyZWZzW2tleV0pe1xuICAgICAgICAgICAgICAgIHJlZnNba2V5XS5pbm5lckhUTUwgPSBpdGVtW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZihyZWZzLmF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVmcy5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5vZGUgPSByZWZzLmF0dHJpYnV0ZXNbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYoaXRlbVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIGl0ZW1bbmFtZV0pO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB3YXJuKG5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xvbmUgPSB0bXBsLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChjbG9uZSk7XG4gICAgfSk7XG5cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZyk7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ2l0ZW0tdGVtcGxhdGUnLFxuICAgIG9yZGVyOiA0MCxcbiAgICBwcmVEb21SZWFkeTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUgPSBkb20ucXVlcnkobm9kZSwgJ3RlbXBsYXRlJyk7XG4gICAgICAgIGlmKG5vZGUuaXRlbVRlbXBsYXRlKXtcbiAgICAgICAgICAgIG5vZGUuaXRlbVRlbXBsYXRlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZS5pdGVtVGVtcGxhdGUpO1xuICAgICAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUgPSBCYXNlQ29tcG9uZW50LmNsb25lKG5vZGUuaXRlbVRlbXBsYXRlKTtcbiAgICAgICAgICAgIG5vZGUuaXRlbVRlbXBsYXRlLml0ZW1SZWZzID0gdXBkYXRlSXRlbVRlbXBsYXRlKG5vZGUuaXRlbVRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHt9OyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnLi9CYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuZnVuY3Rpb24gc2V0Qm9vbGVhbiAobm9kZSwgcHJvcCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldCAoKSB7XG4gICAgICAgICAgICBpZihub2RlLmhhc0F0dHJpYnV0ZShwcm9wKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbS5ub3JtYWxpemUobm9kZS5nZXRBdHRyaWJ1dGUocHJvcCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgKHZhbHVlKSB7XG4gICAgICAgICAgICBpZih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgJycpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5vZGUsIHByb3ApIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBnZXQgKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRvbS5ub3JtYWxpemUodGhpcy5nZXRBdHRyaWJ1dGUocHJvcCkpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydGllcyAobm9kZSkge1xuICAgIGxldCBwcm9wcyA9IG5vZGUucHJvcHMgfHwgbm9kZS5wcm9wZXJ0aWVzO1xuICAgIGlmKHByb3BzKSB7XG4gICAgICAgIHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgICAgIGlmKHByb3AgPT09ICdkaXNhYmxlZCcpe1xuICAgICAgICAgICAgICAgIHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHNldFByb3BlcnR5KG5vZGUsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW5zIChub2RlKSB7XG4gICAgbGV0IHByb3BzID0gbm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zO1xuICAgIGlmKHByb3BzKSB7XG4gICAgICAgIHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgICAgIHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICdwcm9wZXJ0aWVzJyxcbiAgICBvcmRlcjogMTAsXG4gICAgaW5pdDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgc2V0UHJvcGVydGllcyhub2RlKTtcbiAgICAgICAgc2V0Qm9vbGVhbnMobm9kZSk7XG4gICAgfSxcbiAgICBwcmVBdHRyaWJ1dGVDaGFuZ2VkOiBmdW5jdGlvbiAobm9kZSwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdGhpc1tuYW1lXSA9IGRvbS5ub3JtYWxpemUodmFsdWUpO1xuICAgICAgICBpZighdmFsdWUgJiYgKG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucyB8fCBbXSkuaW5kZXhPZihuYW1lKSl7XG4gICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHt9OyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnLi9CYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxudmFyXG4gICAgbGlnaHROb2RlcyA9IHt9LFxuICAgIGluc2VydGVkID0ge307XG5cbmZ1bmN0aW9uIGluc2VydCAobm9kZSkge1xuICAgIGlmKGluc2VydGVkW25vZGUuX3VpZF0gfHwgIWhhc1RlbXBsYXRlKG5vZGUpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb2xsZWN0TGlnaHROb2Rlcyhub2RlKTtcbiAgICBpbnNlcnRUZW1wbGF0ZShub2RlKTtcbiAgICBpbnNlcnRlZFtub2RlLl91aWRdID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29sbGVjdExpZ2h0Tm9kZXMobm9kZSl7XG4gICAgbGlnaHROb2Rlc1tub2RlLl91aWRdID0gbGlnaHROb2Rlc1tub2RlLl91aWRdIHx8IFtdO1xuICAgIHdoaWxlKG5vZGUuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICBsaWdodE5vZGVzW25vZGUuX3VpZF0ucHVzaChub2RlLnJlbW92ZUNoaWxkKG5vZGUuY2hpbGROb2Rlc1swXSkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzVGVtcGxhdGUgKG5vZGUpIHtcbiAgICByZXR1cm4gISFub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZW1wbGF0ZUNoYWluIChub2RlKSB7XG4gICAgdmFyIHRlbXBsYXRlcyA9IG5vZGUuZ2V0VGVtcGxhdGVDaGFpbigpO1xuICAgIHRlbXBsYXRlcy5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICAgICAgZ2V0Q29udGFpbmVyKG5vZGUpLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGUpKTtcbiAgICB9KTtcbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGUgKG5vZGUpIHtcbiAgICBpZihub2RlLm5lc3RlZFRlbXBsYXRlKXtcbiAgICAgICAgaW5zZXJ0VGVtcGxhdGVDaGFpbihub2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXJcbiAgICAgICAgdGVtcGxhdGVOb2RlID0gbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcblxuICAgIGlmKHRlbXBsYXRlTm9kZSkge1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGVOb2RlKSk7XG4gICAgfVxuICAgIGluc2VydENoaWxkcmVuKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBnZXRDb250YWluZXIgKG5vZGUpIHtcbiAgICB2YXIgY29udGFpbmVycyA9IG5vZGUucXVlcnlTZWxlY3RvckFsbCgnW3JlZj1cImNvbnRhaW5lclwiXScpO1xuICAgIGlmKCFjb250YWluZXJzIHx8ICFjb250YWluZXJzLmxlbmd0aCl7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyc1tjb250YWluZXJzLmxlbmd0aCAtIDFdO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRDaGlsZHJlbiAobm9kZSkge1xuICAgIHZhciBpLFxuICAgICAgICBjb250YWluZXIgPSBnZXRDb250YWluZXIobm9kZSksXG4gICAgICAgIGNoaWxkcmVuID0gbGlnaHROb2Rlc1tub2RlLl91aWRdO1xuXG4gICAgaWYoY29udGFpbmVyICYmIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCl7XG4gICAgICAgIGZvcihpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjaGlsZHJlbltpXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldExpZ2h0Tm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGxpZ2h0Tm9kZXNbdGhpcy5fdWlkXTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlTm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjYWNoaW5nIGNhdXNlcyBkaWZmZXJlbnQgY2xhc3NlcyB0byBwdWxsIHRoZSBzYW1lIHRlbXBsYXRlIC0gd2F0P1xuICAgIC8vaWYoIXRoaXMudGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIGlmICh0aGlzLnRlbXBsYXRlSWQpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLmJ5SWQodGhpcy50ZW1wbGF0ZUlkLnJlcGxhY2UoJyMnLCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy50ZW1wbGF0ZVN0cmluZykge1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZU5vZGUgPSBkb20udG9Eb20oJzx0ZW1wbGF0ZT4nICsgdGhpcy50ZW1wbGF0ZVN0cmluZyArICc8L3RlbXBsYXRlPicpO1xuICAgICAgICB9XG4gICAgLy99XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVOb2RlO1xufTtcblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0VGVtcGxhdGVDaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldFxuICAgICAgICBjb250ZXh0ID0gdGhpcyxcbiAgICAgICAgdGVtcGxhdGVzID0gW10sXG4gICAgICAgIHRlbXBsYXRlO1xuXG4gICAgLy8gd2FsayB0aGUgcHJvdG90eXBlIGNoYWluOyBCYWJlbCBkb2Vzbid0IGFsbG93IHVzaW5nXG4gICAgLy8gYHN1cGVyYCBzaW5jZSB3ZSBhcmUgb3V0c2lkZSBvZiB0aGUgQ2xhc3NcbiAgICB3aGlsZShjb250ZXh0KXtcbiAgICAgICAgY29udGV4dCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihjb250ZXh0KTtcbiAgICAgICAgaWYoIWNvbnRleHQpeyBicmVhazsgfVxuICAgICAgICAvLyBza2lwIHByb3RvdHlwZXMgd2l0aG91dCBhIHRlbXBsYXRlXG4gICAgICAgIC8vIChlbHNlIGl0IHdpbGwgcHVsbCBhbiBpbmhlcml0ZWQgdGVtcGxhdGUgYW5kIGNhdXNlIGR1cGxpY2F0ZXMpXG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlU3RyaW5nJykgfHwgY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVJZCcpKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IGNvbnRleHQuZ2V0VGVtcGxhdGVOb2RlKCk7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsYXRlcztcbn07XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAndGVtcGxhdGUnLFxuICAgIG9yZGVyOiAyMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGluc2VydChub2RlKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7fTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbi8vIHBsdWdpbnNcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9pdGVtLXRlbXBsYXRlJyk7XG5cbi8vIGxpYnJhcnlcbmxldCBtbCA9IHJlcXVpcmUoJy4vbWwnKTtcbmNvbnN0IGtleXMgPSByZXF1aXJlKCdrZXktbmF2Jyk7XG5jb25zdCBzdG9yZSA9IHJlcXVpcmUoJ3N0b3JlJyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuY29uc3QgSVRFTV9DTEFTUyA9ICdtbC1saXN0JztcbmNvbnN0IG9uRG9tUmVhZHkgPSB3aW5kb3cub25Eb21SZWFkeTtcblxuLy8gVE9ET1xuXG4vLyBzdG9yZS5zYXZlKGl0ZW0pP1xuLy8gbGlzdCB3aXRob3V0IGl0ZW0gSURzP1xuLy8gZmlyc3QtaXRlbSBzZWxlY3Rpb24gc2hvdWxkIGJlIG9wdGlvbmFsXG4vLyBuYXYta2V5cyB3b3VsZCBiZSBkaWZmZXJlbnQgd2l0aCBjZWxsc1xuLy8gdmlydHVhbCBzY3JvbGxpbmdcbi8vIGRpZmZlcmVudCByb3cgdGVtcGxhdGVzIC0tLT9cbi8vICB0ZW1wbGF0ZSBwcm9wc1xuLy8gIGVhY2hcbi8vICBpZlxuXG4vLyBtYXliZXM6XG4vLyBtLWxpc3QgaW5zdGVhZCBvZiBtbC1saXN0IChjc3MgdmFyIGZvciBwcmVmaXg/KVxuXG5jbGFzcyBMaXN0IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcbiAgICAgICAgcmV0dXJuIFsnaG9yaXpvbnRhbCcsICd2YWx1ZScsICdkaXNhYmxlZCcsICdrZXlzJywgJ211bHRpcGxlJywgJ3ZpcnR1YWwnLCAnc2VsZWN0YWJsZScsICdyb3dUZW1wbGF0ZUlkJ107XG4gICAgfVxuXG4gICAgZ2V0IHByb3BzICgpIHtcbiAgICAgICAgcmV0dXJuIFsndmFsdWUnLCAncm93VGVtcGxhdGVJZCddO1xuICAgIH1cblxuICAgIGdldCBib29scyAoKSB7XG4gICAgICAgIHJldHVybiBbJ2hvcml6b250YWwnLCAna2V5cycsICdtdWx0aXBsZScsICd2aXJ0dWFsJywgJ3NlbGVjdGFibGUnXTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgIH1cblxuICAgIGRvbVJlYWR5KCkge1xuICAgICAgICBkb20uYXR0cih0aGlzLCAndGFiaW5kZXgnLCAwKTtcbiAgICAgICAgaWYodGhpcy5jaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICAgICAgdGhpcy5hZGQoZm9ybWF0SXRlbXMoWy4uLnRoaXMuY2hpbGRyZW5dKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXROb2RlQnlJdGVtIChpdGVtKSB7XG4gICAgICAgIGxldCBpZGVudGlmaWVyID0gdGhpcy5zdG9yZS5pZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWUgPSBpdGVtW2lkZW50aWZpZXJdLFxuICAgICAgICAgICAgcSA9ICdbJyArIGlkZW50aWZpZXIgKyAnPScgKyB2YWx1ZSArICddJztcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3RvcihxKTtcbiAgICB9XG5cbiAgICByZW5kZXJTZWxlY3Rpb24gKCkge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIHNlbGVjdGVkID0gdGhpcy5zdG9yZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICBzZWxOb2RlO1xuXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0YWJsZSkge1xuICAgICAgICAgICAgZG9tLnF1ZXJ5QWxsKHRoaXMsICdbc2VsZWN0ZWRdJykuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbE5vZGUgPSB0aGlzLmdldE5vZGVCeUl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxOb2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsTm9kZSA9IHRoaXMuZ2V0Tm9kZUJ5SXRlbShzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbE5vZGUuc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gZmlyc3RcbiAgICAgICAgICAgICAgICAvLyBUT0RPIG5lZWRzIHRvIGJlIG9wdGlvbmFsXG4gICAgICAgICAgICAgICAgc2VsTm9kZSA9IHRoaXMuY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgc2VsTm9kZS5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmUuc2VsZWN0aW9uID0gc2VsTm9kZS5pZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyICgpIHtcblxuICAgICAgICBsZXRcbiAgICAgICAgICAgIGNoYW5nZXMgPSB0aGlzLnN0b3JlLmhhc0xpc3RDaGFuZ2VkLFxuICAgICAgICAgICAgZnJhZyxcbiAgICAgICAgICAgIGl0ZW1zO1xuXG4gICAgICAgIGlmKGNoYW5nZXMpIHtcbiAgICAgICAgICAgIGl0ZW1zID0gdGhpcy5zdG9yZS5xdWVyeSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbVRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2l0ZW1UZW1wbGF0ZSEnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckxpc3QoaXRlbXMsIHRoaXMpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodG9Ob2RlKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQoZnJhZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlclNlbGVjdGlvbih0aGlzKTtcblxuICAgICAgICB0aGlzLmNvbm5lY3RFdmVudHMoKTtcbiAgICB9XG5cbiAgICBhZGQgKGl0ZW1Pckl0ZW1zKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAgaWRlbnRpZmllciA9IHN0b3JlLmdldElkZW50aWZpZXIoaXRlbU9ySXRlbXMpLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiAnZmlsdGVyLHNvcnQscGFnaW5hdGUsc2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb246e211bHRpcGxlOiB0aGlzLm11bHRpcGxlfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZihpZGVudGlmaWVyICYmIGlkZW50aWZpZXIgIT09ICdpZCcpe1xuICAgICAgICAgICAgb3B0aW9ucy5pZGVudGlmaWVyID0gaWRlbnRpZmllcjtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuICAgICAgICAgICAgaWYoIXRoaXMuc3RvcmUpe1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmUgPSBzdG9yZShvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RvcmUuYWRkKGZvcm1hdEl0ZW1zKGl0ZW1Pckl0ZW1zKSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHNldCBkYXRhIChpdGVtT3JJdGVtcykge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuYWRkKGl0ZW1Pckl0ZW1zKTtcbiAgICB9XG5cbiAgICBjbGVhciAoKSB7XG4gICAgICAgIGlmKHRoaXMuc3RvcmUpe1xuICAgICAgICAgICAgdGhpcy5zdG9yZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29ubmVjdEV2ZW50cygpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW4ubGVuZ3RoICYmIHRoaXMuc2VsZWN0YWJsZSkgeyAvLyAmJiAhaXNPd25lZCh0aGlzIHRhZ25hbWU/PylcbiAgICAgICAgICAgIGlmKHRoaXMua2V5cykge1xuICAgICAgICAgICAgICAgIG1sLmtleXModGhpcywge211bHRpcGxlOiB0aGlzLm11bHRpcGxlfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5vbignY2hhbmdlJywgdGhpcy5yZW5kZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3RFdmVudHMgPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgICB9XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdtbC1saXN0JywgTGlzdCk7XG5cblxuZnVuY3Rpb24gdG9Ob2RlIChpdGVtKSB7XG4gICAgbGV0IGF0dHIgPSB7XG4gICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgfTtcbiAgICBpZihpdGVtLnNlbGVjdGVkKXtcbiAgICAgICAgYXR0ci5zZWxlY3RlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBkb20oJ2xpJywge2h0bWw6IGl0ZW0ubGFiZWwsIGlkOiBpdGVtLmlkLCBjbGFzc05hbWU6IElURU1fQ0xBU1MsIGF0dHI6YXR0cn0pO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRJdGVtcyhpdGVtT3JJdGVtcykge1xuICAgIHJldHVybiAoQXJyYXkuaXNBcnJheShpdGVtT3JJdGVtcykgPyBpdGVtT3JJdGVtcyA6IFtpdGVtT3JJdGVtc10pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZihkb20uaXNOb2RlKGl0ZW0pKXtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IGl0ZW0uaW5uZXJIVE1MXG4gICAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaXNFcXVhbCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEgPT09IHYyIHx8IHYxICsgJycgPT09IHYyICsgJycgfHwgK3YxID09PSArdjI7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlKG5vZGUpIHtcbiAgICBpZiAobm9kZS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBub2RlLnZhbHVlO1xuICAgIH1cbiAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgIH1cbiAgICBpZiAobm9kZS5pZCkge1xuICAgICAgICByZXR1cm4gbm9kZS5pZDtcbiAgICB9XG4gICAgaWYgKG5vZGUubGFiZWwpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubGFiZWw7XG4gICAgfVxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgnbGFiZWwnKSkge1xuICAgICAgICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoJ2xhYmVsJyk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLnRleHRDb250ZW50O1xufVxuXG4vL2Z1bmN0aW9uIGdldElkZW50aWZpZXIoaXRlbU9ySXRlbXMpIHtcbi8vICAgIC8vcmV0dXJuICEhbm9kZSA/IG5vZGUudmFsdWUgfHwgbm9kZS5pZCB8fCBub2RlIDogbnVsbDtcbi8vICAgIGxldCBpdGVtID0gQXJyYXkuaXNBcnJheShpdGVtT3JJdGVtcykgPyBpdGVtT3JJdGVtc1swXSA6IGl0ZW1Pckl0ZW1zO1xuLy8gICAgaWYoaXRlbS5pZCl7XG4vLyAgICAgICAgcmV0dXJuICdpZCc7XG4vLyAgICB9XG4vLyAgICBpZiAoaXRlbS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4vLyAgICAgICAgcmV0dXJuICd2YWx1ZSc7XG4vLyAgICB9XG4vLyAgICBpZihpdGVtLm5hbWUpe1xuLy8gICAgICAgIHJldHVybiAnbmFtZSc7XG4vLyAgICB9XG4vLyAgICBpZiAoaXRlbS5sYWJlbCkge1xuLy8gICAgICAgIHJldHVybiAnbGFiZWwnO1xuLy8gICAgfVxuLy8gICAgY29uc29sZS5lcnJvcignaXRlbXMgbXVzdCBoYXZlIHVzZSBvZiB0aGUgZm9sbG93aW5nIGlkZW50aWZpZXJzOiBgaWRgLCBgdmFsdWVgLCBgbmFtZWAsIGBsYWJlbGAnKTtcbi8vICAgIHJldHVybiBudWxsO1xuLy99XG5cbmZ1bmN0aW9uIGlzT3duZWQobm9kZSwgdGFnTmFtZSkge1xuICAgIHdoaWxlIChub2RlICYmIG5vZGUubG9jYWxOYW1lICE9PSAnYm9keScpIHtcbiAgICAgICAgaWYgKG5vZGUubG9jYWxOYW1lID09PSB0YWdOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlzdDsiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xucmVxdWlyZSgnLi9MaXN0Jyk7XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2Jhc2UtY29tcG9uZW50JywgQmFzZUNvbXBvbmVudCk7XG5cbiIsImNvbnN0IGtleXMgPSByZXF1aXJlKCdrZXktbmF2Jyk7XG5jb25zdCBzdG9yZSA9IHJlcXVpcmUoJ3N0b3JlJyk7XG5cbmZ1bmN0aW9uIGdldFZhbHVlIChub2RlLCBpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBrZXlzIChub2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCBjb250cm9sbGVyID0ga2V5cyhub2RlLCB7cm9sZXM6dHJ1ZX0pO1xuICAgICAgICBub2RlLnJlZ2lzdGVySGFuZGxlKG9uLm1ha2VNdWx0aUhhbmRsZShjb250cm9sbGVyLmhhbmRsZXMpKTtcbiAgICAgICAgbm9kZS5vbigna2V5LXNlbGVjdCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgbGV0XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllciA9IG5vZGUuc3RvcmUuaWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICBzZWxOb2RlID0gZXZlbnQuZGV0YWlsLnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gZ2V0VmFsdWUoc2VsTm9kZSwgaWRlbnRpZmllcik7XG4gICAgICAgICAgICBub2RlLnN0b3JlLnNlbGVjdGlvbiA9IHZhbHVlO1xuICAgICAgICAgICAgbm9kZS5lbWl0KCdjaGFuZ2UnLCB7dmFsdWU6IG5vZGUuc3RvcmUuc2VsZWN0aW9ufSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZihvcHRpb25zLm11bHRpcGxlKXtcbiAgICAgICAgICAgIG5vZGUub24oZG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGUua2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ01ldGEnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdDb250cm9sJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQ29tbWFuZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0b3JlLmNvbnRyb2wgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NoaWZ0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc3RvcmUuc2hpZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBub2RlLm9uKGRvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuc3RvcmUuY29udHJvbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIG5vZGUuc3RvcmUuc2hpZnQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBjb252ZXJ0QnJhY2VzVG9SZWZzOiBmdW5jdGlvbiAoZnJhZykge1xuICAgICAgICB2YXIgcmVmcyA9IHt9O1xuICAgICAgICB3YWxrRG9tKGZyYWcuY2hpbGRyZW5bMF0sIHJlZnMpO1xuICAgICAgICByZXR1cm4gcmVmcztcbiAgICB9XG59O1xuXG5mdW5jdGlvbiB3YWxrRG9tIChub2RlLCByZWZzKSB7XG4gICAgdmFyIGk7XG4gICAgaWYoIW5vZGUuY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgaWYoL1xce1xcey8udGVzdChub2RlLmlubmVySFRNTCkpe1xuICAgICAgICAgICAgcmVmc1tub2RlLmlubmVySFRNTC5yZXBsYWNlKCd7eycsJycpLnJlcGxhY2UoJ319JywnJyldID0gbm9kZTtcbiAgICAgICAgICAgIG5vZGUuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IoaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgd2Fsa0RvbShub2RlLmNoaWxkcmVuW2ldLCByZWZzKTtcbiAgICB9XG59Il19
