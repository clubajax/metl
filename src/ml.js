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