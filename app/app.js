/** app.js
 * 
 * 
 * this file is the main js file, it instanciate the express application object, import the routes and set the app's modules. 
 */

require('dotenv').config() ; 

const fs = require('fs');
 
const  path = require('path') ;
 
const util = require( 'util');
const express = require('express');
const jwt = require("jsonwebtoken");

//imports:
const utils = require( '../utility/utilities.js');
const appSettings = require('../../app.settings.js');
const sendEmailRequest = require('../mail/enzoMail.js') ;
const dbObj = require('../database/DBconnection.js');


const cookieParser = require('cookie-parser');
/*
* body-parser module to parse the request url and body for forms
*/
const bodyParser = require('body-parser');
/*
* morgan module to log the incoming request in the console (for dev purpose)
*/
const { morgan, winstonLogger }  = require('../logger/logger.js');

/*
* CORS module to add and set the CORS headers in our request/response allowing cross origin request/response 
*/
const cors = require ('cors');

const  { getUserFromUserName , getUserDetailsFromId , getAllUsers , checkUserMailExist , getFullUserFromEmail} = require( '../database/dbqueries.js');

const { SETTINGS , TEXTS } = appSettings; 
const LOGDIRECTORY = '/logs'; 
const ACCESSLOG_FILENAME = '/accesslog.log'  ;

const APPLOG_FILENAME = () => `${new Date().getDate()}.logfile.log`  ;

const REACT_SERVER_URL = `${SETTINGS.APP.FRONT_SERVER.HOST}:${SETTINGS.APP.FRONT_SERVER.PORT}`;

const app = express(); 
const router = express.Router();

app.set('port', SETTINGS.LOGIN.SERVER.PORT);
app.use((req, res, next) => { 
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, PUT, GET , DELETE , OPTIONS"); 
  res.header("Access-Control-Allow-Headers", "Origin , X-Requested-With, Content , Content-Type, Accept, Authorization"); 
  req.setTimeout(0); 
  next();
 });
/*
* app settings to set and use the imported modules with our app instance object
*/
app.use(cors());

//Morgan setting for access logs 



/*
 * small function that trigger the check and setting to be done at start 
 */
 
const logDir = path.join(process.cwd() , LOGDIRECTORY) ; 
const accessLogPath = path.join(logDir , ACCESSLOG_FILENAME) ;
const appLogPath = path.join(logDir , APPLOG_FILENAME()) ;

  //log files exist checks 

if (!fs.existsSync(logDir)) fs.mkdirSync(path.dirname(logDir));
if (!fs.existsSync(accessLogPath)) fs.writeFileSync(accessLogPath  , "access.log created!" , {flags:'wx'});
if (!fs.existsSync(appLogPath)) fs.writeFileSync(appLogPath , "access.log created!" , {flags:'wx'});


const accessLogStream = fs.createWriteStream( accessLogPath, { flags: 'a' }) ;
app.use(morgan('combined', { stream: accessLogStream }));

 
//app.use(bodyParser.json());    
//app.use(bodyParser.urlencoded({extended: true}));    
app.use(bodyParser.json({ 
  limit: '50mb'
 }));
 app.use(bodyParser.json({    
  type: function (req) {        
  return req.headers['content-type'] === '*/*'  ;      
//  server.timeout = 100000;     
 }}));
app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieParser());
/*
* app redirect static files/img to serve (needed for files loaded by component directly)
*/
app.use(express.static( __dirname + '/public')) ; 

const  {parseIp , ResponseBody , helpers} =  utils ; 
const  {addTimeToReqMiddleware , getAndCheckUserDataCredentials, getAndcheckUserDataEmail , getUserFromMail , checkLoginRequestData} = utils.login.middlewares;
const  {isValidPwd , isValidUsername , isValidEmail , isValidLoginEntry } = utils.login.functions;

/******* KEYS *****/
const OAUTH_PRIVATE_SECRET = fs.readFileSync(SETTINGS.OAUTH.TOKEN.SECRET.PRIVATE_RSA_KEY.FILENAME) ;
const KMS_API_PUBLIC_KEY = fs.readFileSync(SETTINGS.OAUTH.TOKEN.SECRET.PUBLIC_RSA_KEY.FILENAME) ;

const VERIFY_TOKEN = true;

const ACTIVE_STATUS = 1 ;

const db = dbObj.pgPool ; 

const getAppSettingsInDB = (t) => {
  const sql = `select * from  "${t}" ` ; //"Settings" where  .... `;
  const val = [] ;
  
  
  return db.query(sql, val).then(res => {
    const data = res.rows;
    data.forEach(row => { console.log(row) });
  });
}
 /******************* layer :  Behavior local settings ************************************************* */
//TODO: move this message into settings or message file

const ACTIVATION = {
      USERNAMEEXIST : "Username already in use"  ,
      ACTIVEACCOUNT : "Account already activate" ,
      DBB :  (e) => e.message ,
      NOACCOUNT : "ACCOUNT NOT FOUND" ,
      INVALIDTOKEN : (e) => "INVALID TOKEN" + e.message ,
      VALIDUSERNAME: "Valid username" ,
      RESETSUCCESS : "Password succesfully changed ! \n You are now ready to sign in." ,
      ACTIVATIONSUCCESS : "Your account is now active , you can sign in" ,
      VALIDMAIL : "Valid email" ,
      INVALIDMAIL : "Invalid email" ,
      EXPIREDTOKEN : "This link has expired" ,

    };

const ERRORMESS = {
  MISSING_AUTH_HEADER : {
    STATUSCODE : 401 ,
    MESSAGE : "Missing Authorization header"
  },
  INVALID_TOKEN : {
    STATUSCODE : 401 ,
    MESSAGE : "Invalid token"
  },



} 

const MESSAGES = TEXTS.LOGIN ;

const USEBLOCK = false ;

const blockSettings = {

  checkAndBlockOnIp : SETTINGS.LOGIN.BLOCKS.USE_BLOCK.IP,
  checkAndBlockOnUser : SETTINGS.LOGIN.BLOCKS.USE_BLOCK.USER ,
  logUserAttempt :SETTINGS.LOGIN.LOG.FAILED_ATTEMPTS ,

  wrong_pwd_delay : SETTINGS.LOGIN.BLOCKS.BLOCKING_TIME_ON_ATTEMPT , 
  wrong_email_delay : SETTINGS.LOGIN.BLOCKS.BLOCKING_TIME_ON_ATTEMPT, 
  free_attempt : SETTINGS.LOGIN.BLOCKS.FREE_ATTEMPTS ,
  max_attempts : SETTINGS.LOGIN.BLOCKS.MAX_ATTEMPTS , 
  use_random_delay : SETTINGS.LOGIN.RESPONSE.APPLY_RANDOM_DELAY ,
  max_random_delay :  SETTINGS.LOGIN.RESPONSE.MAX_RANDOM_DELAY , 
  min_random_delay :   SETTINGS.LOGIN.RESPONSE.MIN_RANDOM_DELAY 

}
const { checkAndBlockOnIp ,  checkAndBlockOnUser , logUserAttempt}  = blockSettings ;

/******************************************************************************************************** */


const secondsLeftToNextTry = (t) =>  {
  let n = Date.now() ;
  if (t > n) { 
    return Math.floor((t - n) / 1000)
  }
  return 0 ;
}

function DataCache() {

  this.user_failures = {} ;
  this.pwd_failures = {} ;
  this.login_sessions = {} ;
  this.pwdRecovery_sessions = {} ;
  this.accountActivation_sessions = {} ;
  this.user_sessions = {};
  this.logs = {} ;

  
  this.getCacheSize =  () => {

      let siz = 0 ;
      let loginSessionSiz = Object.keys(dbCache.login_sessions).length;
      let pwdRecSessionSiz = Object.keys(dbCache.pwdRecovery_sessions).length;
      let pwdFailSiz = Object.keys(dbCache.pwd_failures).length;
      let userFailSiz = Object.keys(dbCache.user_failures).length;
      let accountActivSiz = Object.keys(dbCache.accountActivation_sessions).length;
      let userSessSiz = Object.keys(dbCache.user_sessions).length;
      let logSiz = Object.keys(dbCache.logs).length;

      siz = loginSessionSiz + pwdRecSessionSiz + pwdFailSiz + userFailSiz + logSiz + accountActivSiz + userSessSiz ;

      console.log("login_sessions :" + loginSessionSiz);
      console.log("pwdRecovery_sessions :" + pwdRecSessionSiz);
      console.log("pwd_failures :" + pwdFailSiz);
      console.log("user_failures :" + userFailSiz);
      console.log("accountActivation_sessions :" + accountActivSiz);
      console.log("user_sessions :" + userSessSiz);
      console.log("logs :" + logSiz);
      console.log("total cache :" + siz);

    return siz;
  }
} 

const dbCache = USEBLOCK ? new DataCache() : null ;

const useErrorMiddleware = (handler) => ((req, res, next) => handler(req, res, next ).catch(err => next(err))) ;
const errorMiddleware = (err, req, res, next) => {
  logger.error(`An error was caught: ${err.message}`)
  return res.status(err.status || 500).send({
      message: err.message,
      error: {}
  });
  return next();
};

const authenticateBasic = (req, res, next) => {
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(ERRORMESS.MISSING_AUTH_HEADER.STATUSCODE).send(ERRORMESS.MISSING_AUTH_HEADER.MESSAGE);
  let credentials = authHeader.split(' ')[1];
  let buff = new Buffer(credentials, 'base64');
  let text = buff.toString('utf8');
  let data = text.split(':');
  const userData = { user : data[0] , password: data[1] }
  //getUserFromUserName(user , password).then(res => ).catch(err => ) 
  res.locals.userCredentials = userData;
  next();
}

const authenticateOauthJWT = (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return res.status(ERRORMESS.MISSING_AUTH_HEADER.STATUSCODE).send(ERRORMESS.MISSING_AUTH_HEADER.MESSAGE);
  const token = authHeader.split(' ')[1];
  let decodedToken ;
  try{
    decodedToken = VERIFY_TOKEN ? jwt.verify(token, KMS_API_PUBLIC_KEY , { algorithms: ['RS256'] } ) : jwt.decode(token, KMS_API_PUBLIC_KEY , { algorithms: ['RS256'] }); 
    res.locals.token  = decodedToken ;        
    return next() ;
  } 
  catch (err) {
    logger.error(err) ;
    return res.status(ERRORMESS.INVALID_TOKEN.STATUSCODE).send(ERRORMESS.INVALID_TOKEN.MESSAGE);
  }
};


const authenticateJWT = (token , secret , opt = null) => {

  let decodedToken;
    try{
      decodedToken = VERIFY_TOKEN ? jwt.verify(token, secret , opt ) : jwt.decode(token, secret , opt );      
      logger.info("verify token") ;
      return decodedToken ;
    } 
    catch (err) {
      logger.error(err) ;
      throw err
    }
};

/*******************user info start*************************************/

getUserIdFromOauthToken = (req, res , next ) => { 
  
  let val = "act" ;
  let decodedToken = res.locals.token ;
  res.locals.userAccountID = decodedToken[val] ;
  return next() ;
}

app.get('/userInfo' ,  authenticateOauthJWT , getUserIdFromOauthToken , ( req , res , next ) => {    

  let resObj = null ;
  let {userAccountID}  = res.locals

  if (!userAccountID) { 
    resObj = new ResponseBody(422 , "" , null)
    return res.status(resObj.status).send(resObj);
  }
  
  getUserDetailsFromId(userAccountID)
    .then(
  
    results => {
    
      console.log(results);
      if (!results.rows.length) {
        resObj = new ResponseBody(404 , "Invalid User" , null )
      }
      resObj = new ResponseBody(200 , "OK" , results.rows[0])

      console.log(resObj);
      return res.status(resObj.status).send(resObj);
    
    }
  )
  .catch(
    err => {
      console.log(err)
      return res.sendStatus(500)
    }
  )
})


/*******************user info end*************************************/

const checkIsAdmin = (id) => true ;

app.get('/userList' , authenticateOauthJWT ,  getUserIdFromOauthToken , ( req , res , next ) => { 

  let {userID}  = res.locals ;

  if (checkIsAdmin( userID )) {

    getAllUsers().then(results => {
      
      
      let resObj = new ResponseBody(200 , "OK" , results.rows)
      res.send(resObj)
    })
    .catch(err => {
      console.log(err)
      let resObj = new ResponseBody(500 , "KO" , null)
      return res.sendStatus(500) ;
    })    
  
  }
  else{
    return res.sendStatus(403) ;
  }
});


app.delete('/deleteAccount/:userid' , authenticateOauthJWT ,   (req, res , next) => {
  
  let userID = req.params.id ;
  let userAccountID = null ;
  let resObj = null ;
  let success =  false;
  
  ;(async () => {
    
      const client = await db.connect();
    
      try {
        await client.query('BEGIN');
        console.log('BEGIN')
      
        const sql1 = `SELECT user_account_id FROM "Users" WHERE id = $1` ;
        
        const sql2 = `DELETE FROM "Users" WHERE id = $1`;
        const sql3 = `DELETE FROM "UserAccounts" WHERE id = $1`;
        
	      const sql1Values = [ userID ] ;
         
        const result = await client.query(sql1, sql1Values) ;
      
        if (!result.rows.length) {  
          resObj = new ResponseBody(404 , "Account not found" , {userID} );
          return res.status(resObj.status).send(resObj);
        }
      
        userAccountID = result.rows[0].user_account_id; 
        const sql3Values = [ userAccountID ] ;
        
        await client.query(sql2, sql1Values );
        await client.query(sql3, sql3Values );
      
        await client.query('COMMIT');
        console.log('COMMIT');
    
        resObj = new ResponseBody(200 , "Account deleted" , {userID , userAccountID } );
        return res.status(resObj.status).send(resObj);
       
      } 
      catch (e) {
        await client.query('ROLLBACK');
        console.log('ROLLBACK');
        console.error(e)   
        resObj = new ResponseBody(500 , e.message , e );
        return res.status(resObj.status).send(resObj);
      }
      finally {
        console.log('release db connection');
        client.release() ; 
      }
    })();   
})
/*******************login start*************************************/

app.post('/login' ,  addTimeToReqMiddleware , checkLoginRequestData , getAndCheckUserDataCredentials , (req, res) => {
  
  
let {userData , userAttempts}  =  res.locals ;


let resObj = null ;


console.log("look for DB results ")

getUserFromUserName(helpers.sanitizeInput(userData.user))
.then(
   results =>  {
        
      console.log(" *** GetUser .... *** results :")
      console.log(results.rows)
      
      if (!results.rows.length)  { //no result or wrong attempt
     
        if (checkAndBlockOnIp || checkAndBlockOnUser || logUserAttempt ) {
          
          if (!userAttempts)  userAttempts = new UserAttempts() ;
          let failResult = utils.login.functions.addFailAttempt(userAttempts) ;
          let message = failResult.message ;
          if  (userAttempts.count > blockSettings.free_attempt) { 
            userAttempts.nextTry = time + (userAttempts.count * blockSettings.wrong_email_delay * 1000)  ;
            message = MESSAGES.ERRORS.NOUSER_TMPBLOCK(userAttempts.nextTry) ;
          }
          else {
            userAttempts.nextTry = 0 ;
            message =  MESSAGES.ERRORS.NOUSER ;
          }
          resObj = new ResponseBody(400 , message , userAttempts )
          dbCache.user_failures[ip] = userAttempts;
          return res.status(resObj.status).send(resObj);
        }
      
        resObj = new ResponseBody(422 , MESSAGES.ERRORS.ERR_WRG_CRD , null ) ;
        return res.status(resObj.status).send(resObj);
      }
    
      if (results.rows.length === 1) {

        console.log(results.rows[0]);

        let result = results.rows[0];

        console.log("checking result from results.rows[0] :") ;
        console.log(result)

        if (userAttempts)  delete dbCache.user_failures[ip] ;

        if (result.status !== 1 && result.status !== 'active' ) {  
          console.log("STATUS CHECK FAIL USER STATUS IS INCORECT") ;
          resObj = new ResponseBody(422 , MESSAGES.ERRORS.ERR_WRG_CRD , null ) ;
          return res.status(resObj.status).send(resObj) ;
        }
      

        //check pwd 
        let isPwdCorrect = utils.login.functions.pwdHashCompare( userData.password  ,  result.hashing_salt , result.password_hash) ;
        console.log("isPwdCorrect : " + isPwdCorrect);

        if (!isPwdCorrect) {
          resObj = new ResponseBody(401 , MESSAGES.ERRORS.ERR_WRG_CRD , null ) ;
          return res.status(resObj.status).send(resObj) ;
        }
          //success

          //empty cache
        if (dbCache) {
          if (dbCache.pwd_failures && dbCache.pwd_failures[userData.user]) delete dbCache.pwd_failures[userData.user] ;
          if (dbCache.login_sessions &&  dbCache.login_sessions[userData.user])   delete dbCache.login_sessions[userData.user];
        }

        let userObject = result ;
        let sessionId = utils.generator.uuidGenerator();
        let tokenSecret = utils.generator.salt();
        let idTokenSign = utils.makeUserIDTokenSign(userObject.id) ;
        let  userIdToken =  jwt.sign(idTokenSign , tokenSecret  ) ;

        let session = { userIdToken : tokenSecret}  ;
        dbCache.user_sessions[userObject.id] = session;

        res.cookie('userID' , userObject.id ) ;
        res.cookie('idToken' , userIdToken );
        res.cookie('sessionId' , sessionId );

        //res.setHeader("Set-Cookie", `userID = ${userObject.id} ;` )  
        //res.setHeader("Set-Cookie", `idToken = ${userIdToken} ; HttpOnly` )  
        //res.setHeader("Set-Cookie", `sessionId = ${sessionId} ; HttpOnly` )  
       

        if (!SETTINGS.LOGIN.USE_OAUTH) { //response with user object if no oauth 
          resObj  = new ResponseBody(200 , "OK" , { user : userObject.id , idToken :  userIdToken } )
          return  res.status(resObj.status).send(resObj) ;
        }
        
        if (SETTINGS.LOGIN.PROXY_AUTHCODE_REQ) {      /// .... 
         //**/*/*/ */
        }
        // or  add the redirect and Oauth params

        // and send  with token  
        if (SETTINGS.LOGIN.OAUTH_FLOW === 1) { //response with user object if no oauth 
          
          let scope = "kms::dashboard kms::user"  ;
         
          let urlencoded =  new URLSearchParams();
          urlencoded.append("client_id", SETTINGS.OAUTH.CLIENT.CLIENT_ID);
          //urlencoded.append("client_secret", SETTINGS.OAUTH.CLIENT.CLIENT_SECRET);
          urlencoded.append("redirect_uri", SETTINGS.OAUTH.CLIENT.REDIRECT_URI);
          urlencoded.append("Oauthendpoint", `${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}`);
          urlencoded.append("scope", scope ) ;
          urlencoded.append("state", userData.oAuthRequestState ) ;
          // res.setHeader("Content-Type", "application/x-www-form-urlencoded");
          
          /* OR */

          let data = {} ;
          data.client_id = SETTINGS.OAUTH.CLIENT.CLIENT_ID;
          //data.client_secret = SETTINGS.OAUTH.CLIENT.CLIENT_SECRET;
          data.redirect_uri  = SETTINGS.OAUTH.CLIENT.REDIRECT_URI;
          data.Oauthendpoint = `${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}`;
          data.scope = scope ;
          data.state = userData.oAuthRequestState ;
          
          //let uriReceived = req.headers.origin ;
          let oAuthTokenSign =  utils.makeOAuthTokenSign(userObject.id) ;
          let oAuthToken = jwt.sign(oAuthTokenSign ,  OAUTH_PRIVATE_SECRET , { algorithm: 'RS256' }  ) ;
          
          console.log(jwt.decode(oAuthToken))
           //res.redirect(`http://${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}/${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}`)
          //res.redirect(`http://localhost:3000/login/oAuthCallBack"}`)
          resObj  = new ResponseBody(200 , "OK"   , { user : userObject.id ,  oAuthParams : data , oAuthtoken : oAuthToken , idToken :  userIdToken   } ) ; 
          console.log(resObj) ;
     
          return  res.status(resObj.status).send(resObj) ;
        }
        else {
        
          let uriReceived = req.headers.referer ?  req.headers.referer : req.headers.origin ;
          console.log( req.headers.referer  + " ,  "  +  req.headers.origin  )
          let stateReceived = req.body.oAuthRequestState;
          let oAuthTokenSign = utils.makeOAuthTokenSign(userObject.id) ;
          
          let oAuthToken = jwt.sign(oAuthTokenSign ,  OAUTH_PRIVATE_SECRET , { algorithm: 'RS256' } ) ;

          resObj  = new ResponseBody(200 , "OK" , { user : oAuthToken   })
          return  res.status(resObj.status).send(resObj) ;
        }

      }
      else {
          // there is more than a result for this username  we should raise an issue ... somewhere ... somehow
          let userObject = null;
        
          for (let i = 0 ; i < results.rows.length ; ++i) {
            
            let result = results.rows[i] ;
            let isPwdCorrect = utils.login.functions.pwdHashCompare( userData.password  ,  result.hashing_salt , result.password_hash) ;
            console.log("isPwdCorrect : " + isPwdCorrect);
            if (isPwdCorrect)  {
              userObject = result;
              break;
            }
          }
          
          
          if (!userObject) {
            resObj = new ResponseBody(500 , MESSAGES.ERRORS.UNKNWERR_GEN  , null  ) ;
            return res.status(resObj.status).send(resObj);
          }
          //success

          if (userObject)  {
            //empty cache
            if (dbCache) {
              if (dbCache.pwd_failures && dbCache.pwd_failures[userData.user]) delete dbCache.pwd_failures[userData.user] ;
              if (dbCache.login_sessions &&  dbCache.login_sessions[userData.user])   delete dbCache.login_sessions[userData.user];
            }

    
            // send token 
            resObj  = new ResponseBody(200 , "OK" , { userObject  } )
            return  res.status(resObj.status).send(resObj) ;

          }

          //if cache and attempts 
          if (dbCache) { //set failure addition
              //  if (dbCache.pwd_failures && dbCache.pwd_failures[userData.user])  ;
              // if (dbCache.login_sessions &&  dbCache.login_sessions[userData.user])   delete dbCache.login_sessions[userData.user];
          }
          
          resObj = new ResponseBody(500 , MESSAGES.ERRORS.UNKNWERR_GEN  , null  ) ;
          return res.status(resObj.status).send(resObj);
          
      }
  })
  .catch(err => {
        console.log(err)
         resObj =  new ResponseBody(500 , MESSAGES.ERRORS.SERVERR_GEN , err )
         return res.status(resObj.status).send(resObj);
      }
    )
}) 



app.get('/login' ,  (req , res) => {


  const CLIENTID = SETTINGS.OAUTH.CLIENT.CLIENT_ID ;
  const CLIENTLOGINURL = SETTINGS.OAUTH.CLIENT.REDIRECT_URI ;  
  const OAUTHSERVER = `${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}`
  const OAUTHAUTHORIZE = `${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}` ;

  let s = utils.generator.uuidGenerator() ;
   
  let urlencoded =  new URLSearchParams();
        
  urlencoded.append("client_id", CLIENTID);
  urlencoded.append("redirect_uri", CLIENTLOGINURL);
  urlencoded.append("state",  s ) ;
  
  let url = OAUTHSERVER + OAUTHAUTHORIZE + "?" + urlencoded.toString() ;
  
let html = `
<html>
  <body><div class="fullScreen" >
    <div class="login" >
      <a href=${url}>
        <button value="LOGIN" class="loginButton" >
          LOGIN
        </button>
      </a>
    </div> 
  </body>
</html>`;

res.send(html);
})


app.post('/passwordRequest', getAndcheckUserDataEmail , getUserFromMail  , async  (req , res) => {

     let resObj = null;  
     let {email} = res.locals ;
       

     if(!res.locals.user || res.locals.user.length !== 1) {  // we respond ok with some vague generic message but nothing will happen 
      resObj = new ResponseBody(200 , MESSAGES.PWDRESET_EMAIL_LINK_SEND , email )
      return res.status(resObj.status).send(resObj) ; 
    }
  
    let userObject =  res.locals.user[0]  ;
 
      
      //make aconsole.log token

    let tokenSecret = userObject.password_hash ; 
  
    let idTokenSign = utils.makeUserAccountRecoveryTokenSign(userObject.guid) ;
    let token = null;
        console.log(JSON.stringify(idTokenSign))
        console.log(tokenSecret)
    try{
        token =  jwt.sign( { user_account_id : userObject.id }   , tokenSecret , idTokenSign ) ;
    }
    catch(err) {
      // issue during token generation
        console.log(err)
        resObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
         return res.status(resObj.status).send(resObj) ; 
    }
   
  // send email
  
  try {
  
    let result = await sendEmailRequest( 'reset' , email , token , userObject.user_name);

    console.log("email sent " + email)
    resObj = new ResponseBody( 200 , MESSAGES.PWDRESET_EMAIL_LINK_SEND ,  email );
      return res.status(resObj.status).send(resObj) ; 
 
  } catch(err) {
      //in case of issue , find a way to resend the email ?
      console.log(err)
      resObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
       return res.status(resObj.status).send(resObj) ; 
  }
   
}); 


 
    
const getAccountFromRecoveryToken = async (token) => {
    
    let decoded , user_account_id , user , error ;
    
    try {
       decoded = jwt.decode(token) ;
       user_account_id = decoded.user_account_id ; 
       
    } 
    catch (e) {
       console.log(e)
       error =  ACTIVATION.INVALIDTOKEN(e) ;
       throw error ;
    }

    let sql = `SELECT  id , guid , user_name , status, password_hash , encode(password_hash , 'hex') as password_hash, encode(hashing_salt , 'hex') as hashing_salt FROM "UserAccounts" WHERE id = $1 AND status = ACTIVE_STATUS`;

    try {
       let result = await db.query( sql ,[user_account_id] ) ;
       if (!result.rows.length) { 
         error =  ACTIVATION.NOACCOUNT ;
         throw error ;
       }   
       user = result.rows[0];
    }
    catch (e) {
      console.log(e)
      error =  ACTIVATION.DBB(e) ;
      throw error ;
    }   
    
    console.log(user.password_hash)
     console.log(user.password_hashy)
    let secret = user.password_hash ;

    try {
      decoded = jwt.verify(token , secret) ;
  
      return user ;
    }
    catch (e) {
      console.log(e)
      error =  ACTIVATION.INVALIDTOKEN(e) ;
      throw error ;
    } 
}

    
    

app.get('/passwordReset',  (req, res) => {     


    let queryParams = req.query ;
    let token = null ;
    if (!queryParams ||  !queryParams.token) res.status(401).send("missing token") ;
    
      //test   
   token = queryParams?.token ; 
   let redirectURL = `${REACT_SERVER_URL}/passwordReset?token=${token}` ;     
   return getAccountFromRecoveryToken(token)
        .then(result  => res.redirect(redirectURL) )
        .catch(err => res.status(400).send(err)  )
          
})



app.post('/passwordReset',  async (req, res) => {

    
    let userData = req.body;
    
    let token = userData.token; 
    let pwd = helpers.sanitizePwdInput(userData.password) ;
    
     console.log(userData.password)
     console.log(pwd)
   
    
    let decoded = null;
    
    let userObject = null ;
    let secret = null ;
    let success = false ;
    let error = null ;
    let data = null ;
    
    let guid = null ;
    let user_id = null;
    let user_account_id = null ;
    
  
    
        try {
            data = jwt.decode(token) ;
            user_account_id = data.user_account_id ;
            console.log(user_account_id)
            
        } catch (e) {
            console.log(e)
            error =  ACTIVATION.INVALIDTOKEN(e) ;
            let resObj =  new ResponseBody(402 ,  error , userData) ;
            return res.status(resObj.status).send(resObj);
        }

        let sql = `SELECT  id , guid , user_name , status, password_hash , hashing_salt FROM "UserAccounts"  WHERE id = $1 `;

        try {
          let result = await db.query( sql ,[user_account_id] ) ;
          if (!result.rows.length) { 
            error =  ACTIVATION.NOACCOUNT ;
             let resObj =  new ResponseBody(402 ,  error , userData) ;
            return res.status(resObj.status).send(resObj);
          } 
          userObject = result.rows[0];
         }  
        catch (e) {
            console.log(e)
            error =  ACTIVATION.DBB(e) ;
            let resObj =  new ResponseBody(402 ,  error , userData) ;
            return res.status(resObj.status).send(resObj);
          }
        try {
          decoded = jwt.verify(token , userObject.password_hash ) ;
         }
        catch (e) {
            console.log(e)
            error =  ACTIVATION.INVALIDTOKEN(e) ;
            let resObj =  new ResponseBody(402 ,  error , userData) ;
            return res.status(resObj.status).send(resObj);
        }
    
    let hs = utils.generator.hashSaltGenerator() ;
    
    let hpwd = utils.helpers.password.pwdHasher(pwd , hs) ;
    
    console.log(hpwd)
    
    let sql2 = `UPDATE "UserAccounts" SET  password_hash = decode($1 , 'hex') , hashing_salt = decode($2 , 'hex')   WHERE id = $3` ;
    
    console.log(sql2)
     try{
           results = await  db.query(sql2 , [hpwd , hs , decoded.user_account_id ])
       
       console.log(results)  
                let resObj =  new ResponseBody(200 ,   ACTIVATION.RESETSUCCESS , userData ) ;
                return res.status(resObj.status).send(resObj);
            }
         catch (err) { 
             console.log(err); // err  returned by server //will have to analyze the error 
             let resObj =  new ResponseBody(500 , MESSAGES.ERRORS.UNKNWERR_GEN , userData) ;
             return res.status(resObj.status).send(resObj);
          }
  
}); 



app.post('/createAccount',  authenticateOauthJWT ,  getUserIdFromOauthToken , async (req, res , next) => {

  //check/confirm for Admin User request
  let {userID}  = res.locals ;
  if (!checkIsAdmin( userID )) return res.sendStatus(401);
  //process
  let userData = req.body;
  console.log(userData)
  
  let resObj = null ;
      
   
  let { email , first_name , last_name }  = userData ;
  
  email = helpers.sanitizeInput(email);
  
  if (email && !first_name &&  !last_name) {
   console.log('premail check : ' + email)
        try {
  
    let preresult  = await checkUserMailExist(email);
    console.log(preresult)
    if (preresult.rows.length && preresult.rows[0].count > 0) {
      resObj = new ResponseBody(400 ,  MESSAGES.ERRORS.EMAIL_ALREADY_USED , userData) ;
      return res.status(resObj.status).send(resObj) ;
    }
    else if (preresult.rows.length && preresult.rows[0].count === 0){
       resObj = new ResponseBody(200 , ACTIVATION.VALIDMAIL , userData) ;
        return res.status(resObj.status).send(resObj) ;
      }
    }catch (e){
        console.error(e)
        return res.status(500).end();
    }
  }
  
 first_name = helpers.sanitizeInput(first_name);
 last_name = helpers.sanitizeInput(last_name);
   
  let isAdmin = true ;
  let session = null ;

  if (!email || !isValidEmail(email))  {
  //check if email is valid 
    resObj = new ResponseBody(500 , ACTIVATION.INVALIDEMAIL , userData) ;
    return res.status(resObj.status).send(resObj) ;
  }
  //check if email already exist
  try {
  
    let result  = await checkUserMailExist(email);
  
    if (result.rows.length && result.rows[0].count > 0 ) {
      resObj = new ResponseBody(400 ,  MESSAGES.ERRORS.EMAIL_ALREADY_USED , userData) ;
      return res.status(resObj.status).send(resObj) ;
    }
  }catch (e){
        console.error(e)
        return res.status(500).end();
    }
    
    

  //will have to check user is that made request is logged and is Admin role to create account
  //if (token && ) .... 
 
  //generate a reset pwd token and log it in the session

    let newUserUuid = utils.generator.uuidGenerator();
    let defaultPwd =   utils.generator.defPwdGenerator() ;
    
    let createDate = Date.now() ;
    
    let currentDate = new Date();

    let currentTime = currentDate.getTime();

    let localOffset = (-1) * currentDate.getTimezoneOffset() * 60000;

    let stamp = Math.round(new Date(currentTime + localOffset).getTime() / 1000);

  let success = false ;
  let newUserAccountID = null ;
  let newUserID = null ;
  ;(async () => {
  const client = await db.connect()
 try {
      await client.query('BEGIN')
      console.log('BEGIN')
      
      const sql1 = `INSERT INTO "UserAccounts" ( guid , status , user_name , password_hash , hashing_salt  ) VALUES ( $1 , $2 , $3 , decode($4 , 'hex') , decode($5 , 'hex') ) RETURNING id` ; 
      
      const sql1Values = [  newUserUuid ,  0 , email , defaultPwd.hashed_pwd , defaultPwd.hash_salt ] ;

      const res = await client.query(sql1, sql1Values );
      newUserAccountID = res.rows[0].id ;
      const sql2 = `INSERT INTO "Users" (email , first_name , last_name , user_account_id) VALUES ($1, $2, $3 , $4 ) RETURNING id` ;
      const sql2Values = [email , first_name , last_name , res.rows[0].id]; 
      const res2 = await client.query(sql2, sql2Values) ;
      newUserID =  res2.rows[0].id ;
      await client.query('COMMIT');
      console.log('COMMIT');
      success = true ;
    } catch (e) {
      await client.query('ROLLBACK')
      console.log('ROLLBACK')
      throw e
    } finally {
      client.release() ; 
    }
  })()
  .catch(e => {
    console.error(e)
    return res.status(500).end();
  })  
  .then(async  () => {

      if (!success) return res.status(500).end();

      let sign = utils.makeUserAccountActivationTokenSign(newUserUuid) ;
      
      // start mail server 
      
       let responseObj = null;
      // send email
      try {
        let token =  jwt.sign({user_id :  newUserID , user_account_id : newUserAccountID } , defaultPwd.hashed_pwd , sign ) ;
        let result = await sendEmailRequest( 'create' , email , token , user = null );
        console.log(result.data)
        console.log("email sent " + email)
        responseObj = new ResponseBody( 200 , MESSAGES.PWDRESET_EMAIL_LINK ,  email );
      
    }catch(err) {
      //in case of issue , find a way to resend the email ?
      console.log(err)
      responseObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
    }
  return res.status(responseObj.status).send(responseObj) ; 
    
  
    })
    .catch(err => {
          console.log(err)
      responseObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
        return res.status(responseObj.status).send(responseObj) ; 
  })
  });

    
    /* ********************** ACTIVATION ******************************************/ 
    


    
const getAccountFromActivationToken = async (token) => {

       try {
            let decoded = jwt.decode(token) ;
            user_id = decoded.user_id ;
            user_account_id = decoded.user_account_id ;
            
        } catch (e) {
            console.log(e)
            error =  ACTIVATION.INVALIDTOKEN(e) ;
            throw error ;
        }

        let sql = `SELECT  id , guid , user_name , status, encode(password_hash , 'hex') as password_hash, encode(hashing_salt , 'hex') as hashing_salt FROM "UserAccounts" WHERE id = $1 `;

        try {
          let result = await db.query( sql ,[user_account_id] ) ;
          if (!result.rows.length) { 
            error =  ACTIVATION.NOACCOUNT ;
           throw error ;
          }   
          if ( result.rows[0].status > 0 ) { 
            error =  ACTIVATION.ACTIVEACCOUNT ;
            throw error ;
            
          }     
           return result.rows[0] ;
        }
        catch (e) {
          console.log(e)
          error =  ACTIVATION.DBB(e) ;
          throw error ;
        }    
}
    
    

app.get('/accountActivation',  (req, res) => {     


    let queryParams = req.query ;
    let token = null ;
    if (!queryParams ||  !queryParams?.token) res.status(401).send("missing token") ;
    
      //test   
   token = queryParams?.token ; 
   let redirectURL = `${REACT_SERVER_URL}/accountActivation?token=${token}` ;     
   return getAccountFromActivationToken(token)
        .then(result  => res.redirect(redirectURL) )
        .catch(err => res.status(400).send(err)  )
          
})



    
    

app.post('/accountActivation',  (req, res) => {

  let userData = req.body; 
  //or token in req.header 
  let { token , password  , user } = userData ; 
  let pwd = password ;
  user = helpers.sanitizeInput(user)
  
  let resObj = null ;
  
   console.log(userData) ; 
  if ( !token )  { return res.status(400).end() ; }
  
  ;(async () => {

    let secret = null ;
    let success = false ;
    let error = null ;
    let data = null ;
    let returnValue =  { success , error , data } ;
    let guid = null ;
    let user_id = null;
    let user_account_id = null ;
    
        try {
            let decoded = jwt.decode(token) ;
            user_id = decoded.user_id ;
            user_account_id = decoded.user_account_id ;
            
        } catch (e) {
            console.log(e)
            error =  ACTIVATION.INVALIDTOKEN(e) ;
            resObj = new ResponseBody(401 , error , e) ;
            return res.status(resObj.status).send(resObj);
        }

        let sql = `SELECT  id , guid , user_name , status, encode(password_hash , 'hex') as password_hash, encode(hashing_salt , 'hex') as hashing_salt FROM "UserAccounts" WHERE id = $1 `;

        try {
          let result = await db.query( sql ,[user_account_id] ) ;
          if (!result.rows.length) { 
            error =  ACTIVATION.NOACCOUNT ;
            resObj = new ResponseBody(404 , error , userData) ;
            return res.status(resObj.status).send(resObj);
          }   
          if ( result.rows[0].status > 0 ) { 
            error =  ACTIVATION.ACTIVEACCOUNT ;
            resObj = new ResponseBody(400 , error , userData) ;
            return res.status(resObj.status).send(resObj);
          }     
          secret = result.rows[0].password_hash; 
          guid = result.rows[0].guid ;
        }
        catch (e) {
          console.log(e)
          error =  ACTIVATION.DBB(e) ;
          resObj = new ResponseBody(401 , error , e) ;
          return res.status(resObj.status).send(resObj);
        }
      
    try {
      data = jwt.verify(token , secret , {issuer:  'kms::login' , subject:  guid , audience: 'kms::login::userAccountActivation'}) ;
      success = true ;
    }
    catch (e) {
      console.log(e)
      error =  ACTIVATION.INVALIDTOKEN(e) ;
      resObj = new ResponseBody(401 , error , e) ;
      return res.status(resObj.status).send(resObj);
    }


    //token is verified and valid
    //check username
    console.log("still running here 3......")
     console.log(userData) ;
     
      if (!data) {
          resObj = new ResponseBody(400 , error , userData) ;
          return res.status(resObj.status).send(resObj);
      }
     
    

      if (user && !pwd) { 
       // return  checkUserNameExist(user) {
         console.log("user && !pwd") ;
        /*if (useCacheSession)  dbCache.accountActivation_sessions[token].step = 1 ;*/
        let result = null;
     //   ;(async () => {
            
            try {
                let sql2 =  `SELECT COUNT(id) from  "UserAccounts"  WHERE user_name = $1 AND id != $2` ;
                let results = await db.query( sql2 , [ user , data.user_account_id ]) ;
                console.log(results)
                let count  = results.rows[0].count ;
                if (count > 0 ) {  
                    resObj = new ResponseBody( 400 ,  ACTIVATION.USERNAMEEXIST ,  userData );
                    return res.status(resObj.status).send(resObj) ; 
                }
     
               let sql3 = `UPDATE "UserAccounts" SET user_name = $1  WHERE id = $2  ` ;
                
               await db.query(sql3 , [ user , data.user_account_id  ]);
                resObj = new ResponseBody(200 ,    ACTIVATION.VALIDUSERNAME ,  { user , token } ) 
               return res.status(resObj.status).send(resObj);
          }
           catch(err) {
                  console.log(err); // err  returned by server //will have to analyze the error 
                  return res.status(500).send(err);
           }
     // })(); 
    } 
    else if (user && pwd) {
    
      console.log("user && pwd") ;
      
          let hs = utils.generator.hashSaltGenerator() ;

          let hpwd = utils.helpers.password.pwdHasher(pwd , hs) ;

            //use DB , so username should already by set
     
            let sql4 =  `SELECT COUNT(id) AS exist from  "UserAccounts"  WHERE user_name = $1 AND id = $2 AND status = $3` ;
            try {

              let results = await db.query( sql4 , [ user , data.user_account_id , 0 ]) ;

              if (results.rows.length !== 1)   return res.status(500).send(err); //
            
              let sql5 = `UPDATE "UserAccounts" SET password_hash = decode($1 , 'hex') , hashing_salt = decode($2 , 'hex') , status = $3 WHERE id = $4  AND user_name = $5 ` ;
            
              let update =  await db.query(sql5 ,  [hpwd, hs , 1 , data.user_account_id  , user ])
            
              console.log(update)
              
              resObj = new ResponseBody(200 , ACTIVATION.ACTIVATIONSUCCESS , null) 

              return res.status(resObj.status).send(resObj);   
            }
            catch(err) { 
              console.log(err); // err  returned by server //will have to analyze the error 
              return res.status(500).send(err);
            }
          }   
        })()
   
   } 
)
          







  module.exports = app 