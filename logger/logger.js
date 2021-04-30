const fs = require('fs') ;
const util = require('util') ;
const path = require('path');

const morgan  = require('morgan');
const winston = require('winston');

let winstonLogger = winston.createLogger({
 
    transports: [
      new (winston.transports.Console)({ level:'debug' }),
      new (winston.transports.File)({ level:'debug', filename: path.join( process.cwd() ,  'logs/log.log') })
    ]
  });


  
  module.exports = {
        morgan,
        winstonLogger
  } ;


