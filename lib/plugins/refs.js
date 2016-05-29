(function () {

    function assignRefs (node) {
        dom.queryAll(node, '[ref]').forEach(function (child) {
            var name = child.getAttribute('ref');
            node[name] = child;
        });
    }

    function assignEvents (node) {
        dom.queryAll(node, '[on]').forEach(function (child) {
            var
                keyValue = child.getAttribute('on'),
                event = keyValue.split(':')[0].trim(),
                method = keyValue.split(':')[1].trim();
            node.on(child, event, function (e) {
                node[method](e)
            })
        });
    }

    // TODO check that this script is included after template
    ml.create.plugins.push({
        preAttach: function (node) {
            assignRefs(node);
            assignEvents(node);
        }
    });

}());