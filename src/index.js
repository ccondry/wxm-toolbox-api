// load environment file
require('dotenv').config()

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const expressJwt = require('express-jwt')
const requestIp = require('request-ip')
const atob = require('atob')
const teamsLogger = require('./models/teams-logger')
// load the public cert for validating JWT
const cert_pub = fs.readFileSync('./certs/rsa-public.pem')
// set up Node.js HTTP port
const port = process.env.NODE_PORT
const package = require('../package.json')

// JWT path exceptions - these paths can be used without a JWT required
const exceptions = {
  path: [{
    url: /\/api\/v1\/wxm\/version/i,
    methods: ['GET']
  }]
}
// init express app, and configure it
const app = express()
// parse JSON body into req.body, up to 8kb
app.use(bodyParser.json({limit: '8kb'}))
// enable CORS
app.use(cors())
// get remote IP address of request client as req.clientIp
app.use(requestIp.mw())
// require valid JWT for all paths unless in the exceptins list, and parse JWT payload into req.user
app.use(expressJwt({ secret: cert_pub }).unless(exceptions))

// parse JWT to JSON
function parseJwt (token) {
  var base64Url = token.split('.')[1]
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

// extract real user info if user object has suJwt
app.use(function(req, res, next) {
  // console.log('app.use sujwt middleware - req.user = ', req.user)
  try {
    req.realUser = req.user || {}
    req.realUsername = req.realUser.username || 'unknown'
    // is this a substitute-user?
    if (req.user && req.user.suJwt) {
      // set the real user and username
      req.realUser = parseJwt(req.user.suJwt)
      req.realUsername = req.realUser.username
    }
  } catch (e) {
    console.log(e.message)
  }
  // continue processing
  next()
})

// error handling when JWT validation fails
app.use(function(err, req, res, next) {
  try {
    if (err) {
      // console.error(err.message)
      // return status to user
      res.status(err.status).send(err.message)
      // set up data for logging
      const clientIp = req.clientIp
      const method = req.method
      const host = req.get('host')
      const path = req.originalUrl
      // const url = req.protocol + '://' + host + path
      // there was an error
      console.log('user at IP', clientIp, 'attempting to', method, 'at path', path, 'error', err.status, err.name, err.message)
      // stop processing
      return
    } else {
      // no errors
    }
  } catch (e) {
    console.log(e.message)
  }

  // continue processing
  next()
})

/*****
Routes
*****/
// base path keyword to separate from other toolbox projects
const path = 'wxm'
// get provision status or post to start user demo provisioning
app.use('/api/v1/' + path + '/provision', require('./routes/provision'))
// get this software name and version
app.use('/api/v1/' + path + '/version', require('./routes/version'))

// Node HTTP module options
const httpOptions = {
  // 16k header size. 8k is just barely too small sometimes, 
  // with dcloud cookies plus our JWT (especially when admin uses switch-user)
  maxHeaderSize: 8196*2
}
// create HTTP server instance
const server = http.createServer(httpOptions, app)

server.listen(port, () => {
  // done
})
server.on('error', onError)
server.on('listening', onListening)
/**
* Event listener for HTTP server "error" event.
*/

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string'
  ? 'Pipe ' + port
  : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
    console.error(bind + ' requires elevated privileges');
    process.exit(1);
    break;
    case 'EADDRINUSE':
    console.error(bind + ' is already in use');
    process.exit(1);
    break;
    default:
    throw error;
  }
}

/**
* Event listener for HTTP server "listening" event.
*/

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
  ? 'pipe ' + addr
  : 'port ' + addr.port;
  // debug('Listening on ' + bind);
  // console.log('Express.js listening on ' + bind)
   const packageName = package.name
   const packageVersion = package.version
  console.log('%s %s listening on port %d in %s mode', packageName, packageVersion, server.address().port, app.settings.env)
  // log to Webex Teams room
  teamsLogger.log('service started')
}
