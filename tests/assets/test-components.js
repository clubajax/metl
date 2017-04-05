const BaseComponent = require('BaseComponent/dist/BaseComponent');
require('BaseComponent/dist/properties');
require('BaseComponent/dist/template');
require('BaseComponent/dist/refs');
require('BaseComponent/dist/item-template');

customElements.define('base-component', BaseComponent);
const List = require('../../src/List');
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
        console.log('LTN INIT', this._uid);
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
        console.log('GRK INIT', this._uid);
        on.emit(document, 'greek-init');
    }
    domReady () {
        this.innerHTML = '<strong>greek</strong>'
    }
}
customElements.define('greek-widget', GreekWidget);