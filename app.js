process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Module dependencies
 */

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var serveStatic = require('serve-static');
var errorhandler = require('errorhandler');
var exphbs  = require('express-handlebars');
var http = require('http');
var path = require('path');

//custom modules
var routes = require('./routes');

var app = module.exports = express();
var restApi = require('./routes/restapi')(app);
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

/**
 * Configuration
 */

//default
//Template Engine, handlebars
app.engine('.hbs', exphbs({
    defaultLayout: false,
    extname: '.hbs',
    layoutsDir: "views/"
}));
app.set('view engine', '.hbs');
app.set('views', __dirname + '/views');
//port
app.set('port', process.env.PORT || 3000);
//logger
app.use(morgan('combined'));
// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json 
app.use(bodyParser.json())
//Lets us use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
app.use(methodOverride());
app.use(serveStatic(path.join(__dirname, 'public')));

//development
if (app.get('env') === 'development') {
  app.use(errorhandler());
}

// production
if (app.get('env') === 'production') {
  // TODO
};

/**
 * Routes
 */

// serve index and view partials
app.get('/', express.static('index.html'))
app.get('/constelaciones', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/checkAdminCode', restApi.checkAdminCode);
app.get('/api/checkClientCode', restApi.checkClientCode);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

// Socket.io Communication
var socket = require('./routes/socket')(io);

/**
 * Start Server
 */

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
