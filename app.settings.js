const Crypto = require('crypto');
//exports


exports.SETTINGS = {
  //should be load from settings too  
  LOGDIRECTORY : '/logs', 
  ACCESSLOG_FILENAME : '/accesslog.log' ,
  APPLOG_FILENAME : () => `${new Date().getDate()}.logfile.log` ,
  
  APP : {
          FRONT_SERVER : {
            ID : 1 ,
            HOST : 'http://127.0.0.1',
            USER : '',
            PWD : '',
            API : '/kms/api',
            PORT : 3000 ,
            SSL  : false,
            CONN_TIMEOUT : 30,  
          } ,

          BACK_SERVER_API : {
            ID : 2 ,
            HOST : '',
            USER : '',
            PWD : '',
            API : '/kms/api',
            PORT : 5000 ,
            SSL  : true,
            CONN_TIMEOUT : 30,  
          },

        },

        DB : {
          ID:4 ,
          HOST : '',
          USER : '',
          PWD : '',
          DB : '',
          PORT : 5432 ,
          MAXCON : 10,// Max number of connections
          SSL  : false,
          CONN_TIMEOUT : 30,  

        },

        OAUTH : {
          SERVER:{
            HOST : 'http://127.0.0.1',
            PORT : 9000   ,
            SSL  : false,
            CONN_TIMEOUT : 30,  
            ENDPOINTS : {
              AUTH : '/oauth/authorize',
              TOKEN : '/oauth/token'
            },
            SSL_CERT : {
              FILENAME: '' 
            }
          },

  	      TOKEN : {
             ISS : "Enzosystems-Login-Server" ,
             IAT :  () => Date.now()  ,
             SUB : "User login success.",
             AUD : "Enzo-OAuth-Server",
             EXP :  (Date.now() + (60 * 60 * 1000))  ,
             JTI : () =>  Crypto.randomBytes(16).toString('hex').toString(),
             REDIRECT_URI : null ,
             SECRET : {
               PRIVATE_RSA_KEY : { 
                 FILENAME: ''
               },
               PUBLIC_RSA_KEY : { 
                 FILENAME: ''
               }
             }
          },
         CLIENT : {
            CLIENT_ID: `` ,
            CLIENT_SECRET: ``,
            REDIRECT_URI :  'http://127.0.0.1:3000'
          }
        },
        LOGIN : {
          USE_OAUTH: true ,
          PROXY_AUTHCODE_REQ : false ,
          OAUTH_FLOW : 1 ,
          OAUTH_SCOPE : "kms::dashboard kms::user"  ,
          SERVER : {
            ID : 3 ,
            HOST : 'http://127.0.0.1',
            USER : '',
            PWD : '',
            API : '',
            PORT : 3006,
            SSL  : false,
            ENDPOINTS : {
                LOGIN : '/login' ,
                ACCOUNTCREATION : '/login' ,
            },
            CONN_TIMEOUT : 30,  
          } ,
          MAIL : {
            SERVICE : 'https://dev.cloud.enzosystems.com:6000/messaging/email/sendmessage' ,
            LINKTO : 'http://127.0.0.1:3000',
            PATHS : {
              ACCOUNTRECOVERY : '/passwordReset',
              ACCOUNTACTIVATION : '/accountActivation',
            }
          },
          SETTINGS:{
            USE_FILE : true,
            USE_DB : false ,
            FILEPATH : '' ,
            DB : null
          },
          TOKENS : {
            OAUTH:{},
            LOGIN:{} ,
          }, 
          BLOCKS : {
            USE_BLOCK : {
              IP : false ,
              USER : false
            },
            BLOCKING_TIME_ON_FAIL_ATTEMPT : 0  , //second 
            MAX_ATTEMPTS : 10 , 
            FREE_ATTEMPTS : 5 , 
          },
          RESPONSE : {
            APPLY_RANDOM_DELAY : true ,
            MAX_RANDOM_DELAY : 3 ,
            MIN_RANDOM_DELAY : 1 
          },
          LOG : {
            FAILED_ATTEMPTS : false ,
            LEVEL : 1,
          }
        }
}
