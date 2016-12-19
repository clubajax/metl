import BaseComponent from 'BaseComponent';
const keys = require('key-nav');
const store = require('store');
const dom = require('dom');
const ITEM_CLASS = 'ml-list';
const onDomReady = window.onDomReady;

class MlList extends BaseComponent {

    static get observedAttributes() {
        return ['horizontal', 'value', 'disabled'];
    }

    get props() {
        return ['horizontal', 'value', 'disabled'];
    }

    constructor(...args) {
        super(args);
        this.store = store({
            plugins: 'filter,sort,paginate'
        });
    }

    domReady() {
        dom.attr(this, 'tabindex', 0);
        console.log('children', this.children);
        if(this.children.length){
            this.store.add(formatItems([...this.children]));
            this.render();
        }
    }

    attributeChanged(name, value) {
        this[name] = value;
        if (name === 'horizontal') {
            dom.classList.toggle('horizontal', value);
        }
    }

    render () {
        onDomReady(this, () => {
            let
                frag = document.createDocumentFragment(),
                items = this.store.fetch();

            this.innerHTML = '';
            items.forEach(function (item) {
                frag.appendChild(item.node);
            });
            this.appendChild(frag);
            this.connectEvents();
        });
    }

    set data (itemOrItems) {
        this.store.add(formatItems(itemOrItems));
        this.render();
    }

    onHighlight (e) {
        console.log('hi!', e);
    }

    onSelect (e) {
        console.log('sel', e);
    }

    connectEvents() {
        if (this.children.length) { // && !isOwned(this tagname??)
            let controller = keys(this, {roles:true});
            this.registerHandle(on.makeMultiHandle(controller.handles));
            this.on('key-highlight', this.onHighlight.bind(this));
            this.on('key-select', this.onSelect.bind(this));
            this.connectEvents = function () {}
        }
    }
}
customElements.define('ml-list', MlList);

function formatItems(itemOrItems) {
    return (Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]).map(function (item) {
        if(dom.isNode(item)){
            // is node - create data
            // TODO: ensure LIs
            item.classList.add(ITEM_CLASS);
            return {
                id: item.id,
                value: item.value,
                selected: item.selected,
                node: item
            }
        }else{
            // is object - create node
            item.node = dom('li', {html: item.label, id: item.id, className: ITEM_CLASS, attr:{value: item.value, selected: item.selected}});
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

export default MlList;