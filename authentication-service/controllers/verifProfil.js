const models = require("../models/db_init");
const { asyncForEach } = require('../helpers/helpers')

const path = require("path");
const { v4: uuidv4 } = require('uuid')
const formidable = require('formidable');

const UserModel = models["users"];
const VerifProfil = models["verifProfil"];
const CategoryModel = models["category"]
const verifProfil_categoriesModel = models["verifProfil_categories"]

const config = require('../config/config.json');
const axios = require("axios");
const banCheck = require("../middleware/banCheck")



// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({ region: 'eu-central-1' });

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

class verifProfilController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = VerifProfil;
        this.entity_id_name = "verifProfil_id";
        this.list_includes = [
            {
                model: UserModel,
                as: "user",
                attributes: { exclude: ["password"] },
            },
            {
                model: CategoryModel,
                through: verifProfil_categoriesModel,
                as: "categories",
            },
        ]
    }

    uploadImage(files) {

        return new Promise((resolve, reject) => {
            // Create S3 service object
            const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
            const uploadParams = { Bucket: "digit-u-media-resources", Key: '', Body: '' };
            var fs = require('fs');

            var fileStream = fs.createReadStream(files.image.path);
            fileStream.on('error', function (err) {
                console.log('File Error', err);
            });

            uploadParams.Body = fileStream;
            uploadParams.Key = path.basename(uuidv4() + "." + path.basename(files.image.name).split('.')[1]);
            uploadParams.ACL = 'public-read';
            uploadParams.ContentType = files.image.type;


            // call S3 to retrieve upload file to specified bucket
            s3.upload(uploadParams, function (err, data) {
                if (err) {
                    return res.status(401).send({
                        status: false,
                        data: err,
                        message: "ERROR.UPLOAD"
                    })
                } if (data) {
                    return resolve({
                        message: "upload done", url: data.Location, file_name: uploadParams.Key,
                    })
                }
            });
        })
    }

    createVerifiedProfil(req, res) {

        // const { username, fullName, known_as, categories, image } = req.body
        const { payload: { obj } } = req;

        // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
        if (obj.active !== "Y") {
            return res.status(400).send({
                status: false,
                message: "API.USER.BANNED",
                data: null,
            });
        }

        const form = formidable({ multiples: true });
        form.parse(req, async (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }

            if (!fields.username || !fields.fullName || !fields.known_as || !fields.categories || !files.image) {
                return res.status(400).send({
                    message: "Please Enter EntityData",
                });
            }

            let profilToVerify = await VerifProfil.findOne({
                where: {
                    user_id: obj.user_id
                }
            })

            if (profilToVerify) {
                // update the actual verification request

                this.uploadImage(files).then(async (resultImage) => {
                    if (resultImage.message !== "upload done")
                        return res.status(400).json({
                            status: false,
                            message: "API.bad_request",
                            data: null
                        })

                    VerifProfil.update({ username: fields.username, fullName: fields.fullName, known_as: fields.known_as, image: resultImage.file_name }, { where: { user_id: obj.user_id }, plain: true, returning: true })
                        .then(async (resultEntity) => {
                            if (fields.categories) {
                                await verifProfil_categoriesModel.destroy({
                                    where: {
                                        verifProfil_id: resultEntity[1].dataValues.verifProfil_id
                                    }
                                })

                                await asyncForEach(JSON.parse(fields.categories), async (element) => {
                                    await verifProfil_categoriesModel.create({ category_id: element, verifProfil_id: resultEntity[1].dataValues.verifProfil_id })
                                })
                            }
                            // remove whene this task is done in backoffice side :
                            // const userToUpdate = await UserModel.update({ isVerified: true }, { where: { user_id: resultEntity.user_id }, returning: true, plain: true })
                            // // CALL MONGO HERE
                            // console.log("here userToUpdate!",userToUpdate[1].dataValues);

                            // await axios.post(`${config.sync_url}syncMongo`, userToUpdate[1].dataValues)

                            // has to be removed ...
                            return res.status(200).send({
                                status: true,
                                data: resultEntity,
                                message: "API.VERIFICATION.PROFIL.CREATED"
                            })
                        })
                        .catch((error) => {
                            console.log("error", error);
                            return res.status(401).send({
                                status: false,
                                data: error,
                                message: "API.ERROR.VERIFICATION.PROFILs"
                            })
                        })

                }).catch((error) => {
                    console.log("error :", error);
                    return res.status(500).send({
                        status: false,
                        data: error,
                        message: "API.IMAGE.UPLOAD.FAILED"
                    })

                })
            } else {
                // create new verification request 

                this.uploadImage(files).then(async (resultImage) => {
                    if (resultImage.message !== "upload done")
                        return res.status(400).json({
                            status: false,
                            message: "API.bad_request",
                            data: null
                        })

                    VerifProfil.create({ username: fields.username, fullName: fields.fullName, known_as: fields.known_as, image: resultImage.file_name, user_id: obj.user_id })
                        .then(async (resultEntity) => {
                            if (fields.categories) {
                                await asyncForEach(JSON.parse(fields.categories), async (element) => {
                                    await verifProfil_categoriesModel.create({ category_id: element, verifProfil_id: resultEntity.dataValues.verifProfil_id })
                                })
                            }
                            // remove whene this task is done in backoffice side :
                            // const userToUpdate = await UserModel.update({ isVerified: true }, { where: { user_id: resultEntity.user_id }, returning: true, plain: true })
                            // // CALL MONGO HERE
                            // console.log("here userToUpdate!",userToUpdate[1].dataValues);

                            // await axios.post(`${config.sync_url}syncMongo`, userToUpdate[1].dataValues)

                            // has to be removed ...
                            return res.status(200).send({
                                status: true,
                                data: resultEntity,
                                message: "API.VERIFICATION.PROFIL.CREATED"
                            })
                        })
                        .catch((error) => {
                            console.log("error", error);
                            return res.status(401).send({
                                status: false,
                                data: error,
                                message: "API.ERROR.VERIFICATION.PROFILs"
                            })
                        })

                }).catch((error) => {
                    console.log("error :", error);
                    return res.status(500).send({
                        status: false,
                        data: error,
                        message: "API.IMAGE.UPLOAD.FAILED"
                    })

                })
            }
        })
    }

    agreeVerificationAccount(req, res) {

        let { user_id } = req.body;
        UserModel.update({ isVerified: true }, { where: { user_id }, returning: true, plain: true }).then((resultEntity) => {
            console.log("res", resultEntity);
            delete resultEntity[1].dataValues.password
            return res.status(200).send({
                status: true,
                data: resultEntity[1].dataValues,
                message: "SUCCESS.REQUEST"
            })
        }).catch((error) => {
            return res.status(400).send({
                status: true,
                data: null,
                message: "API.BAD.REQUEST"
            })
        })

    }

}

module.exports = verifProfilController;
