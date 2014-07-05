var winston = require('winston');
var colors = require('colors');

exports.getLogger = function getLogger(level) {

    winston.Logger.prototype.blank = function () {
        console.log();
    };

    winston.remove(winston.transports.Console);

    return new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                timestamp: true,
                level: level,
                levels: {
                    silly:   0,
                    input:   1,
                    verbose: 2,
                    prompt:  3,
                    info:    4,
                    data:    5,
                    help:    6,
                    warn:    7,
                    debug:   8,
                    error:   9
                },
                colors: {
                    silly:   'rainbow',
                    input:   'grey',
                    verbose: 'cyan',
                    prompt:  'grey',
                    info:    'green',
                    data:    'grey',
                    help:    'cyan',
                    warn:    'yellow',
                    debug:   'blue',
                    error:   'red'
                }
            })
        ]
    });
};