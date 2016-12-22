import BaseComponent from 'BaseComponent';
import ml from './ml';
const keys = require('key-nav');
const store = require('store');
const dom = require('dom');
const ITEM_CLASS = 'ml-list';
const onDomReady = window.onDomReady;

// TODO

// nav-keys would be different with cells
// multi-select
//      - will need to be store-driven, due to virtual scrolling
// virtual scrolling
// list needs to act table-like, with multiple display-values
//      can that be extended into tds
// template for a row
// different row templates?
//  template props
//  each
//  if

// maybes:
// m-list instead of ml-list (css var for prefix?)

class List extends BaseComponent {

    static get observedAttributes() {
        return ['horizontal', 'value', 'disabled', 'keys', 'multiple'];
    }

    get props() {
        return ['horizontal', 'value', 'keys', 'disabled', 'multiple'];
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

    attributeChanged(name, value) {
        this[name] = dom.normalize(value);
    }

    render () {
        let
            frag = document.createDocumentFragment(),
            items = this.store.query(),
            selected = this.store.selection,
            selNode;

        //console.log('items', items);
        this.innerHTML = '';
        items.forEach(function (item) {
            frag.appendChild(toNode(item));
        });

        if(selected) {
            if(this.multiple){
                //console.log('mult sel', selected.map(function(m){return m.id;}).join(',') );
                selected.forEach(function (item) {
                    selNode = frag.querySelector(('#' + item.id));
                    selNode.setAttribute('selected', '');
                });
            }else{
                selNode = frag.querySelector(('#' + selected.id));
                selNode.setAttribute('selected', '');
            }

        }else{
            // default to first - needs to be optional
            selNode = frag.children[0];
            selNode.setAttribute('selected', '');
            this.store.selection = selNode.id;
        }
        this.appendChild(frag);
        this.connectEvents();
    }

    add (itemOrItems) {
        onDomReady(this, () => {
            if(!this.store){
                this.store = store({
                    plugins: 'filter,sort,paginate,selection',
                    selection:{multiple: this.multiple}
                });
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
        if (this.children.length) { // && !isOwned(this tagname??)
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
            // is node - create data
            //item.classList.add(ITEM_CLASS);
            return {
                id: item.id,
                value: item.value,
                selected: item.selected,
                //node: item,
                label: item.innerHTML
            }
        }else{
            // is object - create node
            //item.node = dom('li', {html: item.label, id: item.id, className: ITEM_CLASS, attr:{value: item.value, selected: item.selected}});
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

function getIdentifier(node) {
    return !!node ? node.value || node.id || node : null;
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

export default List;