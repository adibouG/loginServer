require('dotenv').config() ; 
const fs = require('fs');
const  path = require('path') ;
const express = require('express');
const appSettings = require('../app.settings.js');
const dbObj = require('../database/DBconnection.js');
const api = require('../routes/routes.js');
const apiToMove = require('../routes/routesToMove.js');
const cookieParser = require('cookie-parser');
const cors = require ('cors');
const { morgan, winstonLogger }  = require('../logger/logger.js');
const { SETTINGS } = appSettings; 
const app = express(); 

app.set('port', process.env.PORT);
app.use((req, res, next) => { 
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, PUT, GET , DELETE , OPTIONS"); 
  res.header("Access-Control-Allow-Headers", "Origin , X-Requested-With, Content , Content-Type, Accept, Authorization"); 
  req.setTimeout(0); 
  next();
 });
app.use(cors());
app.use(api);
app.use(SETTINGS.APP.BACK_SERVER_API.API, apiToMove);
const logDir = path.join(process.cwd(), SETTINGS.LOGDIRECTORY) ; 
const accessLogPath = path.join(logDir, SETTINGS.ACCESSLOG_FILENAME) ;
const appLogPath = path.join(logDir, SETTINGS.APPLOG_FILENAME()) ;
  //log files exist checks 
if (!fs.existsSync(logDir)) fs.mkdirSync(path.dirname(logDir));
if (!fs.existsSync(accessLogPath)) fs.writeFileSync(accessLogPath, "access.log created!", {flags:'wx'});
if (!fs.existsSync(appLogPath)) fs.writeFileSync(appLogPath, "access.log created!", {flags:'wx'});
const accessLogStream = fs.createWriteStream( accessLogPath, { flags: 'a' }) ;
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static( __dirname + '/public')) ; 
const useErrorMiddleware = (handler) => ((req, res, next) => handler(req, res, next ).catch(err => next(err))) ;
const errorMiddleware = (err, req, res, cb) => {
  console.error(`An error was caught: ${err.message}`)
  console.log('Error status: ', err.status)
  console.log('Message: ', err.message);
  if (cb)return cb();
  return res.status(err.status || 500).send({
      code: err.status ,
      message: err.message,
      data: {
        status: error.status,
        message: error.message,
        stack: error.stack
      }
  });
};
app.use(errorMiddleware);

module.exports = app ;