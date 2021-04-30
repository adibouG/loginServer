const {SETTINGS}  = require('../../app.settings.js') ;
const axios = require('axios');
const Logger = require('../logger/logger.js');

const {SERVICE , LINKTO }  = SETTINGS.LOGIN.MAIL ;
const {ACCOUNTRECOVERY ,  ACCOUNTACTIVATION } = SETTINGS.LOGIN.MAIL.PATHS ;


const attachmentFormat = {
                        
    "content":  "" ,
    "name": ""

};

const mailFormat = (  type ,   mail , token , user = null  ) => {

let TITLE = '';
let MESSAGE = '' ;


if (type === 'reset' && user ) {
   // if (!user) { return ; }
    
    TITLE = 'Forgot username and/or password' ;
    MESSAGE = `<p><h3>Your username is : "${user}" </h3></p><p>Click the link below to reset your pwd</p> <p><a href="${LINKTO}${ACCOUNTRECOVERY}?token=${token}">Reset my password</a></p>` ;
  
 }   
 
else if (type === 'create') {
    TITLE = 'Your Kms Account is created and needs to be activated' ;
    MESSAGE = `<p>Click the link below to set your username and pwd and activate the account</p> <p><a href="${LINKTO}${ACCOUNTACTIVATION}?token=${token}">Activate my account</a></p>` ;
  
 }   
    
return ({
    "attachments": [],
    "body": {
        "html":`<h2>${TITLE}</h2> ${MESSAGE}` ,
    },
    "from": "no-reply@enzosystems.com",
    "messageId": `{${token}}`,
    "subject": `KMS DASHBOARD :${TITLE}`,
    "to": [mail],
     "cc": ['adrien@enzosystems.com']
})

}






module.exports = function sendEmailRequest( type ,   email , token , user = null ) {   
  
  
  let mail = mailFormat( type ,   email , token , user) ;
 
   return axios({ url : SERVICE , method : 'POST' , data : mail })
     .then(res => {  return res ;} ) 
     .catch(res => {  return res ;} ) 
}


