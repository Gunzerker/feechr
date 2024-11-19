const { ApolloError } = require ('apollo-server-errors');

class APIError extends ApolloError {
    constructor({ code, message }) {
      const fullMsg = `${code}: ${message}`;
      super(fullMsg);
      this.code = code;
      this.message = message;
    }
  }
  
module.exports=APIError;