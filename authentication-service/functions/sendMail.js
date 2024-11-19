const nodemailer = require('nodemailer')
const env = require('../config/config.json');

module.exports = {
    send_reset_password_email: function (destination, code) {
        // config
        // in real case those data would be parsed from env
        const config = {
            host: env.SMTPhost,
            port: 587,
            // secure: false, // upgrade later with STARTTLS
            auth: {
                user: env.SMTPemail,
                pass: env.SMTPpassword,
            },
        }
        // mail_option
        const mail_options = {
            from: env.SMTPnoreply,
            to: destination,
            subject: 'please reset your password',
            // text: 'this code will expire in one day, please reset your password within this time by this token :',
            html: 'this code will expire in 5 minutes, please reset your password within this time by this token ' + code + ' : <a href="https://feecher-auth.digit-dev.com/api/user/resetPassword/' + code + '">Reset password</a>',
        }
        // send
        return new Promise((resolve, reject) => {
            let transporter = nodemailer.createTransport(config)
            transporter.sendMail(mail_options, function (error, info) {
                if (error) {
                    console.log("error", error);
                    reject(false)
                } else {
                    resolve(true)
                }
            })
        })
    },
    send_signup_mail_code: function (destination, code) {
        // config
        // in real case those data would be parsed from env
        const config = {
            host: env.SMTPhost,
            port: 587,
            // secure: false, // upgrade later with STARTTLS
            auth: {
                user: env.SMTPemail,
                pass: env.SMTPpassword,
            },
        }
        // mail_option
        const mail_options = {
            from: env.SMTPnoreply,
            to: destination,
            subject: 'Signup code',
            // text: 'this code will expire in one day, please reset your password within this time by this token :',
            html: 'this code will expire in 5 minutes, please continue your signup within this time by this token ' + code + ' : <a href="http://localhost:3030/api/user/phoneDigitCheck/' + code + '"> verify digit </a>',
        }
        // send
        return new Promise((resolve, reject) => {
            let transporter = nodemailer.createTransport(config)
            transporter.sendMail(mail_options, function (error, info) {
                if (error) {
                    console.log("error", error);
                    reject(false)
                } else {
                    resolve(true)
                }
            })
        })
    }
}