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