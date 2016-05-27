(function () {
    var
        ml = window.ml,
        baseElement,
        extOptions,
        validProperties = {writable: true, enumerable: true, configurable: true, value: true, get: true, set: true};

    function handleProperty (propName, def) {
        var name = '__' + propName, dataPropName = 'data-' + propName;
        // if there is an existing property, we will rename it to use as a backstore
        if (def[propName]) {
            if (def[name]) {
                console.log("WARNING: property overrides a property '" + key + "' for a backstore");
            }
            def[name] = def[propName];
        }
        // define our getter and setter, which keep a property in sync with related attributes
        def[propName] = {
            get: function () {
                var value = this.getAttribute(propName);
                if (value !== null) {
                    return dom.normalize(value);
                }
                value = this.getAttribute(dataPropName);
                if (value !== null) {
                    return dom.normalize(value);
                }
                value = this[name];
                return typeof value === 'undefined' ? null : value; //dom.normalize(value);
            },
            set: function (value) {
                this.setAttribute(propName, value);
            }
        };
        // the actual synchronization happens in attributeChangedCallback() below
    }

    function processProperties (def, options) {
        if (options.props) {
            options.props.forEach(function (propName) {
                handleProperty(propName, def);
            });
        }
    }

    function convertOptionsToDefinition (def, options) {
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

    extOptions = {
        createdCallback: {
            value: function () {
                if(this.created){
                    this.created();
                }
            }
        },
        attachedCallback: {
            value: function () {
                if(this.attached){
                    this.attached();
                }
            }
        },
        detachedCallback: {
            value: function () {
                if(this.detached){
                    this.detached();
                }
            }
        },
        attributeChangedCallback: {
            value: function (attrName, oldVal, newVal) {
                if(this.attributeChanged){
                    this.attributeChanged(attrName, oldVal, newVal);
                }
            }
        },
        destroy:{
            value: function () {

            }
        }
    };

    baseElement = Object.create(HTMLElement.prototype, extOptions);

    function create(options){

        var
            template,
            element,
            constructor,
            importDoc = window.globalImportDoc || (document._currentScript || document.currentScript).ownerDocument,
            def = {importDoc: {get: function () { return importDoc; }}};

        // define well-known properties
        if (options.templateId) {
            // get the template
            template = importDoc.getElementById(options.templateId);
            def.templateNode = {value: template};
            def.noTemplate   = {value: false};
            console.log('template', template);
        } else {
            def.templateNode = {value: null};
            def.noTemplate   = {value: true};
        }
        def._tag = {value: options.tag};

        // collect component-specific definitions
        convertOptionsToDefinition(def, options);
        processProperties(def, options);

        element = Object.create(baseElement, def);

        constructor = document.registerElement(options.nodeName || options.tag, {
            prototype: element
        });

        console.log('create', options);

        return constructor;
    }

    ml.create = create;
}());