var path = require('path');

module.exports = function (grunt) {

    grunt.initConfig({
        metl:{
            less:{
                main:{
                    src:'less/main.less',
                    output: 'dist/main.css'
                }
            },
            watch:{
                less:['./less/*.less'],
                scripts:['./tests/**/*.html'],
                port: 35731
            }
        }
    });

    grunt.loadNpmTasks('grunt-metl-tools');
};