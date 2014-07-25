var fs      = require('fs');
var path    = require('path');
var http    = require('http');

var marked   = require('marked');
var dropbox  = require('dropbox'); 
var humanize = require('humanize'); 

var config  = require('../config/config.js');

var port            = config.port;
var poormansDir     = path.normalize(process.env['HOME'] + config.dir);
var poormansConfig  = path.normalize(poormansDir + config.file);
var logLevel        = config.logLevel;
var logger          = require('./logger').getLogger(logLevel);

var quota           = 0;
var quota_avail     = 0;

exports.run = function run() 
{
    getSpace(function(total,avail){
        quota       = total;
        quota_avail = avail;
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
    });
};

function getSpace(callback)
{
    var dropboxClient = new dropbox.Client(config.dropbox);
    total = 0;
    avail = 0;
    if ( !dropboxClient ) 
    {
        console.erro("Can't Initialize Dropbox Client");
        callback(total,avail);
    }

    dropboxClient.getAccountInfo({},function(err,res,info)
    {
        if ( info )
        {
            total = info.quota_info.quota;
            avail = info.quota_info.quota - info.quota_info.normal;
        }
        callback(total,avail);
    });
} 

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
    var mdConfig = {
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
                if ( !mdConfig.hasOwnProperty( cell[0] ) )
                {
                    mdConfig[ cell[0] ] = { path:cell[1], files:[] };
                } else {
                    mdConfig[ cell[0] ].path = cell[1];
                }
            }
        }
        if ( tokens[i].type == 'heading' && tokens[i].depth==2 )
        {
            var category = tokens[i].text; 
            if ( !mdConfig.hasOwnProperty( category ) )
            {
                mdConfig[ category ] = { path:'', files:[] };
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
                            mdConfig[ category ].files.push(file);
                        }
                    }
                    i++;
                }
            }
        }
    }
    callback(mdConfig);
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
    logger.info('Dropbox Space total('+ humanize.filesize(quota,1024,4) +') available('+ humanize.filesize(quota_avail,1024,4)+')' );
    logger.blank();

    /// don't know if we want to compare diffs or just compare straight to filesystem
    var prevMarkdownConfig = markdownConfig;
    var prevConfigSettings = configSettings;

    /// I was using vim to edit the .md file directly from the Dropbox folder. this caused
    /// two issues.
    /// 1) Node doesn't think the file exists right after a change event,
    /// so I put the fileRead on a half second delay. I haven't tested any different value.
    /// 2) Multiple change events are being fired after a save, so I turn off the listener
    /// after receiving the first event and turn it back on once the timeout is over.
    function onConfigChange(event,filename)
    {
        configWatcher.close();
        setTimeout(function()
        {
            configWatcher = fs.watch( poormansConfig, onConfigChange );
            logger.info('Detected changes in ' + poormansConfig + ': reloading');
            getMarkdownConfig(function(newMarkdownConfig)
            {
                parseMarkdownConfig(newMarkdownConfig,function(newConfigSettings)
                {
                    /// don't know if we want to compare diffs or just compare straight to filesystem
                    prevMarkdownConfig = markdownConfig;
                    prevConfigSettings = configSettings;

                    markdownConfig = newMarkdownConfig;
                    configSettings = newConfigSettings;
                });
            });
        },500);
    };
    
    var configWatcher = fs.watch( poormansConfig, onConfigChange );

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
    	if ( req.url=='/json' ) 
        {
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.write(JSON.stringify(configSettings));
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
        if ( req.url=='/md' || true ) /// default
        {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(markdownConfig);
            res.end();
            return;
        }
    }).listen(port);

    logger.info('Server started');
    logger.info('You can access the current configuration at ' + ('http://localhost:' + port+'/(md|html|json)').bold);
}

