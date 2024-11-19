const models = require("../models/db_init");
const { asyncForEach } = require('../helpers/helpers')

const UserModel = models["users"];
const tokenModel = models["token"];
const UserCategoryModel = models["user_category"];
const CategoryModel = models["category"]
const friendRequestModel = models["friendRequest"]
const FirebaseModel = models["firebase"]
const userCategoriesModel = models["user_categories"]

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");
var uid = require('rand-token').uid;
const config = require('../config/config.json');
const path = require("path");
const { v4: uuidv4 } = require('uuid')
const formidable = require('formidable');
const passport = require('passport');
const axios = require("axios");
const sharp = require("sharp");
var fs = require('fs');
const dynamicLinkInfo = require("../functions/dynamicLink");
const { streamToBuffer } = require("@jorgeferrero/stream-to-buffer");
const multer = require("multer");

const Pusher = require("pusher");
const pusher = new Pusher({
    appId: config.pusher_appId,
    key: config.pusher_key,
    secret: config.pusher_secret,
    cluster: config.pusher_cluster,
    useTLS: config.pusher_useTLS,
});
// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
// AWS.config.update({ region: 'eu-central-1' });

AWS.config.loadFromPath("./config/config.json");

const { hashPassword, isValidEmail, comparePassword, generateToken, UnexpiringGenerateToken } = require('../helpers/validate');
const { send_reset_password_email, send_signup_mail_code } = require("../functions/sendMail");
const { counterPosts, counterLikes, counterViews } = require("../functions/counter");
const category = require("../models/category");
const { counterFollowers, counterFollowing } = require("../functions/counter");

const client = require('twilio')(config.accountSid, config.authToken);

class roleController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = UserModel;
        this.entity_id_name = "user_id";
        this.list_includes = [
            {
                model: CategoryModel,
                through: userCategoriesModel,
                as: "category",
            },
            {
                model: CategoryModel,
                as: "talent",
                include: [
                    {
                        model: CategoryModel,
                        as: "parent_category",
                    },
                ]
            },
        ]
    }

    async checkAccountAppleId(req, res) {
        try {
            const { appleId } = req.body;
            const checkUser = await UserModel.findOne({ where: { appleId } })

            if (checkUser) {
                // if account with apple already exists
                // check UserResultEntity exists
                if (checkUser.dataValues.password != null) {
                    delete checkUser.dataValues.password
                    return res.status(409).send({
                        status: true,
                        data: checkUser.dataValues,
                        message: "Global.EntityAlreadyExists",
                    });
                } else {
                    return res.status(200).send({
                        status: true,
                        data: null,
                        message: "API.ACCOUNT.NOT.COMPLETED",
                    });
                }
            } else {
                return res.status(200).send({
                    status: true,
                    data: null,
                    message: "API.APPLEID.AVAILABLE",
                });
            }

        } catch (err) {
            console.log("err", err);
            return res.status(400).json({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    signUpWithMail(req, res) {
        const { email, socialMediaAuth, appleId } = req.body;
        let expireTime = 5;
        let option;

        if (!email) {
            return res.status(400).send({
                status: false,
                message: "PLEASE.ENTER.EMAIL",
                data: null
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({
                status: false,
                message: "Global.PleaseEnterEntityData.BadEmail",
                data: null
            });
        }

        UserModel
            .findOne({
                where: { email: { [Op.iLike]: email } }
            })
            .then(async function (UserResultEntity) {

                const code = Math.floor(1000 + Math.random() * 9000);
                const createdAt = Date.now();

                if (appleId){
                    const checkAppleAccount = await UserModel.findOne({ where: { appleId } })
                    const checkAppleToken = await tokenModel.findOne({ where: { appleId } })
                    if (checkAppleToken) {
    
                        let d_ = new Date(checkAppleToken.dataValues.tokenGeneratedAt);
                        d_.setMinutes(d_.getMinutes() + expireTime);
                        const now = Date.now();
    
                        if (checkAppleAccount.dataValues.password != null) {
                            // already exists
                            return res.status(409).send({
                                status: false,
                                data: null,
                                message: "Global.EntityAlreadyExists",
                            });
                        } else if (now > d_ ) {
                            await UserModel.update({ appleId: null }, { where: { user_id: checkAppleAccount.dataValues.user_id } })
                            await tokenModel.update({ appleId: null }, { where: { user_id: checkAppleAccount.dataValues.user_id } })
                        } else {
                            return res.status(409).send({
                                status: false,
                                data: null,
                                message: "Global.EntityAlreadyExists",
                            });
                        }
                    }
                }


                if (!UserResultEntity) {
                    if (appleId) {
                        option = { email, appleId }
                    } else {
                        option = { email }
                    }
                    const user = await UserModel.create(option)

                    if (socialMediaAuth) {
                        tokenModel.create({ tokenGeneratedAt: createdAt, token: code, socialMediaAuth, email, user_id: user.dataValues.user_id }).then(() => {
                            return res.status(201).send({
                                status: true,
                                data: email,
                                message: "API.SOCIAL.MEDIA.SIGNUP",
                            });
                        }).catch(() => {
                            return res.status(500).send({
                                status: false,
                                data: null,
                                message: "API.FAILED.SOCIAL.MEDIA.SIGNUP"
                            });
                        })
                        req.body.socialMediaAuth = socialMediaAuth;
                        // THAT.create(req, res);
                        return
                    }

                    if (appleId) {
                        option = { tokenGeneratedAt: createdAt, token: code, email: email, user_id: user.dataValues.user_id, appleId }
                    } else {
                        option = { tokenGeneratedAt: createdAt, token: code, email: email, user_id: user.dataValues.user_id }
                    }

                    tokenModel.create(option).then(() => {
                        send_signup_mail_code(email, code).then(() => {
                            return res.status(201).send({
                                status: true,
                                data: {
                                    email: email
                                },
                                message: "CODE.SENT.TO.MAIL",
                            });
                        }).catch((error) => {
                            console.log("error -------- 1 :", error);
                            return res.status(500).send({
                                status: false,
                                data: null,
                                message: "FAILED.SEND.MAIL"
                            });
                        })

                    }).catch(() => {
                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "FAILED.SEND.MAIL"
                        });
                    })

                    // THAT.create(req, res);
                    return
                }

                // check UserResultEntity exists
                if (UserResultEntity.password != null) {
                    return res.status(409).send({
                        status: false,
                        data: null,
                        message: "Global.EntityAlreadyExists",
                    });
                }

                tokenModel
                    .findOne({
                        where: { email: { [Op.iLike]: email } }
                    }).then(function (resultEntity) {
                        let d_ = new Date(resultEntity.tokenGeneratedAt);
                        d_.setMinutes(d_.getMinutes() + expireTime);
                        const now = Date.now();
                        if (resultEntity) {
                            if (socialMediaAuth == "true") {
                                if (now > d_) {
                                    resultEntity.update({ tokenGeneratedAt: createdAt, token: code, email: email, socialMediaAuth }).then(() => {
                                        return res.status(200).send({
                                            status: true,
                                            data: email,
                                            message: "API.SOCIAL.MEDIA.SIGNUP"
                                        });
                                    }).catch((error) => {
                                        console.log("error -------- 2 :", error);

                                        return res.status(500).send({
                                            status: false,
                                            data: null,
                                            message: "API.FAILED.SOCIAL.MEDIA.SIGNUP"
                                        });
                                    })
                                    return
                                }
                                return res.status(200).send({
                                    status: true,
                                    data: email,
                                    message: "API.SOCIAL.MEDIA.SIGNUP"
                                });
                            }

                            if (now > d_) {

                                if (appleId) {
                                    option = { tokenGeneratedAt: createdAt, token: code, email: email, socialMediaAuth: "false", appleId }
                                } else {
                                    option = { tokenGeneratedAt: createdAt, token: code, email: email, socialMediaAuth: "false" }
                                }

                                resultEntity.update(option).then(() => {
                                    send_signup_mail_code(email, code).then(() => {
                                        return res.status(201).send({
                                            status: true,
                                            data: {
                                                email: email
                                            },
                                            message: "CODE.SENT.TO.MAIL",
                                        });
                                    }).catch((error) => {
                                        console.log("error -------- 3:", error);

                                        return res.status(500).send({
                                            status: false,
                                            data: null,
                                            message: "FAILED.SEND.MAIL"
                                        });
                                    })
                                }).catch((error) => {
                                    console.log("error -------- 4 :", error);

                                    return res.status(500).send({
                                        status: false,
                                        data: null,
                                        message: "FAILED.UPDATE.USER"
                                    });
                                })
                            } else {
                                return res.status(500).send({
                                    status: false,
                                    data: null,
                                    message: "VERIFY.EMAIL.TOKEN.ALREADY.SENT"
                                });
                            }

                        } else {
                            return res.status(500).send({
                                status: false,
                                data: null,
                                message: "API.FAILED.FETCH.USER"
                            });
                        }
                    }, (error) => {
                        console.log("error -------- 5 :", error);

                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "API.FAILED.SEND.EMAIL"
                        });
                    })

            })
            .catch((error) => {
                console.log("error -------- 6 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    signUpWithPhone(req, res) {
        const { phone_number, country_code, appleId } = req.body;
        let expireTime = 5;
        let option;

        if (!phone_number && !country_code) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.CREDENTIALS"
            });
        }

      



        UserModel
            .findOne({
                where: { phone_number, country_code }
            })
            .then(async function (UserResultEntity) {
                const code = Math.floor(1000 + Math.random() * 9000);
                const createdAt = Date.now();

                // check if appleId already used

                if (appleId){
                    const checkAppleAccount = await UserModel.findOne({ where: { appleId } })
                    const checkAppleToken = await tokenModel.findOne({ where: { appleId } })
                    if (checkAppleToken) {

                        let d_ = new Date(checkAppleToken.dataValues.tokenGeneratedAt);
                        d_.setMinutes(d_.getMinutes() + expireTime);
                        const now = Date.now();
    
    
                        if (checkAppleAccount.dataValues.password != null) {
                            // already exists
                            return res.status(409).send({
                                status: false,
                                data: null,
                                message: "Global.EntityAlreadyExists",
                            });
                        } else if (now > d_ ) {
                            await UserModel.update({ appleId: null }, { where: { user_id: checkAppleAccount.dataValues.user_id } })
                            await tokenModel.update({ appleId: null }, { where: { user_id: checkAppleAccount.dataValues.user_id } })
                            return
                        } else {
                            return res.status(409).send({
                                status: false,
                                data: null,
                                message: "Global.EntityAlreadyExists",
                            });
                        }
                    }
    
                }


                

                if (!UserResultEntity) {
                    if (appleId) {
                        option = { phone_number, country_code, appleId }
                    } else {
                        option = { phone_number, country_code }
                    }
                    const user = await UserModel.create(option);

                    if (appleId) {
                        option = { tokenGeneratedAt: createdAt, token: code, phone_number: phone_number, country_code: country_code, user_id: user.dataValues.user_id, appleId }
                    } else {
                        option = { tokenGeneratedAt: createdAt, token: code, phone_number: phone_number, country_code: country_code, user_id: user.dataValues.user_id }
                    }

                    tokenModel.create(option).then(() => {
                        client.messages
                            .create({
                                body: 'Use this code to signup for feechr : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .then(message => console.log(message.sid))
                            .catch((error) => {
                                console.log("error -------- 7 :", error);

                                return res.status(500).send({
                                    status: false,
                                    data: null,
                                    message: "API.TWILIO.ERROR"
                                });
                            })
                            .done();
                        return res.status(201).send({
                            status: true,
                            data: {
                                country_code: country_code,
                                phone_number: phone_number
                            },
                            message: "CODE.SENT.TO.NUMBER",
                        });
                    }, (error) => {
                        console.log("error -------- 8 :", error);

                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "FAILED.SEND.SMS"
                        });
                    })

                    // THAT.create(req, res);
                    return
                }

                // check UserResultEntity exists
                if (UserResultEntity.password != null) {
                    return res.status(409).send({
                        status: false,
                        data: null,
                        message: "Global.EntityAlreadyExists",
                    });
                }

                tokenModel
                    .findOne({
                        where: { phone_number, country_code }
                    }).then(function (resultEntity) {
                        if (resultEntity) {
                            let d_ = new Date(resultEntity.tokenGeneratedAt);
                            d_.setMinutes(d_.getMinutes() + expireTime);
                            const now = Date.now();
                            if (now > d_) {
                                if (appleId) {
                                    option = { tokenGeneratedAt: createdAt, token: code, socialMediaAuth: "false", appleId }
                                } else {
                                    option = { tokenGeneratedAt: createdAt, token: code, socialMediaAuth: "false" }
                                }
                                resultEntity.update(option).then(() => {
                                    client.messages
                                        .create({
                                            body: 'Use this code to signup for feechr : ' + code,
                                            messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                            to: `${country_code}${phone_number}`
                                        })
                                        .then(message => console.log(message.sid))
                                        .catch((error) => {
                                            console.log("error -------- 9 :", error);

                                            return res.status(500).send({
                                                status: false,
                                                data: null,
                                                message: "API.TWILIO.ERROR"
                                            });
                                        })
                                        .done();
                                    return res.status(201).send({
                                        status: true,
                                        data: {
                                            country_code: country_code,
                                            phone_number: phone_number
                                        },
                                        message: "CODE.SENT.TO.NUMBER",
                                    });
                                }, (error) => {
                                    console.log("error -------- 10 :", error);

                                    return res.status(500).send({
                                        status: false,
                                        data: null,
                                        message: "FAILED.SEND.SMS"
                                    });
                                })

                            } else {
                                return res.status(200).send({
                                    status: false,
                                    data: null,
                                    message: "TOKEN.ALREADY.SENT"
                                });
                            }
                        } else {
                            return res.status(401).send({
                                status: false,
                                data: null,
                                message: "FAILED.FETCH.USER"
                            });
                        }
                    }, (error) => {
                        console.log("error -------- 11 :", error);

                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "FAILED.SEND.SMS"
                        });
                    })

            })
            .catch((error) => {
                console.log("error -------- 12 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    mailDigitCheck(req, res) {
        const { email, token } = req.body;
        let expireTime = 5;

        // this code is only for test phase
        if (token == "1717") {
            console.log("success email :");
            return res.status(201).send({
                status: true,
                data: {
                    "email": email,
                    "token": token
                },
                message: "DIGIT.VERIFIED",
            })
        }

        tokenModel
            .findOne({
                where: { email: { [Op.iLike]: email }, token }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    let d_ = new Date(resultEntity.tokenGeneratedAt);
                    d_.setMinutes(d_.getMinutes() + expireTime);

                    const now = Date.now()
                    if (now > d_) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "TOKEN.EXPIRED",
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            data: {
                                "email": email,
                                "token": token
                            },
                            message: "DIGIT.VERIFIED",
                        })
                    }
                }
            })
            .catch((error) => {
                console.log("error -------- 13 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    phoneDigitCheck(req, res) {
        const { phone_number, country_code, token } = req.body;
        let expireTime = 5;

        // this code is only for test phase
        if (token == "1717") {
            console.log("success phone :");
            return res.status(201).send({
                status: true,
                data: {
                    "country_code": country_code,
                    "phone_number": phone_number,
                    "token": token
                },
                message: "DIGIT.VERIFIED",
            })
        }

        tokenModel
            .findOne({
                where: { phone_number, country_code, token }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    let d_ = new Date(resultEntity.tokenGeneratedAt);
                    d_.setMinutes(d_.getMinutes() + expireTime);
                    const now = Date.now()
                    if (now > d_) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "TOKEN.EXPIRED",
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            data: {
                                "country_code": country_code,
                                "phone_number": phone_number,
                                "token": token
                            },
                            message: "DIGIT.VERIFIED",
                        })
                    }
                }
            })
            .catch((error) => {
                console.log("error -------- 14 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    resendCode(req, res) {
        const { email, phone_number, country_code } = req.body;
        const code = uid(4);
        const createdAt = Date.now();

        if (email) {
            if (!isValidEmail(email)) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "Global.PleaseEnterEntityData.BadEmail",

                });
            }

            tokenModel
                .findOne({
                    where: { email: { [Op.iLike]: email } }
                }).then((resultEntity) => {
                    resultEntity.update({ tokenGeneratedAt: createdAt, token: code }).then(() => {

                        send_signup_mail_code(email, code).then(() => {
                            return res.status(201).send({
                                status: true,
                                data: {
                                    email: email
                                },
                                message: "CODE.SENT.TO.EMAIL",
                            });
                        }).catch((err) => {
                            return res.status(400).send({
                                status: false,
                                data: null,
                                message: "FAILED.SEND.EMAIL",
                            });
                        })
                        return
                    }).catch((error) => {
                        console.log("error -------- 15 :", error);

                        return res.status(400).send({
                            status: false,
                            data: null,
                            message: "FAILED.UPDATE.ENTITY"
                        });
                    })
                    return
                }).catch((error) => {
                    console.log("error -------- 16 :", error);

                    return res.status(400).send({
                        status: false,
                        data: null,
                        message: "API.FETCH.USER.ERROR",
                    });
                })
            return
        }

        if (phone_number && country_code) {
            tokenModel
                .findOne({
                    where: { phone_number, country_code }
                }).then((resultEntity) => {
                    resultEntity.update({ tokenGeneratedAt: createdAt, token: code }).then(() => {
                        client.messages
                            .create({
                                body: 'Use this code to signup for feechr : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .then(message => console.log(message.sid))
                            .catch((error) => {
                                console.log("error -------- 17 :", error);

                                return res.status(500).send({
                                    status: false,
                                    data: null,
                                    message: "API.TWILIO.ERROR"
                                });
                            })
                            .done();
                        return res.status(201).send({
                            status: true,
                            data: {
                                country_code: country_code,
                                phone_number: phone_number
                            },
                            message: "CODE.SENT.TO.NUMBER",
                        });



                    }).catch((error) => {

                        console.log("error -------- 18 :", error);

                        return res.status(400).send({
                            status: false,
                            data: null,
                            message: "FAILED.UPDATE.ENTITY"
                        });
                    })

                }).catch((error) => {
                    console.log("error -------- 19 :", error);

                    return res.status(400).send({
                        status: false,
                        data: null,
                        message: "API.FETCH.USER.ERROR",
                    });
                })
            return
        }

        return res.status(400).send({
            status: false,
            message: "CREDENTIALS.NOT.VALID",
            data: null
        })
    }

    compressImage(file, sizeWidth, sizeHeight) {
        return new Promise((resolve, reject) => {
            console.log('file', file)
            sharp(file, { failOnError: false })
                .resize(sizeWidth, sizeHeight)
                .jpeg({ quality: 60, force: true, mozjpeg: true })
                .toBuffer()
                .then((data) => {
                    return resolve(data);
                })
                .catch((err) => { });
        });
    }

    uploadFile(body, files) {
        return new Promise(async (resolve, reject) => {
            var width = 0;
            var height = 0;
            if (body.type == "profil") {
                width = 80;
                height = 80;
            } else {
                width = 375;
                height = 190;
            }

            // Create S3 service object
            const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
            const uploadParams = { Bucket: "digit-u-media-resources", Key: '', Body: '' };

            // create file from upload
            var fileStream = fs.createReadStream(files[0].path);
            // compress that file
            const compressedFile = await this.compressImage(files[0].path, width, height);

            for (let file of files) {
                uploadParams.Body = fileStream;
                uploadParams.Key = path.basename(uuidv4() + "." + path.basename(file.originalname).split('.')[1]);
                uploadParams.ACL = 'public-read';
                uploadParams.ContentType = path.basename(file.originalname).split('.')[1];

                // call S3 to retrieve upload file to specified bucket
                s3.upload(uploadParams, function (err, fileStreamUpload) {
                    if (err) {
                        return res.status(401).send({
                            status: false,
                            data: err,
                            message: "ERROR.UPLOAD"
                        })
                    }

                    uploadParams.Body = compressedFile;
                    uploadParams.Key = path.basename(uuidv4() + "." + path.basename(file.originalname).split('.')[1]);
                    uploadParams.ACL = 'public-read';
                    uploadParams.ContentType = path.basename(file.originalname).split('.')[1];


                    // call S3 to retrieve upload file to specified bucket
                    s3.upload(uploadParams, function (err, compressedFileUpload) {
                        if (err) {
                            return res.status(401).send({
                                status: false,
                                data: err,
                                message: "ERROR.UPLOAD"
                            })
                        }
                        if (compressedFileUpload) {
                            console.log("____________________fileStreamUpload", fileStreamUpload);
                            console.log("____________________compressedFileUpload", compressedFileUpload);
                            if (body.type === 'cover') {
                                return resolve({
                                    type: "cover", message: "upload done", urlOriginalFile: fileStreamUpload.Location, urlCompressedFile: compressedFileUpload.Location, originalFile: fileStreamUpload.Key, compressedFile: compressedFileUpload.key
                                })
                            }
                            if (body.type === 'profil') {
                                return resolve({
                                    type: "profil", message: "upload done", urlOriginalFile: fileStreamUpload.Location, urlCompressedFile: compressedFileUpload.Location, originalFile: fileStreamUpload.Key, compressedFile: compressedFileUpload.key
                                })
                            }
                        }

                    });
                });
            }
        })
    }

    async completeAccountWithMail(req, res) {
        console.log("req.body", req.body, "files", req.files);
        let expireTime = 5;

        tokenModel
            .findOne({
                where: { email: { [Op.iLike]: req.body.email } }
            }).then(async (userEntity) => {
                let d_ = new Date(userEntity.tokenGeneratedAt);
                d_.setMinutes(d_.getMinutes() + expireTime);
                const now = Date.now()
                if (now > d_) {
                    return res.status(401).send({
                        status: false,
                        data: null,
                        message: "SIGNUP.TOKEN.EXPIRED",
                    });
                } else {

                    let newPassword = await hashPassword(req.body.password);
                    let code = req.body.fullName.replace(/\s+/g, '') + '_' + uid(4);
                    try {

                        if (req.files.length > 0) {
                            const upload_result = await this.uploadFile(req.body, req.files);
                            if (upload_result.message !== "upload done") {
                                return res.status(400).json({
                                    status: false,
                                    message: "API.bad_request",
                                    data: null
                                })
                            }
                            if (upload_result.type == "profil") {

                                UserModel.update({ fullName: req.body.fullName, profilLink: code, password: newPassword, dateOfBirth: req.body.dateOfBirth, gender: req.body.gender, profile_image: upload_result.originalFile, profile_image_compressed: upload_result.compressedFile }, { where: { email: req.body.email }, returning: true, plain: true }).then(async (result) => {
                                    const token = generateToken(result[1].dataValues);
                                    result[1].dataValues.token = token
                                    delete result[1].dataValues.password
                                    // CALL MONGO HERE
                                    await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)

                                    // delete file uploaded from local
                                    const directory = "./uploads"
                                    fs.readdir(directory, (err, files) => {
                                        if (err) throw err;

                                        for (const file of files) {
                                            fs.unlink(path.join(directory, file), err => {
                                                if (err) throw err;
                                            });
                                        }
                                    });

                                    return res.status(200).json({
                                        status: true,
                                        message: "API.SUCCESS.SIGNUP",
                                        data: result[1].dataValues
                                    })
                                }).catch((error) => {
                                    console.log("error update with profil photo  -------- :", error);

                                    return res.status(400).json({
                                        status: false,
                                        message: "API.ERROR.SIGNUP",
                                        data: error
                                    })

                                })
                            } else {
                                return res.status(401).send({
                                    status: false,
                                    data: null,
                                    message: "ERROR.BAD.REQUEST"
                                })
                            }
                        } else {
                            UserModel.update({ fullName: req.body.fullName, profilLink: code, password: newPassword, dateOfBirth: req.body.dateOfBirth, gender: req.body.gender }, { where: { email: req.body.email }, returning: true, plain: true }).then(async (result) => {
                                const token = generateToken(result[1].dataValues);
                                result[1].dataValues.token = token
                                delete result[1].dataValues.password
                                // CALL MONGO HERE
                                await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)
                                return res.status(200).json({
                                    status: true,
                                    message: "API.SUCCESS.SIGNUP",
                                    data: result[1].dataValues
                                })
                            }).catch((error) => {
                                console.log("error update without profil photo -------- :", error);

                                return res.status(400).json({
                                    status: false,
                                    message: "API.ERROR.SIGNUP",
                                    data: error
                                })
                            })
                        }
                    } catch (error) {
                        console.log("error try catch block -------- :", error);

                        return res.status(500).json({
                            status: false,
                            message: "API.INTERNEL-SERVER-ERROR",
                            data: error
                        })
                    }


                }
            }).catch((error) => {
                console.log("error user not found -------- :", error);

                return res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            })

    }

    completeAccountWithPhone(req, res) {
        console.log("req.body", req.body, "files", req.files);
        let expireTime = 5;

        tokenModel
            .findOne({
                where: { country_code: req.body.country_code, phone_number: req.body.phone_number }
            }).then(async (userEntity) => {
                let d_ = new Date(userEntity.tokenGeneratedAt);
                d_.setMinutes(d_.getMinutes() + expireTime);
                const now = Date.now()
                if (now > d_) {
                    return res.status(401).send({
                        status: false,
                        data: null,
                        message: "TOKEN.EXPIRED",
                    });
                } else {
                    let newPassword = hashPassword(req.body.password);
                    let code = req.body.fullName.replace(/\s+/g, '') + '_' + uid(4);
                    try {
                        if (req.files.length > 0) {
                            const upload_result = await this.uploadFile(req.body, req.files);

                            if (upload_result.message !== "upload done") {
                                return res.status(400).json({
                                    status: false,
                                    message: "API.bad_request",
                                    data: null
                                })
                            }
                            if (upload_result.type == "profil") {

                                UserModel.update({ fullName: req.body.fullName, profilLink: code, password: newPassword, dateOfBirth: req.body.dateOfBirth, gender: req.body.gender, profile_image: upload_result.originalFile, profile_image_compressed: upload_result.compressedFile }, { where: { phone_number: req.body.phone_number, country_code: req.body.country_code }, returning: true, plain: true }).then(async (result) => {
                                    const token = generateToken(result[1].dataValues);
                                    result[1].dataValues.token = token
                                    delete result[1].dataValues.password
                                    // sync witn mongo
                                    await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)
                                    // delete file from local
                                    const directory = "./uploads"
                                    fs.readdir(directory, (err, files) => {
                                        if (err) throw err;

                                        for (const file of files) {
                                            fs.unlink(path.join(directory, file), err => {
                                                if (err) throw err;
                                            });
                                        }
                                    });
                                    return res.status(200).json({
                                        status: true,
                                        message: "API.SUCCESS.SIGNUP",
                                        data: result[1].dataValues
                                    })
                                }).catch((error) => {
                                    console.log("error -------- 20 :", error);

                                    return res.status(400).json({
                                        status: false,
                                        message: "API.ERROR.SIGNUP",
                                        data: error
                                    })

                                })
                            } else {
                                return res.status(401).send({
                                    status: false,
                                    data: null,
                                    message: "ERROR.BAD.REQUEST"
                                })
                            }
                        } else {
                            UserModel.update({ fullName: req.body.fullName, profilLink: code, password: newPassword, dateOfBirth: req.body.dateOfBirth, gender: req.body.gender }, { where: { phone_number: req.body.phone_number, country_code: req.body.country_code }, returning: true, plain: true }).then(async (result) => {
                                const token = generateToken(result[1].dataValues);
                                result[1].dataValues.token = token
                                delete result[1].dataValues.password
                                //sync witn mongo
                                await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)
                                return res.status(200).json({
                                    status: true,
                                    message: "API.SUCCESS.SIGNUP",
                                    data: result[1].dataValues
                                })
                            }).catch((error) => {
                                console.log("error -------- 21 :", error);

                                return res.status(400).json({
                                    status: false,
                                    message: "API.ERROR.SIGNUP",
                                    data: error
                                })
                            })
                        }
                    } catch (error) {
                        console.log("error -------- 22 :", error);

                        return res.status(500).json({
                            status: false,
                            message: "API.INTERNEL-SERVER-ERROR",
                            data: error
                        })
                    }
                }

            }).catch((error) => {
                console.log("error -------- 23 :", error);

                return res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            })

    }

    loginWithMail(req, res, next) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.ENTITYDATA",
            });
        }

        return passport.authenticate('local', { session: false }, (err, passportUser, info) => {
            if (err) {
                return next.status(501).json({
                    status: false,
                    message: "ERROR.INTERNAL.ISSUE",
                    data: null
                });
            }

            if (passportUser) {
                let user = passportUser;
                delete user.dataValues.password;
                user.dataValues.token = generateToken(user.dataValues);
                return res.status(200).json({
                    status: true,
                    data: user,
                    message: "LOGIN.SUCCESS"
                });
            }

            return res.status(400).json({
                status: false,
                message: info,
                data: null
            });
        })(req, res, next);
    }

    loginWithPhone(req, res) {
        const { phone_number, country_code, password } = req.body;
        if (!phone_number || !password || !country_code) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.ENTITYDATA",
            });
        }

        UserModel
            .findOne({
                where: { phone_number, country_code }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(401).send({
                        status: false,
                        message: "FAILED.FETCH.NUMBER",
                        data: null
                    });
                }
                if (comparePassword(password, resultEntity.password)) {
                    delete resultEntity.dataValues.password
                    const token = generateToken(resultEntity.dataValues)
                    resultEntity.dataValues.token = token
                    return res.status(200).send({
                        status: true,
                        data: resultEntity.dataValues,
                        message: "SuccessAuthentication",
                    })
                } else {
                    return res.status(401).send({
                        status: false,
                        message: "UNSUCCESSFUL.AUTHENTICATION",
                        data: null
                    });
                }
            })
            .catch((error) => {
                console.log("error -------- 24 :", error);

                return res.status(500).send({
                    status: false,
                    message: "API.INTERNAL.SERVER.ERROR",
                    data: null
                });
            });
    }

    loginWithAppleId(req, res) {
        const { appleId, password } = req.body;
        if (!appleId || !password) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.ENTITYDATA",
            });
        }

        UserModel
            .findOne({
                where: { appleId }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(401).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }
                if (comparePassword(password, resultEntity.password)) {
                    delete resultEntity.dataValues.password
                    const token = generateToken(resultEntity.dataValues)
                    resultEntity.dataValues.token = token
                    return res.status(200).send({
                        status: true,
                        data: resultEntity.dataValues,
                        message: "SuccessAuthentication",
                    })
                } else {
                    return res.status(401).send({
                        status: false,
                        message: "UNSUCCESSFUL.AUTHENTICATION",
                        data: null
                    });
                }
            })
            .catch((error) => {
                console.log("error -------- 24 :", error);

                return res.status(500).send({
                    status: false,
                    message: "API.INTERNAL.SERVER.ERROR",
                    data: null
                });
            });
    }

    forgetPasswordMail(req, res) {

        const { email } = req.body;
        if (!email) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.EMAIL",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "Global.PleaseEnterEntityData.BadEmail",
            });
        }

        UserModel
            .findOne({
                where: { email: { [Op.iLike]: email } }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "EMAIL.NOT.VALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    const code = uid(4)
                    const codeGeneratedAt = Date.now();
                    tokenModel.update({ codeGeneratedAt: codeGeneratedAt, reset_code: code }, { where: { email: email }, raw: true, returning: true }).then(() => {
                        send_reset_password_email(email, code).then(() => {
                            return res.status(201).send({
                                status: true,
                                data: null,
                                message: "CODE.SENT.FOR.PASSWORD.RESET",
                            });
                        }, (error) => {
                            console.log("error -------- 25 :", error);

                            return res.status(500).send({
                                status: false,
                                data: null,
                                message: "FAILED.SEND.MAIL"
                            });
                        })
                    }, (error) => {
                        console.log("error -------- 26 :", error);

                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "FAILED.SEND.MAIL"
                        });
                    })
                }
            })
            .catch((error) => {
                console.log("error -------- 27 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    forgetPasswordPhone(req, res) {

        const { phone_number, country_code } = req.body;
        if (!phone_number || !country_code) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.MAIL",
            });
        }

        UserModel
            .findOne({
                where: { phone_number, country_code }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "PHONE.NUMBER.INVALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    const code = uid(4)
                    const codeGeneratedAt = Date.now();
                    tokenModel.update({ codeGeneratedAt: codeGeneratedAt, reset_code: code }, { where: { country_code, phone_number }, raw: true, returning: true }).then(() => {
                        client.messages
                            .create({
                                body: 'use this code to reset your password : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .then(message => console.log(message.sid))
                            .catch((error) => {
                                console.log("error -------- :", error);

                                return res.status(500).send({
                                    status: false,
                                    data: null,
                                    message: "API.TWILIO.ERROR"
                                });
                            })
                            .done();
                        return res.status(201).send({
                            status: true,
                            data: {
                                country_code: country_code,
                                phone_number: phone_number
                            },
                            message: "CODE.SENT.TO.NUMBER",
                        });
                    }, (error) => {
                        console.log("error -------- 28 :", error);

                        return res.status(500).send({
                            status: false,
                            data: null,
                            message: "FAILED.SEND.SMS"
                        });
                    })
                }
            })
            .catch((error) => {
                console.log("error -------- 29 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    changePassword(req, res) {
        const { payload: { obj } } = req;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword && !newPassword) {
            return res.status(400).send({
                status: false,
                data: null,
                message: "PLEASE.ENTER.CREDENTIALS",
            });
        }

        UserModel
            .findOne({
                where: { user_id: obj.user_id }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "USER.NOT.FETCHED",
                        data: null
                    })
                }
                if (comparePassword(currentPassword, resultEntity.dataValues.password)) {
                    if ((comparePassword(newPassword, resultEntity.dataValues.password))) {
                        return res.status(400).send({
                            status: false,
                            message: "CREDENTIALS.NOT.VALID",
                            data: null
                        });
                    }
                    resultEntity.update({ password: hashPassword(newPassword) })
                        .then(() => {
                            return res.status(201).send({
                                status: true,
                                message: "PASSWORD.UPDATED",
                                data: null
                            })
                        })
                        .catch((error) => {
                            console.log("error update password :", error);

                            return res.status(400).send({
                                status: false,
                                message: "ERROR.PASSWORD.UPDATE",
                                data: null
                            })
                        })
                } else {
                    return res.status(401).send({
                        status: false,
                        message: "WRONG.PASSWORD",
                        data: null
                    });
                }
            })
            .catch((error) => {
                console.log("error -------- 30 :", error);

                return res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    verifResetPasswordMail(req, res) {
        let expireTime = 5;
        const { email, reset_code } = req.body;

        tokenModel
            .findOne({
                where: { email: { [Op.iLike]: req.body.email }, reset_code }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    let d_ = new Date(resultEntity.codeGeneratedAt);
                    d_.setMinutes(d_.getMinutes() + expireTime);
                    const now = Date.now()
                    if (now > d_) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "CODE.EXPIRED",
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            data: {
                                "email": email,
                                "reset_code": reset_code
                            },
                            message: "DIGIT.VERIFIED",
                        })
                    }
                }
            })
            .catch((error) => {
                console.log("error -------- 31 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    verifResetPasswordPhone(req, res) {
        const { phone_number, country_code, reset_code } = req.body;
        let expireTime = 5;

        tokenModel
            .findOne({
                where: { phone_number, reset_code, country_code }
            })
            .then(function (resultEntity) {
                if (!resultEntity) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
                if (resultEntity) {
                    let d_ = new Date(resultEntity.codeGeneratedAt);
                    d_.setMinutes(d_.getMinutes() + expireTime);
                    const now = Date.now()
                    if (now > d_) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "CODE.EXPIRED",
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            data: {
                                "country_code": country_code,
                                "phone_number": phone_number,
                                "reset_code": reset_code
                            },
                            message: "DIGIT.VERIFIED",
                        })
                    }
                }
            })
            .catch((error) => {
                console.log("error -------- 32 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });

    }

    resetPassword(req, res) {
        const { email, country_code, phone_number, newPassword } = req.body;

        let password = hashPassword(newPassword);
        if (email) {
            UserModel.findOne({
                where: { email: { [Op.iLike]: req.body.email } }
            }).then((userEntity) => {
                if ((comparePassword(newPassword, userEntity.dataValues.password))) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    });
                }
                userEntity.update({ password }).then(() => {
                    return res.status(201).send({
                        status: true,
                        data: null,
                        message: "SUCCESS.PASSWORD.RESET",
                    })
                }).catch(() => {
                    return res.status(500).send({
                        status: false,
                        data: null,
                        message: "INTERNAL.ISSUE.PASSWORD.RESET"
                    });
                })
            }).catch((error) => {
                console.log("error -------- 33 :", error);

                return res.status(500).send({
                    status: false,
                    data: null,
                    message: "API.ERROR.FETCH.USER"
                });
            })
            return
        }

        if (country_code && phone_number) {
            UserModel.findOne({
                where: { country_code, phone_number }
            }).then((userEntity) => {
                if ((comparePassword(newPassword, userEntity.dataValues.password))) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    });
                }
                userEntity.update({ password }).then(() => {
                    return res.status(201).send({
                        status: true,
                        data: null,
                        message: "SUCCESS.PASSWORD.RESET",
                    })
                }).catch((error) => {
                    console.log("error -------- 34 :", error);

                    return res.status(500).send({
                        status: false,
                        data: null,
                        message: "INTERNAL.ISSUE.PASSWORD.RESET"
                    });
                })
            }).catch((error) => {
                console.log("error -------- 35 :", error);

                return res.status(500).send({
                    status: false,
                    data: null,
                    message: "API.ERROR.FETCH.USER"
                });
            })
            return
        }

        return res.status(400).send({
            status: false,
            message: "CREDENTIALS.NOT.VALID",
            data: null
        })


    }

    uploadPhotoAws(req, res) {
        // token dans le headers - file pour l'image - type pour le type d'image couverture ou profil
        const { payload: { obj } } = req;

        // const bearerHeader = req.headers['authorization'];
        // var decoded = jwtoken.decode(bearerHeader);
        // console.log("-------------> current user", decoded.id);

        // Create S3 service object
        const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        const uploadParams = { Bucket: "digit-u-media-resources", Key: '', Body: '' };

        const form = formidable({ multiples: true });

        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }
            var fileStream = fs.createReadStream(files.file.path);
            fileStream.on('error', function (err) {
                console.log('File Error', err);
            });

            uploadParams.Body = fileStream;
            uploadParams.Key = path.basename(uuidv4() + "." + path.basename(files.file.name).split('.')[1]);
            uploadParams.ACL = 'public-read';
            uploadParams.ContentType = files.file.type;


            // call S3 to retrieve upload file to specified bucket

            s3.upload(uploadParams, function (err, data) {
                if (err) {
                    return res.status(401).send({
                        status: false,
                        data: err,
                        message: "ERROR.UPLOAD"
                    })
                } if (data) {
                    if (fields.type === 'cover') {
                        UserModel.update({ cover_image: data.Location, },
                            {
                                where: {
                                    user_id: obj.user_id
                                }, returning: true
                            }).then((result) => {
                                return res.status(200).send({
                                    status: true,
                                    url: data.Location, file_name: uploadParams.Key,
                                    message: "COVER.IMAGE.UPLOAD"
                                })
                            }).catch((err) => {
                                return res.status(401).send({
                                    status: false,
                                    data: err,
                                    message: "ERROR.COVER.IMAGE.UPLOAD"
                                })
                            })
                    }

                    if (fields.type === 'profil') {
                        UserModel.update({ profil_image: data.Location, },
                            {
                                where: {
                                    user_id: obj.user_id
                                }, returning: true
                            }).then((result) => {
                                return res.status(200).send({
                                    status: true,
                                    url: data.Location, file_name: uploadParams.Key,
                                    message: "PROFIL.IMAGE.UPLOAD"
                                })
                            }).catch((err) => {
                                return res.status(401).send({
                                    status: false,
                                    data: err,
                                    message: "ERROR.PROFIL.IMAGE.UPLOAD"
                                })
                            })

                    }

                }
            });
        });

    }

    async updateEmailOrPhoneStep1(req, res) {
        const { payload: { obj } } = req;
        const { email, phone_number, country_code } = req.body;
        let expireTime = 5;

        if (email) {
            if (!isValidEmail(email)) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "Global.PleaseEnterEntityData.BadEmail",
                });
            }
            // check if email already exists as account
            let checkEmail = await UserModel.findOne({
                where: { email: { [Op.iLike]: req.body.email } }
            })
            if (checkEmail) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "MAIL.ALREADY.EXISTS"
                });
            }
            // check if email has existed, but didnt completed the update, 3 options could exist: 
            tokenModel
                .findOne({
                    where: { email: { [Op.iLike]: req.body.email } }
                }).then((resultEntity) => {
                    const code = uid(4);
                    const createdAt = Date.now();
                    if (!resultEntity) {

                        tokenModel
                            .update({
                                tokenGeneratedAt: createdAt,
                                token: code,
                                email,
                            }, { where: { user_id: obj.user_id } })
                            .then(() => {
                                send_signup_mail_code(email, code)
                                    .then(() => {
                                        return res.status(201).send({
                                            status: true,
                                            data: { email: email },
                                            message: "CODE.SENT.TO.MAIL",
                                        });
                                    })
                                    .catch((error) => {
                                        console.log("error -------- 36 :", error);

                                        return res.status(500).send({
                                            status: false,
                                            data: error,
                                            message: "FAILED.SEND.EMAIL",
                                        });
                                    });
                            })
                            .catch(() => {
                                return res.status(500).send({
                                    status: false,
                                    data: null,
                                    message: "FAILED.SEND.EMAIL ",
                                });
                            });
                        return
                    } else {

                        if (resultEntity.user_id == obj.user_id) {
                            let d_ = new Date(resultEntity.tokenGeneratedAt);
                            d_.setMinutes(d_.getMinutes() + expireTime);
                            const now = Date.now();
                            if (now > d_) {
                                resultEntity.update({ tokenGeneratedAt: createdAt, token: code, email }).then(() => {

                                    send_signup_mail_code(email, code).then(() => {
                                        return res.status(201).send({
                                            status: true,
                                            data: { email: email },
                                            message: "CODE.SENT.TO.EMAIL",
                                        });
                                    }).catch((error) => {
                                        console.log("error -------- 37 :", error);

                                        return res.status(500).send({
                                            status: false,
                                            data: error,
                                            message: "FAILED.SEND.EMAIL"
                                        });
                                    })

                                }).catch((error) => {
                                    console.log("error -------- 38 :", error);

                                    return res.status(500).send({
                                        status: false,
                                        data: null,
                                        message: "FAILED.UPDATE.USER"
                                    });
                                })
                                return
                            } else {
                                return res.status(200).send({
                                    status: true,
                                    data: null,
                                    message: "VERIFY.MAIL.TOKEN.ALREADY.SENT"
                                });
                            }

                        } else {
                            return res.status(400).send({
                                status: false,
                                data: null,
                                message: "MAIL.ALREADY.EXISTS"
                            });
                        }

                    }

                }).catch((error) => {
                    console.log("error -------- 39 :", error);

                    return res.status(401).send({
                        status: false,
                        data: null,
                        message: "API.FETCH.USER.ERROR",
                    });
                })
            return
        }

        if (phone_number && country_code) {

            // check if email already exists as account
            let checkNumber = await UserModel.findOne({
                where: { phone_number, country_code }
            })
            if (checkNumber) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "PHONE.NUMBER.ALREADY.EXISTS"
                });
            }
            // check if email has existed, but didnt completed the update, 3 options could exist: 

            tokenModel
                .findOne({
                    where: { phone_number, country_code }
                }).then((resultEntity) => {
                    if (!resultEntity) {
                        const code = uid(4);
                        const expTime = 5;
                        const createdAt = Date.now();
                        tokenModel.update({ tokenGeneratedAt: createdAt, token: code, phone_number, country_code }, { where: { user_id: obj.user_id } }).then(() => {
                            client.messages
                                .create({
                                    body: 'Use this code to update for feechr : ' + code,
                                    messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                    to: `${country_code}${phone_number}`
                                })
                                .then(message => console.log(message.sid))
                                .catch((error) => {
                                    console.log("error -------- 40 :", error);

                                    return res.status(500).send({
                                        status: false,
                                        data: null,
                                        message: "API.TWILIO.ERROR"
                                    });
                                })
                                .done();
                            return res.status(201).send({
                                status: true,
                                data: {
                                    country_code: country_code,
                                    phone_number: phone_number
                                },
                                message: "CODE.SENT.TO.NUMBER",
                            });

                        }).catch(() => {
                            return res.status(500).send({
                                status: false,
                                data: null,
                                message: "FAILED.SEND.SMS"
                            });
                        })

                        return
                    } else {

                        if (resultEntity.user_id == obj.user_id) {
                            let d_ = new Date(resultEntity.tokenGeneratedAt);
                            d_.setMinutes(d_.getMinutes() + expireTime);
                            const now = Date.now();
                            if (now > d_) {
                                resultEntity.update({ tokenGeneratedAt: createdAt, token: code, phone_number, country_code }).then(() => {

                                    client.messages
                                        .create({
                                            body: 'Use this code to update for feechr : ' + code,
                                            messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                            to: `${country_code}${phone_number}`
                                        })
                                        .then(message => console.log(message.sid))
                                        .catch((error) => {
                                            console.log("error -------- 41 :", error);

                                            return res.status(500).send({
                                                status: false,
                                                data: null,
                                                message: "API.TWILIO.ERROR"
                                            });
                                        })
                                        .done();
                                    return res.status(201).send({
                                        status: true,
                                        data: {
                                            country_code: country_code,
                                            phone_number: phone_number
                                        },
                                        message: "CODE.SENT.TO.NUMBER",
                                    });

                                }).catch((error) => {
                                    console.log("error -------- 42 :", error);

                                    return res.status(500).send({
                                        status: false,
                                        data: null,
                                        message: "FAILED.UPDATE.USER"
                                    });
                                })
                                return
                            } else {
                                return res.status(200).send({
                                    status: true,
                                    data: null,
                                    message: "VERIFY.MAIL.TOKEN.ALREADY.SENT"
                                });
                            }

                        } else {
                            return res.status(400).send({
                                status: false,
                                data: null,
                                message: "MAIL.ALREADY.EXISTS"
                            });
                        }

                    }

                }).catch((error) => {
                    console.log("error -------- 43 :", error);

                    return res.status(401).send({
                        status: false,
                        data: null,
                        message: "API.FETCH.USER.ERROR",
                    });
                })
            return
        }

        return res.status(400).send({
            status: false,
            message: "CREDENTIALS.NOT.VALID",
            data: null
        })
    }

    updateEmailOrPhoneStep2(req, res) {
        const { payload: { obj } } = req;
        const { token, email, phone_number, country_code } = req.body
        let expireTime = 5;

        if (email) {
            if (!isValidEmail(email)) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "Global.PleaseEnterEntityData.BadEmail",
                });
            }

            tokenModel
                .findOne({
                    where: { email: { [Op.iLike]: req.body.email }, token, user_id: obj.user_id }
                })
                .then(function (resultEntity) {
                    console.log(resultEntity);
                    if (!resultEntity) {
                        return res.status(400).send({
                            status: false,
                            message: "CREDENTIALS.NOT.VALID",
                            data: null
                        })
                    }
                    if (resultEntity) {
                        let d_ = new Date(resultEntity.tokenGeneratedAt);
                        d_.setMinutes(d_.getMinutes() + expireTime);
                        const now = Date.now()
                        if (now > d_) {
                            return res.status(401).send({
                                status: false,
                                data: null,
                                message: "TOKEN.EXPIRED",
                            });
                        } else {
                            UserModel.update({ email: email }, { where: { user_id: obj.user_id } }).then((fetchResult) => {

                                return res.status(201).send({
                                    status: true,
                                    data: {
                                        "email": email,
                                    },
                                    message: "EMAIL.UPDATED",
                                })

                            }).catch((error) => {
                                console.log("error -------- 44 :", error);

                                return res.status(400).send({
                                    status: false,
                                    data: null,
                                    message: "FAILED.UPDATE.USER",
                                })
                            })

                        }
                    }
                    return
                })
                .catch((error) => {
                    console.log("error -------- 45 :", error);

                    res.status(500).json({
                        status: false,
                        message: "API.INTERNEL-SERVER-ERROR",
                        data: error
                    })
                });
            return

        }

        if (phone_number && country_code) {
            tokenModel
                .findOne({
                    where: { phone_number, country_code, token }, raw: true
                })
                .then(function (resultEntity) {
                    if (!resultEntity) {
                        return res.status(400).send({
                            status: false,
                            message: "CREDENTIALS.NOT.VALID",
                            data: null
                        })
                    }
                    if (resultEntity) {
                        let d_ = new Date(resultEntity.tokenGeneratedAt);
                        d_.setMinutes(d_.getMinutes() + expireTime);
                        const now = Date.now()
                        if (now > d_) {
                            return res.status(401).send({
                                status: false,
                                data: null,
                                message: "TOKEN.EXPIRED",
                            });
                        } else {

                            UserModel.update({ phone_number: phone_number, country_code: country_code }, { where: { user_id: obj.user_id } }).then((fetchResult) => {

                                return res.status(201).send({
                                    status: true,
                                    data: {
                                        "country_code": country_code,
                                        "phone_number": phone_number,
                                    },
                                    message: "NUMBER.UPDATED",
                                })





                            }).catch((error) => {
                                console.log("error -------- 46 :", error);

                                return res.status(401).send({
                                    status: false,
                                    data: null,
                                    message: "FAILED.UPDATE.USER",
                                })
                            })

                        }
                    }
                    return
                })
                .catch((error) => {
                    console.log("error -------- 47 :", error);

                    res.status(500).json({
                        status: false,
                        message: "API.INTERNEL-SERVER-ERROR",
                        data: error
                    })
                });
            return
        }
        return res.status(400).send({
            status: false,
            message: "CREDENTIALS.NOT.VALID",
            data: null
        })

    }

    currentProfil(req, res) {
        const { payload: { obj } } = req;
        return UserModel.findOne({
            where: { user_id: obj.user_id }, include: [
                {
                    model: CategoryModel,
                    as: "category",
                },
            ],
        })
            .then(async (user) => {
                if (!user) {
                    return res.status(400).send({
                        status: false,
                        message: "USER.NOT.EXIST",
                        data: null
                    })
                }


                // after deprecation of count logic in the following crud , we only need the count where the profil is fetched
                const countFollowers = await counterFollowers(obj.user_id);
                const contFollowing = await counterFollowing(obj.user_id);

                delete user.dataValues.password
                user.dataValues.followers_count = countFollowers;
                user.dataValues.following_count = contFollowing;


                return res.status(201).send({
                    status: true,
                    data:
                    {
                        ...user.dataValues,
                    },
                    message: "CURRENT.PROFIL",
                })
            }).catch((error) => {
                console.log("error -------- 48 :", error);

                res.status(500).json({
                    status: false,
                    message: "API.INTERNEL-SERVER-ERROR",
                    data: error
                })
            });
    }

    profilCountServices(req, res) {
        let { type, user_id, step } = req.body

        if (type == "posts_count") {
            counterPosts(user_id, step).then((resultEntity) => {
                return res.status(201).send({
                    status: true,
                    data: resultEntity,
                    message: "API.POSTS.COUNT",
                })
            }).catch((error) => {
                console.log("error -------- 49 :", error);

                return res.status(401).send({
                    status: true,
                    data: null,
                    message: "API.POSTS.COUNT.FAILED",
                })
            })
        }

        if (type == "likes_count") {
            counterLikes(user_id, step).then((resultEntity) => {
                return res.status(201).send({
                    status: true,
                    data: resultEntity,
                    message: "API.LIKES.COUNT",
                })
            }).catch((error) => {
                console.log("error -------- 50 :", error);

                return res.status(401).send({
                    status: true,
                    data: null,
                    message: "API.LIKES.COUNT.FAILED",
                })
            })
        }

        if (type == "views_count") {
            counterViews(user_id, step).then((resultEntity) => {
                return res.status(201).send({
                    status: true,
                    data: resultEntity,
                    message: "API.VIEWS.COUNT",
                })
            }).catch((error) => {
                console.log("error -------- 51 :", error);

                return res.status(401).send({
                    status: true,
                    data: null,
                    message: "API.VIEWS.COUNT.FAILED",
                })
            })
        }

    }

    async customFind(req, res) {
        //fetch from user_category model
        const result = await UserCategoryModel.findAll({
            where: {
                user_id: req.body.id,
            },
            include: [
                {
                    model: CategoryModel,
                    as: "category",
                },
            ],
        });
        console.log(result)
        return res.send(result)
    }

    async createUpdateToken(req, res) {
        try {
            //check if the requested user exists
            const check = await FirebaseModel.findOne({ where: { user_id: req.body.user_id }, raw: true })
            console.log(check)
            if (check) {
                check.firebase_token = req.body.firebase_token;
                await FirebaseModel.update({ firebase_token: req.body.firebase_token }, { where: { user_id: req.body.user_id } })
                return res.status(200).json({
                    status: true,
                    message: "API.FIREBASE-UPDATED",
                    data: null
                });
            }
            // else create the user with its firebase token
            await FirebaseModel.create({ user_id: req.body.user_id, firebase_token: req.body.firebase_token })
            return res.status(200).json({
                status: true,
                message: "API.FIREBASE-UPDATED",
                data: null,
            });
        } catch (err) {
            return res.json({
                status: false,
                message: "API.INTERNAL-SERVER-ERROR",
                data: null
            })
        }
    }

    async updateUser(req, res) {
        // const { coverImage, profilImage, fullName, Bio, dateOfBirth, address, category, Email, Phone, Links } = req.body
        const { payload: { obj } } = req;
        let { country, fullName, visibility, bio, dateOfBirth, address, categoryId, tiktok, instagram, twitter, facebook, youtube, tumblr, vkontakte, skype, profile_image, cover_image } = req.body;

        UserModel
            .findOne({
                where: { user_id: obj.user_id }, include: [
                    {
                        model: CategoryModel,
                        through: userCategoriesModel,
                        as: "category",
                    },
                ],


            })
            .then(async (resultEntity) => {

                if (req.files) {
                    const upload_result = this.uploadFile(req.body, req.files).then(async (updateEntity) => {
                        if (updateEntity.type == "profil") {

                            await UserModel.update({ profile_image: updateEntity.originalFile, profile_image_compressed: updateEntity.compressedFile }, { where: { user_id: obj.user_id }, returning: true, plain: true }).then(async (result) => {
                                //CALL MONGO HERE
                                await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)

                                await UserModel
                                    .findOne({
                                        where: { user_id: obj.user_id }, include: [
                                            {
                                                model: CategoryModel,
                                                as: "category",
                                            },
                                        ],
                                    }).then((resultFetch) => {
                                        delete resultFetch.dataValues.password;
                                        const token = generateToken(resultFetch.dataValues);
                                        resultFetch.dataValues.token = token;

                                        // delete file from local
                                        const directory = "./uploads"
                                        fs.readdir(directory, (err, files) => {
                                            if (err) throw err;

                                            for (const file of files) {
                                                fs.unlink(path.join(directory, file), err => {
                                                    if (err) throw err;
                                                });
                                            }
                                        });
                                        return res.status(200).send({
                                            status: true,
                                            data: resultFetch.dataValues,
                                            message: "PROFIL.IMAGE.UPDATED"
                                        })
                                    }).catch((error) => {
                                        console.log("error update 1 -------- :", error);

                                        return res.status(401).send({
                                            status: false,
                                            data: null,
                                            message: "ERROR.FETCH.UPDATED.USER"
                                        })
                                    })


                            }).catch((error) => {
                                console.log("error update 2 -------- :", error);

                                return res.status(401).send({
                                    status: false,
                                    data: error,
                                    message: "ERROR.PROFIL.IMAGE.UPDATED"
                                })
                            })
                            return
                        }

                        if (updateEntity.type == "cover") {
                            UserModel.update({ cover_image: updateEntity.originalFile, cover_image_compressed: updateEntity.compressedFile }, { where: { user_id: obj.user_id }, returning: true, plain: true }).then(async (result) => {
                                //CALL MONGO HERE

                                await axios.post(`${config.sync_url}syncMongo`, result[1].dataValues)

                                UserModel
                                    .findOne({
                                        where: { user_id: obj.user_id }, include: [
                                            {
                                                model: CategoryModel,
                                                as: "category",
                                            },
                                        ],
                                    }).then((resultFetch) => {
                                        console.log("resultFetch.dataValues   :", resultFetch.dataValues);
                                        delete resultFetch.dataValues.password;
                                        const token = generateToken(resultFetch.dataValues);
                                        resultFetch.dataValues.token = token;
                                        return res.status(200).send({
                                            status: true,
                                            data: resultFetch.dataValues,
                                            message: "COVER.IMAGE.UPLOAD"
                                        })
                                    }).catch(() => {
                                        return res.status(401).send({
                                            status: false,
                                            data: null,
                                            message: "ERROR.FETCH.UPDATED.USER"
                                        })
                                    })

                            }).catch((error) => {
                                console.log("error -------- 52 :", error);

                                return res.status(401).send({
                                    status: false,
                                    data: error,
                                    message: "ERROR.COVER.IMAGE.UPLOAD"
                                })
                            })
                            return
                        }

                    }).catch((error) => {
                        console.log("error -------- 53 :", error);

                        return res.status(400).json({
                            status: false,
                            message: "API.bad_request",
                            data: null
                        })
                    })
                } else {

                    let { categories, talentCategory } = req.body
                    delete req.body.categories;
                    delete req.body.talentCategory
                    let objectToUpdate = req.body
                    let categoryArray = await resultEntity.dataValues.category.map(a => a.category_id)

                    // a talent user has to be public
                    // if (resultEntity.dataValues.visibility == "public") {
                    //     if (talentCategory) {
                    //         // const updateVerifCode = await verifCodeModel.update({ generatedAt, verifCode: code, socialMediaAuth: false }, { where: { user_id: check.dataValues.user_id } })
                    //         const talent = await UserModel.update({ talent_Category_id: talentCategory, isTalent: true }, { where: { user_id: obj.user_id } })
                    //     }
                    // }

                    if (talentCategory) {
                        console.log("2")
                        if (resultEntity.dataValues.visibility == "public") {
                            // const updateVerifCode = await verifCodeModel.update({ generatedAt, verifCode: code, socialMediaAuth: false }, { where: { user_id: check.dataValues.user_id } })
                            const talent = await UserModel.update({ talent_Category_id: talentCategory, isTalent: true }, { where: { user_id: obj.user_id } })
                        } else {
                            return res.status(401).send({
                                status: false,
                                data: null,
                                message: "ACTION.NOT.ALLOWED"
                            })

                        }
                    }

                    if (categories) {
                        // if categories exist update speciality with the first category chosen
                        if (categories.length > 0) {
                            const specialty = await CategoryModel.findOne({
                                where: {
                                    [Op.and]: {
                                        category_id: categories[0]
                                    }
                                }
                            })
                            objectToUpdate.speciality = specialty.dataValues.categoryName;
                        } else {
                            // if categories deleted or doesnt exist speciality is null
                            objectToUpdate.speciality = null;
                        }

                        await userCategoriesModel.destroy({
                            where: {
                                [Op.and]: {
                                    user_id: obj.user_id
                                }
                            }
                        })

                        await asyncForEach(categories, async (element) => {
                            await userCategoriesModel.destroy({
                                where: {
                                    [Op.and]: {
                                        category_id: element,
                                        user_id: obj.user_id
                                    }
                                }
                            })
                            if (categoryArray.includes(element)) {
                                // categoryArray is full
                                await userCategoriesModel.create({ category_id: element, user_id: obj.user_id })
                            } else {
                                // empty categoryArray
                                await userCategoriesModel.create({ category_id: element, user_id: obj.user_id })
                            }
                        })
                    }

                    if ( req.body.isTalent == true ){
                        objectToUpdate.visibility = "public"
                    }

                    if (req.body.visibility == "private") {
                        if (resultEntity.dataValues.isTalent == false || resultEntity.dataValues.isTalent == null) {
                            // a normal user can switch between private and public account
                            objectToUpdate.visibility = "private"
                        } else {
                            // a talent profil can not move to private account
                            return res.status(401).send({
                                status: false,
                                data: null,
                                message: "ACTION.NOT.ALLOWED"
                            })
                        }
                    }

                    UserModel.update(objectToUpdate, { where: { user_id: obj.user_id }, returning: true, plain: true }).then(async (result) => {

                        //PUSHER HERE
                        //CALL MONGO HERE
                        UserModel
                            .findOne({
                                where: { user_id: obj.user_id }, include: [
                                    {
                                        model: CategoryModel,
                                        through: userCategoriesModel,
                                        as: "category",
                                    },
                                    {
                                        model: CategoryModel,
                                        as: "talent",
                                        include: [
                                            {
                                                model: CategoryModel,
                                                as: "parent_category",
                                            },
                                        ]
                                    },

                                ],
                            }).then(async (resultFetch) => {
                                delete resultFetch.dataValues.password;
                                const token = generateToken(resultFetch.dataValues);
                                resultFetch.dataValues.token = token;
                                console.log("resultFetch____________________", resultFetch);
                                await axios.post(`${config.sync_url}syncMongo`, resultFetch.dataValues)
                                return res.status(201).send({
                                    status: true,
                                    data: resultFetch.dataValues,
                                    message: "update.with.success"
                                })
                            }).catch((error) => {
                                console.log("error -------- 54 :", error);

                                return res.status(401).send({
                                    status: false,
                                    data: error,
                                    message: "ERROR.FETCH.UPDATED.USER"
                                })
                            })


                    }).catch((error) => {
                        console.log("error -------- 55 :", error);
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "ERROR.update"
                        })
                    })

                }

            })
            .catch((error) => {
                console.log("error -------- 56 :", error);
                return res.status(500).send({
                    status: false,
                    data: null,
                    message: "API.ERROR.FETCH.USER"
                })
            })

    }

    async fetchFirebaseToken(req, res) {
        // get the user firebase token
        try {
            const user_data = await FirebaseModel.findOne({ where: { user_id: req.params.user_id }, raw: true })
            return res.status(200).json({
                status: true,
                message: "API.FIREBASE-FETCHED",
                data: user_data,
            });
        } catch (err) {
            return res.status(500).json({
                status: false,
                message: "API.INTERNAL-SERVER-ERROR",
                data: null
            })
        }
    }

    async deleteUser(req, res) {
        let { email, country_code, phone_number } = req.body;

        try {
            if (email) {
                const check = await UserModel.findOne({ where: { email } })
                console.log("check :", check);

                if (check) {
                    if (Object.entries(check).length != 0) {
                        const myId = check.dataValues.user_id
                        const checkRequest = await friendRequestModel.findAll({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } })
                        if (Object.entries(checkRequest).length != 0) {
                            friendRequestModel.destroy({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } });
                        }
                    }
                }
                const checkToken = await tokenModel.findAll({ where: { email: email } })
                if (Object.entries(checkToken).length != 0) {
                    tokenModel.destroy({ where: { email: email } });
                }
                UserModel.destroy({ where: { email } })
                return res.status(200).json({
                    status: true,
                    message: "USER.DELETED",
                    data: null
                })
            }

            if (phone_number && country_code) {
                const check = await UserModel.findOne({ where: { [Op.and]: { phone_number, country_code } } })
                console.log("check :", check);
                if (check) {
                    if (Object.entries(check).length != 0) {
                        const myId = check.dataValues.user_id
                        const checkRequest = await friendRequestModel.findAll({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } })
                        if (Object.entries(checkRequest).length != 0) {
                            friendRequestModel.destroy({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } });
                        }
                    }
                }
                const checkToken = await tokenModel.findAll({ where: { [Op.and]: { phone_number, country_code } } })
                if (Object.entries(checkToken).length != 0) {
                    tokenModel.destroy({ where: { [Op.and]: { phone_number, country_code } } });
                }
                UserModel.destroy({ where: { [Op.and]: { phone_number, country_code } } })
                return res.status(200).json({
                    status: true,
                    message: "USER.DELETED",
                    data: null
                })

            }

        } catch {
            return res.status(400).json({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }


    }

    async externalShareUser(req,res){
        const {userId} = req.body
        // fetch the user to share
        const user = await UserModel.findOne({
          where: { user_id:userId },
        });
      try {
        const dynamic_url = await dynamicLinkInfo(
          userId,
          "userId",
          user.fullName,
          config.bucket_url + user.profile_image
        );
        return res.json({
          status: true,
          message: "API.URL_GENERATED",
          data: dynamic_url,
        });
      } catch (err) {
        throw (err);
      }
    }


}

module.exports = roleController;