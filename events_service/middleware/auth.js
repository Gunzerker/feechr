const jwt = require('express-jwt');
const config = require('../config/config.json');

const getTokenFromHeaders = (req) => {
  const { headers: { authorization } } = req;

  if(authorization && authorization.split(' ')[0] === 'Token') {
    return authorization.split(' ')[1];
  }
  return null;
};

const auth = {
  required: jwt({
    secret: config.secret_jwt,
    userProperty: 'payload',
    getToken: getTokenFromHeaders,
    algorithms: ['HS256']
  }),
  optional: jwt({
    secret: config.secret_jwt,
    userProperty: 'payload',
    getToken: getTokenFromHeaders,
    credentialsRequired: false,
    algorithms: ['HS256']
  }),
};


module.exports = auth;