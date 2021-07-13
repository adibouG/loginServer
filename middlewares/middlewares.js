const utilities = require('../helpers/utilities.js');

const authenticateBasicRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
      const credentials = authHeader.split(' ')[1];
      let buff = new Buffer(credentials, 'base64');
      let text = buff.toString('utf8');
      let data = text.split(':');
      const userData = { user: data[0], password: data[1] } ;
      res.locals.userData = userData;
      next();
  } else {
      res.sendStatus(401);
  }
};

const authenticateOauthJWTRequest = (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return res.status(ERRORMESS.MISSING_AUTH_HEADER.STATUSCODE).send(ERRORMESS.MISSING_AUTH_HEADER.MESSAGE);
  const token = authHeader.split(' ')[1];
  let decodedToken ;
  try{
    decodedToken = VERIFY_TOKEN ? jwt.verify(token, KMS_API_PUBLIC_KEY, { algorithms: ['RS256'] } ) : jwt.decode(token, KMS_API_PUBLIC_KEY, { algorithms: ['RS256'] }); 
    res.locals.token  = decodedToken ;    
    res.locals.userAccountID = utilities.getUserIdFromOauthToken(decodedToken) ;
    return next() ;    
  } catch (err) {
    winstonLogger.log('error', err ) ;
    resObj = new utilities.ResponseBody( ERRORMESS.INVALID_TOKEN.STATUSCODE, ERRORMESS.INVALID_TOKEN.MESSAGE, err );
    return res.status(resObj.status).send(resObj);
  }
};

//check user entries for login
const checkLoginDataRequest = (req, res, next) => { 
  let userData = req.body ? req.body  : null ;
  let resObj ;
  if (!userData) { 
      resObj = new utilities.ResponseBody(422, MESSAGES.ERRORS.ERR_WRG_CRD, null);
      return res.status(resObj.status).send(resObj) ;
  }
  let user = utilities.trimEntry(userData.user)  ;
  let password =  utilities.trimEntry(userData.password)  ; 
  if (!user || !password || !utilities.isValidUsername(user) || !utilities.isValidPwd(password)) {
      resObj = new utilities.ResponseBody(422, MESSAGES.ERRORS.ERR_WRG_CRD, null)
      return res.status(resObj.status).send(resObj) ;
  }
  res.locals.userData = { user, password } ;
  return next();
}

//Add random delay to the request processing 
const delayRequest = (req, res, next) =>  {
    let delay =  utilities.generateRandomDelayValue() ;
    console.log(`adding delays of ${d} ms`);      
    res.local.userRequestData = { ...res.local.userRequestData, delay } ;
    return  setTimeout( next, delay ); 
}  

//extract ip and timestamp of request 
const checkRequestData = (req, res, next) => { 
  let ip = this.parseIp(req);
  let time = Date.now();
  console.log(`request time :  ${time}`);
  console.log(`request ip : ${ip}`);
  res.locals.userRequestData = { ...res.local.userRequestData, ip, timestamp } ;
  return next() ;
}
const isAdminRequest = (req, res, next) => {
  let { userAccountID } = res.locals ;
  if (!checkIsAdmin(userAccountID)) {
      resObj = new utilities.ResponseBody(401, USERINFO.INVALIDACCOUNT, { userAccountID });
      return res.status(resObj.status).send(resObj) ;
  }   
  return next() ;
}

  module.exports = { 
    checkRequestData ,
    delayRequest ,
    checkLoginDataRequest,
    authenticateOauthJWTRequest,
    authenticateBasicRequest,
    isAdminRequest 
}