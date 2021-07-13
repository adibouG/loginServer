
const jwt = require('jsonwebtoken') ;

const utilities = require('../helpers/utilities.js');
const dbqueries = require('../database/dbqueries.js');
const {sendEmailRequest , MAILTYPES} = require('../mail/enzoMail.js') ;
const EnzoError = require('../models/errors.js');
const MESSAGES = require('../text/messages.js');


  const getUserInfoRequest = async ( req , res , next ) => {    

    let resObj ;

    try{
        let results = await dbqueries.getUserDetailsFromId(res.locals.userAccountID );
        winstonLogger.log('info' , results);
        if (!results.length) throw new EnzoError.TokenError(404 , MESSAGES.NOACCOUNT, {userAccountID : res.locals.userAccountID} ) ;
        if (results.length > 1) throw new EnzoError.TokenError(500 , MESSAGES.SERVERERROR, {userAccountID : res.locals.userAccountID} ) ;
        else resObj = new utilities.ResponseBody(200 , MESSAGES.OK , results.rows[0]);
       
        winstonLogger.log('info' , resObj);
  
        return res.status(resObj.status).send(resObj);
    
      }
    catch(err) {
        winstonLogger.log('error' , err)
        console.log(err)
        return res.status(err.code).send(err);
      }
}




const getUserListRequest = async ( req , res , next ) => { 
    
    let resObj ;
   
    try {
        let results = await dbqueries.getUserList() ;
        console.log(results.rows) ;
  
        resObj = new utilities.ResponseBody(200 , MESSAGES.OK , results.rows);
        res.send(resObj);
    }
    catch(err){
        console.log(err)
        return res.status(err.code).send(err);
        //resObj = new utilities.ResponseBody(500 ,  MESSAGES.SERVERERROR , err  );
       // return res.status(resObj.status).send(resObj) ;
    }   
    
}


const processUserLoginRequest = async (req, res , next) => {
  
    let {userData}  =  res.locals ;
    let resObj ;
    
    try {
        let results = await dbqueries.getUserFromUserName(userData.user) ;
    
        console.log(" *** GetUser .... *** results :")
        console.log(results.rows)
          
        if (!results.rows.length)  { //no result or wrong attempt
          
          if (!USE_LOGIN_TMP_BLOCK) throw new EnzoError.InvalidRequest(401, MESSAGES.ERR_WRG_CRD , userData)
          ////{
          //   // resObj = new utilities.ResponseBody(422 , MESSAGES.ERR_WRG_CRD , userData ) ;
          //   // return res.status(resObj.status).send(resObj);
          ////}/*
          //if (!userAttempts)  userAttempts = new UserAttempts() ;
          //let failResult = utils.login.functions.addFailAttempt(userAttempts) ;
          //let message = failResult.message ;
          //if  (userAttempts.count > blockSettings.free_attempt) { 
          //  userAttempts.nextTry = time + (userAttempts.count * blockSettings.wrong_email_delay * 1000)  ;
          //  message = MESSAGES.ERRORS.NOUSER_TMPBLOCK(userAttempts.nextTry) ;
          //}
          //else {
          //  userAttempts.nextTry = 0 ;
          //  message =  MESSAGES.ERRORS.NOUSER ;
          //}
          //resObj = new ResponseBody(400 , message , userAttempts )
          //dbCache.user_failures[ip] = userAttempts;
          //return res.status(resObj.status).send(resObj);  
        }
        else {

            let userObject = null;
            
            for (let i = 0 ; i < results.rows.length ; ++i) {
              
              let result = results.rows[i] ;
              let isPwdCorrect = utilities.pwdHashCompare( userData.password  ,  result.hashing_salt , result.password_hash) ;
              console.log("isPwdCorrect : " + isPwdCorrect);
              if (isPwdCorrect)  {
                userObject = result;
                break;
              }
            }
    
            if (!userObject)   throw new EnzoError.InvalidRequest(401, MESSAGES.ERR_WRG_CRD , userData)
           //  ////{
           //    resObj = new ResponseBody(401 , MESSAGES.ERRORS.ERR_WRG_CRD , null ) ;
           //    return res.status(resObj.status).send(resObj) ;
           //}
            
    
            if (!utilities.checkUserStatusIsActive(userObject)) {  
              console.log("STATUS CHECK FAIL USER STATUS IS INCORECT") ;
              throw new EnzoError.InvalidRequest(401, MESSAGES.ERR_WRG_CRD , userData)
              ////{
              resObj = new utilities.ResponseBody(422 , MESSAGES.ERRORS.ERR_WRG_CRD , null ) ;
              return res.status(resObj.status).send(resObj) ;
            }
          
    
           
            /*  //empty cache
            if (USE_LOGIN_TMP_BLOCK && dbCache) {
              if (dbCache.pwd_failures && dbCache.pwd_failures[userData.user]) delete dbCache.pwd_failures[userData.user] ;
              if (dbCache.login_sessions &&  dbCache.login_sessions[userData.user])   delete dbCache.login_sessions[userData.user];
            }
            */

            if (!USE_OAUTH_SERVER) {
                resObj  = new utilities.ResponseBody(200 , "OK" , { user : userObject.id , idToken :  userIdToken } )
                return  res.status(resObj.status).send(resObj) ;
            }
            else {   
               
                let idTokenSign = utilities.makeUserIDTokenSIgn(userObject.id) ;
                let userIdToken =  jwt.sign(idTokenSign , LOGIN_PRIVATE_SECRET ) ;
                
                //res.cookie('userID' , userObject.id ) ;
                //res.cookie('idToken' , userIdToken );
                //res.cookie('sessionId' , sessionId );
    
                //res.setHeader("Set-Cookie", `userID = ${userObject.id} ;` )  
                //res.setHeader("Set-Cookie", `idToken = ${userIdToken} ; HttpOnly` )  
                //res.setHeader("Set-Cookie", `sessionId = ${sessionId} ; HttpOnly` )  
           
                 
                const OAUTH = { 
                    CLIENT_ID : SETTINGS.OAUTH.CLIENT.CLIENT_ID,
                    CLIENT_REDIRECT_URI : SETTINGS.OAUTH.CLIENT.REDIRECT_URI, 
                    LOGIN_SCOPE : "kms::dashboard kms::user" ,
                    SERVERURL : `${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}`
                }; 
                 
                let urlencoded =  new URLSearchParams();

                urlencoded.append("client_id", OAUTH.CLIENT_ID);
                //urlencoded.append("client_secret", SETTINGS.OAUTH.CLIENT.CLIENT_SECRET);
                urlencoded.append("redirect_uri", OAUTH.CLIENT_REDIRECT_URI);
                urlencoded.append("oauthendpoint", OAUTH.SERVERURL);
                urlencoded.append("scope", OAUTH.LOGIN_SCOPE ) ;
                urlencoded.append("state", userData.oAuthRequestState ) ;
                // res.setHeader("Content-Type", "application/x-www-form-urlencoded");
            
                /* OR */

                let data = {} ;
                data.client_id = OAUTH.CLIENT_ID;
                //data.client_secret = SETTINGS.OAUTH.CLIENT.CLIENT_SECRET;
                data.redirect_uri  = OAUTH.CLIENT_REDIRECT_URI ;
                data.Oauthendpoint = OAUTH.SERVERURL ;
                data.scope = OAUTH.LOGIN_SCOPE ;
                data.state = userData.oAuthRequestState ;
            
                let oAuthTokenSign =  utilities.makeOAuthTokenSIgn(userObject.id) ;
                let oAuthToken = jwt.sign(oAuthTokenSign ,  OAUTH_PRIVATE_SECRET , { algorithm: 'RS256' }  ) ;
            
                console.log(jwt.decode(oAuthToken))
                resObj  = new utilities.ResponseBody(200 , "OK"   , { user : userObject.id ,  oAuthParams : data , oAuthtoken : oAuthToken , idToken :  userIdToken   } ) ; 
                console.log(resObj) ;
        
                return  res.status(resObj.status).send(resObj) ;
            }
        }
    }
    catch (err) {
        console.log(err)

        //resObj = new utilities.ResponseBody(500 , MESSAGES.ERRORS.SERVER , null ) ;
        return res.status(err.code).send(err);
    }

}




const requestRecoveryEmail =  async (req, res) => {
    
  let email = req.body && req.body.email ? utilities.formatEntry(utilities.trimEntry(req.body.email)) : null ;

  let userObject , resObj ;
  try {
    if (!email || !utilities.isValidEmail(email)) {  throw new EnzoError.InvalidData(422 ,  MESSAGES.INVALIDEMAIL , req.body )
        resObj = new utilities.ResponseBody(422 , "INVALID EMAIL" , req.body )
        return res.status(resObj.status).send(resObj) ; 
      } 

    let result = await dbqueries.getFullUserFromEmail(email) ;

    if (!result.rows.length) {
          //fake the end user to say we will send the email if email is valid but ...  
          resObj = new utilities.ResponseBody(200 , MESSAGES.PWDRESET_EMAIL_SENT,  req.body )
          return res.status(resObj.status).send(resObj) ; 
      }

    if ( result.rows.length > 1) throw EnzoError.DatabaseError(500 , MESSAGES.SERVERERROR ,  req.body )
    
    userObject = result.rows[0] ;
 
    if (!utilities.checkUserStatusIsActive(userObject)) {  
      console.log("STATUS CHECK FAIL USER STATUS IS INCORECT") ;
      throw EnzoError.ValidationError(409 , MESSAGES.ACTIVEACCOUNT ,  req.body )
    }
  
    let tokenSecret = userObject.password_hash ; 

    let tokenSign = utilities.makeUserAccountRecoveryTokenSign(userObject.guid) ;
    
    let tokenBody = { user_account_id : userObject.user_account_id , user_id : userObject.user_id  }

    console.log(JSON.stringify(idTokenSign))
    console.log(tokenSecret)
      
    let token =  jwt.sign(  tokenBody  , tokenSecret , tokenSign ) ;
  }
  catch(err) {
      // issue during token generation
      console.log(err) ;
      resObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
      return res.status(resObj.status).send(resObj) ; 
  }
  
         
  try {
  
      await sendEmailRequest( 'reset' , email , token , userObject.user_name);

     
      console.log("email sent " + email) ;
      resObj = new ResponseBody( 200 , MESSAGES.PWDRESET_EMAIL_LINK_SEND ,  email );
      return res.status(resObj.status).send(resObj) ; 
 
    } catch(err) {
   
        console.log(err)
        resObj = new ResponseBody( 500 , MESSAGES.ERRORS.ERR_SERV_GEN  ,  email );
         return res.status(resObj.status).send(resObj) ; 
      // TO DO :  retry sending according to the error 
      }
  
  }; 


module.exports = { 
    getUserInfoRequest ,
    getUserListRequest ,
    processUserLoginRequest ,
    requestRecoveryEmail


}