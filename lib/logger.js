var winston = require('winston');
var colors = require('colors');

var theme = {
    silly:      'rainbow',
    input:      'grey',
    verbose:    'cyan',
    prompt:     'grey',
    info:       'green',
    data:       'grey',
    help:       'cyan',
    warn:       'yellow',
    debug:      'blue',
    error:      'red'
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
                    verbose: 1,
                    debug:   2,
                    data:    3,
                    info:    4,
                    input:   5,
                    prompt:  6,
                    help:    7,
                    warn:    8,
                    error:   9
                },
                colors: theme
            })
        ]
    });
};