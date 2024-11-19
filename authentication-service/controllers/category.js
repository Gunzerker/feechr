const models = require("../models/db_init");
const path = require("path");
const { v4: uuidv4 } = require('uuid')
const formidable = require('formidable');

const categoryModel = models["category"];

// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({ region: 'eu-central-1' });

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

class categoryController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = categoryModel;
        this.entity_id_name = "categoryModel_id";
        this.list_includes = [
            {
                model: categoryModel,
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

            var fileStream = fs.createReadStream(files.categoryImageUrl.path);
            fileStream.on('error', function (err) {
                console.log('File Error', err);
            });

            uploadParams.Body = fileStream;
            uploadParams.Key = path.basename(uuidv4() + "." + path.basename(files.categoryImageUrl.name).split('.')[1]);
            uploadParams.ACL = 'public-read';
            uploadParams.ContentType = files.categoryImageUrl.type;


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

    uploadIcone(files) {

        return new Promise((resolve, reject) => {
            // Create S3 service object
            const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
            const uploadParams = { Bucket: "digit-u-media-resources", Key: '', Body: '' };
            var fs = require('fs');

            var fileStream = fs.createReadStream(files.categoryIconeUrl.path);
            fileStream.on('error', function (err) {
                console.log('File Error', err);
            });

            uploadParams.Body = fileStream;
            uploadParams.Key = path.basename(uuidv4() + "." + path.basename(files.categoryIconeUrl.name).split('.')[1]);
            uploadParams.ACL = 'public-read';
            uploadParams.ContentType = files.categoryIconeUrl.type;


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

    async createCategory(req, res) {
        // let { categoryName, categoryImageUrl,categoryIconeUrl, language } = req.body;

        const form = formidable({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }

            if (!fields.categoryName || !files.categoryImageUrl || !files.categoryIconeUrl || !fields.language) {
                return res.status(400).send({
                    message: "Please Enter EntityData",
                });
            }

            // let language = JSON.stringify(fields.language)
            
            this.uploadImage(files).then((resultImage)=> {
                if (resultImage.message !== "upload done")
                    return res.status(400).json({
                        status: false,
                        message: "API.bad_request",
                        data: null
                    })
                    this.uploadIcone(files).then((resultIcone)=>{
                        if (resultIcone.message !== "upload done")
                            return res.status(400).json({
                                status: false,
                                message: "API.bad_request",
                                data: null
                            })

                            categoryModel.create({ categoryName: fields.categoryName, categoryImageUrl: resultImage.file_name, categoryIconeUrl:resultIcone.file_name ,language:fields.language })
                            .then((resultEntity) => {
                                return res.status(200).send({
                                    status: true,
                                    data: resultEntity,
                                    message: "API.CATEGORY.CREATED"
                                })
                            })
                            .catch((error) => {
                                return res.status(401).send({
                                    status: false,
                                    data: error,
                                    message: "API.CATEGORY.CREATED.FAILED"
                                })
                            })
                        
                    }).catch((error)=>{
                        return res.status(401).send({
                            status: false,
                            data: error,
                            message: "API.ICONE.UPLOAD.FAILED"
                        })
                    })

            }).catch((error)=>{
                return res.status(401).send({
                    status: false,
                    data: error,
                    message: "API.IMAGE.UPLOAD.FAILED"
                })

            })
        })
    }

}

module.exports = categoryController;