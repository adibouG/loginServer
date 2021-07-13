
require('dotenv').config() ; 

const {DB} = require('../app.settings.js').SETTINGS ;

const postgres = require('postgres')
const pg = require('pg')

//pg dbb


const connectionSetting = {
  host     : process.env.DB_HOST ,
  user     : process.env.DB_USER ,
  password : process.env.DB_PWD ,
  database : process.env.DB_NAME ,
  port : process.env.DB_PORT ,
  max : DB.MAXCON,// Max number of connections
  ssl  : DB.SSL,
  connect_timeout : DB.CONN_TIMEOUT,  
  /*
  idle_timeout    : 0,          // Idle connection timeout in seconds
  no_prepare      : false,      // No automatic creation of prepared statements
  types           : [],         // Array of custom types, see more below
  onnotice        : fn          // Defaults to console.log
  onparameter     : fn          // (key, value) when server param change
  debug           : fn          // Is called with (connection, query, params)
  transform       : {
    column            : fn, // Transforms incoming column names
    value             : fn, // Transforms incoming row values
    row               : fn  // Transforms entire rows
  },
  connection      : {
    application_name  : 'postgres.js', // Default application_name
    ...                                // Other connection parameters
  }

*/
};

/*
from env var
const sql = postgres()
Option	Environment Variables
host	PGHOST
port	PGPORT
database	PGDATABASE
username	PGUSERNAME or PGUSER
password	PGPASSWORD
//elad env : 
Databae type: PostgreSql
Database configuration:
DB_HOST_ADD=34.244.245.12
DB_NAME=Authentication
DB_USER=thisisenzoauthsystemsinstance
DB_PASS=my1password2is8not4shared2by3you2006
DB_PORT=5432

*/
/* 
const sql =
  process.env.NODE_ENV === 'production' ?
  */
     // "Unless you're using a Private or Shield Heroku Postgres database, Heroku Postgres does not currently support verifiable certificates"


const pgsql = postgres(connectionSetting) ;

const { Pool, Client , types} = pg ;



 types.setTypeParser(types.builtins.INT8, (value) => {
   return parseInt(value);
 })
 types.setTypeParser(types.builtins.FLOAT8, (value) => {
    return parseFloat(value);
 })
 types.setTypeParser(types.builtins.NUMERIC, (value) => {
    return parseFloat(value);
 })
 types.setTypeParser(types.builtins.BYTEA, (value) => {
   return value.toString();
 });


const pgPool = new Pool(connectionSetting);

const pgClient = new Client(connectionSetting);

const db = {
  // pool,
  // conn, 
  pgsql,
  pgPool,
  pgClient,
 // sequelize 
};



//exports
module.exports = db ;
