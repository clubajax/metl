// https://blog.madewithenvy.com/getting-started-with-webpack-2-ed2b86c68783#.62vgdvbki

'use strict';

const webpack = require("webpack");
var argv = require('minimist')(process.argv.slice(2));

console.log('CONFIG', argv.d);

if(argv.d){
    //deploy
    module.exports = require('./scripts/deploy.webpack.config.js');
}
else{
    // serve
    module.exports = require('./scripts/dev.webpack.config.js');
}
