const Op = require("sequelize").Op;
const models = require("../models/db_init");

class ApiBaseController {
  constructor(req, res) {
    this.entity_model = null;
    this.entity_id_name = null;
    this.list_includes = [];
    this.list_where = {};
  }

  checkConfiguration(req, res) {
    if (!this.entity_model || !this.entity_id_name) {
      return res.status(500).send({
        status: false,
        message: "System.EntityConfigurationNotDetected",
      });
    } else {
      return true;
    }
  }

  get(req, res) {
    if (typeof this.checkConfiguration(req, res) !== "boolean") {
      return;
    }
    let entity_id = req.params.id;
    const where = {};
    where[this.entity_id_name] = entity_id;

    this.entity_model
      .findOne({
        where: where,
        include: this.list_includes,
      })
      .then(function (resultEntity) {
        if (!resultEntity) {
          return res.status(404).send({
            status: false,
            message: "Global.EntityNotFounded",
          });
        }
        return res.status(200).send({
          status: true,
          data: resultEntity,
        });
      })
      .catch((error) => { 
        res.status(500).json({
            status:false,
            message:"API.INTERNEL-SERVER-ERROR",
            data:error
        })
        });
  }

  preSaveValidation(objectToSave) {
    return new Promise((resolve, reject) => {
      resolve(objectToSave);
    });
  }

  create(req, res) {
    //verify if you put data
    if (!req.body || req.body == null) {
      return res.status(400).send({
        status: false,
        data:null,
        message: "Global.PleaseEnterEntityData",
        
      });
    }
    let _this = this;
    // objectToSave take the value of the request sanded
    const objectToSave = req.body;
    // send to preSave and wait the promise
    this.preSaveValidation(objectToSave)

      // if the process return the object after the modification
      .then((objectToSave) => {
        //if objectToSave is valid  update objectToSaveUpdated
        _this
          .processDataPreSave(objectToSave, req, res)
          .then((objectToSaveValidated) => {
            this.entity_model
              .create(objectToSaveValidated)
              // send the result created
              .then((entityCreated) => {
                if (typeof (entityCreated.password) != "undefined")
                  delete entityCreated.dataValues.password
                res.status(201).send({
                  status: true,
                  data: entityCreated,
                  message: "EntityCreatedWithSuccess",
                })
              }
              )
              .catch((error) => { 
                res.status(400).json({
                    status:false,
                    message:"API.BAD-REQUEST-ERROR",
                    data:error
                })
                });
            // probleme with the processDataPreSave
          })
          .catch((error) => { 
            res.status(400).json({
                status:false,
                message:"API.INTERNEL-SERVER-ERROR",
                data:error
            })
            });
      })
      .catch((error) => {
        return res.status(400).json({
          status:false,
          message:"API.INTERNEL-SERVER-ERROR",
          data:error
      })
      });
  }

  processDataPreSave(objectToSave, req, res) {
    let _this = this;
    return new Promise((resolve, reject) => {
      _this
        .validateDataPreSave(objectToSave, req, res)
        .then((objectValidated) => {
          resolve(objectToSave);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  initValidationPreSave() {
    return {
      is_valid: true,
      messages: [],
    };
  }

  validateDataPreSave(objectToSave, req, res) {
    return new Promise((resolve, reject) => {
      resolve(objectToSave);
    });
  }

  processValidationPreSave(objectToSave, validation, resolve, reject) {
    if (!validation.is_valid) {
      return reject({
        status: false,
        messages: validation.messages,
      });
    }

    resolve(objectToSave);
  }

  update(req, res) {
    let entity_id = req.params.id;
    const where = {};
    let _this = this;
    where[this.entity_id_name] = entity_id;

    //find the model with the id sanded in params
    this.entity_model
      .findOne({
        where: where,
          attributes: { exclude: ["password"] }
      })
      .then(function (resultEntity) {
        //if the model or the id not exist return false
        if (!resultEntity) {
          return res.status(404).send({
            status: false,
            message: "Global.EntityNotFounded",
          });
        }

        // objectToSave take the value of the request sanded
        const objectToSave = req.body;

        // send to preSave and wait the promise
        _this
          .processDataPreSave(objectToSave, req, res)
          // si le process retourn l objet après la modification
          .then((objectToSaveUpdated) => {
            //if objectToSave is valid  update objectToSaveUpdated
            resultEntity
              .update(objectToSaveUpdated)
              .then((entitySaved) => {
                // envoyer le resultat vers le after update
                _this.afterUpdate(entitySaved, req, res);
              })
              .catch((error) => {
                return res.status(500).json({
                  status:false,
                  message:"API.INTERNEL-SERVER-ERROR",
                  data:error
              })
              });

            // le process de presave lance une erreur
          })
          .catch((error) => {
            return res.status(500).json({
              status:false,
              message:"API.INTERNEL-SERVER-ERROR",
              data:error
          })
          });
      })
      // probleme avec le find one
      .catch((error) => {
        return res.status(500).json({
          status:false,
          message:"API.INTERNEL-SERVER-ERROR",
          data:error
      })
      });
  }

  afterUpdate(data, req, res) {
    res.status(201).send({
      status: 201,
      data: data,
      message: "Global.EntityUpdatedWithSuccess",
    });
  }

  delete(req, res) {
    if (typeof this.checkConfiguration(req, res) !== "boolean") {
      return;
    }

    let entity_id = req.params.id;
    const where = {};
    where[this.entity_id_name] = entity_id;

    this.entity_model
      .findOne({
        where: where,
      })
      .then(function (resultQuery) {
        if (!resultQuery) {
          return res.status(404).send({
            status: false,
            data:null,
            message: "Global.EntityNotFounded",
          });
        } else {
          resultQuery.active = 'D';
          resultQuery.save()
            .then(() =>
              res.status(204).send({
                status: true,
                message: "Global.EntityDeletedWithSuccess",
              })
            )
             .catch((error) => {
        return res.status(400).json({
          status:false,
          message:"API.BAD.REQUEST.ERROR",
          data:error
      })
      });
        }
      })
       .catch((error) => {
        return res.status(400).json({
          status:false,
          message:"API.BAD.REQUEST.ERROR",
          data:error
      })
      });
  }

  getModelFields() {
    if (!this.entity_model) {
      return [];
    }
    return Object.keys(this.entity_model.rawAttributes);
  }

  getModelWhereFields() {
    return this.getModelFields();
  }

  findOptionsWhere(req) {
    const where = {};
    if (this.getModelWhereFields()) {
      const fields = this.getModelWhereFields();
      fields.forEach((field_name) => {
        if (req.query[field_name]) {
          where[field_name] = req.query[field_name];
        }
      });

      if (!req.query.active && fields['active'] !== 'undefined') {
        where['active'] = ['Y'];
      }
    }

    return where;
  }

  find(req, res) {
    if (typeof this.checkConfiguration(req, res) !== "boolean") {
      return;
    }

    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const page =
      req.query.page && req.query.page > 0 ? Number(req.query.page) : 1;
    const query_includes = req.query.includes
      ? req.query.includes.split(",")
      : [];
    const extra_includes = [];

    if (query_includes.length) {
      query_includes.forEach((include_key) => {
        if (this.entity_model.associations[include_key]) {
          const association = this.entity_model.associations[include_key];
          extra_includes.push({
            model: association.target,
            as: include_key,
          });
        }
      });
    }

    const includes = this.list_includes.concat(extra_includes);
    const findOptions = {
      include: includes,
      where: this.list_where,
      attributes: { exclude: ["password"] },
      offset: (page - 1) * limit,
      limit: limit,
    };

    if (Number(findOptions.limit) < 1) {
      findOptions.limit = null;
      findOptions.offset = 0;
    }

    findOptions.where = this.findOptionsWhere(req);

    const findOptionsCount = JSON.parse(JSON.stringify(findOptions));

    delete findOptionsCount.offset;
    delete findOptionsCount.limit;
    delete findOptionsCount.include;

    this.entity_model.count(findOptionsCount).then((countTotal) => {
      this.entity_model
        .findAll(findOptions)
        .then((resultQuery) => {
          res.send({
            data: resultQuery,
            status: true,
            messages: [
              {
                code: "01",
                message: "entity.GetAllWithSuccess",
              },
            ],
            attrs: {
              limit: limit,
              page: page,
              total: countTotal,
              findOptions: findOptions,
            },
          });
        })
        .catch((error) => {
          return res.status(400).json({
            status:false,
            message:"API.INTERNEL-SERVER-ERROR",
            data:error
        })
        });
    });
  }
}

module.exports = ApiBaseController;
