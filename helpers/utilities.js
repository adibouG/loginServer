
const { performance } = require('perf_hooks');
const fs = require('fs');
const jwt = require("jsonwebtoken");
const Crypto = require('crypto');
const CryptoJS = require("crypto-js");
const {winstonLogger} = require('../logger/logger.js');
const { getUserFromUserName, getUserDetailsFromId, getAllUsers, checkUserMailExist, getFullUserFromEmail } = require( '../database/dbqueries.js');
const { SETTINGS } = require("../app.settings.js");

;
const getSetting = (name , settings) => {
  let setting = null ;
  for (const idx of  settings) {
    if ( idx["name"] === name) {
      setting = idx;
      break;
    }
  }
  return setting;
}

const getMemUsage = () => {
  const total = process.memoryUsage().heapTotal / 1024 / 1024;
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB over ${Math.round(total * 100) / 100} MB total`);
  return used/total;
}

const trimHexStringDesc = (s) => ( s.startsWith('\\x') ? s.slice(2) : s ) ;

const parseIp = (req) => 
(typeof req.headers['x-forwarded-for'] === 'string'
  && req.headers['x-forwarded-for'].split(',').shift())
|| req.connection.remoteAddress
|| req.socket.remoteAddress
|| req.connection.socket.remoteAddress;

class ResponseBody {
  constructor(status = 200, mess = null, data = null){
    this.message = mess ;
    this.status = status ;
    this.data = data  ;
  }
} 

const makeOAuthTokenSIgn = (userid) =>  {
  let iss = SETTINGS.OAUTH.TOKEN.ISS ;
  let jti =  SETTINGS.OAUTH.TOKEN.JTI()  ;
  let iat = SETTINGS.OAUTH.TOKEN.IAT()  ;
  let exp = SETTINGS.OAUTH.TOKEN.EXP  ;
  let sub = SETTINGS.OAUTH.TOKEN.SUB  ;
  let aud = SETTINGS.OAUTH.TOKEN.AUD  ;
  let client_id = SETTINGS.OAUTH.CLIENT.CLIENT_ID ;
  let scope = "kms::dashboard kms::user" ;
  let external_id = userid ; 
  let tokenSign = { exp, iss, jti, sub, aud, external_id } ;
  return tokenSign;
}

const makeUserIDTokenSIgn = (userid) => {
  let iss = 'kms::login' ; //, "kms::idp" ;
  let jti =  SETTINGS.OAUTH.TOKEN.JTI()  ;
  let exp = SETTINGS.OAUTH.TOKEN.EXP  ;
  let scope = 'kms::login::userInfo' ; //"kms::idp::userInfo" ;
  let user_id = userid ; 
  let tokenSign = { iss, jti, scope, user_id } ;
  return tokenSign;
}

const makeUserAccountActivationTokenSign = ( user, exp = '2h') => ({
  issuer:  'kms::login' , 
  subject:  user ,
  audience:  'kms::login::userAccountActivation',
  expiresIn: exp ,
 // jti: tokenId ,
  //algorithm:  'RS256' ,
})


const makeUserAccountRecoveryTokenSign = ( user, exp = '2h') => ({
  issuer :  'kms::login' , 
 // jti :  SETTINGS.OAUTH.TOKEN.JTI()  ,
  subject:  user ,
  audience : "kms::login::userAccountRecover" ,
  expiresIn: exp ,
 });


const hasher = (message) =>  {
  let h = CryptoJS.SHA512(message).toString();
  return h;
}

const pwdHasher = (pwd, hs ) =>  {
  let p = pwd + trimStringDesc(hs) ;
  let hp = hasher(p) ;
  return hp ;
}

const saltGenerator = (i = 32, t = 'hex') =>  Crypto.randomBytes(i).toString(t);   
// hash the salt
const hashSaltGenerator = (i = 32,  t = 'hex') =>  {
  let h = hasher(salt(i, t));
  return h;
}

const defPwdGenerator = () =>  {
    let hs = hashSaltGenerator() ;
    let hpwd = pwdHasher(hashSaltGenerator( 16, 'utf8'), hs ) ;
    return { hash_salt: hs, hashed_pwd: hpwd } ;
}
  
  
const generateRandomDelayValue = () => Math.floor((Math.random() * ( SETTINGS.LOGIN.RESPONSE.MAX_RANDOM_DELAY - SETTINGS.LOGIN.RESPONSE.MIN_RANDOM_DELAY ) + SETTINGS.LOGIN.RESPONSE.MIN_RANDOM_DELAY ) * 1000 )  ; 
  
//generate a reset pwd token and log it in the session
const uuidGenerator = () => {
  let seed = Date.now();
  seed += performance.now(); 
  let  uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = (seed + Math.random() * 16) % 16 | 0;
    seed = Math.floor(seed/16);
    return (c === 'x' ? r : r & (0x3|0x8)).toString(16);
  });
  return uuid;
}

class CryptoCode {
  constructor(size = 40, type = 'hex'){ 
    let c = Crypto.randomBytes(size) ;
    this.size = i ;
    this.value = c ;
    this.toString = (type) => this.value.toString(type);  
  } 
}

const formatEntry = (val) => val.trim().toLowerCase() 
const isValidEmail = (val) => { 
  let patt1 = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]{2,}|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))+$/ ;
  let isValid = false ;
  if (patt1.test(val)) { isValid = true; } 
  return isValid;
}

const isValidUsername = (val) => { 
  let isValid = false ;
  let patt1 = val.length >= USER_MIN_LENGTH ; 
  let patt2 = val.length < USER_MAX_LENGTH ; 
  if (patt1 && patt2)  isValid = true ; 
  return isValid;
}

const isValidPwd = (val) => {
  let patt1 = /[A-Z]/;
  let patt2 = /[a-z]/;
  let patt3 = /[0-9]/;
  let patt4 = /[!|@|#|$|"|%|^|&|\*|_|\\|-|+|=|/|'|`|~|?|>|<|,|\.|\|\]\]\{\}]/ ;
  let patt5 = val.length >= PWD_MIN_LENGTH ; 
  let patt6 = val.length < PWD_MAX_LENGTH ; 
  let isValid = false ;
  if (patt1.test(val) && patt2.test(val) && patt3.test(val) && patt4.test(val) && patt5 && patt6 )  isValid = true; 
  return isValid;
}

const isValidEntry = (val) => {
  let patt1 = val.length; 
  let patt2 = val.length < 190 ; 
  let isValid = false ;
  if (patt1 && patt2) { isValid = true; }
  return isValid;
}

const trimEntry = (val) =>  val.length && val.trim().length ? val.trim() : null ; 

const pwdHashCompare = (pwd, uhs, hpwd) =>  ((pwdHasher(pwd, trimStringDesc(uhs))) === trimStringDesc(hpwd)) ;

const authenticateJWT = (token, secret, opt = null) => {
  let decodedToken;
    try{
      decodedToken = VERIFY_TOKEN ? jwt.verify(token, secret , opt ) : jwt.decode(token, secret , opt );      
      logger.info("verify token") ;
      return decodedToken ;
    } catch(err) {
      logger.error(err) ;
      throw err
    }
}

function isObject(o) {
  return o instanceof Object && o.constructor === Object;
}

const getUserIdFromOauthToken = (token) => { 
  let val = "act" ;
  if (token &&  isObject(token)) return token[val] ;
  if (token && typeof token === 'string') {
    let decodedToken = jwt.decode(token) ;
    return decodedToken[val] ;
  }
  return null;
}

const  checkUserStatusIsActive = (userObject) => (parseInt(userObject.status) === 1 || userObject.status.toLowerCase() === 'active' ) ;

const runAsyncWrapper = (callback) =>  (req, res, next) => callback(req, res, next).catch(next) ;

class DataCache {
  constructor() {
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
      siz = loginSessionSiz + pwdRecSessionSiz + pwdFailSiz + userFailSiz + logSiz + accountActivSiz + userSessSiz 
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
}


//tmp as we don't know yet how to check admin privilege
const checkIsAdmin = (id) => true ;

module.exports = { 
  DataCache,
  getUserIdFromOauthToken,
  authenticateJWT,
  pwdHashCompare,
  trimEntry,
  isValidEntry,
  isValidPwd,
  isValidUsername,
  defPwdGenerator,
  hashSaltGenerator,
  saltGenerator,
  pwdHasher,
  hasher,
  makeUserIDTokenSIgn,
  makeOAuthTokenSIgn,
  parseIp,
  trimHexStringDesc,
  getMemUsage,
  ResponseBody,
  isObject,
  CryptoCode,
  uuidGenerator,
  generateRandomDelayValue,
  checkIsAdmin,
  isValidEmail,
  formatEntry,
  makeUserAccountActivationTokenSign,
  makeUserAccountRecoveryTokenSign,
  checkUserStatusIsActive,
  runAsyncWrapper
}