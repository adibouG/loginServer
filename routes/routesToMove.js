const apiToMove = require('express').Router() ;
const middlewares = require('../middlewares/middlewares.js');
const { userControllers, userAccountsControllers } = require('../controllers/index.js');

apiToMove.get('/userInfo', middlewares.authenticateOauthJWTRequest, userControllers.getUserInfoRequest) ;
apiToMove.get('/userList', middlewares.authenticateOauthJWTRequest, middlewares.isAdminRequest, userControllers.getUserListRequest);  
apiToMove.post('/createAccount', middlewares.authenticateOauthJWTRequest, middlewares.isAdminRequest, userAccountsControllers.createAccountRequest) ;
apiToMove.delete('/deleteAccount/:userid', middlewares.authenticateOauthJWTRequest, middlewares.isAdminRequest, userAccountsControllers.userAccountDeletionRequest);
//TODO : use middleware to check tokens in accounts recovery and activation
//check the token is valid and redirectc the user to the pwd recovery page
apiToMove.get('/passwordReset',  userAccountsControllers.checkRecoveryTokenRequest) ; 
apiToMove.post('/passwordReset', userAccountsControllers.passwordRecoveryRequest); 
//TODO : use middleware to check tokens in accounts recovery and activation
apiToMove.get('/accountActivation',  userAccountsControllers.checkActivationTokenRequest); 
apiToMove.post('/accountActivation',  userAccountsControllers.userAccountActivationRequest);
  
module.exports =  apiToMove ;