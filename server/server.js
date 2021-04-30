/** server.js
* 
* this file instanciate the node http server, import the express app 
* and set the http server's port to listen for incoming connexions and http requests . 
* 
* web socket and https server will be set here too.
*
* this file in then exported and imported by the ./index.js file which is the app entry point. 
*/

//imports:

const http = require('http');
/* 
* http module to use the server method 
*/
const app = require('../app/app.js');
/* 
* import our express app object to use it with the server  
*/
/*
* app settings to set the port in our app instance object
*/
const server = http.createServer(app);

/**
 * set the http server to listen on the previous defined port and set a callback to execute on startup
 */

module.exports =  server;

