const env = process.env.NODE_ENV || "development";
const globalConfig = require(__dirname + "/../config/config.json");

const getConfig = function(key) {
    return globalConfig[key];
};

const getEnvConfig = function(key = null) {
    return globalConfig[env][key];
};

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

module.exports = {
    getConfig,
    getEnvConfig,
    asyncForEach,
};
