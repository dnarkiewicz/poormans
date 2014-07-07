var winston = require('winston');
var colors = require('colors');

var theme = {
    silly:   'rainbow',
    input:   'grey',
    verbose: 'cyan',
    prompt:  'grey',
    debug:   'blue',
    info:    'green',
    data:    'grey',
    help:    'cyan',
    warn:    'yellow',
    error:   'red'
};

colors.setTheme(theme);

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
                    debug:   4,
                    info:    5,
                    data:    6,
                    help:    7,
                    warn:    8,
                    error:   9
                },
                colors: theme
            })
        ]
    });
};