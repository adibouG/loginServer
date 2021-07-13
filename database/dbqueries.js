const dbObj = require('./DBconnection.js');
const utilities = require('../helpers/utilities.js');

const db = dbObj.pgPool ; 


const SQL_QUERY = {
  CHECK_USER_MAIL_EXIST :  `SELECT COUNT(id) from  "Users"  WHERE email = $1 ` ,
  CHECK_USERNAME_EXIST : `SELECT COUNT(id) from  "UserAccounts"  WHERE user_name = $1 AND id != $2` ,
  CHECK_USERNAME_TOBEACTIVATED_EXIST : `SELECT COUNT(id) AS exist from  "UserAccounts"  WHERE user_name = $1 AND id = $2 AND status = $3` ,
  USER_ACCOUNT_USERNAME :  `SELECT * from  "UserAccounts"  WHERE user_name = $1 ` ,
  USER_ACCOUNT_ID :  `SELECT * from  "UserAccounts"  WHERE id = $1 ` ,
  USER_DETAILS_EMAIL : `SELECT * from  "Users"  WHERE email = $1 ` ,
  USER_DETAILS_ID : `SELECT * from  "Users"  WHERE user_account_id = $1 ` ,
  USER_ACCOUNT_W_DETAILS_USERNAME : `SELECT a.* , b.id as user_id , b.first_name ,b.last_name , b.email  from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id WHERE a.user_name = $1 ` ,
  USER_ACCOUNT_W_DETAILS_EMAIL : `SELECT  *  from  "Users" a  JOIN  "UserAccounts" b  ON b.id = a.user_account_id WHERE a.email = $1 ` ,
  USER_ACCOUNT_W_DETAILS_ID : `SELECT a.* , b.id as user_id , b.first_name  ,b.last_name , b.email from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id WHERE a.id = $1 `,
  ALL_USER_ACCOUNTS_WITH_DETAILS : `SELECT a.* , b.id as user_id , b.first_name ,b.last_name , b.email from  "UserAccounts" a  JOIN  "Users" b  ON a.id = b.user_account_id ` ,
  USER_ACCOUNT_ENCODED_PWD_ID : `SELECT  id , guid , user_name , status , encode(password_hash , 'hex') as password_hash, encode(hashing_salt , 'hex') as hashing_salt FROM "UserAccounts" WHERE id = $1 `,
  USER_ACCOUNT_ENCODED_PWD__GUID : `SELECT  id , user_name , status, encode(password_hash , 'hex') as password_hash, encode(hashing_salt , 'hex') as hashing_salt FROM "UserAccounts" WHERE guid = $1 `,
  USER_ACCOUNT_PWD__GUID : `SELECT  id , user_name , status, password_hash, hashing_salt FROM "UserAccounts" WHERE guid = $1 ` ,
  USER_ACCOUNT_UPDATE_PWD__ID : `UPDATE "UserAccounts" SET  password_updated = now() , password_hash = decode($1 , 'hex') , hashing_salt = decode($2 , 'hex') ,  WHERE id = $3` ,
  USER_ACCOUNT_UPDATE_USERNAME__ID : `UPDATE "UserAccounts" SET user_name = $1 , updated = now()   WHERE id = $2  ` ,
  USER_ACCOUNT_UPDATE_PWD_AND_STATUS__ID :  `UPDATE "UserAccounts" SET , updated = now() ,  password_updated = now() , password_hash = decode($1 , 'hex') , hashing_salt = decode($2 , 'hex') , status = $3 WHERE id = $4  AND user_name = $5 ` ,
  USER_ACCOUNT_INSERT_NEW__ID :  `INSERT INTO "UserAccounts" ( created, updated , password_updated , guid , status , user_name , password_hash , hashing_salt  ) VALUES ( $1 , $2 , $3 , decode($4 , 'hex') , decode($5 , 'hex') ) RETURNING id ` ,
  USER_INSERT_NEW__ID :  `INSERT INTO "Users" ( email , first_name , last_name , user_account_id ,  created_timestamp , created, updated) VALUES ($1, $2, $3 , $4 , now() , now() , now()) RETURNING id` ,
  USER_ACCOUNT_ID__USERID : `SELECT user_account_id FROM "Users" WHERE id = $1` ,
  USER_ACCOUNT_DELETE__ID : `DELETE FROM "UserAccounts" WHERE id = $1`,
  USER_DELETE__ID : `DELETE FROM "Users" WHERE id = $1`
}

const getUserFromUserName = (user) => {
  let sql =  SQL_QUERY.USER_ACCOUNT_USERNAME ;
  return db.query(sql, [ user ]) ; 
}

const getUserFromId = (id) => {
  let sql =  SQL_QUERY.USER_ACCOUNT_ID; 
  return db.query(sql, [ id ]) ; 
}

const getUserDetailsFromId = (id) => {
  let sql =  SQL_QUERY.USER_DETAILS_ID;
  return db.query(sql, [ id ]) ; 
}

const getUserDetailsFromEmail = (email) => {
  let sql =  SQL_QUERY.USER_DETAILS_EMAIL;
  return db.query(sql, [ email ]) ; 
}
  
  const getFullUserFromUserName = (username) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_W_DETAILS_USERNAME ;
    
    return db.query( sql , [ username ]) ; 
  }
  
  const getFullUserFromEmail = (email) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_W_DETAILS_EMAIL ;
    
    return db.query( sql , [ email ]) ; 
  }

  const getFullUserFromId = (id) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_W_DETAILS_ID ;
    
    return db.query( sql , [ id ]) ; 
  }
  
  const getUserList = () => {
  
    let sql =  SQL_QUERY.ALL_USER_ACCOUNTS_WITH_DETAILS ;
    
    return db.query( sql ) ; 
  }
  
  const checkUserMailExist = (email) => {
  
    let sql =  SQL_QUERY.CHECK_USER_MAIL_EXIST ;
    
    return db.query( sql ,  [ email ]) ; 
  }

  const getUserAccountPwdEncoded = (user_account_id) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_ENCODED_PWD_ID ;
    
   return db.query( sql ,[user_account_id] ) ;
  
  }


  const getUserAccountPwdEncodedFromGuid = (guid) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_ENCODED_PWD__GUID ;
    
    return db.query( sql ,[guid] ) ;
  
  }



  const getUserAccountFromGuid = (guid) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_PWD__GUID ;
    
   return db.query( sql ,[guid] ) ;
  
  }


  const updateUserAccountPwd = (user_account_id , pwd = null ) => {
  
    let sql =  SQL_QUERY.USER_ACCOUNT_UPDATE_PWD__ID ;
    
    let pwdToUse  =  pwd ?   { hash_salt : utilities.hashSaltGenerator() , hashed_pwd : pwd }  :  utilities.defPwdGenerator() ;

    return db.query( sql ,[pwdToUse.hashed_pwd, pwdToUse.hash_salt, user_account_id] ) ;
  
  }
  
const checkAndUpdateUsername = async (username, user_account_id) => {
  let result1, result2; 
  let sql1 = SQL_QUERY.CHECK_USERNAME_EXIST ; 
  let sql2 =  SQL_QUERY.USER_ACCOUNT_UPDATE_USERNAME__ID;
  let sqlValues = [ username, user_account_id ] ;
  try {
    result1 = await db.query(sql1, sqlValues) ;
    if (result1.rows[0].count > 0 ) {  
      let error = new Error(ACTIVATION.USERNAMEEXIST);
      throw error ; 
    }
    result2 = await db.query(sql2, sqlValues);
    return result2 ;
  } catch(err) {
    console.log(err); // err  returned by server //will have to analyze the error 
    throw new Error(err);
  }
}


const checkAndUpdateUserToActivate = async (username, user_account_id, password_hash, hashing_salt ) => {

  let result1,  result2 ;
  let sql1 = SQL_QUERY.CHECK_USERNAME_TOBEACTIVATED_EXIST ;
  let sql2 = SQL_QUERY.USER_ACCOUNT_UPDATE_PWD_AND_STATUS__ID ;
  let sql1Values = [ username, user_account_id, 0 ];
  let sql2Values = [ password_hash, hashing_salt, 1, user_account_id, username ];
  try{
    result1 = await db.query(sql1, sql1Values) ;
    if (result1.rows.length !== 1) throw new Error(err);
    result2 =  await db.query(sql2, sql2Values) ;
    return result2 ; 
  } catch (err) {
    console.log(err) ;
    throw new Error(err);
  }
}

const createUserTransaction = async (newUserUuid, email, first_name, last_name, hashed_pwd, hash_salt) => {
  let createDate = Date.now() ;
  let currentDate = new Date();
  let currentTime = currentDate.getTime();
  let localOffset = (-1) * currentDate.getTimezoneOffset() * 60000;
  let stamp = Math.round(new Date(currentTime + localOffset).getTime() / 1000);
  //TODO Add timestamp for created
  let userAccountID = null ;
  let userID = null ;
  const sql1 = SQL_QUERY.USER_ACCOUNT_INSERT_NEW__ID ;
  const sql2 = SQL_QUERY.USER_INSERT_NEW__ID  ;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result1 = await client.query(sql1, [ newUserUuid, 0, email, hashed_pwd, hash_salt ]);
    userAccountID = result1.rows[0].id ;
    const sql2Values = [email, first_name, last_name,userAccountID]; 
    const result2 = await client.query(sql2, sql2Values) ;
    userID = result2.rows[0].id ;
    await client.query('COMMIT');
    console.log('COMMIT User');
  } catch (e) {
      await client.query('ROLLBACK');
      console.log('ROLLBACK User');
      console.error(e)   ;
      throw new EnzoError.DatabaseError( 500, e.message , e) ;
     // throw e ;
  } finally {
      client.release() ; 
      return { userID , userAccountID };
  }
}



const deleteUserTransaction = async (userID) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('BEGIN');
    const sql1 = SQL_QUERY.USER_ACCOUNT_ID__USERID ;
    const sql2 = SQL_QUERY.USER_ACCOUNT_DELETE__ID ;
    const sql3 = SQL_QUERY.USER_DELETE__ID ;
    const sql1Values = [ userID ] ;
    const result = await client.query(sql1, sql1Values) ;
    if (!result.rows.length) throw new EnzoError(404, "Account not found", { userID });
    let userAccountID = result.rows[0].user_account_id; 
    const sql3Values = [ userAccountID ] ;
    await client.query(sql2, sql1Values );
    await client.query(sql3, sql3Values );
    await client.query('COMMIT');
    console.log('COMMIT');
    return { userID, userAccountID } ;
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('ROLLBACK');
    console.error(e);
    throw new EnzoError.DatabaseError(500, e.message, e) ;
    //throw e ;
  } finally {
    console.log('release db connection');
    client.release() ; 
  }
}

module.exports = { 
    getUserFromUserName,
    getUserFromId,
    getUserDetailsFromId,
    getUserDetailsFromEmail,
    getFullUserFromUserName,
    getFullUserFromEmail,
    getFullUserFromId,
    getUserList,
    checkUserMailExist,
    getUserAccountPwdEncoded,
    updateUserAccountPwd,
    getUserAccountPwdEncodedFromGuid,
    getUserAccountFromGuid ,
    createUserTransaction,
    checkAndUpdateUsername ,
    checkAndUpdateUserToActivate,
    deleteUserTransaction
}