(function () {

    function getHighlighted (popup) {
        return dom.query(popup, '.hover');
    }

    function isSelected(node){
        if(!node){
            return false;
        }
        return node.selected || node.getAttribute('selected') || node.classList.contains('ml-selected');
    }

    function getSelected(children){
        for(var i = 0; i < children.length; i++){
            if(isSelected(children[i])){
                return children[i];
            }
        }
        return children[0];
    }

    function getNext(children, index){
        var
            norecurse = children.length + 2,
            node = children[index];
        while(node){
            index++;
            if(index > children.length - 1){
                index = -1;
            }else if(children[index] && !children[index].parentNode.disabled){
                node = children[index];
                break;
            }
            if(norecurse-- < 0){
                console.log('RECURSE');
                break;
            }
        }
        return node;
    }

    function getPrev(children, index){
        var
            norecurse = children.length + 2,
            node = children[index];
        while(node){
            index--;
            if(index < 0){
                index = children.length;
            }else if(children[index] && !children[index].parentNode.disabled){
                node = children[index];
                break;
            }
            if(norecurse-- < 0){
                console.log('RECURSE');
                break;
            }
        }
        return node;
    }

    function getNode(children, highlighted, dir){
        var i;
        for(i = 0; i < children.length; i++){
            if(children[i] === highlighted){
                break;
            }
        }
        if(dir === 'down'){
            return getNext(children, i);
        }else if(dir === 'up'){
            return getPrev(children, i);
        }
    }

    ml.keys = {
        bind: function (listNode) {

            var
                handle,
                children = listNode.children,
                selected = getSelected(children),
                highlighted = selected,
                nodeType = highlighted.localName;

            listNode.fire('key-highlight', {value: highlighted});
            listNode.fire('key-select', {value: highlighted});

            listNode.on('mouseover', nodeType, function (e, node) {
                highlighted = node;
                listNode.fire('key-highlight', {value: highlighted});
            });
            listNode.on('mouseout', function (e) {
                highlighted = null;
                listNode.fire('key-highlight', {value: null});
            });
            listNode.on('blur', function (e) {
                highlighted = null;
                listNode.fire('key-highlight', {value: null});
            });
            listNode.on('click', nodeType, function (e, node) {
                selected = highlighted = node;
                listNode.fire('key-select', {value: selected});
            });

            handle = listNode.on('keydown', function (e) {
                if (e.defaultPrevented) { return; }

                switch (e.key) {
                    case 'Enter':
                        selected = highlighted;
                        listNode.fire('key-select', {value: selected});
                        break;
                    case 'Escape':
                        console.log('esc');
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        highlighted = getNode(children, highlighted || selected, 'down');
                        listNode.fire('key-highlight', {value: highlighted});
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        highlighted = getNode(children, highlighted || selected, 'up');
                        listNode.fire('key-highlight', {value: highlighted});
                        break;
                    default:
                        // the event is not handled
                        return;
                }
                e.preventDefault();
                return false;
            });

            handle.setSelected = function (node) {
                selected = highlighted = node;
                listNode.fire('key-select', {value: selected});
            };
            return handle;
        }
    }

}());