"use strict";

const
    fs = require('fs'),
    input = './src/',
    output = './global/',
    ignores = 'create.js,loader.js';

function fromRequire (line) {
    // const on = require('on');
    return line.split("'")[1];
}

function fromImport (line) {
    // import BaseComponent from './BaseComponent';
    return line.split(' ')[1];
}

function fromExports (line) {
    // export default BaseComponent;
    let name = line.split(' ')[2].replace(';', '');
    if(name.indexOf('{}') > -1){ return null; }
    return name;
}

function firstLine (imports) {
    return '(function (' + (imports.join(', ')) + ') {';
}

function lastLines (exports, imports) {
    // }(window.on, window.dom));
    let
        lines = [],
        imps = [];
    exports.forEach(function (exp) {
        if(exp) {
            lines.push('window.' + exp + ' = ' + exp);
        }
    });
    imps = imports.map(function (imp) {
        return 'window.' + imp;
    });
    lines.push('}(' + (imps.join(', ')) + '));');
    return lines.join('\n');
}

function convert (fileName) {
    let
        imports = [],
        exports = [],
        lines = [];
    fs.readFileSync(input + fileName).toString().split('\n').forEach(function (line) {
        if(/require\(/.test(line)){
            imports.push(fromRequire(line));
        }
        else if(/import\s/.test(line)){
            imports.push(fromImport(line));
        }
        else if(/export\s/.test(line)){
            exports.push(fromExports(line));
        }
        // strip comments
        else if(line.trim().indexOf('//') !== 0){
            lines.push(line);
        }
    });

    lines.unshift(firstLine(imports));
    lines.push(lastLines(exports, imports));

    fs.writeFileSync(output + fileName, lines.join('\n'));
}

fs.readdirSync(input).forEach(function (fileName) {
    if(ignores.indexOf(fileName) === -1) {
        console.log('convert', fileName);
        convert(fileName);
    }
});
