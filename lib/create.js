(function () {
    var
        ml = window.ml,
        on = ml.on,
        dom = ml.dom,
        baseElement,
        extOptions,
        privates = {},
        validProperties = {writable: true, enumerable: true, configurable: true, value: true, get: true, set: true};

    function noop () {}

    function convertOptionsToDefinition (def, options) {
        // converts standard object to property definition
        // ergo: {foo: function(){}} to {foo:{value: function(){}}}
        //
        Object.keys(options).forEach(function (key) {
            if (key === 'props') {
                // these options will be processed later
                return;
            }
            var value = options[key];
            if (typeof value === 'object') {
                var keys = Object.keys(value),
                    valid = keys.every(function (name) { return validProperties[name] === true; });
                if (valid) {
                    // propertyDefinition (getter/setter)
                    var d = def[key] = {};
                    Object.keys(value).forEach(function (k) {
                        d[k] = value[k];
                    });
                    return;
                }
            }

            // Poor man's inheritance - a sub-destroy method
            if(key === 'destroy'){
                key = '_destroy';
            }
            def[key] = {
                value:    value,
                writable:     true,
                configurable: true,
                enumerable:   true
            };
        });
    }

    function getChildCustomNodes (node) {
        // collect any children that are custom nodes
        // used to check if their dom is ready before
        // determining if this is ready
        var i, nodes = [];
        for(i = 0; i < node.children.length; i++){
            if(node.children[i].nodeName.indexOf('-') > -1){
                nodes.push(node.children[i]);
            }
        }
        return nodes;
    }

    function onDomReady() {
        privates[this._uid].DOMSTATE = 'domready';

        // call this.domReady first, so that the component
        // can finish initializing before firing any
        // subsequent events
        if (this.domReady) {
            this.domReady();
            // domReady should only ever fire once
            this.domReady = function () {};

        }

        this.fire('domready');
    }

    function onCheckDomReady () {
        if (this.DOMSTATE != 'attached') return;

        var
            count = 0,
            children = getChildCustomNodes(this),
            ourDomReady = onDomReady.bind(this);

        function addReady () {
            count++;
            if (count == children.length) {
                ourDomReady();
            }
        }

        // If no children, we're good - leaf node. Commence with onDomReady
        //
        if (!children.length) {
            ourDomReady();
        } else {
            // else, wait for all children to fire their `ready` events
            //
            children.forEach(function (child) {
                // check if child is already ready
                if (child.DOMSTATE == 'domready') {
                    addReady();
                }
                // if not, wait for event
                child.on('domready', addReady);
            });
        }
    }

    function plugins (method, node, option, a, b, c) {
        create.plugins.forEach(function (plugin) {
            if(plugin[method]){
                plugin[method](node, option, a, b, c);
            }
        });
    }

    function addPlugin () {

    }

    extOptions = {
        createdCallback: {
            value: function () {
                console.log('tag', this._tag);
                this._uid = dom.uid(this._tag);
                privates[this._uid] = { DOMSTATE: 'created' };
                plugins('preCreate', this);
                // private?
                this._cleanUpList = {};
                this._cleanUpList.next = this._cleanUpList.prev = this._cleanUpList;



                if(this.created){
                    this.created();
                }
                this.fire('created');
            }
        },
        attachedCallback: {
            value: function () {
                privates[this._uid].DOMSTATE = 'attached';
                plugins('preAttach', this);

                heya.defer.nextTick(onCheckDomReady.bind(this));

                if(this.attached){
                    this.attached();
                }
                this.fire('attached');
            }
        },
        detachedCallback: {
            value: function () {
                privates[this._uid].DOMSTATE = 'detached';
                plugins('preDetach', this);
                if(this.detached){
                    this.detached();
                }
                this.fire('detached');
            }
        },
        attributeChangedCallback: {
            value: function (attrName, oldVal, newVal) {
                plugins('preAttributeChanged', this, attrName, newVal, oldVal);
                if(this.attributeChanged){
                    this.attributeChanged(attrName, newVal, oldVal);
                }
            }
        },
        destroy:{
            value: function () {
                if(this._destroy){
                    this._destroy();
                }
                this.fire('destroy');
                while (this._cleanUpList !== this._cleanUpList.next) {
                    var handle = this._cleanUpList.next;
                    handle.remove();
                    if (handle === this._cleanUpList.next) {
                        // exclude a handle from list explicitly
                        handle.prev.next = handle.next;
                        handle.next.prev = handle.prev;
                    }
                }
                dom.destroy(this);
            }
        },

        registerHandle: {
            value: function (handle) {
                if (Array.isArray(handle)) {
                    handle.forEach(function (handle) {
                        this.registerHandle(handle);
                    }, this);
                    return handle;
                }
                // include in a double-linked list
                var oldRemove = handle.remove, head = this._cleanUpList;
                handle.prev = head;
                handle.next = head.next;
                handle.prev.next = handle.next.prev = handle;
                handle.remove = function () {
                    // exclude itself from the list
                    handle.prev.next = handle.next;
                    handle.next.prev = handle.prev;
                    // clean itself up
                    oldRemove.call(handle);
                    handle.remove = noop;
                };
                return handle;
            }
        },

        fire: {
            value: function (eventName, eventDetail, bubbles) {
                return ml.fire(this, eventName, eventDetail, bubbles);
            }
        },

        emit: {
            value: function (eventName, value) {
                return ml.emit(this, eventName, value);
            }
        },

        on: {
            value: function (node, eventName, selector, callback) {
                return this.registerHandle(
                    typeof node != 'string' ? // no node is supplied
                        on(node, eventName, selector, callback) :
                        on(this, node, eventName, selector));
            }
        },

        once: {
            value: function (node, eventName, selector, callback) {
                return this.registerHandle(
                    typeof node != 'string' ? // no node is supplied
                        on.once(node, eventName, selector, callback) :
                        on.once(this, node, eventName, selector, callback));
            }
        },

        DOMSTATE: {
            get: function (){
                return privates[this._uid].DOMSTATE;
            }
        }
    };

    baseElement = Object.create(HTMLElement.prototype, extOptions);

    function create(options){

        var
            element,
            constructor,
            def = {};

        plugins('define', def, options);

        def._tag = {value: options.tag};

        // collect component-specific definitions
        convertOptionsToDefinition(def, options);

        element = Object.create(baseElement, def);

        constructor = document.registerElement(options.nodeName || options.tag, {
            prototype: element
        });

        return constructor;
    }

    create.plugins = [];
    // TODO - instead of Array, use addPlugin function so optimizations can be made
    create.addPlugin = addPlugin;

    ml.create = create;
}());