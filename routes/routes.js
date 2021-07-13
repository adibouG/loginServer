const api = require('express').Router() ;
const middlewares = require('../middlewares/middlewares.js');
const { userControllers, oauthControllers } = require('../controllers/index.js');

api.post('/login', middlewares.delayRequest, middlewares.checkLoginDataRequest, userControllers.processUserLoginRequest) ;
api.get('/login', oauthControllers.returnOauthLoginButton) ;
api.post('/passwordRequest', userControllers.requestRecoveryEmail) ;

module.exports =  api  ;

