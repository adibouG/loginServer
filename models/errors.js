const jwt = require('jsonwebtoken');

class EnzoError extends Error {

    constructor(name, message, code , data  ) {
        super(message)
        this.name = name ;
        this.message = message;
        this.code = code  ;
        this.data = data ;
      }

}


class InvalidRequest extends EnzoError {

  constructor( message, code , data ) {
      super(message, data )
      this.name = "InvalidRequest" ;
      this.message = message || "Invalid request";
      this.code = code || 400 ;
    }

}

class InvalidData extends EnzoError {

  constructor( message ,code , data) {
      super(message, data )
      this.name = "InvalidData" ;
      this.message = message;
      this.code = code || 422 ;
    }

}



class ValidationError extends EnzoError {
    constructor(message,  code , data) {
      super(message, data)
      this.name = 'ValidationError' ;
      this.message = message;
      this.code = code || 400 ;
    }
  }

  class PermissionError extends EnzoError {
    constructor(message,  code ) {
      super(message)
      this.name = 'PermissionError';
      this.message = message;
      this.code = code || 401 ;
    }
  }


  class DatabaseError extends EnzoError {
    constructor(message ,  code ) {
      super(message, data )
      this.name = 'DatabaseError' ;
      this.message = message ;
      this.code = code || 500 ;
    }
  }

  

  
class TokenError extends EnzoError  {

  constructor(message, code ) {
    super(message, data )
    this.name = 'TokenError' ;
    this.message = message;
    this.code = code || 401 ;
    // this.data = {
    //   name : this.name ,
    //   message : this.message ,
    //   code : this.code ,
    //   stack : this.stack

    // };
  }
}

 class InvalidTokenError extends TokenError {
    constructor(message,  code ) {
     super(message, data )
     this.name = 'InvalidTokenError' ;
     this.message = message;
     this.code = code || 401 ;
   }
 }




  module.exports = {
    EnzoError,
    InvalidRequest,
    InvalidData,
    ValidationError,
    PermissionError,
    DatabaseError,
    TokenError,
    InvalidTokenError
  }