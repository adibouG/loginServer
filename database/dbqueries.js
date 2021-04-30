const dbObj = require('./DBconnection.js');

const db = dbObj.pgPool ; 


exports.SQL_QUERY = {

    CHECK_USER_MAIL_EXIST :  `SELECT COUNT(id) from  "Users"  WHERE email = $1 ` ,

    USER_ACCOUNT_USERNAME :  `SELECT * from  "UserAccounts"  WHERE user_name = $1 ` ,
    USER_ACCOUNT_ID :  `SELECT * from  "UserAccounts"  WHERE id = $1 ` ,
    USER_DETAILS_EMAIL : `SELECT * from  "Users"  WHERE email = $1 ` ,
    USER_DETAILS_ID : `SELECT * from  "Users"  WHERE user_account_id = $1 ` ,
    USER_ACCOUNT_W_DETAILS_USERNAME : `SELECT * from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id WHERE a.user_name = $1 ` ,
    
    USER_ACCOUNT_W_DETAILS_EMAIL : `SELECT * from  "Users" a  JOIN  "UserAccounts" b  ON b.id = a.user_account_id WHERE a.email = $1 ` ,
    
    USER_ACCOUNT_W_DETAILS_ID : `SELECT * from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id WHERE a.id = $1 `,
    
    ALL_USER_ACCOUNTS_WITH_DETAILS : `SELECT * from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id ` ,

}


exports.getUserFromUserName = (user) => {

    let sql =  this.SQL_QUERY.USER_ACCOUNT_USERNAME ;
    
    return db.query( sql , [ user ]) ; 
  }

  exports.getUserFromId = (id) => {
  
    let sql =  this.SQL_QUERY.USER_ACCOUNT_ID;
    
    return db.query( sql , [ id ]) ; 

  }
  exports.getUserDetailsFromId = (id) => {
  
    let sql =  this.SQL_QUERY.USER_DETAILS_ID;
    
    return db.query( sql , [ id ]) ; 
  }
  
  
  exports.getUserDetailsFromEmail = (email) => {
  
    let sql =  this.SQL_QUERY.USER_DETAILS_EMAIL;
    
    return db.query( sql , [ email ]) ; 
  }
  
  exports.getFullUserFromUserName = (username) => {
  
    let sql =  this.SQL_QUERY.USER_ACCOUNT_W_DETAILS_USERNAME ;
    
    return db.query( sql , [ username ]) ; 
  }
  
  exports.getFullUserFromEmail = (email) => {
  
    let sql =  this.SQL_QUERY.USER_ACCOUNT_W_DETAILS_EMAIL ;
    
    return db.query( sql , [ email ]) ; 
  }

  exports.getFullUserFromId = (username) => {
  
    let sql =  this.SQL_QUERY.USER_ACCOUNT_W_DETAILS_ID ;
    
    return db.query( sql , [ username ]) ; 
  }
  
  exports.getAllUsers = () => {
  
    let sql =  this.SQL_QUERY.ALL_USER_ACCOUNTS_WITH_DETAILS ;
    
    return db.query( sql ) ; 
  }
  
  exports.checkUserMailExist = (email) => {
  
    let sql =  this.SQL_QUERY.CHECK_USER_MAIL_EXIST ;
    
    return db.query( sql ,  [ email ]) ; 
  }
  

/*****************************************************************  Logs  **** */

  
const logUserAttemptToDB = (attempt) => {

    let sql = 'INSERT INTO `user_access_attempts` (  `ip`, `attempts`, `last_attempt`, `first_attempt`)  VALUES ($1 , $2 , $3 , $4 )'; 
    let ip = attempt.ip ;SELECT
    let count = attempt.count ;
    let last = attempt.nextTry -  ( count * blockSettings.wrong_email_delay * 1000) ;
    let first = attempt.startAt  ;
    return db.query( 
      sql ,
      [ip , count , last  ,  first ] 
    )
  } 
  
  
  const logPwdAttemptToDB =  (attempt) => {
  
   // let sql1 = 'SELECT `accounts`.`id` FROM `accounts` WHERE  `accounts`.`username` = ? '; 
   // let sql2 = 'INSERT INTO `login_attempts` (  `ip`, `attempts`, `last_attempt`, `first_attempt` , `account_id` )  VALUES (? , ? , ? , ? )'; 
    let sql  = 'INSERT INTO "userAccessAttempts" (  `ip_address`, `attempt_count`, `last_attempt`, `first_attempt` , `user_id` ) SELECT $1 , $2 , $3 , $4  , $5 , "UserAccounts".`id` FROM `login_attempts`  JOIN "UserAccounts" ON  "userAccessAttempts".`user_id` = `accounts`.`id`  WHERE `accounts`.`username` =  $6 )'; 
    let ip = attempt.ip ;
    let count = attempt.count ;
    let last = attempt.nextTry -  ( count * blockSettings.wrong_email_delay * 1000) ;
    let first = attempt.startAt  ;
    let user = attempt.user ;
    return  db.query( 
      sql ,
      [ip , count , last  ,  first , user] 
    )
  } 
  
  