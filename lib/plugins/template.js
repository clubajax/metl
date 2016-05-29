(function () {

    var
        lightNodes = {},
        inserted = {};

    function insertTemplate (node){
        if(node.templateNode) {
            node.appendChild(ml.clone(node.templateNode));
            //assignRefs(node);
            //assignEvents(node);
            inserted[node._uid] = true;
        }
    }

    function collectLightNodes(node){
        lightNodes[node._uid] = [];
        while(node.childNodes.length){
            lightNodes[node._uid].push(node.childNodes[0]);
            node.removeChild(node.childNodes[0]);
        }
    }

    ml.create.plugins.push({
        define: function (def, options) {
            var
                importDoc = window.globalImportDoc || (document._currentScript || document.currentScript).ownerDocument;

            def.importDoc = {
                get: function() { return importDoc; }
            };

            def.getLightNodes = {
                value: function () {
                    console.log('getLightNodes:::::', this._uid);
                    return lightNodes[this._uid];
                }
            };

            if (options.templateId) {
                // get the template
                template = importDoc.getElementById(options.templateId);
                def.templateNode = {value: template};
            } else {
                def.templateNode = {value: null};
            }

        },
        preAttach: function (node) {
            if(!inserted[node._uid] && node.templateNode){
                console.log(' ~~~ plugins.template.preAttach');
                collectLightNodes(node);
                insertTemplate(node);
            }
        }
    });
}());