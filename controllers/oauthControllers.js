
const returnOauthLoginButton = (req , res) => {
    const CLIENTID = SETTINGS.OAUTH.CLIENT.CLIENT_ID ;
    const CLIENTLOGINURL = SETTINGS.OAUTH.CLIENT.REDIRECT_URI ;  
    const OAUTHSERVER = `${SETTINGS.OAUTH.SERVER.HOST}:${SETTINGS.OAUTH.SERVER.PORT}`
    const OAUTHAUTHORIZE = `${SETTINGS.OAUTH.SERVER.ENDPOINTS.AUTH}` ;
    let s = utils.generator.uuidGenerator() ;
    let urlencoded =  new URLSearchParams();    
    urlencoded.append("client_id", CLIENTID);
    urlencoded.append("redirect_uri", CLIENTLOGINURL);
    urlencoded.append("state",  s ) ;
    let url = OAUTHSERVER + OAUTHAUTHORIZE + "?" + urlencoded.toString() ;
    let html = `
  <html>
    <body><div class="fullScreen" >
      <div class="login" >
        <a href=${url}>
          <button value="LOGIN" class="loginButton" >
            LOGIN
          </button>
        </a>
      </div> 
    </body>
  </html>`;
  
  return res.send(html);
}

module.exports = {
    returnOauthLoginButton
}