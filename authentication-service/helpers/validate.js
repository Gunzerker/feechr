const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json');

const validate = {

    hashPassword(password) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    },

    isValidEmail(email) {
        return /\S+@\S+\.\S+/.test(email);
    },

    isValidRf(rf_id) {
        return /B\S+/.test(rf_id);
    },

    isValidMac(mac_address){
        return /^(([A-Fa-f0-9]{2}[:]){5}[A-Fa-f0-9]{2}[,]?)+$/i.test(mac_address);
    },

    comparePassword(password, hashPassword) {
        return bcrypt.compareSync(password, hashPassword);
    },

    generateToken(obj) {
        if (!config.secret) {
            throw "No secret token added";
        }
        return jwt.sign({
            obj:obj
            },
            config.secret,
            // {
            //     expiresIn: '7d'
            // }
        );
    },

    UnexpiringGenerateToken(id,fullname,profile_image) {
        if (!config.unexpiring) {
            throw "No secret token added";
        }
        return jwt.sign({
                id: id,
                fullname:fullname,
                profile_image:profile_image
            },
            config.unexpiring,
        );
    }

};

module.exports = validate;
