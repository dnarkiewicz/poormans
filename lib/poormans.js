var fs      = require('fs');
var path    = require('path');
var http    = require('http');

var poormansDir     = path.normalize(process.env['HOME'] + '/Dropbox/Apps/Poormans/');
var poormansConfig  = path.normalize(poormansDir + 'poormans.md');
var logLevel        = 'info';
var logger          = require('./logger').getLogger(logLevel);
var port            = 1234;

exports.run = function run() {

    getVersion(function (version) {
        startServer(version, logger);
    });
};

function getVersion(callback) {

    fs.readFile('package.json', {'encoding': 'UTF-8'}, function (err, packageInfo) {
        if (err) throw err;
        callback(JSON.parse(packageInfo).version);
    });
}

function getMarkdownConfig(callback) {

    fs.readFile(poormansConfig, {'encoding': 'UTF-8'}, function (err, data) {
        if (err) throw err;
        callback(data.toString());
    });
}

function startServer(version, logger) {

    var args = process.argv.slice(2);

    logger.blank();
    logger.info('Initializing Poormans Media Server (PMS), Version: ' + version);
    logger.info('Listening for changes in ' + poormansDir);
    logger.info('Starting server on port ' + port);
    logger.blank();

    http.createServer(function (req, res) {
        getMarkdownConfig(function(markdownConfig) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(markdownConfig);
            res.end();
        });
    }).listen(port);
}

