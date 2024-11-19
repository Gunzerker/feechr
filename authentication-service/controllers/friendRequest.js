const models = require("../models/db_init");
const friendRequestModel = models["friendRequest"];
const UserModel = models["users"];
const CategoryModel = models["category"];
const config = require("../config/config.json");
const axios = require("axios");

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");
const { counterFollowers, counterFollowing } = require("../functions/counter");
const firebase_notification = require("../functions/firebase_notification");
const banCheck = require("../middleware/banCheck")

class roleController extends ApiBaseController {
  constructor() {
    super();
    this.entity_model = friendRequestModel;
    this.entity_id_name = "friendRequest_id";
    this.list_includes = [
      {
        model: UserModel,
        as: "from_user",
        attributes: { exclude: ["password"] },
      },
      {
        model: UserModel,
        as: "to_user",
        attributes: { exclude: ["password"] },
      },
    ];
  }

  async addFriend(req, res) {
    try {
      console.log("TOKEN ", req.headers.authorization);
      const {
        payload: { obj },
      } = req;
      
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      if (obj.active !== "Y" ) {
        return res.status(400).send({
          status: false,
          message: "API.USER.BANNED",
          data: null,
        });
      }

      const { to_user_id } = req.body;
      if (!to_user_id) {
        return res.status(400).send({
          message: "API.ENTER.ENTITYDATA",
        });
      }

      if (to_user_id == obj.user_id) {
        return res.status(400).send({
          message: "API.ACTION.NOT.ALLOWED",
        });
      }

      const user = await UserModel.findOne({ where: { user_id: to_user_id } });
      if (!user) {
        return res.status(400).json({
          status: true,
          message: "USER.NOT.EXIST",
          data: null,
        });
      }
      const check = await friendRequestModel.findOne({
        where: {
          [Op.and]: {
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
          },
        },
      });
      const reverseCheck = await friendRequestModel.findOne({
        where: {
          [Op.and]: {
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
          },
        },
      });
      const date_following = new Date().toISOString();
      if (user.dataValues.visibility == "public") {
        console.log("here public _____________________");
        if (!check) {
          console.log(" public first contact _____________________");
          const sendRequest = await friendRequestModel.create({
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
            date_following: date_following,
            following_status: "following",
          });
          const receiveRequest = await friendRequestModel.create({
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
            date_following: date_following,
            following_status: "followed",
          });
          // after deprecation of count logic in the following crud , we only need the count where the profil is fetched

          const incrementMe = counterFollowers(to_user_id);
          const incrementHim = counterFollowing(obj.user_id);
          let promises = [
            sendRequest,
            receiveRequest,
            incrementMe,
            incrementHim,
          ];
          const result = await Promise.all(promises);
          // firebase_notification("friend request", "firend request", { id: obj.user_id, tag: "FRIEND-REQUEST" }, to_user_id);

          // notify messaging server
          let newObjUser_id = obj.user_id;
          let newTo_user_id = to_user_id;
          const friends = await axios.post(
            `https://feecher-messaging.digit-dev.com/api/messaging/update_channels_relation`,
            {
              from: newObjUser_id,
              to: newTo_user_id,
            },
            {
              headers: {
                authorization: req.headers.authorization,
              },
            }
          );

          // notify when follow user
          await axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "user",
              from_user: obj.user_id,
              to_user: to_user_id,
              tag: "PUBLIC_FOLLOW_REQUEST",
              payload: {},
              from_db: "pg",
            }
          );

          return res.status(201).send({
            status: true,
            data: {
              sender: result[0].dataValues,
              receiver: result[1].dataValues,
            },
            message: "API.SENT.RECEIVE.REQUEST",
          });
        } else {
          if (
            check.dataValues.following_status != "blocking" &&
            check.dataValues.following_status != "blocked"
          ) {
            console.log(" public already in contact _____________________");
            const sendRequestResult = await check.update({
              following_status: "following",
            });
            const incrementMe = counterFollowers(to_user_id);
            const incrementHim = counterFollowing(obj.user_id);
            let promises = [sendRequestResult, incrementMe, incrementHim];
            const result = await Promise.all(promises);
            //notifiy the reciving user
            // firebase_notification("friend request", "firend request", { id: obj.user_id, tag: "FRIEND-REQUEST" }, to_user_id);

            // notify messaging server
            let newObjUser_id = obj.user_id;
            let newTo_user_id = to_user_id;
            const friends = await axios.post(
              `https://feecher-messaging.digit-dev.com/api/messaging/update_channels_relation`,
              {
                from: newObjUser_id,
                to: newTo_user_id,
              },
              {
                headers: {
                  authorization: req.headers.authorization,
                },
              }
            );

            // notification when follow user
            await axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "user",
                from_user: obj.user_id,
                to_user: to_user_id,
                tag: "PUBLIC_FOLLOW_REQUEST",
                payload: {},
                from_db: "pg",
              }
            );

            return res.status(201).send({
              status: true,
              data: {
                sender: result[0].dataValues,
                receiver: reverseCheck.dataValues,
              },
              message: "API.SENT.RECEIVE.REQUEST",
            });
          } else {
            console.log("request may be canceled or user has been blocked");
            throw new Error("sentRequestNotFound");
          }
        }
      } else {
        console.log("private");
        // if visibility : private
        if (!check) {
          // first time relation : create
          const sendRequest = await friendRequestModel.create({
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
            date_following: date_following,
            following_status: "sentRequest",
          });
          const receiveRequest = await friendRequestModel.create({
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
            date_following: date_following,
            following_status: "requested",
          });
          let promises = [sendRequest, receiveRequest];
          const result = await Promise.all(promises);
          //notifiy the reciving user
          //firebase_notification("friend request", "firend request", { id: obj.user_id, tag: "FRIEND-REQUEST" }, to_user_id);

          // notification when follow user
          await axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "user",
              from_user: obj.user_id,
              to_user: to_user_id,
              tag: "PRIVATE_FOLLOW_REQUEST",
              payload: {},
              from_db: "pg",
            }
          );

          return res.status(201).send({
            status: true,
            data: {
              sender: result[0].dataValues,
              receiver: result[1].dataValues,
            },
            message: "API.SENT.RECEIVE.REQUEST",
          });
        } else {
          // relation already exist
          if (
            check.dataValues.following_status != "blocking" &&
            check.dataValues.following_status != "blocked"
          ) {
            const sendRequestResult = await check.update({
              following_status: "sentRequest",
            });
            let promises = [sendRequestResult];
            const result = await Promise.all(promises);

            //notifiy the reciving user
            //firebase_notification("friend request", "firend request", { id: obj.user_id, tag: "FRIEND-REQUEST" }, to_user_id);

            // notification when follow user
            await axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "user",
                from_user: obj.user_id,
                to_user: to_user_id,
                tag: "PRIVATE_FOLLOW_REQUEST",
                payload: {},
                from_db: "pg",
              }
            );
            return res.status(201).send({
              status: true,
              data: {
                sender: result[0].dataValues,
                receiver: reverseCheck.dataValues,
              },
              message: "API.SENT.RECEIVE.REQUEST",
            });
          } else {
            console.log("request may be canceled or user has been blocked");
            throw new Error("sentRequestNotFound");
          }
        }
      }
    } catch (error) {
      console.log("error addFriend :", error);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  async acceptFriendRequest(req, res) {
    try {
      const {
        payload: { obj },
      } = req;
      const { to_user_id } = req.body;
      if (!to_user_id) {
        return res.status(400).send({
          message: "API.ENTER.ENTITYDATA",
        });
      }

      const date_accept_following = new Date().toISOString();
      const check = await friendRequestModel.findOne({
        where: {
          [Op.and]: {
            following_status: { [Op.like]: "sentRequest" },
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
          },
        },
      });

      if (!check) {
        return res.status(400).send({
          status: false,
          message: "API.BAD.REQUEST",
          data: null,
        });
      }

      const acceptRequest = await check.update({
        date_accept_following: date_accept_following,
        following_status: "following",
      });
      const incrementMe = counterFollowers(obj.user_id);
      const incrementHim = counterFollowing(to_user_id);

      let promises = [acceptRequest, incrementMe, incrementHim];
      const result = await Promise.all(promises);
      // notify user
      // firebase_notification("friend request accepted", "friend request accepted", { id: obj.user_id, tag: "FRIEND-REQUEST-ACCEPTED" }, to_user_id);
      // notify messaging server
      const friends = await axios.post(
        `https://feecher-messaging.digit-dev.com/api/messaging/update_channels_relation`,
        {
          from: to_user_id,
          to: obj.user_id,
        },
        {
          headers: {
            authorization: req.headers.authorization,
          },
        }
      );

      // delete notification when accept follow
      await axios.post(
        `${config.notification_service_url}api/notifications/deleteNotification`,
        {
          origin: "user",
          from_user: to_user_id,
          to_user: obj.user_id,
          tag: "PRIVATE_FOLLOW_REQUEST",
          from_db: "pg",
        }
      );

      // notification when follow user
      await axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "user",
          from_user: obj.user_id,
          to_user: to_user_id,
          tag: "ACCEPT_FOLLOW",
          payload: {},
          from_db: "pg",
        }
      );

      return res.status(201).send({
        status: true,
        data: { accepting_request: result[0].dataValues },
        message: "API.REQUEST.ACCEPTED",
      });
    } catch (error) {
      console.log("error addFriend :", error);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  deleteFriendRequest(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body;
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    const date_unfollowing = new Date().toISOString();

    friendRequestModel
      .findOne({
        where: {
          [Op.and]: {
            following_status: {
              [Op.iLike]: "sentRequest",
            },
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      })
      .then(function (resultEntity) {
        if (!resultEntity) {
          return res.status(400).send({
            status: false,
            message: "API.BAD.REQUEST",
          });
        }
        const refuseRequest = resultEntity.update({ following_status: null });
        return res.status(201).send({
          status: true,
          data: null,
          message: "API.INVITATION.DELETED",
        });
      })
      .catch((err) => {
        return res.status(500).send({
          status: false,
          data: null,
          message: "API.FAILED.FETCH.INVITATION",
        });
      });
  }

  cancelFriendRequest(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body; // 69 --> 106
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    friendRequestModel
      .findOne({
        where: {
          [Op.and]: {
            following_status: {
              [Op.iLike]: "sentRequest",
            },
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      })
      .then(function (resultEntity) {
        if (!resultEntity) {
          return res.status(400).send({
            status: false,
            message: "API.BAD.REQUEST",
          });
        }
        const cancelRequest = resultEntity.update({ following_status: null });
        return res.status(201).send({
          status: true,
          data: null,
          message: "API.INVITATION.CANCELED",
        });
      })
      .catch((err) => {
        return res.status(500).send({
          status: false,
          data: null,
          message: "API.FAILED.FETCH.INVITATION",
        });
      });
  }

  unfollowFriend(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body;
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    friendRequestModel
      .findOne({
        where: {
          [Op.and]: {
            following_status: {
              [Op.iLike]: "following",
            },
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      })
      .then(function (resultEntity) {
        if (!resultEntity) {
          return res.status(400).send({
            status: false,
            message: "API.BAD.REQUEST",
          });
        }
        const deleteFollowing = resultEntity.update({ following_status: null });
        const incrementHim = counterFollowers(to_user_id);
        const incrementMe = counterFollowing(obj.user_id);

        let promises = [deleteFollowing, incrementMe, incrementHim];
        Promise.all(promises)
          .then((result) => {
            return res.status(201).send({
              status: true,
              data: null,
              message: "API.UNFOLLOW.USER",
            });
          })
          .catch((error) => {
            return res.status(500).send({
              status: false,
              data: null,
              message: "API.FAILED.UNFOLLOW.USER",
            });
          });
      })
      .catch((err) => {
        return res.status(500).send({
          status: false,
          data: null,
          message: "API.FAILED.FETCH.USER",
        });
      });
  }

  deleteFollower(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body;
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    friendRequestModel
      .findOne({
        where: {
          [Op.and]: {
            following_status: {
              [Op.iLike]: "following",
            },
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      })
      .then(function (resultEntity) {
        if (!resultEntity) {
          return res.status(400).send({
            status: false,
            message: "API.BAD.REQUEST",
          });
        }
        const deleteFollower = resultEntity.update({ following_status: null });

        const incrementMe = counterFollowers(obj.user_id);
        const incrementHim = counterFollowing(to_user_id);

        let promises = [deleteFollower, incrementMe, incrementHim];
        Promise.all(promises)
          .then((result) => {
            return res.status(200).send({
              status: true,
              data: null,
              message: "API.DELETE.FOLLOWER",
            });
          })
          .catch((error) => {
            return res.status(500).send({
              status: false,
              data: null,
              message: "API.FAILED.DELETE.FOLLOWER",
            });
          });
      })
      .catch((err) => {
        return res.status(500).send({
          status: false,
          data: null,
          message: "API.FAILED.FETCH.USER",
        });
      });
  }

  // i can find problemes here
  blockUser(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body;
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    if (to_user_id == obj.user_id) {
      return res.status(400).send({
        message: "API.ACTION.NOT.ALLOWED",
      });
    }

    const date_unfollowing = new Date().toISOString();

    friendRequestModel
      .findOne({
        where: {
          [Op.and]: {
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
          },
        },
      })
      .then(function (resultEntity) {
        if (resultEntity == null) {
          const blocking = friendRequestModel.create({
            date_unfollowing: date_unfollowing,
            from_user_id: obj.user_id,
            to_user_id: to_user_id,
            following_status: "blocking",
          });
          const blocked = friendRequestModel.create({
            date_unfollowing: date_unfollowing,
            from_user_id: to_user_id,
            to_user_id: obj.user_id,
            following_status: "blocked",
          });

          let promises = [blocking, blocked];
          Promise.all(promises)
            .then((result) => {
              const blockingResult = friendRequestModel.findOne({
                where: {
                  friendRequest_id: result[0].dataValues.friendRequest_id,
                },
                include: [
                  {
                    model: UserModel,
                    as: "to_user",
                    attributes: { exclude: ["password"] },
                    include: [
                      {
                        model: CategoryModel,
                        as: "category",
                      },
                    ],
                  },
                ],
              });

              const blockedResult = friendRequestModel.findOne({
                where: {
                  friendRequest_id: result[1].dataValues.friendRequest_id,
                },
                include: [
                  {
                    model: UserModel,
                    as: "to_user",
                    attributes: { exclude: ["password"] },
                    include: [
                      {
                        model: CategoryModel,
                        as: "category",
                      },
                    ],
                  },
                ],
              });

              let promisesWithAssociation = [blockingResult, blockedResult];

              Promise.all(promisesWithAssociation)
                .then((associationResult) => {
                  delete associationResult[0].dataValues.to_user_id;
                  delete associationResult[1].dataValues.to_user_id;
                  return res.status(201).send({
                    status: true,
                    data: {
                      blocking: associationResult[0].dataValues,
                      blocked: associationResult[1].dataValues,
                    },
                    message: "API.USER.BLOCKED",
                  });
                })
                .catch((error) => {
                  return res.status(401).send({
                    status: false,
                    data: null,
                    message: "API.ERROR.FETCH.BLOCK.REQUEST",
                  });
                });
            })
            .catch(() => {
              return res.status(500).send({
                status: false,
                data: null,
                message: "API.USER.BLOCK.FAILED",
              });
            })
            .catch((err) => {
              return res.status(500).send({
                status: false,
                data: null,
                message: "API.USER.BLOCK.FAILED",
              });
            });
        } else {
          console.log("result");
          // if i'm following this account i have to decrement my following and his followers status count
          if (resultEntity.dataValues.following_status == "following") {
            // if in the other direction  the other usuer is following you, then operation decrement following follower must be done

            friendRequestModel
              .findOne({
                where: {
                  [Op.and]: {
                    from_user_id: to_user_id,
                    to_user_id: obj.user_id,
                  },
                },
              })
              .then((resultFetch) => {
                console.log(
                  "resultFetch.dataValues.following_status :",
                  resultFetch.dataValues.following_status
                );
                if (resultFetch.dataValues.following_status == "following") {
                  const decrementMe = counterFollowers(obj.user_id);
                  const decrementHim = counterFollowing(to_user_id);
                }
              })
              .catch((error) => {
                console.log("error :", error);
                return res.status(400).send({
                  status: false,
                  data: null,
                  message: "API.ERROR.FETCH.USER",
                });
              });

            const blocking = resultEntity.update({
              following_status: "blocking",
            });
            const blocked = friendRequestModel.update(
              { following_status: "blocked" },
              {
                where: {
                  [Op.and]: {
                    from_user_id: to_user_id,
                    to_user_id: obj.user_id,
                  },
                },
                returning: true,
              }
            );

            const incrementHim = counterFollowers(to_user_id);
            const incrementMe = counterFollowing(obj.user_id);

            let promises = [blocking, blocked, incrementHim, incrementMe];
            Promise.all(promises)
              .then((result) => {
                const blockingResult = friendRequestModel.findOne({
                  where: {
                    friendRequest_id: result[0].dataValues.friendRequest_id,
                  },
                  include: [
                    {
                      model: UserModel,
                      as: "to_user",
                      attributes: { exclude: ["password"] },
                      include: [
                        {
                          model: CategoryModel,
                          as: "category",
                        },
                      ],
                    },
                  ],
                });

                const blockedResult = friendRequestModel.findOne({
                  where: {
                    friendRequest_id:
                      result[1][1][0].dataValues.friendRequest_id,
                  },
                  include: [
                    {
                      model: UserModel,
                      as: "to_user",
                      attributes: { exclude: ["password"] },
                      include: [
                        {
                          model: CategoryModel,
                          as: "category",
                        },
                      ],
                    },
                  ],
                });

                let promisesWithAssociation = [blockingResult, blockedResult];

                Promise.all(promisesWithAssociation)
                  .then((associationResult) => {
                    delete associationResult[0].dataValues.to_user_id;
                    delete associationResult[1].dataValues.to_user_id;
                    return res.status(201).send({
                      status: true,
                      data: {
                        blocking: associationResult[0].dataValues,
                        bloqued: associationResult[1].dataValues,
                      },
                      message: "API.USER.BLOCKED",
                    });
                  })
                  .catch((error) => {
                    return res.status(401).send({
                      status: false,
                      data: null,
                      message: "API.ERROR.FETCH.BLOCK.REQUEST",
                    });
                  });
              })
              .catch((error) => {
                return res.status(401).send({
                  status: false,
                  data: null,
                  message: "API.USER.BLOCK.FAILED",
                });
              });
          }

          const blocking = resultEntity.update({
            following_status: "blocking",
          });
          const blocked = friendRequestModel.update(
            { following_status: "blocked" },
            {
              where: {
                [Op.and]: {
                  from_user_id: to_user_id,
                  to_user_id: obj.user_id,
                },
              },
              returning: true,
            }
          );

          let promises = [blocking, blocked];
          Promise.all(promises)
            .then((result) => {
              const blockingResult = friendRequestModel.findOne({
                where: {
                  friendRequest_id: result[0].dataValues.friendRequest_id,
                },
                include: [
                  {
                    model: UserModel,
                    as: "to_user",
                    attributes: { exclude: ["password"] },
                    include: [
                      {
                        model: CategoryModel,
                        as: "category",
                      },
                    ],
                  },
                ],
              });

              const blockedResult = friendRequestModel.findOne({
                where: {
                  friendRequest_id: result[1][1][0].dataValues.friendRequest_id,
                },
                include: [
                  {
                    model: UserModel,
                    as: "to_user",
                    attributes: { exclude: ["password"] },
                    include: [
                      {
                        model: CategoryModel,
                        as: "category",
                      },
                    ],
                  },
                ],
              });

              let promisesWithAssociation = [blockingResult, blockedResult];

              Promise.all(promisesWithAssociation)
                .then((associationResult) => {
                  delete associationResult[0].dataValues.to_user_id;
                  delete associationResult[1].dataValues.to_user_id;
                  return res.status(201).send({
                    status: true,
                    data: {
                      blocking: associationResult[0].dataValues,
                      bloqued: associationResult[1].dataValues,
                    },
                    message: "API.USER.BLOCKED",
                  });
                })
                .catch((error) => {
                  return res.status(401).send({
                    status: false,
                    data: null,
                    message: "API.ERROR.FETCH.BLOCK.REQUEST",
                  });
                });
            })
            .catch((error) => {
              return res.status(401).send({
                status: false,
                data: null,
                message: "API.USER.BLOCK.FAILED",
              });
            });
        }
      })
      .catch((err) => {
        return res.status(400).send({
          status: false,
          data: null,
          message: "API.FETCH.ERROR",
        });
      });
  }

  unblockUser(req, res) {
    const {
      payload: { obj },
    } = req;

    const { to_user_id } = req.body;
    if (!to_user_id) {
      return res.status(400).send({
        message: "API.ENTER.ENTITYDATA",
      });
    }

    friendRequestModel
      .findAll({
        where: {
          [Op.and]: {
            following_status: { [Op.like]: "blocking" },
            from_user_id: obj.user_id,
          },
        },
      })
      .then((resultEntity) => {
        const unblockEmission = friendRequestModel.destroy({
          where: {
            [Op.and]: {
              following_status: { [Op.like]: "blocking" },
              from_user_id: obj.user_id,
              to_user_id: to_user_id,
            },
          },
          returning: true,
          plain: true,
        });
        const unblockReception = friendRequestModel.destroy({
          where: {
            [Op.and]: {
              following_status: { [Op.like]: "blocked" },
              from_user_id: to_user_id,
              to_user_id: obj.user_id,
            },
          },
          returning: true,
          plain: true,
        });

        let promises = [unblockEmission, unblockReception];

        Promise.all(promises)
          .then((result) => {
            return res.status(201).send({
              status: true,
              data: null,
              message: "API.USER.UNBLOCKED",
            });
          })
          .catch((error) => {
            return res.status(401).send({
              status: false,
              data: null,
              message: "API.ERROR.UNBLOCK.USER",
            });
          });
      })
      .catch((error) => {
        return res.status(401).send({
          status: false,
          data: error,
          message: "API.ERROR.FETCH.BLOCKED.USER",
        });
      });
  }

  async hideUser(req, res) {
    try {
      const {
        payload: { obj },
      } = req;

      const { destination, hideType } = req.body;
      if (!destination && !hideType) {
        return res.status(400).send({
          status: false,
          message: "API.ENTER.ENTITYDATA",
          data: null,
        });
      }

      if (destination == obj.user_id) {
        return res.status(400).send({
          message: "API.ACTION.NOT.ALLOWED",
        });
      }

      let date_hide = new Date(new Date().setDate(new Date().getDate() + 7));
      let newDate = new Date();

      // check relation between me and destination
      const check = await friendRequestModel.findOne({
        where: {
          [Op.and]: {
            from_user_id: obj.user_id,
            to_user_id: destination,
          },
        },
      });

      if (hideType !== "permanent" && hideType !== "week") {
        throw new Error("errorHideType :");
      }

      // if relation doesnt exist create one with the hide attribute
      if (!check) {
        const hiding = await friendRequestModel.create({
          from_user_id: obj.user_id,
          to_user_id: destination,
          hideType,
          hideDuration: hideType == "week" ? date_hide : null,
        });
        const hid = await friendRequestModel.create({
          from_user_id: destination,
          to_user_id: obj.user_id,
        });
        return res.status(200).send({
          status: true,
          message: "API.USER.HID",
          data: hiding,
        });
      }
      // if relation exists update the hide attribute
      else {
        const hiding = await friendRequestModel.update(
          { hideType, hideDuration: hideType == "week" ? date_hide : null },
          {
            where: { from_user_id: obj.user_id, to_user_id: destination },
            returning: true,
            plain: true,
          }
        );
        return res.status(200).send({
          status: true,
          message: "API.USER.HID",
          data: hiding[1],
        });
      }
    } catch (err) {
      console.log("error hideUser :", err);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  async unhideUser(req, res) {
    try {
      const {
        payload: { obj },
      } = req;

      const { destination } = req.body;
      if (!destination) {
        return res.status(400).send({
          status: false,
          message: "API.ENTER.ENTITYDATA",
          data: null,
        });
      }

      // check relation between me and destination
      const check = await friendRequestModel.findOne({
        where: {
          [Op.and]: {
            from_user_id: obj.user_id,
            to_user_id: destination,
            hideType: { [Op.or]: ["permanent", "week"] },
          },
        },
      });

      // if relation doesnt exist nothing to update
      if (check) {
        const unhiding = await friendRequestModel.update(
          { hideType: null, hideDuration: null },
          {
            where: { from_user_id: obj.user_id, to_user_id: destination },
            returning: true,
            plain: true,
          }
        );
        return res.status(200).send({
          status: true,
          message: "API.USER.UNHID",
          data: unhiding[1],
        });
      } // if relation exists update the hide attribute
      else {
        return res.status(401).send({
          status: false,
          data: null,
          message: "API.ERROR.FETCH.HIDDEN.USER",
        });
      }
    } catch (err) {
      console.log("error hideUser :", err);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  listBlocked(req, res) {
    const {
      payload: { obj },
    } = req;

    friendRequestModel
      .findAll({
        where: {
          [Op.and]: {
            following_status: { [Op.like]: "blocking" },
            from_user_id: obj.user_id,
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      })
      .then((resultEntity) => {
        if (resultEntity.length == 0) {
          return res.status(201).send({
            status: true,
            data: resultEntity,
            message: "API.USER.BLOCKED.FETCHED",
          });
        }
        delete resultEntity[0].dataValues.to_user_id;
        return res.status(201).send({
          status: true,
          data: resultEntity,
          message: "API.FETCH.BLOCKED.USERS",
        });
      })
      .catch((error) => {
        return res.status(401).send({
          status: false,
          data: error,
          message: "API.ERROR.FETCH.BLOCKED.USERS",
        });
      });
  }

  async listHid(req, res) {
    try {
      const {
        payload: { obj },
      } = req;
      // check relation between me and destination
      const check = await friendRequestModel.findAll({
        where: {
          [Op.and]: {
            from_user_id: obj.user_id,
            hideType: { [Op.or]: ["permanent", "week"] },
          },
        },
        include: [
          {
            model: UserModel,
            as: "to_user",
            attributes: { exclude: ["password"] },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      });

      console.log("check ========== ", check);
      return res.status(400).send({
        status: false,
        message: "check",
        data: check,
      });
    } catch (err) {
      console.log("error hideUser :", err);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  async fetchHiddenAndBlocked(req, res) {
    try {
      //
      let { myId } = req.body;

      console.log("----------------------", new Date());
      const check = await friendRequestModel.findAll({
        where: {
          [Op.or]: [
            {
              [Op.and]: {
                hideType: "week",
                hideDuration: { [Op.gte]: new Date().toISOString() },
                from_user_id: myId,
              },
            },
            {
              [Op.and]: {
                hideType: "permanent",
                from_user_id: myId,
              },
            },
            {
              [Op.and]: {
                following_status: "blocking",
                from_user_id: myId,
              },
            },
            {
              [Op.and]: {
                following_status: "blocked",
                from_user_id: myId,
              },
            },
          ],
        },
      });
      console.log("----------------------", check);
      return res.status(200).send({
        status: true,
        message: "API.FETCH.HIDDEN.AND.BLOCKED.USERS",
        data: check,
      });
    } catch (err) {
      console.log("error fetchHiddenAndBlocked :", err);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }

  find(req, res) {
    if (typeof this.checkConfiguration(req, res) !== "boolean") {
      return;
    }

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
      attributes: { exclude: ["password", "to_user_id"] },
    };

    if (Number(findOptions.limit) < 1) {
      findOptions.limit = null;
      findOptions.offset = 0;
    }

    findOptions.where = this.findOptionsWhere(req);

    friendRequestModel
      .findAll(findOptions)
      .then((resultQuery) => {
        res.status(200).send({
          status: true,
          data: resultQuery,
          message: "API.DATA.FETCHED",
        });
      })
      .catch((error) => {
        return res.status(400).json({
          status: false,
          message: "API.INTERNEL-SERVER-ERROR",
          data: error,
        });
      });
  }

  async getUserProfileBackOffice(req, res) {
    let { to_user_id } = req.body;
    // after deprecation of count logic in the following crud , we only need the count where the profil is fetched
    let countFollowers = await counterFollowers(to_user_id);
    let countFollowing = await counterFollowing(to_user_id);
    UserModel.findOne({
      where: { user_id: to_user_id },
      raw: true,
      include: [
        {
          model: CategoryModel,
          as: "category",
        },
      ],
    }).then((fetchMyAccount) => {
        fetchMyAccount.followers_count = countFollowers;
        fetchMyAccount.following_count = countFollowing;
        delete fetchMyAccount.password
        return res.status(200).send({
          status: true,
          message: "API.USER.FETCHED",
          data: fetchMyAccount,
        });
      }).catch((error) => {
        console.log("error :",error);
        return res.status(500).json({
          status: false,
          message: "API.INTERNEL-SERVER-ERROR",
          data: error,
        });
      });
  }

  fetchUserProfilService(req, res) {
    let { from_user_id, to_user_id } = req.body;

    return UserModel.findOne({
      where: { user_id: from_user_id },
      raw: true,
      include: [
        {
          model: CategoryModel,
          as: "category",
        },
      ],
    })
      .then((fetchMyAccount) => {
        UserModel.findOne({
          where: { user_id: to_user_id },
          raw: true,
          include: [
            {
              model: CategoryModel,
              as: "category",
            },
          ],
        })
          .then((fetchYourAccount) => {
            if (!fetchYourAccount) {
              return res.status(400).send({
                status: false,
                message: "USERS.NOT.EXIST",
              });
            }

            // console.log("from :", fetchMyAccount.user_id);
            // console.log("to :", fetchYourAccount.user_id);

            friendRequestModel
              .findOne({
                where: {
                  [Op.and]: {
                    from_user_id: fetchMyAccount.user_id,
                    to_user_id: fetchYourAccount.user_id,
                  },
                },
              })
              .then((resultEntity) => {
                friendRequestModel
                  .findOne({
                    where: {
                      [Op.and]: {
                        from_user_id: fetchYourAccount.user_id,
                        to_user_id: fetchMyAccount.user_id,
                      },
                    },
                  })
                  .then((reverseEntity) => {
                    return res.status(201).send({
                      status: true,
                      data: {
                        currentUser: fetchMyAccount,
                        visitedUser: fetchYourAccount,
                        relation: resultEntity,
                        reverse: reverseEntity,
                      },
                      message: "CURRENT.PROFILS.AND.RELATION",
                    });
                  })
                  .catch((error) => {
                    return res.status(401).send({
                      status: false,
                      data: null,
                      message: "ERROR.FETCH.REVERSE.RELATION",
                    });
                  });
              })
              .catch((error) => {
                return res.status(401).send({
                  status: false,
                  data: null,
                  message: "ERROR.FETCH.CURRENT.PROFILS.AND.RELATION",
                });
              });
          })
          .catch((error) => {
            return res.status(400).send({
              status: false,
              message: "USERS.NOT.EXIST",
            });
          });
      })
      .catch((error) => {
        res.status(500).json({
          status: false,
          message: "API.INTERNEL-SERVER-ERROR",
          data: error,
        });
      });
  }

  fetchUserProfil(req, res) {
    let {
      payload: { obj },
    } = req;
    let { to_user_id } = req.body;
    return UserModel.findOne({
      where: { user_id: obj.user_id },
      raw: true,
      include: [
        {
          model: CategoryModel,
          as: "category",
        },
      ],
    })
      .then((fetchMyAccount) => {
        UserModel.findOne({
          where: { user_id: to_user_id },
          raw: true,
          include: [
            {
              model: CategoryModel,
              as: "category",
            },
          ],
        })
          .then(async (fetchYourAccount) => {
            console.log("5555", fetchYourAccount);
            if (!fetchYourAccount) {
              return res.status(400).send({
                status: false,
                message: "USERS.NOT.EXIST",
              });
            }

            // after deprecation of count logic in the following crud , we only need the count where the profil is fetched
            const countFollowers = await counterFollowers(to_user_id);
            const countFollowing = await counterFollowing(to_user_id);

            friendRequestModel
              .findOne({
                where: {
                  [Op.and]: {
                    from_user_id: fetchMyAccount.user_id, // obj.user_id
                    to_user_id: fetchYourAccount.user_id, // to_user_id
                  },
                },
              })
              .then((resultEntity) => {
                friendRequestModel
                  .findOne({
                    where: {
                      [Op.and]: {
                        from_user_id: fetchYourAccount.user_id,
                        to_user_id: fetchMyAccount.user_id,
                      },
                    },
                  })
                  .then(async (reverseEntity) => {
                    // after deprecation of count logic in the following crud , we only need the count where the profil is fetched
                    fetchYourAccount.followers_count = countFollowers;
                    fetchYourAccount.following_count = countFollowing;
                    delete fetchYourAccount.password;
                    delete fetchMyAccount.password;
                // fetch if the user is subbed
                    const response = await axios.post(
                      `${config.notification_service_url}api/notifications/fetchSubStatus`,
                      { from_id: obj.user_id, to_user: to_user_id }
                    );
                    let is_subed = false
                    if (response.data.response.length != 0)
                      is_subed = true

                    return res.status(201).send({
                      status: true,
                      data: {
                        currentUser: fetchMyAccount,
                        visitedUser: fetchYourAccount,
                        relation: resultEntity,
                        reverse: reverseEntity,
                        is_subed
                      },
                      message: "CURRENT.PROFILS.AND.RELATION",
                    });
                  })
                  .catch((error) => {
                    return res.status(401).send({
                      status: false,
                      data: null,
                      message: "ERROR.FETCH.REVERSE.RELATION",
                    });
                  });
              })
              .catch((error) => {
                return res.status(401).send({
                  status: false,
                  data: null,
                  message: "ERROR.FETCH.CURRENT.PROFILS.AND.RELATION",
                });
              });
          })
          .catch((error) => {
            console.log("8888", error);
            return res.status(400).send({
              status: false,
              message: "USERS.NOT.EXIST",
            });
          });
      })
      .catch((error) => {
        res.status(500).json({
          status: false,
          message: "API.INTERNEL-SERVER-ERROR",
          data: error,
        });
      });
  }

  async fetchUserContacts(req, res) {
    try {
      // this function is made to fetch both following and followers of a user, to consume it paginated in the graphql events micro service
      const { user_id, searchName, limit, offset } = req.body;

      // fetch all contacts
      const myContacts = await friendRequestModel.findAll({
        where: {
          [Op.or]: [
            {
              from_user_id: user_id,
              following_status: "following",
            },
            {
              to_user_id: user_id,
              following_status: "following",
            },
          ],
        },
      });
      // contacts (my following and followers ) ids excluding my own id
      let obj = {};
      let mapped_array = [];
      for await (let contact of myContacts) {
        if (contact.from_user_id != user_id) {
          mapped_array.push(contact.from_user_id);
        }
        if (contact.to_user_id != user_id) {
          mapped_array.push(contact.to_user_id);
        }
      }

      console.log("mapped_array__________________", mapped_array);

      let contactsFiltred = mapped_array.filter(
        (contact) => contact !== user_id
      );

      console.log("contactsFiltred________", contactsFiltred);
      let users;
      // fetching those ids in the users table
      if (searchName) {
        console.log("here !!!!");
        users = await UserModel.findAll({
          limit,
          offset,
          where: {
            user_id: {
              [Op.in]: mapped_array,
            },
            fullName: { [Op.iLike]: `%${searchName}%` },
          },
          attributes: { exclude: ["password"] },
          include: [
            {
              model: CategoryModel,
              as: "category",
            },
          ],
        });
      } else {
        users = await UserModel.findAll({
          limit,
          offset,
          where: {
            user_id: {
              [Op.in]: mapped_array,
            },
          },
          attributes: { exclude: ["password"] },
          include: [
            {
              model: CategoryModel,
              as: "category",
            },
          ],
        });
      }
      console.log(
        "users______________!",
        users.map((user) => user.user_id)
      );
      return res.status(201).json({
        status: true,
        message: "Contact.list.fetched",
        data: users,
      });
    } catch (err) {
      console.log("err fetchUserContacts", err);
      return res.status(400).send({
        status: false,
        message: "API.BAD.REQUEST",
        data: null,
      });
    }
  }
}

module.exports = roleController;
