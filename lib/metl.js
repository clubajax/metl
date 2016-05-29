(function(){

    if(window.ml){ return; }

    function mix (event, value) {
        if(typeof value === 'object'){
            Object.keys(value).forEach(function (key) {
                event[key] = value[key];
            });
        }else{
            event.value = value;
        }
        return event;
    }

    var ml = {
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
        },

        emit: function (node, eventName, value) {
            return on.emit(node, eventName, value);
        },

        fire: function (node, eventName, eventDetail, bubbles) {
            return on.fire(node, eventName, eventDetail, bubbles);
        },

        mix: mix
    };


    // customLoader
    //  A special, global function to work with (custom) UMD.
    window.customLoader = function(module, name){
        ml[name] = window[name] = module();
    };

    window.ml = ml;

}());