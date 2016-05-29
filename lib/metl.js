(function(){

    if(window.ml){ return; }

    window.ml = {
        clone: function(template){
            // HTML5 standard
            if (template.content && template.content.children) {
                return document.importNode(template.content, true);
            }
            // IE work around
            var
                frag = document.createDocumentFragment(),
                cloneNode = document.createElement('div');
            cloneNode.innerHTML = template.innerHTML;

            while (cloneNode.children.length) {
                frag.appendChild(cloneNode.children[0]);
            }
            return frag;
        }
    };

    // customLoader
    //  A special, global function to work with (custom) UMD.
    window.customLoader = function(module, name){
        ml[name] = window[name] = module();
    };

}());