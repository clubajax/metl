(function () {

    window.ml.create.plugins.push({
        preAttach: function (node) {
            console.log('preAttach!', this);
        }
    });

}());