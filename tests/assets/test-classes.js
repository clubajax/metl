const BaseComponent = require('BaseComponent/dist/BaseComponent');
class TestClass extends BaseComponent {
	constructor(...args) {
		super(args);
		console.log('test-class.constructor', this._uid);
	}
	domReady () {
		this.innerHTML = '<strong>[[test-class]]</strong>'
	}
}
customElements.define('test-class', TestClass);