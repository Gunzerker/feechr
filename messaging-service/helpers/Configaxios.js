const axios = require("axios");

const createClient = (baseURL) => {
  const instance = axios.create({
    baseURL,
    responseType: "json",
    timeout: 15000,
    validateStatus: function (status) {
      return status >= 200 && status <= 302;
    },
  });
  return instance;
};

const api = createClient("https://feecher-auth.digit-dev.com/api/");
api.defaults.headers.common.Accept = "application/json";
api.defaults.headers.post["Content-Type"] = "application/json";
//api.defaults.headers.common["Access-Control-Allow-Origin"] = "*";

api.setAccessToken = (token) => {
  if (!token) {
    return;
  }
  api.defaults.headers.common.Authorization = `Token ${token}`;
};

module.exports = api;
