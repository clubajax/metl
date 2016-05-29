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
        },

        emit: function (node, eventName, value) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent(eventName, true, true); // event type, bubbling, cancelable
            return node.dispatchEvent(mix(event, value));
        },

        fire: function (node, eventName, eventDetail, bubbles) {
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable
            return node.dispatchEvent(event);
        },

        mix: mix
    };

    // customLoader
    //  A special, global function to work with (custom) UMD.
    window.customLoader = function(module, name){
        ml[name] = window[name] = module();
    };

}());