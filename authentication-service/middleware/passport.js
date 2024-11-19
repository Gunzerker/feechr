const models = require("../models/db_init");
const UserModel = models["users"];
const validate = require("../helpers/validate");
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { Op } = require("sequelize");


passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
}, (email, password, done) => {
    UserModel.findOne({
        where: { email: { [Op.iLike]: email } }
    })
        .then((user) => {
            if (!user || !validate.comparePassword(password, user.password)) {
                return done(null, false, 'email or password : is invalid' );
            }
            return done(null, user);
        }).catch(done);
}));