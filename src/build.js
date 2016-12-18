import MlList from './ml-list';
import BaseComponent from 'BaseComponent';
const dom = require('dom');

let list = dom('ml-list', {html:'i am ml-list'}, document.body);
list.on('domready', function () {
    console.log('ml-list.domready');
});

list.data = [{id:1, label:'alpha'}, {id:2, label: 'beta'}, {id:3, label: 'gamma'}, {id:4, label:'delta'}, {id:5, label: 'epsilon'}];

customElements.define('base-component', BaseComponent);
let node = dom('base-component', {html:'i am base'}, document.body);
node.on('domready', function () {
    console.log('base-component.domready');
});