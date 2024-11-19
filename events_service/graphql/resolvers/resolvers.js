const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const mongoose = require("mongoose");
const { ApolloError } = require("apollo-server-errors");
const config = require("../../config/config.json");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");
const Event = require("../../models/event");
const EventMember = require("../../models/eventMember");
const EventComments = require("../../models/eventComments");
const Users = require("../../models/Users")
const clubs = require("../../models/clubs")
const clubMembers = require("../../models/clubMembers")
const axios = require("axios");
const sharp = require("sharp");
const { streamToBuffer } = require("@jorgeferrero/stream-to-buffer");
const geoip = require('geoip-lite');
const createOrUpdateHashTag = require("../../functions/createHashTag")
const Notification = require("../../models/Notification");
const Posts = require("../../models/Posts");
const dynamicLinkInfo = require("../../functions/dynamicLink");
const banCheck = require("../../middleware/banCheck")

function compressImage(file) {
  return new Promise((resolve, reject) => {
    sharp(file)
      .resize(1080)
      .jpeg({ quality: 60, force: true, mozjpeg: true })
      .toBuffer()
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => { });
  });
}

function uploadMedia(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const { createReadStream, filename, mimetype, enconding } = await file;
      console.log(file);
      // Configure the file stream and obtain the upload parameters
      var fileStream = createReadStream();

      fileStream.on("error", function (err) {
        console.log("File Error", err);
      });
      if (mimetype.includes("image")) {
        const new_file = await streamToBuffer(createReadStream());
        //const fileBuffer = await streamToBuffer(fileStream);
        //console.log(fileBuffer);
        //const returned_file = await compressImage(new_file);
        uploadParams.Body = new_file;
        uploadParams.Key = uuidv4() + "." + mime.getExtension("image/jpeg");
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = "image/jpeg";
      } else {
        uploadParams.Body = fileStream;
        uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
        console.log(uploadParams.Key);
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = mimetype;
      }

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve({
        _id: mongoose.Types.ObjectId(),
        file_name: upload.Key,
        mimetype,
        url: upload.Location,
      });
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = {
  Query: {
    testQuery: async (parent, args, context, info) => {
      return console.log("test query");
    },
  },
  Mutation: {
    createEvent: async (parent, args, context, info) => {
      try {
        
        // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
        banCheck(context.decoded.obj.active)

        const resolved_uploads = await Promise.all([
          uploadMedia(args.eventProfileImage),
          uploadMedia(args.eventCoverImage),
        ]);
        /*create event*/
        let locations = [];
        let obj = {};
        let members = [];
        let membersObj = {};


        // if created from club not from talent
        let owner;
        if (args.clubId) {
          owner = null;
        } else {
          owner = `${context.decoded.obj._id}`;
          /*check if user is talent */
          if (context.decoded.obj.isTalent != true) {
            throw new ApolloError("action not allowed", 400, {
              code: 400,
              message: "action not allowed",
            });
          }
        }

        // prepare location object to insert while event creation
        if (args.tickets) {
          if (args.tickets.available) {
            available = args.tickets.available;
          } else {
            available = false;
          }
          if (args.tickets.eventLocation) {
            for (let i = 0; i < args.tickets.eventLocation.length; i++) {
              obj = {
                site: args.tickets.eventLocation[i].site,
                latitude: args.tickets.eventLocation[i].latitude,
                longitude: args.tickets.eventLocation[i].longitude,
              };
              locations.push(obj);
            }
          }
        }

        // prepare members object to insert while event creation
        if (args.members) {
          for (let i = 0; i < args.members.length; i++) {
            membersObj = {
              user_id: args.members[i].user_id,
              invitationStatus: args.members[i].invitationStatus,
            };
            members.push(membersObj);
          }
        }
        // fetch category data
        const fetched_category = await axios.get(
          `${config.auth_service_url}api/category/find?category_id=${args.category}`
        );
        let fetchedCategory = fetched_category.data.data.map(
          (category) => category
        )[0];

        // if (args.eventDuration && args.endOfEvent ){
        //   args.eventDuration = args.eventDuration.toISOString();
        //   args.endOfEvent = args.endOfEvent.toISOString();
        // }

        // create event
        let event = await Event.create({
          owner: owner,
          eventProfileImage: `${resolved_uploads[0].file_name}`,
          eventCoverImage: `${resolved_uploads[1].file_name}`,
          category: fetchedCategory,
          eventName: args.eventName,
          eventType: args.eventType,
          eventDescription: args.eventDescription,
          eventSite: args.eventSite,
          eventCoordinates: {
            loc: {
              type: "Point",
              coordinates: args.eventCoordinates,
            },
          },
          eventCountry: args.eventCountry,
          eventDate: `${new Date(args.eventDate).toISOString()}`,
          eventDuration: args.eventDuration,
          endOfEvent: `${new Date(args.endOfEvent).toISOString()}`,
          tickets: {
            available: available,
            locations: locations,
          },
          members: members,
          clubId: args.clubId,
        });

        const contactList = await axios.post(
          `${config.auth_service_url}api/friendRequest/fetchUserContacts`,
          {
            limit: args.limit,
            offset: args.offset,
            user_id: context.decoded.obj.user_id,
          }
        );

        for (let i = 0; i < contactList.data.data.length; i++) {
          // notify when follow user
          await axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "event",
              from_user: context.decoded.obj.user_id,
              to_user: contactList.data.data[i].user_id,
              tag: "EVENT_CREATION",
              payload: { event: mongoose.Types.ObjectId(event._id) },
              from_db: "pg",
            }
          );
        }

        if (args.members) {
          for (let i = 0; i < args.members.length; i++) {
            await EventMember.create({
              event_id: event._id,
              user_id: args.members[i].user_id,
              invitationStatus: args.members[i].invitationStatus,
            });

            // notify when follow user
            await axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "event",
                from_user: mongoose.Types.ObjectId(context.decoded.obj._id),
                to_user: mongoose.Types.ObjectId(members[i].user_id),
                tag: "INVITATION_EVENT",
                payload: { event: mongoose.Types.ObjectId(event._id) },
              }
            );
          }
        }
        event.belongStatus = true;
        await Event.populate(event, "members.user_id");
        await Event.populate(event, "owner");
        await Event.populate(event, "clubId");
        return event;
      } catch (err) {
        console.log("createEvent err", err);
        return reject(err);
      }
    },

    fetchUsersToInvite: async (parent, args, context) => {
      try {
        // fetch the user friends
        let users;
        let user_invited;
        let other_users;
        const contactList = await axios.post(
          `${config.auth_service_url}api/friendRequest/fetchUserContacts`,
          {
            // limit: args.limit,
            // offset: args.offset,
            user_id: context.decoded.obj.user_id,
          }
        );

        if (args.eventId) {
          // invite friends for a specified event ( user for update invited list )
          // check if users are already invited
          user_invited = await EventMember.find({
            event_id: args.eventId,
            $or: [
              { invitationStatus: "pending" },
              { invitationStatus: "going" },
              { invitationStatus: "notGoing" },
            ],
          });

          let invitedArray = [];
          for await (let invited of user_invited) {
            invitedArray.push(mongoose.Types.ObjectId(invited.user_id));
          }

          // fetch event
          const event = await Event.findOne({
            _id: args.eventId,
          });
          // filter event owner from being invited to his event
          if (event) {
            if (event.owner) {
              invitedArray.push(mongoose.Types.ObjectId(event.owner));
            }
          }

          // console.log("eventsMember : _id", user_invited.map(user => user.user_id));
          // console.log("users : user_id", contactList.data.data.map(contact => contact.user_id));

          if (args.searchTag) {
            users = await Users.find({
              fullName: { $regex: args.searchTag, $options: "i" },
              $and: [{ _id: { $nin: invitedArray } }],
            });
          } else {
            // fetch users to invite for a new event creation, all those users are never been invited before
            users = await Users.find({
              user_id: {
                $in: contactList.data.data.map((contact) => contact.user_id),
              },
              $and: [{ _id: { $nin: invitedArray } }],
            })
              .limit(args.limit)
              .skip(args.offset);
          }
        } else {
          if (args.searchTag) {
            users = await Users.find({
              fullName: { $regex: args.searchTag, $options: "i" },
            });
          } else {
            // fetch users to invite for a new event creation, all those users are never invited before
            users = await Users.find({
              user_id: {
                $in: contactList.data.data.map((contact) => contact.user_id),
              },
            })
              .limit(args.limit)
              .skip(args.offset);
          }
        }

        return users;
      } catch (err) {
        console.log("fetchUsersToInvite err", err);
        return reject(err);
      }
    },

    fetchMyEvents: async (parent, args, context) => {
      try {
        /*get my events */
        let myEvents = await Event.find({
          owner: context.decoded.obj._id,
        })
          .limit(args.limit)
          .skip(args.offset);
        myEvents.map((event) => (event.belongStatus = true));
        await Event.populate(myEvents, "members.user_id");
        await Event.populate(myEvents, "owner");
        await Event.populate(myEvents, "clubId");
        return myEvents;
      } catch (err) {
        console.log("fetchMyEvents err", err);
        return reject(err);
      }
    },

    fetchEvents: async (parent, args, context, info) => {
      try {
        let geo;
        if (`${context.decoded.ip}` == "::1") {
          context.decoded.ip = "108.51.168.229";
          geo = geoip.lookup(`${context.decoded.ip}`);
          console.log("geo", geo);
        } else {
          geo = geoip.lookup(`${context.decoded.ip}`);
        }

        // // fetch user category
        // const fetched_category = await axios.get(
        //   `${config.auth_service_url}api/category/find?category_id=${args.category}`
        // );
        // args.category = fetched_category.data.data.map(
        //   (category) => category.category_id);

        let today = new Date();
        console.log("today", today.toISOString());

        // check if belong to event
        let checkBelongToEvent = await Event.find({
          $or: [
            { owner: mongoose.Types.ObjectId(context.decoded.obj._id) },
            {
              members: {
                $elemMatch: {
                  $and: [
                    {
                      user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
                    },
                    { invitationStatus: "going" },
                  ],
                },
              },
            },
          ],
        });

        // belong status
        let belongArray = [];
        belongArray = checkBelongToEvent.map((event) => event._id);
        let arrayIdToString = belongArray.toString().split(",");

        /*get my events */
        let events;
        if (args.eventTag == "upcoming") {
          console.log("upcoming");

          // in this case front cannot access mongo _id, he is using the screen fetched in micro-service auth with postgresql databse,
          //  so i have to get the user_id from postgres then search for the mongo _id so he can fetch the events developed in micro-service events with mongo DB
          if (args.owner) {
            let userMongoId = await Users.findOne({
              user_id: Number(args.owner),
            });
            args.owner = userMongoId._id;
          }

          if (args.category) {
            if (args.owner) {
              events = await Event.find({
                endOfEvent: { $gte: today },
                owner: args.owner,
                "category.category_id": args.category,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else if (args.clubId) {
              events = await Event.find({
                endOfEvent: { $gte: today },
                clubId: args.clubId,
                "category.category_id": args.category,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else {
              events = await Event.find({
                endOfEvent: { $gte: today },
                "category.category_id": args.category,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            }
          } else {
            if (args.owner) {
              events = await Event.find({
                endOfEvent: { $gte: today },
                owner: args.owner,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else if (args.clubId) {
              events = await Event.find({
                endOfEvent: { $gte: today },
                clubId: args.clubId,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else {
              events = await Event.find({ endOfEvent: { $gte: today } })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            }
          }

          // update belongStatus && update members count && update comments count
          for await (let myEvent of events) {
            let newString = myEvent._id.toString();
            if (arrayIdToString.includes(newString)) {
              myEvent.belongStatus = true;
            } else {
              myEvent.belongStatus = false;
            }

            // update members count
            let membersCount = await EventMember.find({
              event_id: myEvent._id,
              invitationStatus: "going",
            });
            myEvent.members_total_count = membersCount.length;

            // update comments count
            let commentsCount = await EventComments.find({
              event_id: myEvent._id,
            });
            myEvent.comment_total_count = commentsCount.length;
          }
        } else if (args.eventTag == "forYou") {
          console.log("forYou");

          if (args.category) {
            events = await Event.find({
              eventCountry: geo.country,
              endOfEvent: { $gte: today },
              "category.category_id": args.category,
            })
              .limit(args.limit)
              .skip(args.offset);
          } else {
            events = await Event.find({
              eventCountry: geo.country,
              endOfEvent: { $gte: today },
            })
              .limit(args.limit)
              .skip(args.offset);
          }

          // update belongStatus && update members count && update comments count
          // for (i = 0; i < events.length; i++) {
          for await (let myEvent of events) {
            let newString = myEvent._id.toString();
            if (arrayIdToString.includes(newString)) {
              myEvent.belongStatus = true;
            } else {
              myEvent.belongStatus = false;
            }
            // update members count
            let membersCount = await EventMember.find({
              event_id: myEvent._id,
              invitationStatus: "going",
            });
            myEvent.members_total_count = membersCount.length;

            // update comments count
            let commentsCount = await EventComments.find({
              event_id: myEvent._id,
            });
            myEvent.comment_total_count = commentsCount.length;
          }
        } else if (
          args.eventTag == "nearby" &&
          args.longitude &&
          args.latitude
        ) {
          console.log("nearby");
          var date = new Date();
          if (args.category) {
            if (args.searchTag) {
              events = await Event.aggregate([
                {
                  $geoNear: {
                    near: {
                      type: "Point",
                      coordinates: [args.longitude, args.latitude],
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 2000,
                  },
                },
                {
                  $match: {
                    endOfEvent: { $gte: today },
                    eventType: args.searchTag,
                    "category.category_id": args.category,
                  },
                },
              ]);
            } else {
              events = await Event.aggregate([
                {
                  $geoNear: {
                    near: {
                      type: "Point",
                      coordinates: [args.longitude, args.latitude],
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 2000,
                  },
                },
                {
                  $match: {
                    endOfEvent: { $gte: today },
                    "category.category_id": args.category,
                  },
                },
              ]);
            }
          } else {
            if (args.searchTag) {
              events = await Event.aggregate([
                {
                  $geoNear: {
                    near: {
                      type: "Point",
                      coordinates: [args.longitude, args.latitude],
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 2000,
                  },
                },
                {
                  $match: {
                    endOfEvent: { $gte: today },
                    eventType: args.searchTag,
                  },
                },
              ]);
            } else {
              events = await Event.aggregate([
                {
                  $geoNear: {
                    near: {
                      type: "Point",
                      coordinates: [args.longitude, args.latitude],
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 2000,
                  },
                },
                {
                  $match: {
                    endOfEvent: { $gte: today },
                  },
                },
              ]);
            }
          }

          // update belongStatus && update members count && update comments count
          // for (i = 0; i < events.length; i++) {
          for await (let myEvent of events) {
            let newString = myEvent._id.toString();
            if (arrayIdToString.includes(newString)) {
              myEvent.belongStatus = true;
            } else {
              myEvent.belongStatus = false;
            }
            // update members count
            let membersCount = await EventMember.find({
              event_id: myEvent._id,
              invitationStatus: "going",
            });
            myEvent.members_total_count = membersCount.length;

            // update comments count
            let commentsCount = await EventComments.find({
              event_id: myEvent._id,
            });
            myEvent.comment_total_count = commentsCount.length;
          }
          console.log(
            "events========================================================================",
            events
          );
        } else if (args.eventTag == "discover") {
          if (args.category) {
            if (args.searchTag) {
              events = await Event.find({
                eventCountry: args.searchTag,
                endOfEvent: { $gte: today },
                "category.category_id": args.category,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else {
              events = await Event.find({
                endOfEvent: { $gte: today },
                "category.category_id": args.category,
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            }
          } else {
            if (args.searchTag) {
              events = await Event.find({
                eventCountry: args.searchTag,
                endOfEvent: { $gte: today },
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            } else {
              events = await Event.find({
                endOfEvent: { $gte: today },
              })
                .sort({ eventDate: -1 })
                .limit(args.limit)
                .skip(args.offset);
            }
          }

          // update belongStatus && update members count && update comments count
          for await (let myEvent of events) {
            let newString = myEvent._id.toString();
            if (arrayIdToString.includes(newString)) {
              myEvent.belongStatus = true;
            } else {
              myEvent.belongStatus = false;
            }
            // update members count
            let membersCount = await EventMember.find({
              event_id: events._id,
              invitationStatus: "going",
            });
            events.members_total_count = membersCount.length;

            // update comments count
            let commentsCount = await EventComments.find({
              event_id: events._id,
            });
            events.comment_total_count = commentsCount.length;
          }
        } else if (args.eventTag == "attending") {
          attendingEvents = await EventMember.find({
            // user_id:`${context.decoded.obj._id}`
            user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
            invitationStatus: "going",
          });

          if (args.category) {
            events = await Event.find({
              _id: {
                $in: attendingEvents.map((event) =>
                  mongoose.Types.ObjectId(event.event_id)
                ),
              },
              endOfEvent: { $gte: today },
              "category.category_id": args.category,
            })
              .limit(args.limit)
              .skip(args.offset);
          } else {
            events = await Event.find({
              _id: {
                $in: attendingEvents.map((event) =>
                  mongoose.Types.ObjectId(event.event_id)
                ),
              },
              endOfEvent: { $gte: today },
            })
              .limit(args.limit)
              .skip(args.offset);
          }

          // update belongStatus && update members count && update comments count
          for await (let myEvent of events) {
            let newString = myEvent._id.toString();
            if (arrayIdToString.includes(newString)) {
              myEvent.belongStatus = true;
            } else {
              myEvent.belongStatus = false;
            }
            // update members count
            let membersCount = await EventMember.find({
              event_id: myEvent._id,
              invitationStatus: "going",
            });
            myEvent.members_total_count = membersCount.length;

            // update comments count
            let commentsCount = await EventComments.find({
              event_id: myEvent._id,
            });
            myEvent.comment_total_count = commentsCount.length;
          }
        }

        await Event.populate(events, "members.user_id");
        await Event.populate(events, "owner");
        await Event.populate(events, "clubId");
        return events;
      } catch (err) {
        console.log("fetchEvents err", err);
        return reject(err);
      }
    },

    fetchEventById: async (parent, args, context) => {
      try {
        /*get event */
        let event = await Event.find({
          _id: args.eventId,
        });

        // check if belong to event
        let checkBelongToEvent = await Event.find({
          $or: [
            { owner: mongoose.Types.ObjectId(context.decoded.obj._id) },
            {
              members: {
                $elemMatch: {
                  $and: [
                    {
                      user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
                    },
                    { invitationStatus: "going" },
                  ],
                },
              },
            },
          ],
        });

        const countRefeechredEvent = await Posts.find({
          type: "event",
          eventId: mongoose.Types.ObjectId(args.eventId),
        });

        for await (let myEvent of event) {
          let belongArray = checkBelongToEvent.map((event) => `${event._id}`);
          if (belongArray.includes(`${event[0]._id}`)) {
            event[0].belongStatus = true;
          } else {
            event[0].belongStatus = false


          }

          // update members count
          let membersCount = await EventMember.find({
            event_id: mongoose.Types.ObjectId(args.eventId),
            invitationStatus: "going",
          });
          event[0].members_total_count = membersCount.length;

          // update comments count
          let commentsCount = await EventComments.find({
            event_id: mongoose.Types.ObjectId(args.eventId),
          });
          event[0].comment_total_count = commentsCount.length;
          event[0].refeechr_total_count = countRefeechredEvent.length;
        }

        await Event.populate(event, "members.user_id");
        await Event.populate(event, "owner");
        await Event.populate(event, "clubId");
        return event[0];
      } catch (err) {
        return reject(err);
      }
    },

    deleteEvent: async (parent, args, context, info) => {
      try {
        // check event ownership
        const checkOwnership = await Event.findOne({
          _id: args.eventId,
          owner: mongoose.Types.ObjectId(context.decoded.obj._id),
        });
        const deletedEvent = checkOwnership;

        let membersToNotifiy = await EventMember.find({
          event_id: args.eventId,
        });

        const checkNotifs = await Notification.deleteMany({
          "payload.event": mongoose.Types.ObjectId(args.eventId),
        });

        for (let i = 0; i < membersToNotifiy.length; i++) {
          // notify users that event has been canceled
          await axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "event",
              from_user: context.decoded.obj._id,
              to_user: membersToNotifiy[i].user_id,
              tag: "CANCELED_EVENT",
              payload: {
                event: deletedEvent._id,
                eventName: deletedEvent.eventName,
              },
            }
          );
        }

        if (checkOwnership) {
          await Event.deleteOne({ _id: args.eventId });
          await EventMember.deleteMany({ event_id: args.eventId });
          return "event deleted";
        } else {
          throw new ApolloError("Forbidden", 403, {
            code: 403,
            message: "Forbidden",
          });
        }
      } catch (err) {
        console.log("deleteEvent err", err);
        return reject(err);
      }
    },

    updateMyEvent: async (parent, args, context) => {
      try {
        // get the event id
        const event_id = args.eventId;
        delete args.eventId;
        // check event ownership
        const checkOwnership = await Event.findOne({
          _id: event_id,
        }).populate("clubId");

        if (args.category) {
          // fetch user category
          const fetched_category = await axios.get(
            `${config.auth_service_url}api/category/find?category_id=${args.category}`
          );
          args.category = fetched_category.data.data.map(
            (category) => category
          )[0];
        }

        let membersObj;
        let updated_members;
        // update members list
        if (checkOwnership) {
          console.log("here");
          // if owner of event
          if (checkOwnership.owner == `${context.decoded.obj._id}`) {
            console.log("is owner of event");
            // if (args.members) {
            //   updated_members = checkOwnership.members;
            //   for (let i = 0; i < args.members.length; i++) {
            //     membersObj = {
            //       user_id: args.members[i].user_id,
            //       invitationStatus: "pending",
            //     };
            //     updated_members.push(membersObj);
            //     // notify when follow user
            //     await axios.post(
            //       `${config.notification_service_url}api/notifications/sendToUser`,
            //       {
            //         origin: "event",
            //         from_user: context.decoded.obj._id,
            //         to_user: args.members[i].user_id,
            //         tag: "INVITATION_EVENT",
            //         payload: { event: mongoose.Types.ObjectId(event_id) },
            //       }
            //     );

            //     // update eventMember list
            //     await EventMember.findOneAndUpdate(
            //       {
            //         event_id: mongoose.Types.ObjectId(event_id),
            //         user_id: `${args.members[i].user_id}`,
            //       },
            //       {
            //         invitationStatus: "pending",
            //       },
            //       { upsert: true, new: true }
            //     );
            //   }
            //   args.members = updated_members;
            // } else {
            //   args.members = checkOwnership.members;
            // }
          } else if (checkOwnership.clubId) {


            const isAdmin = await clubMembers.findOne({
              clubId: mongoose.Types.ObjectId(checkOwnership.clubId._id),
              user: mongoose.Types.ObjectId(context.decoded.obj._id),
              $or: [{ status: "owner" }, { status: "admin" }],
            });

            if (isAdmin) {
              // if (args.members) {
              //   updated_members = checkOwnership.members;

              //   for (let i = 0; i < args.members.length; i++) {
              //     membersObj = {
              //       user_id: args.members[i].user_id,
              //       invitationStatus: "pending",
              //     };
              //     updated_members.push(membersObj);
              //     // notify when follow user
              //     await axios.post(
              //       `${config.notification_service_url}api/notifications/sendToUser`,
              //       {
              //         origin: "event",
              //         from_user: context.decoded.obj._id,
              //         to_user: args.members[i].user_id,
              //         tag: "INVITATION_EVENT",
              //         payload: { event: mongoose.Types.ObjectId(event_id) },
              //       }
              //     );
              //     // update eventMember list
              //     await EventMember.findOneAndUpdate(
              //       {
              //         event_id: mongoose.Types.ObjectId(event_id),
              //         user_id: `${args.members[i].user_id}`,
              //       },
              //       {
              //         invitationStatus: "pending",
              //       },
              //       { upsert: true, new: true }
              //     );
              //   }
              //   args.members = updated_members;
              // } else {
              //   args.members = checkOwnership.members;
              // }
            }
          }
        } else {
          console.log("ownership not granted");
          throw new ApolloError("action not allowed", 400, {
            code: 400,
            message: "action not allowed",
          });
        }

        // update eventCoordinates
        if (args.eventCoordinates) {
          let eventCoordinates;
          eventCoordinates = {
            loc: {
              type: "Point",
              coordinates: args.eventCoordinates,
            },
          };
          args.eventCoordinates = eventCoordinates;
        }
        // ticket location work
        if (args.tickets) {
          let locations = [];
          for (let i = 0; i < args.tickets.eventLocation.length; i++) {
            obj = {
              site: args.tickets.eventLocation[i].site,
              latitude: args.tickets.eventLocation[i].latitude,
              longitude: args.tickets.eventLocation[i].longitude,
            };
            locations.push(obj);
          }
          args.tickets = {
            available: args.tickets.available,
            locations: locations,
          };
        }

        if (checkOwnership) {
          console.log("here !!!");
          let eventUpdate = await Event.findOneAndUpdate(
            {
              _id: event_id,
            },
            { $set: args },
            { new: true }
          );
          await Event.populate(eventUpdate, "members.user_id");
          await Event.populate(eventUpdate, "owner");
          await Event.populate(eventUpdate, "clubId");
          return eventUpdate;
        } else {
          throw new ApolloError("ownership privilage required", 400, {
            code: 400,
            message: "ownership privilage required",
          });
        }
      } catch (err) {
        console.log("updateMyEvent err", err);
        return reject(err);
      }
    },

    inviteMembers: async (parent, args, context) => {
      try {
        // get the event id
        const event_id = args.eventId;
        delete args.eventId;
        // check event ownership
        const eventFetched = await Event.findOne({
          _id: event_id,
        })

        if (eventFetched) {

          let membersObj;
          let updated_members;
          // update members list
          if (args.members) {
            updated_members = eventFetched.members;
            for (let i = 0; i < args.members.length; i++) {
              membersObj = {
                user_id: args.members[i].user_id,
                invitationStatus: "pending",
              };
              updated_members.push(membersObj);
              // notify when follow user
              await axios.post(
                `${config.notification_service_url}api/notifications/sendToUser`,
                {
                  origin: "event",
                  from_user: context.decoded.obj._id,
                  to_user: args.members[i].user_id,
                  tag: "INVITATION_EVENT",
                  payload: { event: mongoose.Types.ObjectId(event_id) },
                }
              );

              // update eventMember list
              await EventMember.findOneAndUpdate(
                {
                  event_id: mongoose.Types.ObjectId(event_id),
                  user_id: `${args.members[i].user_id}`,
                },
                {
                  invitationStatus: "pending",
                },
                { upsert: true, new: true }
              );
            }
            args.members = updated_members;
          } else {
            args.members = eventFetched.members;
          }
        } else {
          console.log("invite members to event bad request");
          throw new ApolloError("invite members to event bad request", 400, {
            code: 400,
            message: "invite members to event bad request",
          });
        }

        let eventUpdate = await Event.findOneAndUpdate(
          {
            _id: event_id,
          },
          { $set: args },
          { new: true }
        );
        await Event.populate(eventUpdate, "members.user_id");
        await Event.populate(eventUpdate, "owner");
        await Event.populate(eventUpdate, "clubId");
        return eventUpdate;

      } catch (err) {
        console.log("updateMembers err", err);
        return reject(err);
      }
    },

    updateEventPhoto: async (parent, args, context, info) => {
      try {
        // check event ownership
        const event = await Event.findOne({
          _id: args.eventId,
          owner: context.decoded.obj._id,
        });
        if (event) {
          if (args.eventProfileImage) {
            const resolved_uploads = await Promise.all([
              uploadMedia(args.eventProfileImage),
            ]);
            args.eventProfileImage = resolved_uploads[0].file_name;
          }

          if (args.eventCoverImage) {
            const resolved_uploads = await Promise.all([
              uploadMedia(args.eventCoverImage),
            ]);
            args.eventCoverImage = resolved_uploads[0].file_name;
          }
          let updatedEvent = await Event.findOneAndUpdate(
            {
              _id: args.eventId,
            },
            { $set: args },
            { new: true }
          );
          return updatedEvent;
        } else {
          throw new ApolloError("Forbidden", 403, {
            code: 403,
            message: "Forbidden",
          });
        }
      } catch (err) {
        console.log("updateEventPhoto err", err);
        return reject(err);
      }
    },

    updateUserEventAction: async (parent, args, context, info) => {
      try {
        // check if user already invited to event
        let member;
        let listMember;
        const checkIfInvitedToEvent = await Event.findOne({
          _id: args.eventId,
          "members.user_id": mongoose.Types.ObjectId(context.decoded.obj._id),
        }).populate("clubId");

        // if (args.invitationStatus == "going") {
        //   // notify when follow user
        //   await axios.post(
        //     `${config.notification_service_url}api/notifications/sendToUser`,
        //     {
        //       origin: "event",
        //       from_user: context.decoded.obj._id,
        //       to_user: checkIfInvitedToEvent.owner,
        //       tag: "INVITATION_EVENT",
        //       payload: { event: mongoose.Types.ObjectId(args.eventId) },
        //     }
        //   );
        // }

        if (checkIfInvitedToEvent) {
          // update user going or notGoing to event
          listMember = await Event.findOneAndUpdate(
            {
              _id: args.eventId,
              "members.user_id": mongoose.Types.ObjectId(
                context.decoded.obj._id
              ),
            },
            {
              $set: {
                "members.$.invitationStatus": args.invitationStatus,
              },
            },
            { new: true, useFindAndModify: false }
          );

          // update eventMember list
          member = await EventMember.findOneAndUpdate(
            {
              event_id: args.eventId,
              user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
            },
            {
              invitationStatus: args.invitationStatus,
            },
            { upsert: true, new: true }
          );

          if (args.invitationStatus == "going") {
            // notify when follow user
            if (checkIfInvitedToEvent.clubId) {
              await axios.post(
                `${config.notification_service_url}api/notifications/sendToUser`,
                {
                  origin: "event",
                  from_user: context.decoded.obj._id,
                  to_user: checkIfInvitedToEvent.clubId.owner,
                  tag: "ATTENDING_EVENT",
                  payload: { event: mongoose.Types.ObjectId(args.eventId) },
                }
              );
            } else {
              await axios.post(
                `${config.notification_service_url}api/notifications/sendToUser`,
                {
                  origin: "event",
                  from_user: context.decoded.obj._id,
                  to_user: checkIfInvitedToEvent.owner,
                  tag: "ATTENDING_EVENT",
                  payload: { event: mongoose.Types.ObjectId(args.eventId) },
                }
              );
            }
          }
        } else {
          // in this case, the user found the event and not been invited yet
          // check if event exists
          const checkEvent = await Event.findOne({
            _id: args.eventId,
          }).populate("clubId");

          if (checkEvent) {
            // event exists but user not invited yet
            // push new user to the existing members list

            // update members list
            let membersObj;
            let updated_members = checkEvent.members;
            membersObj = {
              user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
              invitationStatus: args.invitationStatus,
            };
            updated_members.push(membersObj);

            if (args.invitationStatus == "going") {
              // notify when follow user
              if (checkEvent.clubId) {
                console.log("checkEvent.clubId", checkEvent.clubId);
                await axios.post(
                  `${config.notification_service_url}api/notifications/sendToUser`,
                  {
                    origin: "event",
                    from_user: context.decoded.obj._id,
                    to_user: checkEvent.clubId.owner,
                    tag: "ATTENDING_EVENT",
                    payload: { event: mongoose.Types.ObjectId(args.eventId) },
                  }
                );
              } else {
                await axios.post(
                  `${config.notification_service_url}api/notifications/sendToUser`,
                  {
                    origin: "event",
                    from_user: context.decoded.obj._id,
                    to_user: checkEvent.owner,
                    tag: "ATTENDING_EVENT",
                    payload: { event: mongoose.Types.ObjectId(args.eventId) },
                  }
                );
              }
            }

            // update eventMember list
            member = await EventMember.findOneAndUpdate(
              {
                event_id: args.eventId,
                user_id: mongoose.Types.ObjectId(context.decoded.obj._id),
              },
              {
                invitationStatus: args.invitationStatus,
              },
              { upsert: true, new: true }
            );

            // update members
            args.members = updated_members;
            event_id = args.eventId;
            delete args.invitationStatus;
            delete args.eventId;

            listMember = await Event.findOneAndUpdate(
              {
                _id: event_id,
              },
              { $set: args },
              { new: true }
            );
          } else {
            throw new ApolloError("Forbidden", 403, {
              code: 403,
              message: "Forbidden",
            });
          }
        }

        await Event.populate(listMember, "members.user_id");
        await Event.populate(listMember, "owner");
        await Event.populate(listMember, "clubId");
        return listMember;
      } catch (err) {
        console.log("updateUserEventAction err", err);
        return reject(err);
      }
    },

    updateEventView: async (parent, args, context, info) => {
      try {
        /*get event */
        let event;
        let viewersArray = [];
        let checkEvent = await Event.findOne({
          _id: args.eventId,
        });

        // check if user already saw the post
        const found_view = checkEvent.event_viewers.includes(
          String(context.decoded.obj._id)
        );
        console.log("found_view", found_view);

        if (found_view) {
          event = checkEvent;
        } else {
          viewersArray = checkEvent.event_viewers;
          viewersArray.push(context.decoded.obj._id);
          event = await Event.findOneAndUpdate(
            { _id: args.eventId },
            {
              event_views_count: checkEvent.event_views_count + 1,
              event_viewers: viewersArray,
            },
            { new: true }
          );
        }

        await Event.populate(event, "members.user_id");
        await Event.populate(event, "owner");
        await Event.populate(event, "clubId");
        return event;
      } catch (err) {
        console.log("updateEventView err :", err);
        return reject(err);
      }
    },

    commentEvent: async (parent, args, context, info) => {
      try {

        // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
        banCheck(context.decoded.obj.active)
        
        let checkEvent = await Event.findOne({
          _id: args.event_id,
        });
        let eventComments;
        let event;
        if (checkEvent) {
          eventComments = await EventComments.create({
            event_id: args.event_id,
            user_id: `${context.decoded.obj._id}`,
            comment: args.comment,
            tags: args.tags,
            hashTags: args.hashTags,
          });
          event = await EventComments.find({
            event_id: args.event_id,
          });
        } else {
          throw new ApolloError("Event doest not exists", 400, {
            code: 400,
            message: "Event doest not exists",
          });
        }

        for (let i = 0; i < args.hashTags.length; i++) {
          createOrUpdateHashTag(args.hashTags[i], false);
        }

        if (args.tags) {
          for (let i = 0; i < args.tags.length; i++)
            axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "user",
                from_user: context.decoded.obj._id,
                to_user: mongoose.Types.ObjectId(args.tags[i]),
                tag: "TAG_POST",
                payload: { event: mongoose.Types.ObjectId(args.event_id) },
              }
            );
        }

        await EventComments.populate(event, "user_id");
        await EventComments.populate(event, "event_id");
        await EventComments.populate(event, "tags");
        await EventComments.populate(event, "event_id.owner");
        await EventComments.populate(event, "event_id.members.user_id");
        return event;
      } catch (err) {
        console.log("commentEvent err :", err);
        return reject(err);
      }
    },
    updateCommentEvent: async (parent, args, context, info) => {
      try {
        let event;
        let checkCommentOwner = await EventComments.findOneAndUpdate(
          {
            event_id: args.event_id,
            user_id: `${context.decoded.obj._id}`,
            _id: args.comment_id,
          },
          {
            comment: args.comment,
            tags: args.tags,
            hashTags: args.hashTags,
          }
        );
        if (checkCommentOwner) {
          event = await EventComments.find({
            event_id: args.event_id,
          });

          if (args.tags) {
            for (let i = 0; i < args.tags.length; i++)
              axios.post(
                `${config.notification_service_url}api/notifications/sendToUser`,
                {
                  origin: "user",
                  from_user: context.decoded.obj._id,
                  to_user: mongoose.Types.ObjectId(args.tags[i]),
                  tag: "TAG_POST",
                  payload: { event: mongoose.Types.ObjectId(args.event_id) },
                }
              );
          }

          await EventComments.populate(event, "user_id");
          await EventComments.populate(event, "event_id");
          await EventComments.populate(event, "tags");
          await EventComments.populate(event, "event_id.owner");
          await EventComments.populate(event, "event_id.members.user_id");
          return event;
        } else {
          throw new ApolloError("Event doest not exists", 400, {
            code: 400,
            message: "Event doest not exists",
          });
        }
      } catch (err) {
        console.log("updateCommentEvent err :", err);
        return reject(err);
      }
    },
    deleteCommentEvent: async (parent, args, context, info) => {
      try {
        let event;
        let checkCommentOwner = await EventComments.findOneAndDelete({
          event_id: args.event_id,
          user_id: `${context.decoded.obj._id}`,
          _id: args.comment_id,
        });
        if (checkCommentOwner) {
          event = await EventComments.find({
            event_id: args.event_id,
          });

          await EventComments.populate(event, "user_id");
          await EventComments.populate(event, "event_id");
          await EventComments.populate(event, "event_id.owner");
          await EventComments.populate(event, "event_id.members.user_id");
          return event;
        } else {
          throw new ApolloError("Event doest not exists", 400, {
            code: 400,
            message: "Event doest not exists",
          });
        }
      } catch (err) {
        console.log("deleteCommentEvent err :", err);
        return reject(err);
      }
    },
    ownerEventDeleteComment: async (parent, args, context, info) => {
      try {
        let event;
        let checkEventOwner = await Event.findOne({
          _id: args.event_id,
          owner: `${context.decoded.obj._id}`,
        });
        if (checkEventOwner) {
          await EventComments.findOneAndDelete({
            _id: args.comment_id,
          });

          event = await EventComments.find({
            event_id: args.event_id,
          });

          await EventComments.populate(event, "user_id");
          await EventComments.populate(event, "event_id");
          await EventComments.populate(event, "event_id.owner");
          await EventComments.populate(event, "event_id.members.user_id");
          return event;
        } else {
          throw new ApolloError("Forbidden", 403, {
            code: 403,
            message: "Forbidden",
          });
        }
      } catch (err) {
        console.log("OwnerEventDeleteComment err :", err);
        return reject(err);
      }
    },
    fetchCommentsEvent: async (parent, args, context, info) => {
      try {
        let event;
        let checkEvent = await Event.findOne({
          _id: args.event_id,
        });
        if (checkEvent) {
          event = await EventComments.find({
            event_id: args.event_id,
          })
            .limit(args.limit)
            .skip(args.offset);
          await EventComments.populate(event, "user_id");
          await EventComments.populate(event, "event_id");
          await EventComments.populate(event, "tags");
          await EventComments.populate(event, "event_id.owner");
          await EventComments.populate(event, "event_id.members.user_id");
          return event;
        } else {
          throw new ApolloError("Forbidden", 403, {
            code: 403,
            message: "Forbidden",
          });
        }
      } catch (err) {
        console.log("fetchCommentsEvent err :", err);
        return reject(err);
      }
    },

    timelineEvents: async (parent, args, context, info) => {
      let categories_id = [];
      let user = await Users.findOne({ _id: context.decoded.obj._id });
      let today = new Date();
      if (user.category.length !=0) {
        categories_id = user.category.map((category) => category.category_id);
      }
      // const totalEvents = await Event.find({
      //   "category.category_id": { $in: categories_id },
      // });

      // check if belong to event
      let checkBelongToEvent = await Event.find({
        $or: [
          { owner: mongoose.Types.ObjectId(context.decoded.obj._id) },
          {
            members: {
              $elemMatch: {
                $and: [
                  { user_id: mongoose.Types.ObjectId(context.decoded.obj._id) },
                  { invitationStatus: "going" },
                ],
              },
            },
          },
        ],
      });

      let belongToEventList = [];
      for await (let belonger of checkBelongToEvent) {
        belongToEventList.push(mongoose.Types.ObjectId(belonger._id));
      }
      const geo = geoip.lookup(`${context.decoded.ip}`);
      const suggest_Events = await Event.find({
        $or:[{"category.category_id": { $in: categories_id }},
        {eventCountry: geo.country}],
        eventType: "event",
        endOfEvent: { $gte: today },
        // owner: { $ne: mongoose.Types.ObjectId(context.decoded.obj._id) },
        _id: { $nin: belongToEventList },
      })
        .limit(args.limit)
        .skip(args.offset);

      // belong status
      let belongArray = [];
      belongArray = checkBelongToEvent.map((event) => event._id);
      let arrayIdToString = belongArray.toString().split(",");

      for (i = 0; i < suggest_Events.length; i++) {
        // event comment count
        let commentsCount = await EventComments.find({
          event_id: suggest_Events[i]._id,
        });
        // event members count
        let membersCount = await EventMember.find({
          event_id: suggest_Events[i]._id,
          invitationStatus: "going",
        });

        let newString = suggest_Events[i]._id.toString();
        if (arrayIdToString.includes(newString)) {
          suggest_Events[i].belongStatus = true;
        } else {
          suggest_Events[i].belongStatus = false;
        }

        suggest_Events[i].comment_total_count = commentsCount.length;
        suggest_Events[i].members_total_count = membersCount.length;
      }
      await Event.populate(suggest_Events, "clubId");
      await Event.populate(suggest_Events, "owner");
      await Event.populate(suggest_Events, "members.user_id");
      return {
        events: suggest_Events,
        totalEvents: suggest_Events.length,
      };
    },
    timelineTalents: async (parent, args, context, info) => {
      console.log(
        "context.decoded.obj.country _________________________ ",
        context.decoded.obj.country
      );
      let categories_id = [];
      let user = await Users.findOne({ _id: context.decoded.obj._id });
      if (!user.category) {
        throw new ApolloError("User with bad format categories", 400, {
          code: 400,
          message: "User with bad format categories",
        });
      }

      const users = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
      );
      let followersArray = [];
      followersArray = users.data.data.map((user) => user.to_user.user_id);
      followersArray.push(context.decoded.obj.user_id);
      console.log("followersArray", followersArray);

      // fetch user category
      categories_id = user.category.map((category) => category.category_id);
      // find talents with the same category as the user
      const suggest_talents = await Users.find({
        isVerified: true,
        user_id: { $nin: followersArray },
        $or: [
          { "talent.parent_category_id": { $in: categories_id } },
          { country: context.decoded.obj.country },
        ],
      })
        .limit(args.limit)
        .skip(args.offset);
      // check total fans for every suggested talent
      for (i = 0; i < suggest_talents.length; i++) {
        const followers = await axios.get(
          `${config.auth_service_url}api/friendRequest/find?to_user_id=${suggest_talents[i].user_id}&following_status=following`
        );
        // console.log("followers",followers.data.data.map(user => user.from_user_id ));
        suggest_talents[i].comment_total_fans = followers.data.data.length;
      }

      return suggest_talents;
    },

    // we have used this mutation once, to updated the profilLink attribute of all users, now I'm commenting it and deleting it from schema; good bye

    syncAllUsers: async (parent, args, context, info) => {
      var uid = require("rand-token").uid;

      let userUpdated;
      // check ApiBaseController to change limit if you use this service
      const users = await axios.get(`${config.auth_service_url}api/user/find`);
      let user = users.data.data.map((user) => user);

      for (let i = 0; i < user.length; i++) {
        if (user[i].fullName == null) {
          user[i].fullName = "fullName";
        }

        userUpdated = await Users.updateMany(
          {
            user_id: user[i].user_id,
          },
          {
            $set: {
              profilLink: user[i].fullName.replace(/\s+/g, "") + "_" + uid(4),
            },
          },
          { multi: true }
        );
      }
      let getUsers = await Users.find({});
      return getUsers;
    },
    externalShareEvent: async (parent, args, context, info) => {
      const { eventId } = args
      // fetch the event to share
      const event = await Event.findOne({ _id: eventId });
      try {
        const dynamic_url = await dynamicLinkInfo(
          eventId,
          "eventId",
          event.eventName,
          config.bucket_url + event.eventProfileImage
        );
        return dynamic_url;
      } catch (err) {
        throw new ApolloError(err);
      }
    }
  },
  Subscription: {},
};

