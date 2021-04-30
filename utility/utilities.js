
const { performance } = require('perf_hooks');
const fs = require('fs');
const jwt = require("jsonwebtoken");
const Crypto = require('crypto');
const CryptoJS = require("crypto-js");

const  { getUserFromUserName , getUserDetailsFromId , getAllUsers , checkUserMailExist , getFullUserFromEmail} = require( '../database/dbqueries.js');


const { SETTINGS , TEXTS } = require("../../app.settings.js");

const MESSAGES = TEXTS.LOGIN ;

exports.readFile = (name) => { 
    let f ; 
    try {
      f = fs.readFileSync(name);
      console.log('successfully read ' + name );
      console.log('successfully read ' + f );
    } catch (err) {
      // handle the error
      console.log(err)
    }
    return f ;
  } 
  
  
  exports.writeFile = (name , data) => { 
  
    try {
        fs.appendFile(name , data);
        console.log('successfully write to : ' + name );
      } catch (err) {
        // handle the error
        console.log(err);
      } 
    } 
   
  
    

  

  exports.getSetting = (name , settings) => {

    let setting = null ;
    for (const idx of  settings) {
      
      if ( idx["name"] === name) {
        setting = idx;
        break;
      }
    }
    return setting;
}



exports.getMemUsage = () => {
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB over ${Math.round(total * 100) / 100} MB total`);
    return used/total;
  }
  

  exports.trimStringDesc = (s) => ( s.startsWith('\\x') ? s.slice(2) : s ) ;



  
exports.parseIp = (req) => 
(typeof req.headers['x-forwarded-for'] === 'string'
    && req.headers['x-forwarded-for'].split(',').shift())
|| req.connection.remoteAddress
|| req.socket.remoteAddress
|| req.connection.socket.remoteAddress;



exports.ResponseBody = function(status = null , mess = null , data = null){

    this.message = mess ;
    this.status = status ;
    this.data = data  ;

}

exports.makeOAuthTokenSign = function(userid)  {
  
  let iss = SETTINGS.OAUTH.TOKEN.ISS ;
  let jti =  SETTINGS.OAUTH.TOKEN.JTI()  ;
  let iat = SETTINGS.OAUTH.TOKEN.IAT()  ;
  let exp = SETTINGS.OAUTH.TOKEN.EXP  ;
  let sub = SETTINGS.OAUTH.TOKEN.SUB  ;
  let aud = SETTINGS.OAUTH.TOKEN.AUD  ;
  let client_id = SETTINGS.OAUTH.CLIENT.CLIENT_ID ;
  let scope = "kms::dashboard kms::user" ;
  let external_id = userid ; 
 
  let tokenSign = { exp , iss ,  jti , sub , aud ,  external_id } ;

  return tokenSign;
};


exports.makeUserIDTokenSign = function(userid)  {
  
  let iss = "kms::login" ;
  let jti =  SETTINGS.OAUTH.TOKEN.JTI()  ;
 
  let exp = SETTINGS.OAUTH.TOKEN.EXP  ;

  let scope = "kms::login::userInfo" ;
  let user_id = userid ; 
 
  let tokenSign = { iss , jti , scope , user_id } ;

  return tokenSign;
};


exports.makeUserAccountActivationTokenSign = ( user , exp = '2h') => ({
    issuer:  'kms::login' , 
    subject:  user ,
    audience:  'kms::login::userAccountActivation',
    expiresIn: exp ,

   // jti: tokenId ,
    //algorithm:  'RS256' ,
   });


exports.makeUserAccountRecoveryTokenSign = ( user , exp = '2h') => ({

    issuer :  'kms::login' , 
   // jti :  SETTINGS.OAUTH.TOKEN.JTI()  ,
    subject:  user ,
    audience : "kms::login::userAccountRecover" ,
    expiresIn: exp ,
  
   });

  

/************************************************************************************************* */

  /******************************************************************************************************* */
  
exports.helpers = { block : {} , crypt : {} , password : {} }  ; 





  /***********************************************************************************************/


  exports.helpers.crypt.encryptVal = (val) => CryptoJS.AES.encrypt(val , secret).toString();

  exports.helpers.crypt.decryptVal = (val) => {
 
      let bytes  = CryptoJS.AES.decrypt(ciphertext, secret);
      let originalVal = bytes.toString(CryptoJS.enc.Utf8);
      console.log(originalVal); 
      return originalVal;
}

exports.helpers.crypt.hasher = (message) =>  {
    let h = CryptoJS.SHA512(message).toString();
    return h;
  }


  //generate random salt (8 char)

  

/*********************************************************************************************** */

  
exports.helpers.password.pwdHasher = (pwd , hs ) =>  {
    console.log("pwdHasher Entries => pwd : %s " + pwd + " , hs : %s " + hs )  
    let p = pwd + this.trimStringDesc(hs) ;
    console.log(p)
    let hp = this.helpers.crypt.hasher(p) ;
    return hp ;

}


  
exports.helpers.sanitizeInput = ( val ) => {
  if (val && val.trim()) return val.trim().toLowerCase() ;
  return null;
  }

   

exports.helpers.sanitizePwdInput = ( val ) => {
  if (val && val.trim()) return val.trim() ;
  return null;
  }

  
  
  /************************************************************************************************* */
  exports.generator = {}; 

  exports.generator.salt = (i = 32 , t = 'hex') =>  Crypto.randomBytes(i).toString(t);   
  // hash the salt
  exports.generator.hashSaltGenerator = (i = 32 , t = 'hex') =>  {
      let h = this.helpers.crypt.hasher(this.generator.salt(i, t));
      return h;
    }
    
       
    
  exports.generator.defPwdGenerator = () =>  {
        let hs = this.generator.hashSaltGenerator() ;
        let hpwd = this.helpers.password.pwdHasher(this.generator.hashSaltGenerator( 16 , 'utf8') , hs ) ;
        return {hash_salt : hs , hashed_pwd : hpwd} ;
    }
    
    
    
exports.generator.randomDelays = () => Math.floor((Math.random() * ( SETTINGS.LOGIN.RESPONSE.MAX_RANDOM_DELAY - SETTINGS.LOGIN.RESPONSE.MIN_RANDOM_DELAY ) + SETTINGS.LOGIN.RESPONSE.MIN_RANDOM_DELAY ) * 1000 )  ; 
    
  //generate a reset pwd token and log it in the session
  exports.generator.uuidGenerator = () => {
    let seed = Date.now();
    seed += performance.now();
      
    let  uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = (seed + Math.random() * 16) % 16 | 0;
      seed = Math.floor(seed/16);
      
      return (c === 'x' ? r : r & (0x3|0x8)).toString(16);
    });
    
    return uuid;
}


exports.generator.CryptoCode = function(size = 40 , type = 'hex'){ 
    let c = Crypto.randomBytes(size) ;
    this.size = i ;
    this.value = c ;
    this.toString = (type) => this.value.toString(type);  
  
  } 




/************************************************** */
exports.login = {functions : {} , middlewares : {} };


exports.login.UserAttempts = function( ip , userData , time) {
    this.count = 0 ;
    this.ip = ip ;
    this.user = userData ;
    this.startAt = time ;

    this.addAttempt = (i = 1) => this.count = this.count + i ; 

  } 
  
exports.login.NewLoginSession = function ( ip , userData , time ){
    this.ip = ip ;
    this.userData = userData ; 
    this.result =  null ;
    this.startAt =  time  ;
  }
  


  exports.login.functions.addFailAttempt = (attempt = null , fail_type = 1) => { 

    if (!attempt) { attempt = new UserAttempts(); }
  
  
    attempt.count = attempt.count + 1 ; 
    if  (attempt.count > blockSettings.max_attempts && fail_type === 2 ) {
      attempt.nextTry = -1  ;
      message =  MESSAGES.ERRORS.ACCOUNT_BLOCK    ; 
    }
    else if  (attempt.count > blockSettings.free_attempt) {
      attempt.nextTry = time + (attempt.count * blockSettings.wrong_email_delay * 1000)  ;
      message = fail_type === 1 ? MESSAGES.ERRORS.NOUSER_TMPBLOCK(attempt.nextTry) : MESSAGES.ERRORS.WRGPWD_TMPBLOCK(attempt.nextTry)    ; 
    }
    else {
      attempt.nextTry = 0 ;
      message =  MESSAGES.ERRORS.NOUSER ;
    }
    return  { attempt , message } ;
  }
  

  
  exports.login.functions.isValidUsername = (val) => { 

    let isValid = true ;
  
    let patt1 = val.length >= 8 ; 
    let patt2 = val.length < 64 ; 
  
    if (!patt1) { isValid = false; }
    if (!patt2) { isValid = false; }
  
    return isValid;
  
  }
  
  exports.login.functions.isValidPwd = (val) => {
  
    let patt1 = /[A-Z]/;
    let patt2 = /[a-z]/;
    let patt3 = /[0-9]/;
    //let pat4 = /[!@#$%^&*_\-+=\/"'`~?><,.]/ ;
    let patt5 = val.length >= 10 ; 
    let patt6 = val.length < 60 ; 
  
  
    let isValid = true ;
  
    if (!patt1.test(val)) { isValid = false; }
    if (!patt2.test(val)) { isValid = false; }
    if (!patt3.test(val)) { isValid = false; }
   // if (!patt4.test(val)) { isValid = false; }
   //if (!patt5) { isValid = false; }
    if (!patt6) { isValid = false; }
  
    return isValid;
  }
   exports.login.functions.isValidLoginEntry = (val) => {
  
  
    let patt5 = val.length > 3 ; 
    let patt6 = val.length < 300 ; 
  
  
    let isValid = true ;
  
  
     if (!patt5) { isValid = false; }
    if (!patt6) { isValid = false; }
  
    return isValid;
  }
  
  exports.login.functions.isValidEmail = (val) => { 

    let patt1 = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]{2,}|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))+$/ ;
   
   let isValid = true ;
  
   if (!patt1.test(val)) { isValid = false; }
  
  return isValid
  };
  
  
  exports.login.functions.pwdHashCompare = (pwd , uhs , hpwd) =>  ((this.helpers.password.pwdHasher(pwd , this.trimStringDesc(uhs))) === this.trimStringDesc(hpwd)) ;

  exports.login.functions.checkBlockType = (attempt) => {

    if (attempt.count >  SETTINGS.LOGIN.BLOCKS.MAX_ATTEMPTS) return  2  ;
    if (attempt.count > SETTINGS.LOGIN.BLOCKS.FREE_ATTEMPTS && attempt.nextTry > Date.now()) return 1 ;
  
    return null ;
  }


exports.login.functions.setBlockResponse = (attempt) => {

  if (checkBlockType(attempt) === 2 ) return new ResponseBody(429 , MESSAGES.ERRORS.ACCOUNT_BLOCK , attempt ); 
  if (checkBlockType(attempt) === 1  ) return new ResponseBody(400 , MESSAGES.ERRORS.ISTMPBLOCK(attempt.nextTry) , attempt ); 
  
}
  
  exports.login.functions.getAttemptCache = (val , dbCache = dbCache ) =>  {
    if (dbCache.user_failures[val])  return dbCache.user_failures[val] ;
    if (dbCache.pwd_failures[val])  return dbCache.pwd_failures[val] ;
   return null;
   
 }

 exports.login.functions.getSessionCache = (val , dbCache = dbCache ) =>  {
   if (dbCache.login_sessions[val])  return dbCache.login_sessions[val] ;
   if (dbCache.pwdRecovery_sessions[val])  return dbCache.pwdRecovery_sessions[val] ;
  return null;
  
}

   
exports.login.middlewares.addTimeToReqMiddleware = (req , res , next) =>  {
    console.log("adding delays To Request ... of ....  ")      
    let d =  this.generator.randomDelays() ;
    console.log( d + " ms")
    return  setTimeout( next   , d ); 
}  

exports.login.middlewares.blockIpCheckMiddleware = (req , res , next ) => {
    if (!useBlock && !checkAndBlockOnIp)  return next(); 
  let requestip = this.parseIp(req) ;
  let attempts = this.login.functions.getAttemptCache(requestip) ;
  if ( attempts && checkBlockType(attempts)) {
    // already logged errors
   console.log("checks ip  :  blocked " )
   resObj = setBlockResponse(attempts) ;
   return res.status(resObj.status).send(resObj) ; // `account blocked for ${(dbCache.failures[ip]["nextTry"] - time)} seconds`);
 }
 
return next(); 
}


exports.login.middlewares.blockUserCheckMiddleware = (req , res , next ) => {
    if (!useBlock && !checkAndBlockOnUser)  return next(); 
    let user = req.body.user || req.body.username || req.body.email ;
    let attempts = getAttemptCache(user) ;
    if (attempts && checkBlockType(attempts)) {
             // already logged errors
      console.log("checks ip  :  blocked " )
      resObj = setBlockResponse(attempts) ;
      return res.status(resObj.status).send(resObj) ; // `account blocked for ${(dbCache.failures[ip]["nextTry"] - time)} seconds`);
    }
          
    return next(); 
  }
  

  exports.login.middlewares.checkLoginRequestData = (req, res , next) => { 

    console.log('... /login start now ... ' ); 
    console.log(req.body); //
    let userData = req.body ;
  
    let ip = this.parseIp(req);
    let time = Date.now();
    let resObj = null ;
  
    console.log("request time :" + time)
    console.log(`request ip : ${ip}`);
  
    res.locals.reqData =  { ip , time } ;
  
    return next() ;
  }
  
  
  exports.login.middlewares.getAndCheckUserDataCredentials = (req , res , next) => { 
  
    let userData = req.body ;
    
    let user = userData.user && userData.user.length ? this.helpers.sanitizeInput(userData.user)  : null  ;
    let pwd =  userData.password && userData.password.length ? userData.password.trim() : null  ; 
  
    let resObj = null ;
  
    if (!user || !pwd || !this.login.functions.isValidLoginEntry(user) || !this.login.functions.isValidLoginEntry(pwd)) {
 
      resObj = new this.ResponseBody( 422 , MESSAGES.ERRORS.ERR_WRG_CRD , null )
      return res.status(resObj.status).send(resObj) ;
    }
  
    res.locals.userData = {user : user , password : pwd } ;
  
  
    //check user attempts... if needed ... 
    let userAttempts = null ;
    let userSession = null ;
  
    res.locals.userAttempts = userAttempts ;
    res.locals.userSession = userSession ;
  
    return next()
  }
  
  
  exports.login.middlewares.getAndcheckUserDataEmail = (req, res , next) => {

  if (req.body) console.log(req.body) ;
  let userData = req.body ;
  //let user = userData.user ? userData.user.trim() : null ;
  let email = userData.email ? this.helpers.sanitizeInput(userData.email) : null ;
  let responseObj = null ;
  
  if (!email || ( email && (email.length > 300 || !this.login.functions.isValidEmail(email)))){
    responseObj = new this.ResponseBody(400 ,  null , null)
    return res.status(responseObj.status).send(responseObj) ; 
  } 
   
  //res.locals.userData = {} ;
  res.locals.email = email ;
  return next();
}


   
  exports.login.middlewares.getUserFromMail = async (req, res, next) => {
  
  let email = res.locals.email ? res.locals.email : this.helpers.sanitizeInput(req.body.email) ;
  
  try {
    let response =  await getFullUserFromEmail(email) ;
  
    res.locals.user =  response.rows || null  ;
    
    return next() ;
  }
  catch (e) {
  
    console.log(e) ;
    responseObj = new this.ResponseBody(500 , MESSAGES.ERRORS.ERR_SERV_GEN , null  )
    return res.status(responseObj.status).send(responseObj) ; 
    
    }
  }

  