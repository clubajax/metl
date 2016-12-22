const keys = require('key-nav');
const store = require('store');

export default {
    keys (node, options) {
        let controller = keys(node, {roles:true});
        node.registerHandle(on.makeMultiHandle(controller.handles));
        node.on('key-select', function (event) {
            let selNode = event.detail.value;
            node.store.selection = selNode.id;
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
    store (node, options) {

    }
}