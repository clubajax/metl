'use strict';

// This file is used for tests

console.log('DEV/TEST');

const root = __dirname + '/../';

module.exports = {
    context: root,

    performance: {
        hints: false
    },

    entry: {
        build: './src/build.js'
    },
    output: {
        path: root + 'dist',
        publicPath: '/dist',
        filename: 'build.js'
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                use: [{
                    loader: "babel-loader",
                    options: { presets: ["es2015"] }
                }]
            }
            // Loaders for other file types can go here
        ]
    },
    plugins:[

    ],
    devServer: {
        contentBase: root  // New
    },
    devtool: 'cheap-module-source-map'
    //devtool: 'inline-source-map' // eval does not work
    //devtool: 'inline'
};

console.log('webpack dev server');