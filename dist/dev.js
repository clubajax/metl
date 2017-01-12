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
        return ['horizontal', 'value', 'disabled', 'keys', 'multiple', 'virtual', 'selectable', 'rowTemplateId', 'no-default'];
    }

    get props () {
        return ['value', 'rowTemplateId'];
    }

    get bools () {
        return ['horizontal', 'keys', 'multiple', 'virtual', 'selectable', 'no-default'];
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
        console.log('renderSelection');
        if(this.selectable) {
            dom.queryAll(this, '[selected]').forEach(function (node) {
                node.removeAttribute('selected');
            });

            if (selected) {
                console.log('s...');
                if (this.multiple) {
                    console.log('s1');
                    selected.forEach(function (item) {
                        selNode = this.getNodeByItem(item);
                        selNode.setAttribute('selected', '');
                    }, this);
                }
                else {
                    console.log('s2');
                    selNode = this.getNodeByItem(selected);
                    selNode.setAttribute('selected', '');
                }

            }
            else if(!this['no-default']){

                console.log('DEF?', this['no-default']);
                // default to first
                // TODO needs to be optional
                selNode = this.children[0];
                selNode.setAttribute('selected', '');
                this.store.selection = selNode.id;
            }
            else{
                console.log('no selection');
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
        let controller = keys(node, {roles:true, noDefault: node['no-default']});
        node.registerHandle(on.makeMultiHandle(controller.handles));
        node.on('key-select', function (event) {
            console.log('ON KEY');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvQmFzZUNvbXBvbmVudC5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9pdGVtLXRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvdGVtcGxhdGUuanMiLCJzcmMvTGlzdC5qcyIsInNyYy9idWlsZC5qcyIsInNyYy9tbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gY2xhc3MvY29tcG9uZW50IHJ1bGVzXG4vLyBhbHdheXMgY2FsbCBzdXBlcigpIGZpcnN0IGluIHRoZSBjdG9yLiBUaGlzIGFsc28gY2FsbHMgdGhlIGV4dGVuZGVkIGNsYXNzJyBjdG9yLlxuLy8gY2Fubm90IGNhbGwgTkVXIG9uIGEgQ29tcG9uZW50IGNsYXNzXG5cbi8vIENsYXNzZXMgaHR0cDovL2V4cGxvcmluZ2pzLmNvbS9lczYvY2hfY2xhc3Nlcy5odG1sI190aGUtc3BlY2llcy1wYXR0ZXJuLWluLXN0YXRpYy1tZXRob2RzXG5cbmNvbnN0IG9uID0gcmVxdWlyZSgnb24nKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5jbGFzcyBCYXNlQ29tcG9uZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl91aWQgPSBkb20udWlkKHRoaXMubG9jYWxOYW1lKTtcbiAgICAgICAgcHJpdmF0ZXNbdGhpcy5fdWlkXSA9IHtET01TVEFURTogJ2NyZWF0ZWQnfTtcbiAgICAgICAgcHJpdmF0ZXNbdGhpcy5fdWlkXS5oYW5kbGVMaXN0ID0gW107XG4gICAgICAgIHBsdWdpbignaW5pdCcsIHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgcHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURSA9ICdjb25uZWN0ZWQnO1xuICAgICAgICBwbHVnaW4oJ3ByZUNvbm5lY3RlZCcsIHRoaXMpO1xuICAgICAgICBuZXh0VGljayhvbkNoZWNrRG9tUmVhZHkuYmluZCh0aGlzKSk7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpcmUoJ2Nvbm5lY3RlZCcpO1xuICAgICAgICBwbHVnaW4oJ3Bvc3RDb25uZWN0ZWQnLCB0aGlzKTtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgcHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURSA9ICdkaXNjb25uZWN0ZWQnO1xuICAgICAgICBwbHVnaW4oJ3ByZURpc2Nvbm5lY3RlZCcsIHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJlKCdkaXNjb25uZWN0ZWQnKTtcbiAgICB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKSB7XG4gICAgICAgIHBsdWdpbigncHJlQXR0cmlidXRlQ2hhbmdlZCcsIHRoaXMsIGF0dHJOYW1lLCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZUNoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlQ2hhbmdlZChhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5maXJlKCdkZXN0cm95Jyk7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICAgICAgICAgIGhhbmRsZS5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRvbS5kZXN0cm95KHRoaXMpO1xuICAgIH1cblxuICAgIGZpcmUoZXZlbnROYW1lLCBldmVudERldGFpbCwgYnViYmxlcykge1xuICAgICAgICByZXR1cm4gb24uZmlyZSh0aGlzLCBldmVudE5hbWUsIGV2ZW50RGV0YWlsLCBidWJibGVzKTtcbiAgICB9XG5cbiAgICBlbWl0KGV2ZW50TmFtZSwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9uLmVtaXQodGhpcywgZXZlbnROYW1lLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgb24obm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJIYW5kbGUoXG4gICAgICAgICAgICB0eXBlb2Ygbm9kZSAhPSAnc3RyaW5nJyA/IC8vIG5vIG5vZGUgaXMgc3VwcGxpZWRcbiAgICAgICAgICAgICAgICBvbihub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykgOlxuICAgICAgICAgICAgICAgIG9uKHRoaXMsIG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IpKTtcbiAgICB9XG5cbiAgICBvbmNlKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuICAgICAgICAgICAgdHlwZW9mIG5vZGUgIT0gJ3N0cmluZycgPyAvLyBubyBub2RlIGlzIHN1cHBsaWVkXG4gICAgICAgICAgICAgICAgb24ub25jZShub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykgOlxuICAgICAgICAgICAgICAgIG9uLm9uY2UodGhpcywgbm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spKTtcbiAgICB9XG5cbiAgICByZWdpc3RlckhhbmRsZShoYW5kbGUpIHtcbiAgICAgICAgcHJpdmF0ZXNbdGhpcy5fdWlkXS5oYW5kbGVMaXN0LnB1c2goaGFuZGxlKTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZTtcbiAgICB9XG5cbiAgICBnZXQgRE9NU1RBVEUoKSB7XG4gICAgICAgIHJldHVybiBwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFO1xuICAgIH1cblxuICAgIHN0YXRpYyBjbG9uZSh0ZW1wbGF0ZSkge1xuICAgICAgICBpZiAodGVtcGxhdGUuY29udGVudCAmJiB0ZW1wbGF0ZS5jb250ZW50LmNoaWxkcmVuKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQuaW1wb3J0Tm9kZSh0ZW1wbGF0ZS5jb250ZW50LCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICAgICAgICBjbG9uZU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY2xvbmVOb2RlLmlubmVySFRNTCA9IHRlbXBsYXRlLmlubmVySFRNTDtcblxuICAgICAgICB3aGlsZSAoY2xvbmVOb2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChjbG9uZU5vZGUuY2hpbGRyZW5bMF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcmFnO1xuICAgIH1cblxuICAgIHN0YXRpYyBhZGRQbHVnaW4ocGx1Zykge1xuICAgICAgICB2YXIgaSwgb3JkZXIgPSBwbHVnLm9yZGVyIHx8IDEwMDtcbiAgICAgICAgaWYgKCFwbHVnaW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgcGx1Z2lucy5wdXNoKHBsdWcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHBsdWdpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAocGx1Z2luc1swXS5vcmRlciA8PSBvcmRlcikge1xuICAgICAgICAgICAgICAgIHBsdWdpbnMucHVzaChwbHVnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsdWdpbnMudW5zaGlmdChwbHVnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwbHVnaW5zWzBdLm9yZGVyID4gb3JkZXIpIHtcbiAgICAgICAgICAgIHBsdWdpbnMudW5zaGlmdChwbHVnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgZm9yIChpID0gMTsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAob3JkZXIgPT09IHBsdWdpbnNbaSAtIDFdLm9yZGVyIHx8IChvcmRlciA+IHBsdWdpbnNbaSAtIDFdLm9yZGVyICYmIG9yZGVyIDwgcGx1Z2luc1tpXS5vcmRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcGx1Z2lucy5zcGxpY2UoaSwgMCwgcGx1Zyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB3YXMgbm90IGluc2VydGVkLi4uXG4gICAgICAgICAgICBwbHVnaW5zLnB1c2gocGx1Zyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmxldFxuICAgIHByaXZhdGVzID0ge30sXG4gICAgcGx1Z2lucyA9IFtdO1xuXG5mdW5jdGlvbiBwbHVnaW4obWV0aG9kLCBub2RlLCBhLCBiLCBjKSB7XG4gICAgcGx1Z2lucy5mb3JFYWNoKGZ1bmN0aW9uIChwbHVnKSB7XG4gICAgICAgIGlmIChwbHVnW21ldGhvZF0pIHtcbiAgICAgICAgICAgIHBsdWdbbWV0aG9kXShub2RlLCBhLCBiLCBjKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBvbkNoZWNrRG9tUmVhZHkoKSB7XG4gICAgaWYgKHRoaXMuRE9NU1RBVEUgIT0gJ2Nvbm5lY3RlZCcgfHwgcHJpdmF0ZXNbdGhpcy5fdWlkXS5kb21SZWFkeUZpcmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXJcbiAgICAgICAgY291bnQgPSAwLFxuICAgICAgICBjaGlsZHJlbiA9IGdldENoaWxkQ3VzdG9tTm9kZXModGhpcyksXG4gICAgICAgIG91ckRvbVJlYWR5ID0gb25Eb21SZWFkeS5iaW5kKHRoaXMpO1xuXG4gICAgZnVuY3Rpb24gYWRkUmVhZHkoKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIGlmIChjb3VudCA9PSBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIG91ckRvbVJlYWR5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBubyBjaGlsZHJlbiwgd2UncmUgZ29vZCAtIGxlYWYgbm9kZS4gQ29tbWVuY2Ugd2l0aCBvbkRvbVJlYWR5XG4gICAgLy9cbiAgICBpZiAoIWNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBvdXJEb21SZWFkeSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gZWxzZSwgd2FpdCBmb3IgYWxsIGNoaWxkcmVuIHRvIGZpcmUgdGhlaXIgYHJlYWR5YCBldmVudHNcbiAgICAgICAgLy9cbiAgICAgICAgY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGNoaWxkIGlzIGFscmVhZHkgcmVhZHlcbiAgICAgICAgICAgIGlmIChjaGlsZC5ET01TVEFURSA9PSAnZG9tcmVhZHknKSB7XG4gICAgICAgICAgICAgICAgYWRkUmVhZHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmIG5vdCwgd2FpdCBmb3IgZXZlbnRcbiAgICAgICAgICAgIGNoaWxkLm9uKCdkb21yZWFkeScsIGFkZFJlYWR5KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBvbkRvbVJlYWR5KCkge1xuICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSAnZG9tcmVhZHknO1xuICAgIC8vIGRvbVJlYWR5IHNob3VsZCBvbmx5IGV2ZXIgZmlyZSBvbmNlXG4gICAgcHJpdmF0ZXNbdGhpcy5fdWlkXS5kb21SZWFkeUZpcmVkID0gdHJ1ZTtcbiAgICBwbHVnaW4oJ3ByZURvbVJlYWR5JywgdGhpcyk7XG4gICAgLy8gY2FsbCB0aGlzLmRvbVJlYWR5IGZpcnN0LCBzbyB0aGF0IHRoZSBjb21wb25lbnRcbiAgICAvLyBjYW4gZmluaXNoIGluaXRpYWxpemluZyBiZWZvcmUgZmlyaW5nIGFueVxuICAgIC8vIHN1YnNlcXVlbnQgZXZlbnRzXG4gICAgaWYgKHRoaXMuZG9tUmVhZHkpIHtcbiAgICAgICAgdGhpcy5kb21SZWFkeSgpO1xuICAgICAgICB0aGlzLmRvbVJlYWR5ID0gZnVuY3Rpb24gKCkge307XG4gICAgfVxuXG4gICAgdGhpcy5maXJlKCdkb21yZWFkeScpO1xuXG4gICAgcGx1Z2luKCdwb3N0RG9tUmVhZHknLCB0aGlzKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2hpbGRDdXN0b21Ob2Rlcyhub2RlKSB7XG4gICAgLy8gY29sbGVjdCBhbnkgY2hpbGRyZW4gdGhhdCBhcmUgY3VzdG9tIG5vZGVzXG4gICAgLy8gdXNlZCB0byBjaGVjayBpZiB0aGVpciBkb20gaXMgcmVhZHkgYmVmb3JlXG4gICAgLy8gZGV0ZXJtaW5pbmcgaWYgdGhpcyBpcyByZWFkeVxuICAgIHZhciBpLCBub2RlcyA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuW2ldLm5vZGVOYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAgICAgICBub2Rlcy5wdXNoKG5vZGUuY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2Rlcztcbn1cblxuZnVuY3Rpb24gbmV4dFRpY2soY2IpIHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2IpO1xufVxuXG53aW5kb3cub25Eb21SZWFkeSA9IGZ1bmN0aW9uIChub2RlLCBjYWxsYmFjaykge1xuICAgIGZ1bmN0aW9uIG9uUmVhZHkgKCkge1xuICAgICAgICBjYWxsYmFjayhub2RlKTtcbiAgICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdkb21yZWFkeScsIG9uUmVhZHkpO1xuICAgIH1cbiAgICBpZihub2RlLkRPTVNUQVRFID09PSAnZG9tcmVhZHknKXtcbiAgICAgICAgY2FsbGJhY2sobm9kZSk7XG4gICAgfWVsc2V7XG4gICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcignZG9tcmVhZHknLCBvblJlYWR5KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VDb21wb25lbnQ7IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmZ1bmN0aW9uIHdhbGtEb20gKG5vZGUsIHJlZnMpIHtcblxuICAgIGlmKG5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGlmKC9cXHtcXHsvLnRlc3Qobm9kZS5hdHRyaWJ1dGVzW2ldLnZhbHVlKSl7XG4gICAgICAgICAgICAgICAgcmVmcy5hdHRyaWJ1dGVzID0gcmVmcy5hdHRyaWJ1dGVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIC8vIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmU/P1xuICAgICAgICAgICAgICAgIC8vIHNhbWUgd2l0aCBub2RlP1xuICAgICAgICAgICAgICAgIHJlZnMuYXR0cmlidXRlc1tub2RlLmF0dHJpYnV0ZXNbaV0ubmFtZV0gPSBub2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYoIW5vZGUuY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgaWYoL1xce1xcey8udGVzdChub2RlLmlubmVySFRNTCkpe1xuICAgICAgICAgICAgcmVmc1tub2RlLmlubmVySFRNTC5yZXBsYWNlKCd7eycsJycpLnJlcGxhY2UoJ319JywnJyldID0gbm9kZTtcbiAgICAgICAgICAgIG5vZGUuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHdhbGtEb20obm9kZS5jaGlsZHJlbltpXSwgcmVmcyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVJdGVtVGVtcGxhdGUgKGZyYWcpIHtcbiAgICBsZXQgcmVmcyA9IHt9O1xuICAgIHdhbGtEb20oZnJhZywgcmVmcyk7XG4gICAgcmV0dXJuIHJlZnM7XG59XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLnJlbmRlckxpc3QgPSBmdW5jdGlvbiAoaXRlbXMsIGNvbnRhaW5lciwgaXRlbVRlbXBsYXRlKSB7XG4gICAgbGV0XG4gICAgICAgIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICAgIHRtcGwgPSBpdGVtVGVtcGxhdGUgfHwgdGhpcy5pdGVtVGVtcGxhdGUsXG4gICAgICAgIHJlZnMgPSB0bXBsLml0ZW1SZWZzLFxuICAgICAgICBjbG9uZSxcbiAgICAgICAgZGVmZXI7XG5cbiAgICBmdW5jdGlvbiB3YXJuIChuYW1lKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWZlcik7XG4gICAgICAgIGRlZmVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dGVtcHRlZCB0byBzZXQgYXR0cmlidXRlIGZyb20gbm9uLWV4aXN0ZW50IGl0ZW0gcHJvcGVydHk6JywgbmFtZSk7XG4gICAgICAgIH0sMSk7XG4gICAgfVxuXG4gICAgaXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBPYmplY3Qua2V5cyhpdGVtKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGlmKHJlZnNba2V5XSl7XG4gICAgICAgICAgICAgICAgcmVmc1trZXldLmlubmVySFRNTCA9IGl0ZW1ba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmKHJlZnMuYXR0cmlidXRlcyl7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhyZWZzLmF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgbm9kZSA9IHJlZnMuYXR0cmlidXRlc1tuYW1lXTtcbiAgICAgICAgICAgICAgICBpZihpdGVtW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgaXRlbVtuYW1lXSk7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHdhcm4obmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjbG9uZSA9IHRtcGwuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICBmcmFnLmFwcGVuZENoaWxkKGNsb25lKTtcbiAgICB9KTtcblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnKTtcbn07XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAnaXRlbS10ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDQwLFxuICAgIHByZURvbVJlYWR5OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZSA9IGRvbS5xdWVyeShub2RlLCAndGVtcGxhdGUnKTtcbiAgICAgICAgaWYobm9kZS5pdGVtVGVtcGxhdGUpe1xuICAgICAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlLml0ZW1UZW1wbGF0ZSk7XG4gICAgICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZSA9IEJhc2VDb21wb25lbnQuY2xvbmUobm9kZS5pdGVtVGVtcGxhdGUpO1xuICAgICAgICAgICAgbm9kZS5pdGVtVGVtcGxhdGUuaXRlbVJlZnMgPSB1cGRhdGVJdGVtVGVtcGxhdGUobm9kZS5pdGVtVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge307IiwiY29uc3QgQmFzZUNvbXBvbmVudCAgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5mdW5jdGlvbiBzZXRCb29sZWFuIChub2RlLCBwcm9wKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgZ2V0ICgpIHtcbiAgICAgICAgICAgIGlmKG5vZGUuaGFzQXR0cmlidXRlKHByb3ApKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9tLm5vcm1hbGl6ZShub2RlLmdldEF0dHJpYnV0ZShwcm9wKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmKHZhbHVlKXtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCAnJyk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eSAobm9kZSwgcHJvcCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldCAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9tLm5vcm1hbGl6ZSh0aGlzLmdldEF0dHJpYnV0ZShwcm9wKSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKHByb3AsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0aWVzIChub2RlKSB7XG4gICAgbGV0IHByb3BzID0gbm9kZS5wcm9wcyB8fCBub2RlLnByb3BlcnRpZXM7XG4gICAgaWYocHJvcHMpIHtcbiAgICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgaWYocHJvcCA9PT0gJ2Rpc2FibGVkJyl7XG4gICAgICAgICAgICAgICAgc2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgc2V0UHJvcGVydHkobm9kZSwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0Qm9vbGVhbnMgKG5vZGUpIHtcbiAgICBsZXQgcHJvcHMgPSBub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnM7XG4gICAgaWYocHJvcHMpIHtcbiAgICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgc2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3Byb3BlcnRpZXMnLFxuICAgIG9yZGVyOiAxMCxcbiAgICBpbml0OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBzZXRQcm9wZXJ0aWVzKG5vZGUpO1xuICAgICAgICBzZXRCb29sZWFucyhub2RlKTtcbiAgICB9LFxuICAgIHByZUF0dHJpYnV0ZUNoYW5nZWQ6IGZ1bmN0aW9uIChub2RlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0aGlzW25hbWVdID0gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG4gICAgICAgIGlmKCF2YWx1ZSAmJiAobm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zIHx8IFtdKS5pbmRleE9mKG5hbWUpKXtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge307IiwiY29uc3QgQmFzZUNvbXBvbmVudCAgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG52YXJcbiAgICBsaWdodE5vZGVzID0ge30sXG4gICAgaW5zZXJ0ZWQgPSB7fTtcblxuZnVuY3Rpb24gaW5zZXJ0IChub2RlKSB7XG4gICAgaWYoaW5zZXJ0ZWRbbm9kZS5fdWlkXSB8fCAhaGFzVGVtcGxhdGUobm9kZSkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpO1xuICAgIGluc2VydFRlbXBsYXRlKG5vZGUpO1xuICAgIGluc2VydGVkW25vZGUuX3VpZF0gPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0TGlnaHROb2Rlcyhub2RlKXtcbiAgICBsaWdodE5vZGVzW25vZGUuX3VpZF0gPSBsaWdodE5vZGVzW25vZGUuX3VpZF0gfHwgW107XG4gICAgd2hpbGUobm9kZS5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXS5wdXNoKG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5jaGlsZE5vZGVzWzBdKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNUZW1wbGF0ZSAobm9kZSkge1xuICAgIHJldHVybiAhIW5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlQ2hhaW4gKG5vZGUpIHtcbiAgICB2YXIgdGVtcGxhdGVzID0gbm9kZS5nZXRUZW1wbGF0ZUNoYWluKCk7XG4gICAgdGVtcGxhdGVzLnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbGF0ZSkge1xuICAgICAgICBnZXRDb250YWluZXIobm9kZSkuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZSkpO1xuICAgIH0pO1xuICAgIGluc2VydENoaWxkcmVuKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZW1wbGF0ZSAobm9kZSkge1xuICAgIGlmKG5vZGUubmVzdGVkVGVtcGxhdGUpe1xuICAgICAgICBpbnNlcnRUZW1wbGF0ZUNoYWluKG5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhclxuICAgICAgICB0ZW1wbGF0ZU5vZGUgPSBub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xuXG4gICAgaWYodGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZU5vZGUpKTtcbiAgICB9XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lciAobm9kZSkge1xuICAgIHZhciBjb250YWluZXJzID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKCdbcmVmPVwiY29udGFpbmVyXCJdJyk7XG4gICAgaWYoIWNvbnRhaW5lcnMgfHwgIWNvbnRhaW5lcnMubGVuZ3RoKXtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJzW2NvbnRhaW5lcnMubGVuZ3RoIC0gMV07XG59XG5cbmZ1bmN0aW9uIGluc2VydENoaWxkcmVuIChub2RlKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGNvbnRhaW5lciA9IGdldENvbnRhaW5lcihub2RlKSxcbiAgICAgICAgY2hpbGRyZW4gPSBsaWdodE5vZGVzW25vZGUuX3VpZF07XG5cbiAgICBpZihjb250YWluZXIgJiYgY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0TGlnaHROb2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGlnaHROb2Rlc1t0aGlzLl91aWRdO1xufTtcblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0VGVtcGxhdGVOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGNhY2hpbmcgY2F1c2VzIGRpZmZlcmVudCBjbGFzc2VzIHRvIHB1bGwgdGhlIHNhbWUgdGVtcGxhdGUgLSB3YXQ/XG4gICAgLy9pZighdGhpcy50ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgaWYgKHRoaXMudGVtcGxhdGVJZCkge1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZU5vZGUgPSBkb20uYnlJZCh0aGlzLnRlbXBsYXRlSWQucmVwbGFjZSgnIycsJycpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRlbXBsYXRlU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS50b0RvbSgnPHRlbXBsYXRlPicgKyB0aGlzLnRlbXBsYXRlU3RyaW5nICsgJzwvdGVtcGxhdGU+Jyk7XG4gICAgICAgIH1cbiAgICAvL31cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZU5vZGU7XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUNoYWluID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0XG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICB0ZW1wbGF0ZXMgPSBbXSxcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICAvLyB3YWxrIHRoZSBwcm90b3R5cGUgY2hhaW47IEJhYmVsIGRvZXNuJ3QgYWxsb3cgdXNpbmdcbiAgICAvLyBgc3VwZXJgIHNpbmNlIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBDbGFzc1xuICAgIHdoaWxlKGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbnRleHQpO1xuICAgICAgICBpZighY29udGV4dCl7IGJyZWFrOyB9XG4gICAgICAgIC8vIHNraXAgcHJvdG90eXBlcyB3aXRob3V0IGEgdGVtcGxhdGVcbiAgICAgICAgLy8gKGVsc2UgaXQgd2lsbCBwdWxsIGFuIGluaGVyaXRlZCB0ZW1wbGF0ZSBhbmQgY2F1c2UgZHVwbGljYXRlcylcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVTdHJpbmcnKSB8fCBjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZUlkJykpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gY29udGV4dC5nZXRUZW1wbGF0ZU5vZGUoKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVzO1xufTtcblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICd0ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDIwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaW5zZXJ0KG5vZGUpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHt9OyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuLy8gcGx1Z2luc1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcycpO1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvdGVtcGxhdGUnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL2l0ZW0tdGVtcGxhdGUnKTtcblxuLy8gbGlicmFyeVxubGV0IG1sID0gcmVxdWlyZSgnLi9tbCcpO1xuY29uc3Qga2V5cyA9IHJlcXVpcmUoJ2tleS1uYXYnKTtcbmNvbnN0IHN0b3JlID0gcmVxdWlyZSgnc3RvcmUnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5jb25zdCBJVEVNX0NMQVNTID0gJ21sLWxpc3QnO1xuY29uc3Qgb25Eb21SZWFkeSA9IHdpbmRvdy5vbkRvbVJlYWR5O1xuXG4vLyBUT0RPXG5cbi8vIHN0b3JlLnNhdmUoaXRlbSk/XG4vLyBmaXJzdC1pdGVtIHNlbGVjdGlvbiBzaG91bGQgYmUgb3B0aW9uYWxcbi8vIG5hdi1rZXlzIHdvdWxkIGJlIGRpZmZlcmVudCB3aXRoIGNlbGxzXG4vLyB2aXJ0dWFsIHNjcm9sbGluZ1xuLy8gZGlmZmVyZW50IHJvdyB0ZW1wbGF0ZXMgLS0tP1xuLy8gIHRlbXBsYXRlIHByb3BzXG4vLyAgZWFjaFxuLy8gIGlmXG5cbi8vIG1heWJlczpcbi8vIG0tbGlzdCBpbnN0ZWFkIG9mIG1sLWxpc3QgKGNzcyB2YXIgZm9yIHByZWZpeD8pXG5cbmNsYXNzIExpc3QgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkge1xuICAgICAgICByZXR1cm4gWydob3Jpem9udGFsJywgJ3ZhbHVlJywgJ2Rpc2FibGVkJywgJ2tleXMnLCAnbXVsdGlwbGUnLCAndmlydHVhbCcsICdzZWxlY3RhYmxlJywgJ3Jvd1RlbXBsYXRlSWQnLCAnbm8tZGVmYXVsdCddO1xuICAgIH1cblxuICAgIGdldCBwcm9wcyAoKSB7XG4gICAgICAgIHJldHVybiBbJ3ZhbHVlJywgJ3Jvd1RlbXBsYXRlSWQnXTtcbiAgICB9XG5cbiAgICBnZXQgYm9vbHMgKCkge1xuICAgICAgICByZXR1cm4gWydob3Jpem9udGFsJywgJ2tleXMnLCAnbXVsdGlwbGUnLCAndmlydHVhbCcsICdzZWxlY3RhYmxlJywgJ25vLWRlZmF1bHQnXTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgIH1cblxuICAgIGRvbVJlYWR5KCkge1xuICAgICAgICBkb20uYXR0cih0aGlzLCAndGFiaW5kZXgnLCAwKTtcbiAgICAgICAgaWYodGhpcy5jaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICAgICAgdGhpcy5hZGQoZm9ybWF0SXRlbXMoWy4uLnRoaXMuY2hpbGRyZW5dKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXROb2RlQnlJdGVtIChpdGVtKSB7XG4gICAgICAgIGxldCBpZGVudGlmaWVyID0gdGhpcy5zdG9yZS5pZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWUgPSBpdGVtW2lkZW50aWZpZXJdLFxuICAgICAgICAgICAgcSA9ICdbJyArIGlkZW50aWZpZXIgKyAnPScgKyB2YWx1ZSArICddJztcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3RvcihxKTtcbiAgICB9XG5cbiAgICByZW5kZXJTZWxlY3Rpb24gKCkge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIHNlbGVjdGVkID0gdGhpcy5zdG9yZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICBzZWxOb2RlO1xuICAgICAgICBjb25zb2xlLmxvZygncmVuZGVyU2VsZWN0aW9uJyk7XG4gICAgICAgIGlmKHRoaXMuc2VsZWN0YWJsZSkge1xuICAgICAgICAgICAgZG9tLnF1ZXJ5QWxsKHRoaXMsICdbc2VsZWN0ZWRdJykuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzLi4uJyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3MxJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbE5vZGUgPSB0aGlzLmdldE5vZGVCeUl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxOb2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3MyJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbE5vZGUgPSB0aGlzLmdldE5vZGVCeUl0ZW0oc2VsZWN0ZWQpO1xuICAgICAgICAgICAgICAgICAgICBzZWxOb2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmKCF0aGlzWyduby1kZWZhdWx0J10pe1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RFRj8nLCB0aGlzWyduby1kZWZhdWx0J10pO1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gZmlyc3RcbiAgICAgICAgICAgICAgICAvLyBUT0RPIG5lZWRzIHRvIGJlIG9wdGlvbmFsXG4gICAgICAgICAgICAgICAgc2VsTm9kZSA9IHRoaXMuY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgc2VsTm9kZS5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmUuc2VsZWN0aW9uID0gc2VsTm9kZS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHNlbGVjdGlvbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIgKCkge1xuXG4gICAgICAgIGxldFxuICAgICAgICAgICAgY2hhbmdlcyA9IHRoaXMuc3RvcmUuaGFzTGlzdENoYW5nZWQsXG4gICAgICAgICAgICBmcmFnLFxuICAgICAgICAgICAgaXRlbXM7XG5cbiAgICAgICAgaWYoY2hhbmdlcykge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnN0b3JlLnF1ZXJ5KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckxpc3QoaXRlbXMsIHRoaXMpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodG9Ob2RlKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQoZnJhZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlclNlbGVjdGlvbih0aGlzKTtcblxuICAgICAgICB0aGlzLmNvbm5lY3RFdmVudHMoKTtcbiAgICB9XG5cbiAgICBhZGQgKGl0ZW1Pckl0ZW1zKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAgaWRlbnRpZmllciA9IHN0b3JlLmdldElkZW50aWZpZXIoaXRlbU9ySXRlbXMpLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiAnZmlsdGVyLHNvcnQscGFnaW5hdGUsc2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb246e211bHRpcGxlOiB0aGlzLm11bHRpcGxlfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZihpZGVudGlmaWVyICYmIGlkZW50aWZpZXIgIT09ICdpZCcpe1xuICAgICAgICAgICAgb3B0aW9ucy5pZGVudGlmaWVyID0gaWRlbnRpZmllcjtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuICAgICAgICAgICAgaWYoIXRoaXMuc3RvcmUpe1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmUgPSBzdG9yZShvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RvcmUuYWRkKGZvcm1hdEl0ZW1zKGl0ZW1Pckl0ZW1zKSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHNldCBkYXRhIChpdGVtT3JJdGVtcykge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuYWRkKGl0ZW1Pckl0ZW1zKTtcbiAgICB9XG5cbiAgICBjbGVhciAoKSB7XG4gICAgICAgIGlmKHRoaXMuc3RvcmUpe1xuICAgICAgICAgICAgdGhpcy5zdG9yZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29ubmVjdEV2ZW50cygpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW4ubGVuZ3RoICYmIHRoaXMuc2VsZWN0YWJsZSkgeyAvLyAmJiAhaXNPd25lZCh0aGlzIHRhZ25hbWU/PylcbiAgICAgICAgICAgIGlmKHRoaXMua2V5cykge1xuICAgICAgICAgICAgICAgIG1sLmtleXModGhpcywge211bHRpcGxlOiB0aGlzLm11bHRpcGxlfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5vbignY2hhbmdlJywgdGhpcy5yZW5kZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3RFdmVudHMgPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgICB9XG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdtbC1saXN0JywgTGlzdCk7XG5cblxuZnVuY3Rpb24gdG9Ob2RlIChpdGVtKSB7XG4gICAgbGV0IGF0dHIgPSB7XG4gICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgfTtcbiAgICBpZihpdGVtLnNlbGVjdGVkKXtcbiAgICAgICAgYXR0ci5zZWxlY3RlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBkb20oJ2xpJywge2h0bWw6IGl0ZW0ubGFiZWwsIGlkOiBpdGVtLmlkLCBjbGFzc05hbWU6IElURU1fQ0xBU1MsIGF0dHI6YXR0cn0pO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRJdGVtcyhpdGVtT3JJdGVtcykge1xuICAgIHJldHVybiAoQXJyYXkuaXNBcnJheShpdGVtT3JJdGVtcykgPyBpdGVtT3JJdGVtcyA6IFtpdGVtT3JJdGVtc10pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZihkb20uaXNOb2RlKGl0ZW0pKXtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IGl0ZW0uaW5uZXJIVE1MXG4gICAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaXNFcXVhbCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEgPT09IHYyIHx8IHYxICsgJycgPT09IHYyICsgJycgfHwgK3YxID09PSArdjI7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlKG5vZGUpIHtcbiAgICBpZiAobm9kZS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBub2RlLnZhbHVlO1xuICAgIH1cbiAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgIH1cbiAgICBpZiAobm9kZS5pZCkge1xuICAgICAgICByZXR1cm4gbm9kZS5pZDtcbiAgICB9XG4gICAgaWYgKG5vZGUubGFiZWwpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubGFiZWw7XG4gICAgfVxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgnbGFiZWwnKSkge1xuICAgICAgICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoJ2xhYmVsJyk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLnRleHRDb250ZW50O1xufVxuXG4vL2Z1bmN0aW9uIGdldElkZW50aWZpZXIoaXRlbU9ySXRlbXMpIHtcbi8vICAgIC8vcmV0dXJuICEhbm9kZSA/IG5vZGUudmFsdWUgfHwgbm9kZS5pZCB8fCBub2RlIDogbnVsbDtcbi8vICAgIGxldCBpdGVtID0gQXJyYXkuaXNBcnJheShpdGVtT3JJdGVtcykgPyBpdGVtT3JJdGVtc1swXSA6IGl0ZW1Pckl0ZW1zO1xuLy8gICAgaWYoaXRlbS5pZCl7XG4vLyAgICAgICAgcmV0dXJuICdpZCc7XG4vLyAgICB9XG4vLyAgICBpZiAoaXRlbS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4vLyAgICAgICAgcmV0dXJuICd2YWx1ZSc7XG4vLyAgICB9XG4vLyAgICBpZihpdGVtLm5hbWUpe1xuLy8gICAgICAgIHJldHVybiAnbmFtZSc7XG4vLyAgICB9XG4vLyAgICBpZiAoaXRlbS5sYWJlbCkge1xuLy8gICAgICAgIHJldHVybiAnbGFiZWwnO1xuLy8gICAgfVxuLy8gICAgY29uc29sZS5lcnJvcignaXRlbXMgbXVzdCBoYXZlIHVzZSBvZiB0aGUgZm9sbG93aW5nIGlkZW50aWZpZXJzOiBgaWRgLCBgdmFsdWVgLCBgbmFtZWAsIGBsYWJlbGAnKTtcbi8vICAgIHJldHVybiBudWxsO1xuLy99XG5cbmZ1bmN0aW9uIGlzT3duZWQobm9kZSwgdGFnTmFtZSkge1xuICAgIHdoaWxlIChub2RlICYmIG5vZGUubG9jYWxOYW1lICE9PSAnYm9keScpIHtcbiAgICAgICAgaWYgKG5vZGUubG9jYWxOYW1lID09PSB0YWdOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlzdDsiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xucmVxdWlyZSgnLi9MaXN0Jyk7XG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2Jhc2UtY29tcG9uZW50JywgQmFzZUNvbXBvbmVudCk7XG5cbiIsImNvbnN0IGtleXMgPSByZXF1aXJlKCdrZXktbmF2Jyk7XG5jb25zdCBzdG9yZSA9IHJlcXVpcmUoJ3N0b3JlJyk7XG5cbmZ1bmN0aW9uIGdldFZhbHVlIChub2RlLCBpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBrZXlzIChub2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCBjb250cm9sbGVyID0ga2V5cyhub2RlLCB7cm9sZXM6dHJ1ZSwgbm9EZWZhdWx0OiBub2RlWyduby1kZWZhdWx0J119KTtcbiAgICAgICAgbm9kZS5yZWdpc3RlckhhbmRsZShvbi5tYWtlTXVsdGlIYW5kbGUoY29udHJvbGxlci5oYW5kbGVzKSk7XG4gICAgICAgIG5vZGUub24oJ2tleS1zZWxlY3QnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdPTiBLRVknKTtcbiAgICAgICAgICAgIGxldFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgPSBub2RlLnN0b3JlLmlkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgc2VsTm9kZSA9IGV2ZW50LmRldGFpbC52YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGdldFZhbHVlKHNlbE5vZGUsIGlkZW50aWZpZXIpO1xuICAgICAgICAgICAgbm9kZS5zdG9yZS5zZWxlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgICAgIG5vZGUuZW1pdCgnY2hhbmdlJywge3ZhbHVlOiBub2RlLnN0b3JlLnNlbGVjdGlvbn0pO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYob3B0aW9ucy5tdWx0aXBsZSl7XG4gICAgICAgICAgICBub2RlLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdNZXRhJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQ29udHJvbCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0NvbW1hbmQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdG9yZS5jb250cm9sID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdTaGlmdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0b3JlLnNoaWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbm9kZS5vbihkb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBub2RlLnN0b3JlLmNvbnRyb2wgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBub2RlLnN0b3JlLnNoaWZ0ID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgY29udmVydEJyYWNlc1RvUmVmczogZnVuY3Rpb24gKGZyYWcpIHtcbiAgICAgICAgdmFyIHJlZnMgPSB7fTtcbiAgICAgICAgd2Fsa0RvbShmcmFnLmNoaWxkcmVuWzBdLCByZWZzKTtcbiAgICAgICAgcmV0dXJuIHJlZnM7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gd2Fsa0RvbSAobm9kZSwgcmVmcykge1xuICAgIHZhciBpO1xuICAgIGlmKCFub2RlLmNoaWxkcmVuLmxlbmd0aCl7XG4gICAgICAgIGlmKC9cXHtcXHsvLnRlc3Qobm9kZS5pbm5lckhUTUwpKXtcbiAgICAgICAgICAgIHJlZnNbbm9kZS5pbm5lckhUTUwucmVwbGFjZSgne3snLCcnKS5yZXBsYWNlKCd9fScsJycpXSA9IG5vZGU7XG4gICAgICAgICAgICBub2RlLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHdhbGtEb20obm9kZS5jaGlsZHJlbltpXSwgcmVmcyk7XG4gICAgfVxufSJdfQ==
