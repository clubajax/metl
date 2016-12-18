import BaseComponent from 'BaseComponent';
const keys = require('key-nav');
const store = require('store');
const dom = require('dom');

console.log('keys', keys);
console.log('STORE', store);

class MlList extends BaseComponent {

    static get observedAttributes() {
        return ['horizontal', 'value', 'disabled'];
    }

    get props() {
        return ['horizontal', 'value', 'disabled'];
    }

    constructor(...args) {
        super();
        this.store = store({
            plugins: 'filter,sort,paginate'
        });
    }

    domReady() {
        dom.attr(this, 'tabindex', 0);
    }

    attributeChanged(name, value) {
        this[name] = value;
        if (name === 'horizontal') {
            dom.classList.toggle('horizontal', value);
        }
    }

    render () {
        let items = this.store.fetch();
        console.log('ITEMS', items);
    }

    set data (itemOrItems) {
        this.store.add(itemOrItems);
        this.render();
    }

    connectEvents() {
        if (this.children.length) { // && !isOwned(this tagname??)
            this.registerHandle(keys.bind(this));
            this.on('key-highlight', this.onHighlight.bind(this));
            this.on('key-select', this.onSelect.bind(this));
            this.connectEvents = function () {}
        }
        addRoles(this);
    }
}
customElements.define('ml-list', MlList);

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

function addRoles(node) {
    for (var i = 0; i < node.children.length; i++) {
        node.children[i].setAttribute('role', 'listitem');
    }
    node.setAttribute('role', 'listbox');
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