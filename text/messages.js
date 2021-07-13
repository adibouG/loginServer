



  const MESSAGES = {

    OK : 'OK' ,
    ERR_WRG_CRD : 'Wrong credentials' ,

    VALIDUSERNAME : "Valid username" ,
    INVALIDUSERNAME : "Invalid username" ,
    USERNAMEEXIST : "Username already in use"  ,

    VALIDEMAIL : "Valid email" ,
    INVALIDEMAIL : "Invalid email" ,
    USED_EMAIL : "Email already in use" ,

    INVALIDDATA : "Invalid values" ,
    
    INVALIDTOKEN : "Invalid token" ,
    EXPIREDTOKEN : "Token is expired" ,
    EXPIREDTOKENLINK : "This link has expired" ,

    PWDRESET_EMAIL_SENT : "If this account exist an email wil be sent" ,
    PWDRESETSUCCESS : "Password successfully changed ! \n You are now ready to sign in." ,
    ACTIVATIONSUCCESS : "Your account is now active , you can sign in" ,
    ACTIVEACCOUNT : "This account is already active" ,
    INVALIDACCOUNT : "Invalid account" ,

    NOACCOUNT : "ACCOUNT NOT FOUND" ,
    DELETIONSUCCESS : "User account deleted" ,

    MISSINGPARAMS :(p = '') =>  `Missing ${p} parameters` ,
    DBB :  (e) => `db error : ${e}` ,
    
    SERVERERROR : "SERVER ERROR",
  
    LOGIN : {
      ERRORS : {
        EMAIL_ALREADY_USED: "This email is already in our system",
        NOUSER : "User ID doesn't exist." ,
        NOUSER_TMPBLOCK : (t) => `User ID doesn't exist. \n Sign in will be temporary blocked for ${secondsLeftToNextTry(t)} seconds.` ,
        ISTMPBLOCK : (t) => `Sign in is temporary blocked \n ${secondsLeftToNextTry(t)} seconds.` ,
        WRGPWD : "Invalid password" ,
        WRGPWD_TMPBLOCK :  (t) => `Invalid password. \n Sign in will be tempoary blocked for ${secondsLeftToNextTry(t)} seconds.` ,
        ACCOUNT_BLOCK : "Your account is blocked. \n Contact Enzosystems.",
        WRG_ACCOUNT_EMAIL : "E-mail doesn't match with username" ,
        ERR_NET_GEN : "Network Error \n The network connection is lost",
        ERR_SERV_GEN : "Internal Serval Error" ,
        ERR_UNKNW_GEN : "An Unknow error occured",
        ERR_WRG_CRD : "Invalid credentials."
      }, 
      VALIDUSER : "OK, Valid user",
      VALIDPWD : "OK, Valid password",
      PWDRESET_MSG_TIP: "Password must contain: \n .... \n .......... \n .........",
      PWDRESET_EMAIL_MESSAGE :  "An email with a link will be send to this e-mail address",
      PWDRESET_EMAIL_LINK_SEND : "An email is sent to you",
    },
    ACTIVATION : {
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
      EXPIREDTOKEN : "This link has expired" 
    },
  
    MISSING_AUTH_HEADER : {
      STATUSCODE : 401 ,
      MESSAGE : "Missing Authorization header"
    } ,
    INVALID_TOKEN : {
      STATUSCODE : 401 ,
      MESSAGE : "Invalid token"
    } 
  }


  module.exports = {
      MESSAGES
  }