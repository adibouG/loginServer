const helpers = require('../helpers/tokenHelpers.js');
const utilities = require('../helpers/utilities.js');
const { sendEmailRequest, MAILTYPES } = require('../mail/enzoMail.js');
const EnzoError = require('../models/errors.js');
const MESSAGES = require('../text/messages.js');
const SETTINGS = require('../app.settings.js');

const REACT_SERVER_URL = SETTINGS.REACT_SERVER_URL;
const REDIRECT_URLS = {
    PWDRESET : `${REACT_SERVER_URL}/passwordReset?token=` ,
    ACCOUNTACTIVATION : `${REACT_SERVER_URL}/passwordReset?token=`
}

const checkRecoveryTokenRequest = async (req, res) => {     
    let error ;
    let token = req.query?.token  ;
    try {
        if (!token) throw new EnzoError.InvalidRequest(MESSAGES.INVALIDTOKEN) ;
        let redirectURL = `${REDIRECT_URLS.PWDRESET}${token}` ;     
        //if the token is valid we redirect the user to the pwd reset page 
        let result = await helpers.getAccountFromRecoveryToken(token);
        return res.redirect(redirectURL) ;
    } catch(err) {
        console.log(err);
        return res.status(err.code).send(err) ;
    }      
}

const checkActivationTokenRequest = async (req, res) => {     
    try{
        let token  = !req.query?.token;
        if (!token)  throw new EnzoError.InvalidRequest(MESSAGES.INVALIDTOKEN) ;
        let decoded = await helpers.checkActivationToken(token) ;
        let redirectURL = `${REDIRECT_URLS.ACCOUNTACTIVATION}${token}` ;     
        return res.redirect(redirectURL); 
    } catch(err) {
        console.log(err);  
        let resObj = new utilities.ResponseBody(err.code, err.message, err);
        return res.status(resObj.status).send(resObj) ; 
    }
}

const userAccountActivationRequest = async (req, res) => {
    let resObj, userObject, pwd, username  ;
    //TODO move token in req.header and verify in middleware 
    let { token, password, user } = req.body ; 
    try{
        pwd = utilities.isValidEntry(utilities.trimEntry(password)) ;
        username = utilities.isValidEntry(utilities.trimEntry(user)) ;
        if (!utilities.isValidPwd(pwd) || !utilities.isValidUsername(username))  throw new EnzoError.ValidationError(MESSAGES.INVALIDDATA, null, req.body); 
        userObject = await helpers.checkActivationToken(token) ;
        secret = userObject.password_hash; 
        guid = userObject.guid ; 
        if (user && !pwd) { 
            console.log("user && !pwd") ;
            await dbqueries.checkAndUpdateUsername(user, userObject.id ) ;     
            resObj = new utilities.ResponseBody(200, MESSAGES.VALIDUSERNAME, req.body) ;
            return res.status(resObj.status).send(resObj);         
        } else if (user && pwd) {
            let hs = utilities.hashSaltGenerator() ;
            let hpwd = utilities.pwdHasher(pwd , hs) ;
            let results = await dbqueries.checkAndUpdateUserToActivate(user, userObject.id, hpwd, hs) ;
            resObj = new utilities.ResponseBody(200 , MESSAGE.ACTIVATIONSUCCESS , req.body) 
            return res.status(resObj.status).send(resObj);   
        }
    } catch(err) { 
        console.log(err); // err  returned by server //will have to analyze the error 
        resObj = new utilities.ResponseBody(err.code, err.message, req.body) 
        return res.status(resObj.status).send(resObj);   
    }
}

const passwordRecoveryRequest = async (req, res) => {
  
    let userObject, results, resObj ;
    let token = req.body && req.body.token ? req.body.token : null; 
    let pwd = utilities.isValidPwd(utilities.trimEntry(req.body.password)) ? utilities.trimEntry(req.body.password) : null ;
    try {
        if (!token || !pwd) throw new EnzoError.InvalidRequest() ; 
        userObject = helpers.getAccountFromRecoveryToken(token) ;
        results = await dbqueries.updateUserAccountPwd(userObject.user_account_id, pwd ) ;
        resObj =  new utilities.ResponseBody(200, MESSAGES.PWDRESETSUCCESS, req.body ) ;
       //TODO send an email to confirm the pwd reset
        return res.status(resObj.status).send(resObj);
    } catch (err) { 
        console.log(err); // err  returned by server //will have to analyze the error 
        resObj =  new utilities.ResponseBody(err.code , err.message , req.body) ;
        return res.status(resObj.status).send(resObj);
    }      
}

const createAccountRequest = async (req, res, next) => {
    let resObj , error ;
    let { email, first_name, last_name } = req.body ;
    //TODO Add a specific check mail endpoint or use a type property in the body to diff
    if (email && !first_name &&  !last_name) { 
        //Precheck of the mail
        try {
            if (!utilities.isValidEntry(utilities.trimEntry(email)) || !utilities.isValidEmail(utilities.trimEntry(email))) throw new EnzoError.InvalidData(MESSAGES.INVALIDEMAIL , null , req.body) ;
            email = utilities.formatEntry(utilities.trimEntry(email));
            console.log('pre-email check : ' + email);
            let preResult  = await dbqueries.checkUserMailExist(email);
            console.log(preResult)
            if (preResult.rows[0].count > 0) {
                throw new EnzoError.ValidationError(MESSAGES.USED_EMAIL , null , req.body) ;
            }
            resObj = new utilities.ResponseBody(200 , MESSAGES.VALIDEMAIL ,  req.body) ;
            return res.status(resObj.status).send(resObj) ;
        } catch (e){
             console.error(e)
             resObj = new utilities.ResponseBody(e.code , e.message ,  req.body) ;
             return res.status(resObj.status).send(resObj) ;
         }
    } else {
        try{
            if (!utilities.isValidEntry(utilities.trimEntry(email)) || !utilities.isValidEntry(utilities.trimEntry(first_name)) 
                || !utilities.isValidEntry(utilities.trimEntry(last_name)) || !utilities.isValidEmail(utilities.trimEntry(email))) 
            { 
                throw new EnzoError.InvalidData(MESSAGES.INVALIDDATA, null, req.body) ;
            }
            let userIds, newUserUuid, defaultPwd, result;
            first_name = utilities.formatEntry(utilities.trimEntry(first_name));
            last_name = utilities.formatEntry(utilities.trimEntry(last_name));
            email = utilities.formatEntry(utilities.trimEntry(email));
            //generate a reset pwd token and log it in the session
            newUserUuid = utilities.uuidGenerator();
            defaultPwd =   utilities.defPwdGenerator() ;
            result  = await dbqueries.checkUserMailExist(email);
            if (result.rows[0].count > 0 ) throw new EnzoError.ValidationError(MESSAGES.USED_EMAIL, null, req.body) ;
            userIds = await dbqueries.createUserTransaction(newUserUuid, email, first_name, last_name, defaultPwd.hashed_pwd, defaultPwd.hash_salt);
            let tokenBody = { 
                user_id :  userIds.userID ,
                user_account_id : userIds.userAccountID 
            };
            let tokenSign = utilities.makeUserAccountActivationTokenSign(newUserUuid) ;
            let token =  jwt.sign(tokenBody , defaultPwd.hashed_pwd , tokenSign ) ;
            let emailResult = await sendEmailRequest(MAILTYPES.ACTIVATE, email, token, user = null) ;
            console.log("email sent " + email)
            resObj = new utilities.ResponseBody(200, MESSAGES.PWDRESET_EMAIL_SENT, email);
            return res.status(resObj.status).send(resObj) ; 
        } catch(err) {
          //in case of issue , find a way to resend the email ?
          console.log(err)
          resObj = new utilities.ResponseBody(err.code, err.message, req.body);
          return res.status(resObj.status).send(resObj) ; 
        }
    }
} 


const userAccountDeletionRequest = async (req, res, next) => {
    let userID = req.params?.id ;
    let resObj ;
    try {
        if (!userID) throw new EnzoError.InvalidRequest(400, MESSAGES.MISSINGPARAMS, userID);
        let result = await dbqueries.deleteUserTransaction(userID);   
        resObj = new utilities.ResponseBody(200, MESSAGES.DELETIONSUCCESS, result) ; 
        return res.status(resObj.status).send(resObj) ; 
    } catch(err){
        console.log(err)
        resObj = new utilities.ResponseBody(err.code, err.message, err.data );
        return res.status(resObj.status).send(resObj) ; 
    }
}

module.exports = {
    checkRecoveryTokenRequest,
    checkActivationTokenRequest,
    passwordRecoveryRequest ,
    createAccountRequest,
    userAccountActivationRequest,
    userAccountDeletionRequest
}