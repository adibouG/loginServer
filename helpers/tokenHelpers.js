const jwt = require('jsonwebtoken');
const dbqueries = require('../database/dbqueries.js');
const EnzoError = require('../models/errors.js');
const { SETTINGS } = require("../app.settings.js");
const MESSAGES = require("../text/messages.js");

const checkRecoveryToken = async (token) => {
    let decoded, result, user_account_id, userObject, error ;
    try {
      //decode the token and check user 
      decoded = jwt.decode(token) ;
      user_account_id = decoded.user_account_id ; 
      //result = await dbqueries.getUserAccountPwdEncoded( sql ,[user_account_id] ) ;
      result = await dbqueries.getUserFromId(user_account_id) ;
      if (!result.rows.length) throw new EnzoError.InvalidTokenError(MESSAGES.NOACCOUNT) ;
      userObject = result.rows[0];
      if (!utilities.checkUserStatusIsActive(userObject)) throw new EnzoError.InvalidRequest(MESSAGES.INVALIDACCOUNT) ;
      //verify the token signature before returning the data
      let verified  = jwt.verify(token, userObject.password_hash) ;
      return userObject ;
    } catch (e) {
      console.log(e);
      throw new EnzoError.InvalidTokenError(e.message) ;
    } 
}

const checkActivationToken = async (token) => {
    let error, guid ;
    try {
        let decoded = jwt.decode(token) ;
        guid = decoded.data.guid ;
        user_id = decoded.user_id ;
        user_account_id = decoded.user_account_id ;
        let result = await dbqueries.getUserAccountFromGuid(guid) ;
        //let result = await dbqueries.getUserAccountPwdEncodedFromGuid(guid) ;
        if (!result.rows.length)  throw new EnzoError.InvalidTokenError(MESSAGES.NOACCOUNT) ;
        let userObject = result.rows[0] ;   
        if (!utilities.checkUserStatusIsActive(userObject)) throw new EnzoError.InvalidRequest(MESSAGES.INVALIDACCOUNT) ;
        //let activationSign = { issuer:  'kms::login' , subject:  guid , audience:  'kms::login:account:activation'}
        //jwt.verify(t , secret , activationSign) ;
        jwt.verify(token, userObject.password_hash) ;
        return userObject ;
    }
    catch (e) {
      console.log(e);
      throw new EnzoError.InvalidTokenError(e.message) ;
    }
}

module.exports = {
    checkRecoveryToken,
    checkActivationToken
}