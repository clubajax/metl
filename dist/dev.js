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
const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
const r = /\{\{\w*}}/g;

// TODO: switch to ES6 literals

function createCondition(name, value) {
    // FIXME name?
    value = value.replace(r, function (w) {
        w = w.replace('{{', '').replace('}}', '');
        return 'item["' + w + '"]';
    });
    return function (item) {
        return eval(value);
    };
}

function walkDom(node, refs) {

    let item = {
        node: node
    };

    refs.nodes.push(item);

    if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
            let
                name = node.attributes[i].name,
                value = node.attributes[i].value;
            if (name === 'if') {
                item.conditional = createCondition(name, value);
            }
            else if (/\{\{/.test(value)) {
                // <div id="{{id}}">
                refs.attributes = refs.attributes || {};
                item.attributes = item.attributes || {};
                item.attributes[name] = value;
                // could be more than one??
                // same with node?
                refs.attributes[name] = node;
            }
        }
    }

    // should probably loop over childNodes and check text nodes for replacements
    //
    if (!node.children.length) {
        if (/\{\{/.test(node.innerHTML)) {
            // FIXME - innerHTML as value too naive
            let prop = node.innerHTML.replace('{{', '').replace('}}', '');
            item.text = item.text || {};
            item.text[prop] = node.innerHTML;
            refs[prop] = node;
        }
        return;
    }

    for (let i = 0; i < node.children.length; i++) {
        walkDom(node.children[i], refs);
    }
}

function updateItemTemplate(frag) {
    let refs = {
        nodes: []
    };
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

    function warn(name) {
        clearTimeout(defer);
        defer = setTimeout(function () {
            console.warn('Attempted to set attribute from non-existent item property:', name);
        }, 1);
    }

    items.forEach(function (item) {

        let
            ifCount = 0,
            deletions = [];

        refs.nodes.forEach(function (ref) {

            //
            // can't swap because the innerHTML is being changed
            // can't clone because then there is not a node reference
            //
            let
                value,
                node = ref.node,
                hasNode = true;
            if (ref.conditional) {
                if (!ref.conditional(item)) {
                    hasNode = false;
                    ifCount++;
                    // can't actually delete, because this is the original template
                    // instead, adding attribute to track node, to be deleted in clone
                    // then after, remove temporary attribute from template
                    ref.node.setAttribute('ifs', ifCount+'');
                    deletions.push('[ifs="'+ifCount+'"]');
                }
            }
            if (hasNode) {
                if (ref.attributes) {
                    Object.keys(ref.attributes).forEach(function (key) {
                        value = ref.attributes[key];
                        ref.node.setAttribute(key, item[key]);
                        //console.log('swap att', key, value, ref.node);
                    });
                }
                if (ref.text) {
                    Object.keys(ref.text).forEach(function (key) {
                        value = ref.text[key];
                        //console.log('swap text', key, item[key]);
                        node.innerHTML = value.replace(value, item[key])
                    });
                }
            }
        });

        console.log('clone template');
        clone = tmpl.cloneNode(true);

        deletions.forEach(function (del) {
            let node = clone.querySelector(del);
            if(node) {
                dom.destroy(node);
                let tmplNode = tmpl.querySelector(del);
                tmplNode.removeAttribute('ifs');
            }
        });

        frag.appendChild(clone);
    });

    container.appendChild(frag);

    //items.forEach(function (item) {
    //    Object.keys(item).forEach(function (key) {
    //        if(refs[key]){
    //            refs[key].innerHTML = item[key];
    //        }
    //    });
    //    if(refs.attributes){
    //        Object.keys(refs.attributes).forEach(function (name) {
    //            let node = refs.attributes[name];
    //            if(item[name] !== undefined) {
    //                node.setAttribute(name, item[name]);
    //            }else{
    //                warn(name);
    //            }
    //        });
    //    }
    //
    //    clone = tmpl.cloneNode(true);
    //    frag.appendChild(clone);
    //});

    //container.appendChild(frag);
};

BaseComponent.addPlugin({
    name: 'item-template',
    order: 40,
    preDomReady: function (node) {
        node.itemTemplate = dom.query(node, 'template');
        if (node.itemTemplate) {
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
            value = item[identifier];
        return this.querySelector(`[${identifier}=${value}]`);
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
                console.log(' ----- item template', this.itemTemplate);
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
},{"./ml":6,"BaseComponent":1,"BaseComponent/src/item-template":2,"BaseComponent/src/properties":3,"BaseComponent/src/template":4,"dom":"dom","key-nav":"key-nav","store":"store"}],6:[function(require,module,exports){
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
    }
};
},{"key-nav":"key-nav","store":"store"}],7:[function(require,module,exports){
const BaseComponent = require('BaseComponent');
customElements.define('base-component', BaseComponent);
const List = require('../src/List');
const on = require('on');




class TestWidget extends BaseComponent {
    constructor(...args) {
        super(args);
        console.log('WDG INIT');
        on.emit(document, 'widget-init');
    }
}
customElements.define('test-widget', TestWidget);

class LatinWidget extends BaseComponent {
    constructor(...args) {
        super(args);
        console.log('LTN INIT');
        on.emit(document, 'latin-init');
    }
    domReady () {
        this.innerHTML = '<strong>latin</strong>'
    }
}
customElements.define('latin-widget', LatinWidget);

class GreekWidget extends BaseComponent {
    constructor(...args) {
        super(args);
        console.log('GRK INIT');
        on.emit(document, 'greek-init');
    }
    domReady () {
        this.innerHTML = '<strong>greek</strong>'
    }
}
customElements.define('greek-widget', GreekWidget);
},{"../src/List":5,"BaseComponent":1,"on":"on"}]},{},[7])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvQmFzZUNvbXBvbmVudC5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9pdGVtLXRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvdGVtcGxhdGUuanMiLCJzcmMvTGlzdC5qcyIsInNyYy9tbC5qcyIsInRlc3RzL3Rlc3QtYXNzZXRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIGNsYXNzL2NvbXBvbmVudCBydWxlc1xuLy8gYWx3YXlzIGNhbGwgc3VwZXIoKSBmaXJzdCBpbiB0aGUgY3Rvci4gVGhpcyBhbHNvIGNhbGxzIHRoZSBleHRlbmRlZCBjbGFzcycgY3Rvci5cbi8vIGNhbm5vdCBjYWxsIE5FVyBvbiBhIENvbXBvbmVudCBjbGFzc1xuXG4vLyBDbGFzc2VzIGh0dHA6Ly9leHBsb3Jpbmdqcy5jb20vZXM2L2NoX2NsYXNzZXMuaHRtbCNfdGhlLXNwZWNpZXMtcGF0dGVybi1pbi1zdGF0aWMtbWV0aG9kc1xuXG5jb25zdCBvbiA9IHJlcXVpcmUoJ29uJyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuY2xhc3MgQmFzZUNvbXBvbmVudCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fdWlkID0gZG9tLnVpZCh0aGlzLmxvY2FsTmFtZSk7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0gPSB7RE9NU1RBVEU6ICdjcmVhdGVkJ307XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdCA9IFtdO1xuICAgICAgICBwbHVnaW4oJ2luaXQnLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSAnY29ubmVjdGVkJztcbiAgICAgICAgcGx1Z2luKCdwcmVDb25uZWN0ZWQnLCB0aGlzKTtcbiAgICAgICAgbmV4dFRpY2sob25DaGVja0RvbVJlYWR5LmJpbmQodGhpcykpO1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJlKCdjb25uZWN0ZWQnKTtcbiAgICAgICAgcGx1Z2luKCdwb3N0Q29ubmVjdGVkJywgdGhpcyk7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEUgPSAnZGlzY29ubmVjdGVkJztcbiAgICAgICAgcGx1Z2luKCdwcmVEaXNjb25uZWN0ZWQnLCB0aGlzKTtcbiAgICAgICAgaWYgKHRoaXMuZGlzY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlyZSgnZGlzY29ubmVjdGVkJyk7XG4gICAgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgICAgICBwbHVnaW4oJ3ByZUF0dHJpYnV0ZUNoYW5nZWQnLCB0aGlzLCBhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVDaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZUNoYW5nZWQoYXR0ck5hbWUsIG5ld1ZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZmlyZSgnZGVzdHJveScpO1xuICAgICAgICBwcml2YXRlc1t0aGlzLl91aWRdLmhhbmRsZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICAgICAgICBoYW5kbGUucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBkb20uZGVzdHJveSh0aGlzKTtcbiAgICB9XG5cbiAgICBmaXJlKGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpIHtcbiAgICAgICAgcmV0dXJuIG9uLmZpcmUodGhpcywgZXZlbnROYW1lLCBldmVudERldGFpbCwgYnViYmxlcyk7XG4gICAgfVxuXG4gICAgZW1pdChldmVudE5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvbi5lbWl0KHRoaXMsIGV2ZW50TmFtZSwgdmFsdWUpO1xuICAgIH1cblxuICAgIG9uKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdGVySGFuZGxlKFxuICAgICAgICAgICAgdHlwZW9mIG5vZGUgIT0gJ3N0cmluZycgPyAvLyBubyBub2RlIGlzIHN1cHBsaWVkXG4gICAgICAgICAgICAgICAgb24obm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIDpcbiAgICAgICAgICAgICAgICBvbih0aGlzLCBub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgb25jZShub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWdpc3RlckhhbmRsZShcbiAgICAgICAgICAgIHR5cGVvZiBub2RlICE9ICdzdHJpbmcnID8gLy8gbm8gbm9kZSBpcyBzdXBwbGllZFxuICAgICAgICAgICAgICAgIG9uLm9uY2Uobm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIDpcbiAgICAgICAgICAgICAgICBvbi5vbmNlKHRoaXMsIG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSk7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJIYW5kbGUoaGFuZGxlKSB7XG4gICAgICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uaGFuZGxlTGlzdC5wdXNoKGhhbmRsZSk7XG4gICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgfVxuXG4gICAgZ2V0IERPTVNUQVRFKCkge1xuICAgICAgICByZXR1cm4gcHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURTtcbiAgICB9XG5cbiAgICBzdGF0aWMgY2xvbmUodGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKHRlbXBsYXRlLmNvbnRlbnQgJiYgdGVtcGxhdGUuY29udGVudC5jaGlsZHJlbikge1xuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICAgICAgY2xvbmVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNsb25lTm9kZS5pbm5lckhUTUwgPSB0ZW1wbGF0ZS5pbm5lckhUTUw7XG5cbiAgICAgICAgd2hpbGUgKGNsb25lTm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2xvbmVOb2RlLmNoaWxkcmVuWzBdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZztcbiAgICB9XG5cbiAgICBzdGF0aWMgYWRkUGx1Z2luKHBsdWcpIHtcbiAgICAgICAgdmFyIGksIG9yZGVyID0gcGx1Zy5vcmRlciB8fCAxMDA7XG4gICAgICAgIGlmICghcGx1Z2lucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBsdWdpbnMucHVzaChwbHVnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwbHVnaW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHBsdWdpbnNbMF0ub3JkZXIgPD0gb3JkZXIpIHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zLnB1c2gocGx1Zyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGx1Z2luc1swXS5vcmRlciA+IG9yZGVyKSB7XG4gICAgICAgICAgICBwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDE7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9yZGVyID09PSBwbHVnaW5zW2kgLSAxXS5vcmRlciB8fCAob3JkZXIgPiBwbHVnaW5zW2kgLSAxXS5vcmRlciAmJiBvcmRlciA8IHBsdWdpbnNbaV0ub3JkZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsdWdpbnMuc3BsaWNlKGksIDAsIHBsdWcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gd2FzIG5vdCBpbnNlcnRlZC4uLlxuICAgICAgICAgICAgcGx1Z2lucy5wdXNoKHBsdWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5sZXRcbiAgICBwcml2YXRlcyA9IHt9LFxuICAgIHBsdWdpbnMgPSBbXTtcblxuZnVuY3Rpb24gcGx1Z2luKG1ldGhvZCwgbm9kZSwgYSwgYiwgYykge1xuICAgIHBsdWdpbnMuZm9yRWFjaChmdW5jdGlvbiAocGx1Zykge1xuICAgICAgICBpZiAocGx1Z1ttZXRob2RdKSB7XG4gICAgICAgICAgICBwbHVnW21ldGhvZF0obm9kZSwgYSwgYiwgYyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gb25DaGVja0RvbVJlYWR5KCkge1xuICAgIGlmICh0aGlzLkRPTVNUQVRFICE9ICdjb25uZWN0ZWQnIHx8IHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyXG4gICAgICAgIGNvdW50ID0gMCxcbiAgICAgICAgY2hpbGRyZW4gPSBnZXRDaGlsZEN1c3RvbU5vZGVzKHRoaXMpLFxuICAgICAgICBvdXJEb21SZWFkeSA9IG9uRG9tUmVhZHkuYmluZCh0aGlzKTtcblxuICAgIGZ1bmN0aW9uIGFkZFJlYWR5KCkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICBpZiAoY291bnQgPT0gY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBvdXJEb21SZWFkeSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gY2hpbGRyZW4sIHdlJ3JlIGdvb2QgLSBsZWFmIG5vZGUuIENvbW1lbmNlIHdpdGggb25Eb21SZWFkeVxuICAgIC8vXG4gICAgaWYgKCFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgb3VyRG9tUmVhZHkoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGVsc2UsIHdhaXQgZm9yIGFsbCBjaGlsZHJlbiB0byBmaXJlIHRoZWlyIGByZWFkeWAgZXZlbnRzXG4gICAgICAgIC8vXG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBjaGlsZCBpcyBhbHJlYWR5IHJlYWR5XG4gICAgICAgICAgICBpZiAoY2hpbGQuRE9NU1RBVEUgPT0gJ2RvbXJlYWR5Jykge1xuICAgICAgICAgICAgICAgIGFkZFJlYWR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiBub3QsIHdhaXQgZm9yIGV2ZW50XG4gICAgICAgICAgICBjaGlsZC5vbignZG9tcmVhZHknLCBhZGRSZWFkeSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25Eb21SZWFkeSgpIHtcbiAgICBwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gJ2RvbXJlYWR5JztcbiAgICAvLyBkb21SZWFkeSBzaG91bGQgb25seSBldmVyIGZpcmUgb25jZVxuICAgIHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCA9IHRydWU7XG4gICAgcGx1Z2luKCdwcmVEb21SZWFkeScsIHRoaXMpO1xuICAgIC8vIGNhbGwgdGhpcy5kb21SZWFkeSBmaXJzdCwgc28gdGhhdCB0aGUgY29tcG9uZW50XG4gICAgLy8gY2FuIGZpbmlzaCBpbml0aWFsaXppbmcgYmVmb3JlIGZpcmluZyBhbnlcbiAgICAvLyBzdWJzZXF1ZW50IGV2ZW50c1xuICAgIGlmICh0aGlzLmRvbVJlYWR5KSB7XG4gICAgICAgIHRoaXMuZG9tUmVhZHkoKTtcbiAgICAgICAgdGhpcy5kb21SZWFkeSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cblxuICAgIHRoaXMuZmlyZSgnZG9tcmVhZHknKTtcblxuICAgIHBsdWdpbigncG9zdERvbVJlYWR5JywgdGhpcyk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ3VzdG9tTm9kZXMobm9kZSkge1xuICAgIC8vIGNvbGxlY3QgYW55IGNoaWxkcmVuIHRoYXQgYXJlIGN1c3RvbSBub2Rlc1xuICAgIC8vIHVzZWQgdG8gY2hlY2sgaWYgdGhlaXIgZG9tIGlzIHJlYWR5IGJlZm9yZVxuICAgIC8vIGRldGVybWluaW5nIGlmIHRoaXMgaXMgcmVhZHlcbiAgICB2YXIgaSwgbm9kZXMgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbltpXS5ub2RlTmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgICAgICAgbm9kZXMucHVzaChub2RlLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbmZ1bmN0aW9uIG5leHRUaWNrKGNiKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKTtcbn1cblxud2luZG93Lm9uRG9tUmVhZHkgPSBmdW5jdGlvbiAobm9kZSwgY2FsbGJhY2spIHtcbiAgICBmdW5jdGlvbiBvblJlYWR5ICgpIHtcbiAgICAgICAgY2FsbGJhY2sobm9kZSk7XG4gICAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignZG9tcmVhZHknLCBvblJlYWR5KTtcbiAgICB9XG4gICAgaWYobm9kZS5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jyl7XG4gICAgICAgIGNhbGxiYWNrKG5vZGUpO1xuICAgIH1lbHNle1xuICAgICAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2RvbXJlYWR5Jywgb25SZWFkeSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlQ29tcG9uZW50OyIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCcuL0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuY29uc3QgYWxwaGFiZXQgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKTtcbmNvbnN0IHIgPSAvXFx7XFx7XFx3Kn19L2c7XG5cbi8vIFRPRE86IHN3aXRjaCB0byBFUzYgbGl0ZXJhbHNcblxuZnVuY3Rpb24gY3JlYXRlQ29uZGl0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgLy8gRklYTUUgbmFtZT9cbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UociwgZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdyA9IHcucmVwbGFjZSgne3snLCAnJykucmVwbGFjZSgnfX0nLCAnJyk7XG4gICAgICAgIHJldHVybiAnaXRlbVtcIicgKyB3ICsgJ1wiXSc7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBldmFsKHZhbHVlKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiB3YWxrRG9tKG5vZGUsIHJlZnMpIHtcblxuICAgIGxldCBpdGVtID0ge1xuICAgICAgICBub2RlOiBub2RlXG4gICAgfTtcblxuICAgIHJlZnMubm9kZXMucHVzaChpdGVtKTtcblxuICAgIGlmIChub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldFxuICAgICAgICAgICAgICAgIG5hbWUgPSBub2RlLmF0dHJpYnV0ZXNbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG5vZGUuYXR0cmlidXRlc1tpXS52YWx1ZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSAnaWYnKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5jb25kaXRpb25hbCA9IGNyZWF0ZUNvbmRpdGlvbihuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgvXFx7XFx7Ly50ZXN0KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIC8vIDxkaXYgaWQ9XCJ7e2lkfX1cIj5cbiAgICAgICAgICAgICAgICByZWZzLmF0dHJpYnV0ZXMgPSByZWZzLmF0dHJpYnV0ZXMgfHwge307XG4gICAgICAgICAgICAgICAgaXRlbS5hdHRyaWJ1dGVzID0gaXRlbS5hdHRyaWJ1dGVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIGl0ZW0uYXR0cmlidXRlc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIC8vIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmU/P1xuICAgICAgICAgICAgICAgIC8vIHNhbWUgd2l0aCBub2RlP1xuICAgICAgICAgICAgICAgIHJlZnMuYXR0cmlidXRlc1tuYW1lXSA9IG5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzaG91bGQgcHJvYmFibHkgbG9vcCBvdmVyIGNoaWxkTm9kZXMgYW5kIGNoZWNrIHRleHQgbm9kZXMgZm9yIHJlcGxhY2VtZW50c1xuICAgIC8vXG4gICAgaWYgKCFub2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBpZiAoL1xce1xcey8udGVzdChub2RlLmlubmVySFRNTCkpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FIC0gaW5uZXJIVE1MIGFzIHZhbHVlIHRvbyBuYWl2ZVxuICAgICAgICAgICAgbGV0IHByb3AgPSBub2RlLmlubmVySFRNTC5yZXBsYWNlKCd7eycsICcnKS5yZXBsYWNlKCd9fScsICcnKTtcbiAgICAgICAgICAgIGl0ZW0udGV4dCA9IGl0ZW0udGV4dCB8fCB7fTtcbiAgICAgICAgICAgIGl0ZW0udGV4dFtwcm9wXSA9IG5vZGUuaW5uZXJIVE1MO1xuICAgICAgICAgICAgcmVmc1twcm9wXSA9IG5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB3YWxrRG9tKG5vZGUuY2hpbGRyZW5baV0sIHJlZnMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlSXRlbVRlbXBsYXRlKGZyYWcpIHtcbiAgICBsZXQgcmVmcyA9IHtcbiAgICAgICAgbm9kZXM6IFtdXG4gICAgfTtcbiAgICB3YWxrRG9tKGZyYWcsIHJlZnMpO1xuICAgIHJldHVybiByZWZzO1xufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5yZW5kZXJMaXN0ID0gZnVuY3Rpb24gKGl0ZW1zLCBjb250YWluZXIsIGl0ZW1UZW1wbGF0ZSkge1xuICAgIGxldFxuICAgICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICB0bXBsID0gaXRlbVRlbXBsYXRlIHx8IHRoaXMuaXRlbVRlbXBsYXRlLFxuICAgICAgICByZWZzID0gdG1wbC5pdGVtUmVmcyxcbiAgICAgICAgY2xvbmUsXG4gICAgICAgIGRlZmVyO1xuXG4gICAgZnVuY3Rpb24gd2FybihuYW1lKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWZlcik7XG4gICAgICAgIGRlZmVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dGVtcHRlZCB0byBzZXQgYXR0cmlidXRlIGZyb20gbm9uLWV4aXN0ZW50IGl0ZW0gcHJvcGVydHk6JywgbmFtZSk7XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICBsZXRcbiAgICAgICAgICAgIGlmQ291bnQgPSAwLFxuICAgICAgICAgICAgZGVsZXRpb25zID0gW107XG5cbiAgICAgICAgcmVmcy5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWYpIHtcblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIGNhbid0IHN3YXAgYmVjYXVzZSB0aGUgaW5uZXJIVE1MIGlzIGJlaW5nIGNoYW5nZWRcbiAgICAgICAgICAgIC8vIGNhbid0IGNsb25lIGJlY2F1c2UgdGhlbiB0aGVyZSBpcyBub3QgYSBub2RlIHJlZmVyZW5jZVxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIGxldFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgIG5vZGUgPSByZWYubm9kZSxcbiAgICAgICAgICAgICAgICBoYXNOb2RlID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChyZWYuY29uZGl0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZi5jb25kaXRpb25hbChpdGVtKSkge1xuICAgICAgICAgICAgICAgICAgICBoYXNOb2RlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FuJ3QgYWN0dWFsbHkgZGVsZXRlLCBiZWNhdXNlIHRoaXMgaXMgdGhlIG9yaWdpbmFsIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIGluc3RlYWQsIGFkZGluZyBhdHRyaWJ1dGUgdG8gdHJhY2sgbm9kZSwgdG8gYmUgZGVsZXRlZCBpbiBjbG9uZVxuICAgICAgICAgICAgICAgICAgICAvLyB0aGVuIGFmdGVyLCByZW1vdmUgdGVtcG9yYXJ5IGF0dHJpYnV0ZSBmcm9tIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLnNldEF0dHJpYnV0ZSgnaWZzJywgaWZDb3VudCsnJyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0aW9ucy5wdXNoKCdbaWZzPVwiJytpZkNvdW50KydcIl0nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGFzTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZWYuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhyZWYuYXR0cmlidXRlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHJlZi5hdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICByZWYubm9kZS5zZXRBdHRyaWJ1dGUoa2V5LCBpdGVtW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc3dhcCBhdHQnLCBrZXksIHZhbHVlLCByZWYubm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVmLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocmVmLnRleHQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSByZWYudGV4dFtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc3dhcCB0ZXh0Jywga2V5LCBpdGVtW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5yZXBsYWNlKHZhbHVlLCBpdGVtW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ2Nsb25lIHRlbXBsYXRlJyk7XG4gICAgICAgIGNsb25lID0gdG1wbC5jbG9uZU5vZGUodHJ1ZSk7XG5cbiAgICAgICAgZGVsZXRpb25zLmZvckVhY2goZnVuY3Rpb24gKGRlbCkge1xuICAgICAgICAgICAgbGV0IG5vZGUgPSBjbG9uZS5xdWVyeVNlbGVjdG9yKGRlbCk7XG4gICAgICAgICAgICBpZihub2RlKSB7XG4gICAgICAgICAgICAgICAgZG9tLmRlc3Ryb3kobm9kZSk7XG4gICAgICAgICAgICAgICAgbGV0IHRtcGxOb2RlID0gdG1wbC5xdWVyeVNlbGVjdG9yKGRlbCk7XG4gICAgICAgICAgICAgICAgdG1wbE5vZGUucmVtb3ZlQXR0cmlidXRlKCdpZnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChjbG9uZSk7XG4gICAgfSk7XG5cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZyk7XG5cbiAgICAvL2l0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAvLyAgICBPYmplY3Qua2V5cyhpdGVtKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAvLyAgICAgICAgaWYocmVmc1trZXldKXtcbiAgICAvLyAgICAgICAgICAgIHJlZnNba2V5XS5pbm5lckhUTUwgPSBpdGVtW2tleV07XG4gICAgLy8gICAgICAgIH1cbiAgICAvLyAgICB9KTtcbiAgICAvLyAgICBpZihyZWZzLmF0dHJpYnV0ZXMpe1xuICAgIC8vICAgICAgICBPYmplY3Qua2V5cyhyZWZzLmF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAvLyAgICAgICAgICAgIGxldCBub2RlID0gcmVmcy5hdHRyaWJ1dGVzW25hbWVdO1xuICAgIC8vICAgICAgICAgICAgaWYoaXRlbVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgaXRlbVtuYW1lXSk7XG4gICAgLy8gICAgICAgICAgICB9ZWxzZXtcbiAgICAvLyAgICAgICAgICAgICAgICB3YXJuKG5hbWUpO1xuICAgIC8vICAgICAgICAgICAgfVxuICAgIC8vICAgICAgICB9KTtcbiAgICAvLyAgICB9XG4gICAgLy9cbiAgICAvLyAgICBjbG9uZSA9IHRtcGwuY2xvbmVOb2RlKHRydWUpO1xuICAgIC8vICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgIC8vfSk7XG5cbiAgICAvL2NvbnRhaW5lci5hcHBlbmRDaGlsZChmcmFnKTtcbn07XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAnaXRlbS10ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDQwLFxuICAgIHByZURvbVJlYWR5OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZSA9IGRvbS5xdWVyeShub2RlLCAndGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKG5vZGUuaXRlbVRlbXBsYXRlKSB7XG4gICAgICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUuaXRlbVRlbXBsYXRlKTtcbiAgICAgICAgICAgIG5vZGUuaXRlbVRlbXBsYXRlID0gQmFzZUNvbXBvbmVudC5jbG9uZShub2RlLml0ZW1UZW1wbGF0ZSk7XG4gICAgICAgICAgICBub2RlLml0ZW1UZW1wbGF0ZS5pdGVtUmVmcyA9IHVwZGF0ZUl0ZW1UZW1wbGF0ZShub2RlLml0ZW1UZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7fTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW4gKG5vZGUsIHByb3ApIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBnZXQgKCkge1xuICAgICAgICAgICAgaWYobm9kZS5oYXNBdHRyaWJ1dGUocHJvcCkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBkb20ubm9ybWFsaXplKG5vZGUuZ2V0QXR0cmlidXRlKHByb3ApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0ICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYodmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKHByb3AsICcnKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5IChub2RlLCBwcm9wKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgZ2V0ICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0ICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnRpZXMgKG5vZGUpIHtcbiAgICBsZXQgcHJvcHMgPSBub2RlLnByb3BzIHx8IG5vZGUucHJvcGVydGllcztcbiAgICBpZihwcm9wcykge1xuICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICBpZihwcm9wID09PSAnZGlzYWJsZWQnKXtcbiAgICAgICAgICAgICAgICBzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBzZXRQcm9wZXJ0eShub2RlLCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRCb29sZWFucyAobm9kZSkge1xuICAgIGxldCBwcm9wcyA9IG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucztcbiAgICBpZihwcm9wcykge1xuICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICBzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAncHJvcGVydGllcycsXG4gICAgb3JkZXI6IDEwLFxuICAgIGluaXQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHNldFByb3BlcnRpZXMobm9kZSk7XG4gICAgICAgIHNldEJvb2xlYW5zKG5vZGUpO1xuICAgIH0sXG4gICAgcHJlQXR0cmlidXRlQ2hhbmdlZDogZnVuY3Rpb24gKG5vZGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHRoaXNbbmFtZV0gPSBkb20ubm9ybWFsaXplKHZhbHVlKTtcbiAgICAgICAgaWYoIXZhbHVlICYmIChub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnMgfHwgW10pLmluZGV4T2YobmFtZSkpe1xuICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7fTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJy4vQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbnZhclxuICAgIGxpZ2h0Tm9kZXMgPSB7fSxcbiAgICBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG4gICAgcmV0dXJuICEhbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIHZhciB0ZW1wbGF0ZXMgPSBub2RlLmdldFRlbXBsYXRlQ2hhaW4oKTtcbiAgICB0ZW1wbGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlKSB7XG4gICAgICAgIGdldENvbnRhaW5lcihub2RlKS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlKSk7XG4gICAgfSk7XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlIChub2RlKSB7XG4gICAgaWYobm9kZS5uZXN0ZWRUZW1wbGF0ZSl7XG4gICAgICAgIGluc2VydFRlbXBsYXRlQ2hhaW4obm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyXG4gICAgICAgIHRlbXBsYXRlTm9kZSA9IG5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG5cbiAgICBpZih0ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlTm9kZSkpO1xuICAgIH1cbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyIChub2RlKSB7XG4gICAgdmFyIGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpLFxuICAgICAgICBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuICAgICAgICBpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS5ieUlkKHRoaXMudGVtcGxhdGVJZC5yZXBsYWNlKCcjJywnJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGVTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLnRvRG9tKCc8dGVtcGxhdGU+JyArIHRoaXMudGVtcGxhdGVTdHJpbmcgKyAnPC90ZW1wbGF0ZT4nKTtcbiAgICAgICAgfVxuICAgIC8vfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlTm9kZTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlQ2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXRcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHRlbXBsYXRlcyA9IFtdLFxuICAgICAgICB0ZW1wbGF0ZTtcblxuICAgIC8vIHdhbGsgdGhlIHByb3RvdHlwZSBjaGFpbjsgQmFiZWwgZG9lc24ndCBhbGxvdyB1c2luZ1xuICAgIC8vIGBzdXBlcmAgc2luY2Ugd2UgYXJlIG91dHNpZGUgb2YgdGhlIENsYXNzXG4gICAgd2hpbGUoY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29udGV4dCk7XG4gICAgICAgIGlmKCFjb250ZXh0KXsgYnJlYWs7IH1cbiAgICAgICAgLy8gc2tpcCBwcm90b3R5cGVzIHdpdGhvdXQgYSB0ZW1wbGF0ZVxuICAgICAgICAvLyAoZWxzZSBpdCB3aWxsIHB1bGwgYW4gaW5oZXJpdGVkIHRlbXBsYXRlIGFuZCBjYXVzZSBkdXBsaWNhdGVzKVxuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZVN0cmluZycpIHx8IGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlSWQnKSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSBjb250ZXh0LmdldFRlbXBsYXRlTm9kZSgpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZXM7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3RlbXBsYXRlJyxcbiAgICBvcmRlcjogMjAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpbnNlcnQobm9kZSk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge307IiwiY29uc3QgQmFzZUNvbXBvbmVudCAgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG4vLyBwbHVnaW5zXG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9wcm9wZXJ0aWVzJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy90ZW1wbGF0ZScpO1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvaXRlbS10ZW1wbGF0ZScpO1xuXG4vLyBsaWJyYXJ5XG5sZXQgbWwgPSByZXF1aXJlKCcuL21sJyk7XG5jb25zdCBrZXlzID0gcmVxdWlyZSgna2V5LW5hdicpO1xuY29uc3Qgc3RvcmUgPSByZXF1aXJlKCdzdG9yZScpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmNvbnN0IElURU1fQ0xBU1MgPSAnbWwtbGlzdCc7XG5jb25zdCBvbkRvbVJlYWR5ID0gd2luZG93Lm9uRG9tUmVhZHk7XG5cbi8vIFRPRE9cblxuLy8gc3RvcmUuc2F2ZShpdGVtKT9cbi8vIG5hdi1rZXlzIHdvdWxkIGJlIGRpZmZlcmVudCB3aXRoIGNlbGxzXG4vLyB2aXJ0dWFsIHNjcm9sbGluZ1xuLy8gZGlmZmVyZW50IHJvdyB0ZW1wbGF0ZXMgLS0tP1xuLy8gIHRlbXBsYXRlIHByb3BzXG4vLyAgZWFjaFxuLy8gIGlmXG5cbi8vIG1heWJlczpcbi8vIG0tbGlzdCBpbnN0ZWFkIG9mIG1sLWxpc3QgKGNzcyB2YXIgZm9yIHByZWZpeD8pXG5cbmNsYXNzIExpc3QgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkge1xuICAgICAgICByZXR1cm4gWydob3Jpem9udGFsJywgJ3ZhbHVlJywgJ2Rpc2FibGVkJywgJ2tleXMnLCAnbXVsdGlwbGUnLCAndmlydHVhbCcsICdzZWxlY3RhYmxlJywgJ3Jvd1RlbXBsYXRlSWQnLCAnbm8tZGVmYXVsdCddO1xuICAgIH1cblxuICAgIGdldCBwcm9wcyAoKSB7XG4gICAgICAgIHJldHVybiBbJ3ZhbHVlJywgJ3Jvd1RlbXBsYXRlSWQnXTtcbiAgICB9XG5cbiAgICBnZXQgYm9vbHMgKCkge1xuICAgICAgICByZXR1cm4gWydob3Jpem9udGFsJywgJ2tleXMnLCAnbXVsdGlwbGUnLCAndmlydHVhbCcsICdzZWxlY3RhYmxlJywgJ25vLWRlZmF1bHQnXTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgIH1cblxuICAgIGRvbVJlYWR5KCkge1xuICAgICAgICBkb20uYXR0cih0aGlzLCAndGFiaW5kZXgnLCAwKTtcbiAgICAgICAgaWYodGhpcy5jaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICAgICAgdGhpcy5hZGQoZm9ybWF0SXRlbXMoWy4uLnRoaXMuY2hpbGRyZW5dKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXROb2RlQnlJdGVtIChpdGVtKSB7XG4gICAgICAgIGxldCBpZGVudGlmaWVyID0gdGhpcy5zdG9yZS5pZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWUgPSBpdGVtW2lkZW50aWZpZXJdO1xuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKGBbJHtpZGVudGlmaWVyfT0ke3ZhbHVlfV1gKTtcbiAgICB9XG5cbiAgICByZW5kZXJTZWxlY3Rpb24gKCkge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIHNlbGVjdGVkID0gdGhpcy5zdG9yZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICBzZWxOb2RlO1xuICAgICAgICBjb25zb2xlLmxvZygncmVuZGVyU2VsZWN0aW9uJyk7XG4gICAgICAgIGlmKHRoaXMuc2VsZWN0YWJsZSkge1xuICAgICAgICAgICAgZG9tLnF1ZXJ5QWxsKHRoaXMsICdbc2VsZWN0ZWRdJykuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzLi4uJyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3MxJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbE5vZGUgPSB0aGlzLmdldE5vZGVCeUl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxOb2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3MyJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbE5vZGUgPSB0aGlzLmdldE5vZGVCeUl0ZW0oc2VsZWN0ZWQpO1xuICAgICAgICAgICAgICAgICAgICBzZWxOb2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmKCF0aGlzWyduby1kZWZhdWx0J10pe1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RFRj8nLCB0aGlzWyduby1kZWZhdWx0J10pO1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gZmlyc3RcbiAgICAgICAgICAgICAgICAvLyBUT0RPIG5lZWRzIHRvIGJlIG9wdGlvbmFsXG4gICAgICAgICAgICAgICAgc2VsTm9kZSA9IHRoaXMuY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgc2VsTm9kZS5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmUuc2VsZWN0aW9uID0gc2VsTm9kZS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHNlbGVjdGlvbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIgKCkge1xuXG4gICAgICAgIGxldFxuICAgICAgICAgICAgY2hhbmdlcyA9IHRoaXMuc3RvcmUuaGFzTGlzdENoYW5nZWQsXG4gICAgICAgICAgICBmcmFnLFxuICAgICAgICAgICAgaXRlbXM7XG5cbiAgICAgICAgaWYoY2hhbmdlcykge1xuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLnN0b3JlLnF1ZXJ5KCk7XG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnIC0tLS0tIGl0ZW0gdGVtcGxhdGUnLCB0aGlzLml0ZW1UZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0KGl0ZW1zLCB0aGlzKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICAgICAgaXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBmcmFnLmFwcGVuZENoaWxkKHRvTm9kZShpdGVtKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGZyYWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZW5kZXJTZWxlY3Rpb24odGhpcyk7XG5cbiAgICAgICAgdGhpcy5jb25uZWN0RXZlbnRzKCk7XG4gICAgfVxuXG4gICAgYWRkIChpdGVtT3JJdGVtcykge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIGlkZW50aWZpZXIgPSBzdG9yZS5nZXRJZGVudGlmaWVyKGl0ZW1Pckl0ZW1zKSxcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luczogJ2ZpbHRlcixzb3J0LHBhZ2luYXRlLHNlbGVjdGlvbicsXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uOnttdWx0aXBsZTogdGhpcy5tdWx0aXBsZX1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYoaWRlbnRpZmllciAmJiBpZGVudGlmaWVyICE9PSAnaWQnKXtcbiAgICAgICAgICAgIG9wdGlvbnMuaWRlbnRpZmllciA9IGlkZW50aWZpZXI7XG4gICAgICAgIH1cblxuICAgICAgICBvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcbiAgICAgICAgICAgIGlmKCF0aGlzLnN0b3JlKXtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3JlID0gc3RvcmUob3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0b3JlLmFkZChmb3JtYXRJdGVtcyhpdGVtT3JJdGVtcykpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBzZXQgZGF0YSAoaXRlbU9ySXRlbXMpIHtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmFkZChpdGVtT3JJdGVtcyk7XG4gICAgfVxuXG4gICAgY2xlYXIgKCkge1xuICAgICAgICBpZih0aGlzLnN0b3JlKXtcbiAgICAgICAgICAgIHRoaXMuc3RvcmUuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbm5lY3RFdmVudHMoKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkcmVuLmxlbmd0aCAmJiB0aGlzLnNlbGVjdGFibGUpIHsgLy8gJiYgIWlzT3duZWQodGhpcyB0YWduYW1lPz8pXG4gICAgICAgICAgICBpZih0aGlzLmtleXMpIHtcbiAgICAgICAgICAgICAgICBtbC5rZXlzKHRoaXMsIHttdWx0aXBsZTogdGhpcy5tdWx0aXBsZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMub24oJ2NoYW5nZScsIHRoaXMucmVuZGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb25uZWN0RXZlbnRzID0gZnVuY3Rpb24gKCkge31cbiAgICAgICAgfVxuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbWwtbGlzdCcsIExpc3QpO1xuXG5cbmZ1bmN0aW9uIHRvTm9kZSAoaXRlbSkge1xuICAgIGxldCBhdHRyID0ge1xuICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZVxuICAgIH07XG4gICAgaWYoaXRlbS5zZWxlY3RlZCl7XG4gICAgICAgIGF0dHIuc2VsZWN0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZG9tKCdsaScsIHtodG1sOiBpdGVtLmxhYmVsLCBpZDogaXRlbS5pZCwgY2xhc3NOYW1lOiBJVEVNX0NMQVNTLCBhdHRyOmF0dHJ9KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0SXRlbXMoaXRlbU9ySXRlbXMpIHtcbiAgICByZXR1cm4gKEFycmF5LmlzQXJyYXkoaXRlbU9ySXRlbXMpID8gaXRlbU9ySXRlbXMgOiBbaXRlbU9ySXRlbXNdKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYoZG9tLmlzTm9kZShpdGVtKSl7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkLFxuICAgICAgICAgICAgICAgIGxhYmVsOiBpdGVtLmlubmVySFRNTFxuICAgICAgICAgICAgfVxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzRXF1YWwodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxID09PSB2MiB8fCB2MSArICcnID09PSB2MiArICcnIHx8ICt2MSA9PT0gK3YyO1xufVxuXG5mdW5jdGlvbiBnZXRWYWx1ZShub2RlKSB7XG4gICAgaWYgKG5vZGUudmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgICB9XG4gICAgaWYgKG5vZGUuaGFzQXR0cmlidXRlKCd2YWx1ZScpKSB7XG4gICAgICAgIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICB9XG4gICAgaWYgKG5vZGUuaWQpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuaWQ7XG4gICAgfVxuICAgIGlmIChub2RlLmxhYmVsKSB7XG4gICAgICAgIHJldHVybiBub2RlLmxhYmVsO1xuICAgIH1cbiAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ2xhYmVsJykpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKCdsYWJlbCcpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS50ZXh0Q29udGVudDtcbn1cblxuZnVuY3Rpb24gaXNPd25lZChub2RlLCB0YWdOYW1lKSB7XG4gICAgd2hpbGUgKG5vZGUgJiYgbm9kZS5sb2NhbE5hbWUgIT09ICdib2R5Jykge1xuICAgICAgICBpZiAobm9kZS5sb2NhbE5hbWUgPT09IHRhZ05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaXN0OyIsImNvbnN0IGtleXMgPSByZXF1aXJlKCdrZXktbmF2Jyk7XG5jb25zdCBzdG9yZSA9IHJlcXVpcmUoJ3N0b3JlJyk7XG5cbmZ1bmN0aW9uIGdldFZhbHVlIChub2RlLCBpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBrZXlzIChub2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCBjb250cm9sbGVyID0ga2V5cyhub2RlLCB7cm9sZXM6dHJ1ZSwgbm9EZWZhdWx0OiBub2RlWyduby1kZWZhdWx0J119KTtcbiAgICAgICAgbm9kZS5yZWdpc3RlckhhbmRsZShvbi5tYWtlTXVsdGlIYW5kbGUoY29udHJvbGxlci5oYW5kbGVzKSk7XG4gICAgICAgIG5vZGUub24oJ2tleS1zZWxlY3QnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdPTiBLRVknKTtcbiAgICAgICAgICAgIGxldFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgPSBub2RlLnN0b3JlLmlkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgc2VsTm9kZSA9IGV2ZW50LmRldGFpbC52YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGdldFZhbHVlKHNlbE5vZGUsIGlkZW50aWZpZXIpO1xuICAgICAgICAgICAgbm9kZS5zdG9yZS5zZWxlY3Rpb24gPSB2YWx1ZTtcbiAgICAgICAgICAgIG5vZGUuZW1pdCgnY2hhbmdlJywge3ZhbHVlOiBub2RlLnN0b3JlLnNlbGVjdGlvbn0pO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYob3B0aW9ucy5tdWx0aXBsZSl7XG4gICAgICAgICAgICBub2RlLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdNZXRhJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQ29udHJvbCc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0NvbW1hbmQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdG9yZS5jb250cm9sID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdTaGlmdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0b3JlLnNoaWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbm9kZS5vbihkb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBub2RlLnN0b3JlLmNvbnRyb2wgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBub2RlLnN0b3JlLnNoaWZ0ID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYmFzZS1jb21wb25lbnQnLCBCYXNlQ29tcG9uZW50KTtcbmNvbnN0IExpc3QgPSByZXF1aXJlKCcuLi9zcmMvTGlzdCcpO1xuY29uc3Qgb24gPSByZXF1aXJlKCdvbicpO1xuXG5cblxuXG5jbGFzcyBUZXN0V2lkZ2V0IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgICBzdXBlcihhcmdzKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1dERyBJTklUJyk7XG4gICAgICAgIG9uLmVtaXQoZG9jdW1lbnQsICd3aWRnZXQtaW5pdCcpO1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGVzdC13aWRnZXQnLCBUZXN0V2lkZ2V0KTtcblxuY2xhc3MgTGF0aW5XaWRnZXQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgICAgICBjb25zb2xlLmxvZygnTFROIElOSVQnKTtcbiAgICAgICAgb24uZW1pdChkb2N1bWVudCwgJ2xhdGluLWluaXQnKTtcbiAgICB9XG4gICAgZG9tUmVhZHkgKCkge1xuICAgICAgICB0aGlzLmlubmVySFRNTCA9ICc8c3Ryb25nPmxhdGluPC9zdHJvbmc+J1xuICAgIH1cbn1cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbGF0aW4td2lkZ2V0JywgTGF0aW5XaWRnZXQpO1xuXG5jbGFzcyBHcmVla1dpZGdldCBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICAgICAgc3VwZXIoYXJncyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdHUksgSU5JVCcpO1xuICAgICAgICBvbi5lbWl0KGRvY3VtZW50LCAnZ3JlZWstaW5pdCcpO1xuICAgIH1cbiAgICBkb21SZWFkeSAoKSB7XG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gJzxzdHJvbmc+Z3JlZWs8L3N0cm9uZz4nXG4gICAgfVxufVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdncmVlay13aWRnZXQnLCBHcmVla1dpZGdldCk7Il19
