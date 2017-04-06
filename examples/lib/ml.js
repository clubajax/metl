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
        mix: mix
    };


    // customLoader
    //  A special, global function to work with (custom) UMD.
    window.customLoader = function(module, name){
        ml[name] = window[name] = module();
    };

    window.ml = ml;

}());