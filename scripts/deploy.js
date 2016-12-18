'use strict';

// This file calls the webpack function instead of using the webpack cli
// This way the code can be run through a node debugger
// This helps since webpack 2 is still in beta and has a few issues

const webpack = require("webpack");
let config = require('./deploy.webpack.config.js');
webpack(config, function(err, stats) {
    if (err) { throw new Error(err); }
    console.log('[webpack:build]', stats.toString({
        chunks: false, // Makes the build much quieter
        colors: true
    }));
});