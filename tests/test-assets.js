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