var fs      = require('fs');
var path    = require('path');
var http    = require('http');

var poormansDir     = path.normalize(process.env['HOME'] + '/Dropbox/Apps/Poormans/');
var poormansConfig  = path.normalize(poormansDir + 'poormans.md');
var logLevel        = 'info';
var logger          = require('./logger').getLogger(logLevel);
var port            = 1234;

var marked = require('marked');

exports.run = function run() 
{
    getVersion(function (version) 
    {
        getMarkdownConfig(function(markdownConfig) 
        {
            parseMarkdownConfig(markdownConfig,function(configSettings)
            {
                startServer(version, markdownConfig, configSettings);
            });
        });
    });
};

function getVersion(callback) 
{
    fs.readFile('package.json', {'encoding': 'UTF-8'}, function (err, packageInfo) {
        if (err) throw err;
        callback(JSON.parse(packageInfo).version);
    });
}

function getMarkdownConfig(callback) 
{
    fs.readFile(poormansConfig, {'encoding': 'UTF-8'}, function (err, data) 
    {
        if (err) throw err;
        callback(data.toString());
    });
}

function parseMarkdownConfig(markdownConfig,callback)
{
    var config = {
        'Current Media' : { path:'', files:[] }
    };
    var tokens = marked.lexer(markdownConfig);
    var len = tokens.length;
    for ( var i=0; i<len; i++ )
    {
        if ( tokens[i].type == 'heading' && tokens[i].depth==4 && tokens[i+1].type == 'table' ) 
        {
            i++
            var table  = tokens[i];
            var ncells = table.cells.length;
            for ( var c=0; c<ncells; c++ )
            {
                var cell = table.cells[c];
                if ( !config.hasOwnProperty( cell[0] ) )
                {
                    config[ cell[0] ] = { path:cell[1], files:[] };
                } else {
                    config[ cell[0] ].path = cell[1];
                }
            }
        }
        if ( tokens[i].type == 'heading' && tokens[i].depth==2 )
        {
            var category = tokens[i].text; 
            if ( !config.hasOwnProperty( category ) )
            {
                config[ category ] = { path:'', files:[] };
            }
            i++;
            if ( tokens[i].type == 'list_start' )
            {
                i++; 
                while( tokens[i].type !== 'list_end' )
                {
                    if ( tokens[i].type == 'list_item_start' )
                    {
                        i++; 
                        var file = '';
                        while( tokens[i].type !== 'list_item_end' )
                        {
                            if ( !file && tokens[i].type == 'text' )
                            {
                                file = tokens[i].text;
                            }
                            i++;
                        }
                        if ( file ) 
                        {
                            config[ category ].files.push(file);
                        }
                    }
                    i++;
                }
            }
        }
    }
    callback(config);
}

function moveFiles(configSettings)
{
    /// match local files to configSettings
    /// using directories listed in config, map all existing local files
    /// move local files to match direcotory locations listed in config 
}

function startServer(version, markdownConfig, configSettings) 
{

    logger.blank();
    logger.info('Initializing Poormans Media Server (PMS), Version: ' + version);
    logger.info('Listening for changes in ' + poormansDir);
    logger.info('Starting server on port ' + port);
    logger.blank();

    var prevMarkdownConfig = markdownConfig;
    var prevConfigSettings = configSettings;

    function onConfigChange(event,filename)
    {
        configWatcher.close();
        setTimeout(function()
        {
            configWatcher = fs.watch( poormansDir+'poormans.md', onConfigChange );
            logger.info('Detected changes in ' + poormansConfig + ': reloading');
            getMarkdownConfig(function(newMarkdownConfig)
            {
                parseMarkdownConfig(config,function(newConfigSettings)
                {
                    prevMarkdownConfig = markdownConfig;
                    prevConfigSettings = configSettings;

                    markdownConfig = newMarkdownConfig;
                    configSettings = newConfigSettings;
                });
            });
        },500);
    };
    
    var configWatcher = fs.watch( poormansDir+'poormans.md', onConfigChange );

    http.createServer(function (req, res) 
    {
        logger.info(req.method+' '+req.url);
    	if ( req.url=='/favicon.ico' ) 
    	{
    		var favicon = new Buffer("AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAABoaGgAt7e3AFhYWADr6+sA9PT0AMnJyQBqamoA/f39AHNzcwDS0tIAfHx8ALm5uQBjY2MA9vb2AP///wBTU1MAu7u7AHd3dwBVVVUAvb29APHx8QDPz88AeXl5AIKCggDh4eEAV1dXAOrq6gBgYGAA8/PzAGlpaQD8/PwApqamANra2gC4uLgAwcHBAGtrawD+/v4AdHR0AFJSUgBbW1sAw8PDAHZ2dgDe3t4AVFRUAJqamgDOzs4AeHh4AE1NTQCBgYEAtbW1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADysmDw8PDw8PDw8PDw8PDysmDw8PDw8mDw8PDw8PDw8mKw8PFx4VDw8PDysmDysPDyYPDwoOBQ8PDysmDw8mKw8PDyYuDigPJismKyYPDyYPKyYrKQciDysmDw8PJg8PDyYPJikHMSwYHwwmDysrJg8PDw8pBwsIAQQaFg8mJg8PDw8PKQcQDw8lHCoZDw8PDw8PDykeIQ8mKy0kLisPKw8PDyYpDgEPKyYgBy4mJg8rDyYrEQ4TAiMiDgkPJisPDysPDzAeFAMNDRMADw8PDw8mDw8nHQYjIxsvDw8PJg8PDw8mDysmKw8PJhImDw8PDw8PDw8mDw8PDysmKw8PKwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",'base64');
    	    res.writeHead(200, {'Content-Type': 'data:image/x-icon;base64'});
    		res.write(favicon);
    		res.end();
    		return;
    	}
    	if ( req.url=='/html' )
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(marked(markdownConfig));
            res.end();
            return;
        }
    	if ( req.url=='/json' ) 
        {
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.write(JSON.stringify(configSettings));
            res.end();
            return;
        }
        if ( req.url=='/md' || true ) /// default
        {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(markdownConfig);
            res.end();
            return;
        }
    }).listen(port);

    logger.info('Server started');
    logger.info('You can access the current configuration at ' + ('http://localhost:' + port).bold);
}

