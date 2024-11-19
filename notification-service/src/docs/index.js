const basicInfo = require("./basicInfo");
const servers = require("./servers");
const components = require("./components");
const tags = require("./tags");
const notifications = require("./notifications");

module.exports = {
    ...basicInfo,
    ...servers,
    ...components,
    ...tags,
    ...notifications,
};
