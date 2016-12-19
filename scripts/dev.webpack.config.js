'use strict';

const root = __dirname + '/../';
const ExtractTextPlugin = require('extract-text-webpack-plugin');
let extractLESS = new ExtractTextPlugin({
    filename: '/dist/main-foo.css'
    //root + '/less/main.less'
});

module.exports = {
    context: root,

    //performance: {
    //    hints: false
    //},

    entry: {
        build: './src/build.js',
        //styles:'./less/main.less'
        //main: './less/main.less'
    },
    output: {
        path: root + 'dist',
        publicPath: '/dist',
        filename: 'build.js'
    },

    //resolve: {
    //    extensions: ['', '.js', '.jsx', '.css'],
    //    modulesDirectories: [
    //        'node_modules'
    //    ]
    //},

    //extensions: [".js", ".css", ".less"],

    module: {
        rules: [
            {
                test: /\.js$/,

                // using exclude prevents babel from transpiling. wtf.
                //exclude: /node_modules|bower_components/,
                use: [{
                    loader: "babel-loader",
                    options: {presets: ["es2015"]}
                }]
            }
            //,{
            //    test: /\.less$/,
            //    exclude: /node_modules|bower_components/,
            //    use: ['style-loader', 'less-loader']
            //}
            //, {
            //    test: /\.(less|css)$/,
            //    exclude: /node_modules|bower_components|dist/,
            //    //use: ['style-loader', 'less-loader'],
            //
            //    loader: ExtractTextPlugin.extract({
            //        loader: 'less-loader',
            //        fallbackLoader: 'style-loader'
            //    })
            //}
            // Loaders for other file types can go here
        ],


        loaders: [
            // {test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000'},
            //{
            //    test: /\.(css|less)$/,
            //    loader: ExtractTextPlugin.extract({
            //        fallbackLoader: 'style-loader',
            //        loader: ['less-loader']
            //    })
            //}
            //{
            //    test: /\.less$/i,
            //    loader: extractLESS.extract(['css', 'less'])
            //    //loader: "style-loader!css-loader!less-loader"
            //}
        ]
    },
    plugins: [
        //extractLESS
        // Output extracted CSS to a file
        //new ExtractTextPlugin('[name]BLAHHHHHH.css')
    ],
    devServer: {
        contentBase: root  // New
    },
    devtool: 'cheap-module-source-map'
    //devtool: 'inline-source-map' // eval does not work
    //devtool: 'inline'
};

console.log('webpack dev server');