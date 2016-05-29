(function () {

    function getAttr(node, attr){
        if(node.hasAttribute(attr)){
            var value = node.getAttribute(attr);
            if(value !== '' && value !== null){
                return value;
            }
        }
        return null;
    }

    ml.create.plugins.push({
        preCreate: function (node) {
            // If attribute is set on node, assign them to properties
            if(node.attrs && node.attrs.length){
                node.attrs.forEach(function (attr) {
                    var value = getAttr(node, attr);
                    if(value) {
                        if (typeof node[attr] === 'function') {
                            node[attr](value);
                        }
                        else {
                            node[attr] = value;
                        }
                    }
                });
            }
        },

        preAttributeChanged: function (node, attr, value, oldValue) {
            if(node.attrs && node.attrs.indexOf(attr) > -1){
                if (typeof node[attr] === 'function') {
                    node[attr](value);
                }
                else {
                    node[attr] = value;
                }
            }
        }
    });
}());