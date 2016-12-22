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
    
    convertBracesToRefs: function (frag) {
        console.log('frag', frag.children[0]);
        var refs = {};
        walkDom(frag.children[0], refs);
        console.log('refs', refs);
        return refs;
    }
}

function walkDom (node, refs) {
    var i;
    if(!node.children.length){
        if(/\{\{/.test(node.innerHTML)){
            refs[node.innerHTML.replace('{{','').replace('}}','')] = node;
            node.innerHTML = '';
        }
        return;
    }
    for(i = 0; i < node.children.length; i++){
        walkDom(node.children[i], refs);
    }
}