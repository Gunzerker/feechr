const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const path = require("path");
const fs = require("fs");
const Clubs = require('../../models/Clubs');
const Requests = require('../../models/ClubJoinRequests')
const mongoose = require("mongoose");
const { ApolloError } = require('apollo-server-errors');
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const uploadParams = { Bucket: "digit-u-media-resources", Key: '', Body: '' };
const { v4: uuidv4 } = require('uuid')
const mime = require('mime')
const axios = require('axios')
const config = require('../../config/config.json')
const ClubMembers = require("../../models/ClubMembers");
const Posts = require("../../models/Posts")
const Users = require("../../models/Users")
const Rule = require("../../models/Rules")
const Music = require("../../models/Music");
const BlockedClub = require("../../models/BlockClubs")
const reportSchema = require("../../models/report");
const subToTopic = require("../../models/subToPost")
const sharp = require("sharp");
const { streamToBuffer } = require("@jorgeferrero/stream-to-buffer");
const dynamicLinkInfo = require("../../functions/dynamicLink");
const banCheck = require("../../middleware/banCheck")

function compressImage(file, resize) {
  return new Promise((resolve, reject) => {
    if (resize) {
      sharp(file)
        .resize(80, 80)
        .jpeg({ quality: 60, force: true, mozjpeg: true })
        .toBuffer()
        .then((data) => {
          return resolve(data);
        })
        .catch((err) => { });
    }
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

function uploadMedia(file, position) {
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
        let returned_file
        if (position == 2) returned_file = await compressImage(new_file, true);
        else returned_file = await compressImage(new_file);
        uploadParams.Body = returned_file;
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
    fetchClubs: async (parent, args, context, info) => {
      /* fetch the clubs that the user is member of */
      const clubs = await Clubs.find({ members: context.decoded.obj._id })
        .populate("owner")
        .populate("members")
        .populate("admins")
        .populate("moderateurs");
      let clubOwner = clubs.filter(
        (club) => club.owner.id == context.decoded.obj._id
      );
      let clubModerateur = clubs.filter((club) =>
        club.moderateurs.find(
          (moderateur) => moderateur.id == context.decoded.obj._id
        )
      );
      let clubAdmin = clubs.filter((club) =>
        club.admins.find((admin) => admin.id == context.decoded.obj._id)
      );
      let clubMember = clubs.filter((club) =>
        club.members.find((member) => member.id == context.decoded.obj._id)
      );

      return {
        clubOwner,
        clubModerateur,
        clubAdmin,
        clubMember,
      };
    },
  },
  Mutation: {
    createClub: async (parent, args, context, info) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)
      /*check if a club with the same name exists */
      const check_club = await Clubs.findOne({ clubName: args.clubName });
      if (check_club) {
        throw new ApolloError("Club with the same name already exists", 400, {
          code: 400,
          message: "Club with the same name already exists",
        });
        return;
      }
      let promise_array = [];
      /* prepare the club media */
      for (let i = 0; i < args.imageUpload.length; i++) {
        promise_array.push(uploadMedia(args.imageUpload[i]));
      }
      promise_array.push(uploadMedia(args.imageUpload[1], 2));
      /* resolve all promises */
      const resolved_uploads = await Promise.all(promise_array);
      args.clubCoverImage = resolved_uploads[0].file_name;
      args.clubImage = resolved_uploads[1].file_name;
      args.compressedClubImage = resolved_uploads[2].file_name;
      args.owner = context.decoded.obj._id;
      // fetch category data
      const fetched_category = await axios.get(
        `${config.auth_service_url}api/category/find?category_id=${args.category}`
      );
      args.category = fetched_category.data.data.map((category) => category)[0];
      delete args.imageUpload;
      /* create user for the club */
      const user_club = await Users.create({
        fullName: args.clubName,
        cover_image: args.clubCoverImage,
        profile_image_compressed: args.compressedClubImage,
        profile_image: args.clubImage,
        category: [args.category],
        type: "club",
      });
      args.user_club = user_club._id;
      /* create the club */
      let clubs = await Clubs.create(args);
      /* add the user as admin */
      await ClubMembers.create({
        user: context.decoded.obj._id,
        clubId: clubs._id,
        status: "owner",
      });
      /* invite the users */
      for (let i = 0; i < args.usersToInvite.length; i++) {
        /* create the pending-invite */
        await ClubMembers.create({
          user: args.usersToInvite[i],
          clubId: clubs._id,
          status: "pending-invite",
        });
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "club",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(args.usersToInvite[i]),
            tag: "INVITATION_CLUB",
            payload: { club: mongoose.Types.ObjectId(clubs._id) },
          }
        );
      }
      clubs.user_role = "owner";
      return clubs;
    },

    findClubById: async (parent, args, context, info) => {
      /* fetch the clubs that i am member of */
      let find_club = await Clubs.findOne({
        _id: args.clubId,
      }).populate("user_club");
      /* check if the user is a member of the club */
      if (find_club) {
        const check_member = await ClubMembers.findOne({
          user: context.decoded.obj._id,
          clubId: args.clubId,
        }).populate("user_club");
        let available_roles = ["member", "owner", "moderator", "admin"];
        if (check_member) {
          let check_role = available_roles.find(
            (role) => role == check_member.status
          );
          if (check_role) find_club.user_role = check_member.status;
          else find_club.user_role = null;
        }
        const fetched_status = await ClubMembers.findOne({
          user: context.decoded.obj._id,
          clubId: args.clubId,
          status: "pending-invite",
        });
        find_club.pending_invite = false;
        find_club.join_request = false;
        /* check if he has a join request */
        const join_request = await Requests.findOne({
          from_user: context.decoded.obj._id,
          clubId: args.clubId,
        });
        const is_subed = await subToTopic.findOne({
          user: context.decoded.obj._id,
          club: args.clubId,
        });
        if (is_subed) find_club.is_subed = true;
        else find_club.is_subed = false;
        if (fetched_status) {
          find_club.pending_invite = true;
        }
        if (join_request) {
          find_club.join_request = true;
        }
      }

      const posts_count = await Posts.aggregate([
        { $match: { clubId: find_club._id } },
        {
          $group: { _id: null, view_counts: { $sum: "$post_views_total" } },
        },
      ]);
      console.log(posts_count);
      if (posts_count.length == 0)
        find_club.vues_counter_total = 0
      else
        find_club.vues_counter_total = posts_count[0].view_counts;

      return find_club;
    },
    deleteClub: async (parent, args, context, info) => {
      /* fetch the user and his permissions */
      const userMember = await ClubMembers.find({
        clubId: args.clubId,
        status: "owner",
      });

      /* check if the user exists and there is atleast 2*/

      /* find if the current user has suffisant permission */
      if (userMember.length != 0) {
        await Clubs.deleteOne({ _id: args.clubId });
        await ClubMembers.deleteMany({ clubId: args.clubId });
        Posts.deleteMany({ clubId: args.clubId });
        axios.post(
          `${config.notification_service_url}api/notifications/deleteNotification`,
          {
            origin: "club",
            tag: "CLUB_DELETED",
            payload: {
              club: mongoose.Types.ObjectId(args.clubId),
            },
          }
        );
        return "club deleted";
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },

    leaveClub: async (parent, args, context, info) => {
      /*fetch the club */
      const clubMembership = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId: args.clubId,
      });
      const fetched_admins = await ClubMembers.find({
        clubId: args.clubId,
        status: { $in: ["owner", "admin", "moderator"] },
      });
      /* map the ids */
      const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
      /* loop and send notifications to them */
      for (let i = 0; i < mapped_admins_ids.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "club",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
            tag: "LEFT_CLUB",
            payload: {
              club: mongoose.Types.ObjectId(args.clubId),
            },
          }
        );

      if (clubMembership.status == "owner")
        return new ApolloError("Method Not Allowed", 405, {
          code: 405,
          message: "an owner needs to exists...",
        });

      await ClubMembers.deleteOne({ _id: clubMembership._id });
      await Clubs.findOneAndUpdate(
        { _id: clubMembership.clubId },
        { $inc: { members_count: -1 } }
      );
      return "user left";
    },
    updateClub: async (parent, args, context, info) => {
      /*get the club id */
      const club_id = args.clubId;
      delete args.clubId;
      let result_upload;
      /*check if the user can update the club */
      const check_privilage = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId: club_id,
        $or: [{ status: "owner" }, { status: "admin" }],
      });
      if (check_privilage) {
        /* prepare the club media */
        /* check if the media will be updated */
        /* fetch the category data */
        const fetched_category = await axios.get(
          `${config.auth_service_url}api/category/find?category_id=${args.category}`
        );
        args.category = fetched_category.data.data.map(
          (category) => category
        )[0];
        //check name if already exists
        const findClub = await Clubs.findOne({
          _id: { $ne: club_id },
          clubName: args.clubName,
        });
        if (findClub) {
          throw new ApolloError("Forbidden", 403, {
            code: 403,
            message: "Club with that name already exists",
          });
        }
        const updatedClub = await Clubs.findOneAndUpdate(
          { _id: club_id },
          { $set: args },
          { new: true }
        );
        /* fetch the club status */
        const club_member = await ClubMembers.findOne({
          user: context.decoded.obj._id,
          clubId: club_id,
        });
        updatedClub.user_role = club_member.status;
        return updatedClub;
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },

    joinClub: async (parent, args, context, info) => {
      /* check to avoid miss join club */
      // context.decoded.obj._id = mongoose.Types.ObjectId(
      //   "61489ee96cbd3ccc4897913d"
      // );
      const check_user_join = await ClubMembers.find({
        user: context.decoded.obj._id,
        clubId: args.clubId,
      });
      if (check_user_join.length != 0) {
        throw new ApolloError("Forbidden", 403, {
          code: 403,
          message: "User is already a member",
        });
      }
      /*fetch the club */
      let club = await Clubs.findOne({ _id: args.clubId });
      if (club.privacy == 0) {
        await ClubMembers.create({
          user: context.decoded.obj._id,
          clubId: args.clubId,
        });
        club.members_count++;
        await club.save();
        if (club.members_count == 5) {
          const fetched_admins = await ClubMembers.find({
            clubId: args.clubId,
            status: { $in: ["owner", "admin", "moderator"] },
          });
          /* map the ids */
          const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
          /* loop and send notifications to them */
          for (let i = 0; i < mapped_admins_ids.length; i++)
            axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "club",
                from_user: context.decoded.obj._id,
                to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
                tag: "MEMBER_REACHED",
                payload: {
                  club: mongoose.Types.ObjectId(args.clubId),
                },
              }
            );
        }
      } else {
        /* send a join request */
        await Requests.findOneAndUpdate(
          {
            from_user: context.decoded.obj._id,
            clubId: args.clubId,
          },
          {},
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
      return "club joined";
    },

    fetchClubRequests: async (parent, args, context, info) => {
      /* check if the user has suffisant permition to check requests */
      const check_privilage = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId: args.clubId,
        $or: [{ status: "owner" }, { status: "admin" }],
      });
      if (check_privilage) {
        const requests = await Requests.find({
          clubId: args.clubId,
          status: "pending",
        }).populate("from_user");
        console.log(args.clubId);
        console.log(requests);
        return requests;
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },

    handleClubRequests: async (parent, args, context, info) => {
      /* check if the user has suffisant permition to handle requests */
      const check_privilage = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId: args.clubId,
        $or: [
          { status: "owner" },
          { status: "admin" },
          { status: "moderator" },
        ],
      });
      /* fetch the request */
      let updatedRequest = await Requests.findOne({
        _id: args.requestId,
        clubId: args.clubId,
      });
      if (check_privilage) {
        if (args.status == "accepted") {
          /* add the user to the club */

          await ClubMembers.create({
            user: updatedRequest.from_user,
            clubId: updatedRequest.clubId,
          });
          let club = await Clubs.findOneAndUpdate(
            { _id: args.clubId },
            { $inc: { members_count: 1 } },
            { upsert: true }
          );
          if (club.members_count == 5) {
            const fetched_admins = await ClubMembers.find({
              clubId: args.clubId,
              status: { $in: ["owner", "admin", "moderator"] },
            });
            /* map the ids */
            const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
            /* loop and send notifications to them */
            for (let i = 0; i < mapped_admins_ids.length; i++)
              axios.post(
                `${config.notification_service_url}api/notifications/sendToUser`,
                {
                  origin: "club",
                  from_user: context.decoded.obj._id,
                  to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
                  tag: "MEMBER_REACHED",
                  payload: {
                    club: mongoose.Types.ObjectId(args.clubId),
                  },
                }
              );
          }
        }
        await Requests.populate(updatedRequest, "from_user");
        await Requests.deleteOne({ _id: args.requestId });
        return updatedRequest;
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },
    revokeRoles: async (parent, args, context, info) => {
      /*get the club */
      const club = await Clubs.findOne({ _id: args.clubId })
        .populate("admins")
        .populate("members")
        .populate("moderateurs");
      /*get the current user rank*/
      const is_owner = club.owner == context.decoded.obj.id;
      const is_admin = club.admins.includes(context.decoded.obj.id);
      const is_moderateur = club.moderateurs.includes(context.decoded.obj.id);
      /*get the targeted user rank*/
      const target_is_owner = club.owner == context.decoded.obj.id;
      const target_is_admin = club.admins.find((admin_entity) => {
        admin_entity.id == args.userId;
      });
      const target_is_moderateur = club.moderateurs.find(
        (moderateur_entity) => {
          moderateur_entity.id == args.userId;
        }
      );

      if (is_owner) {
        if (target_is_admin) {
          const index = club.admins.indexOf(target_is_admin);
          club.admins.splice(index, 1);
          await club.save();
          return "user downgraded";
        } else {
          const index = club.moderateurs.indexOf(target_is_moderateur);
          club.moderateurs.splice(index, 1);
          await club.save();
          return "user downgraded";
        }
      }

      if (is_admin && target_is_moderateur) {
        const index = club.moderateurs.indexOf(target_is_moderateur);
        club.moderateurs.splice(index, 1);
        await club.save();
        return "user downgraded";
      }

      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },
    updateRoles: async (parent, args, context, info) => {
      const { clubId, userId, target } = args;
      /* get current user role */
      const current_user_role = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId,
      });
      if (!current_user_role) {
        throw new ApolloError("Forbidden", 403, {
          code: 403,
          message: "Insuffisant permissions",
        });
      }
      if (current_user_role.status == "owner" && target == "owner") {
        /* if the user gona remove his ownership role */
        await ClubMembers.findOneAndUpdate(
          { user: context.decoded.obj._id, clubId },
          { $set: { status: "admin" } }
        );
        await ClubMembers.findOneAndUpdate(
          { user: userId, clubId },
          { $set: { status: "owner" } }
        );
        await Clubs.findOneAndUpdate(
          { _id: clubId },
          { $set: { owner: mongoose.Types.ObjectId(userId) } }
        );
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "club",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(userId),
            tag: "OWNER_INVITATION_CLUB",
            payload: { club: mongoose.Types.ObjectId(clubId) },
          }
        );
        return "role updated";
      }
      if (
        current_user_role.status == "owner" ||
        current_user_role.status == "admin"
      ) {
        await ClubMembers.findOneAndUpdate(
          { user: userId, clubId },
          { $set: { status: target } }
        );
        let tag_to_notification;
        if (target == "member") tag_to_notification = "MEMBER_INVITATION_CLUB";
        if (target == "admin") tag_to_notification = "ADMIN_INVITATION_CLUB";
        if (target == "moderator")
          tag_to_notification = "MODERATOR_INVITATION_CLUB";
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "club",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(userId),
            tag: tag_to_notification,
            payload: { club: mongoose.Types.ObjectId(clubId) },
          }
        );
        return "role updated";
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden user is an admin or a moderateur",
      });
    },

    kickUser: async (parent, args, context, info) => {
      // check current user status
      const { clubId, userId } = args;
      const current_user_role = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId,
      });
      //get the target user role
      const traget_user_role = await ClubMembers.findOne({
        user: userId,
        clubId,
      });
      if (
        current_user_role.status == "admin" &&
        traget_user_role.status == "admin"
      )
        throw new ApolloError("Forbidden", 403, {
          code: 403,
          message: "Forbidden user is an admin",
        });
      else {
        /*delete the user */
        await ClubMembers.deleteOne({ _id: traget_user_role._id });
        /* remove the member from the total count */
        await Clubs.findOneAndUpdate(
          { _id: clubId },
          { $inc: { members_count: -1 } }
        );
      }
      return "user kicked";
    },
    createRules: async (parent, args, context, info) => {
      /* get the club data */
      return await Rule.create(args);
    },
    updateRules: async (parent, args, context, info) => {
      const rule = await Rule.findOneAndUpdate(
        { _id: args.ruleId },
        { $set: args },
        { new: true }
      );
      return rule;
    },
    deleteRule: async (parent, args, context, info) => {
      await Rule.deleteOne({ _id: args.ruleId, isDefault: false });
      return "rule deleted";
    },
    clubsIManage: async (parent, args, context, info) => {
      const { offset, limit } = args;
      const clubManage = await ClubMembers.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(context.decoded.obj._id),
            $or: [
              { status: "owner" },
              { status: "admin" },
              { status: "moderator" },
            ],
          },
        },
        {
          $lookup: {
            from: "clubs",
            localField: "clubId",
            foreignField: "_id",
            as: "club",
          },
        },
        { $unwind: "$club" },
        {
          $lookup: {
            from: "users",
            localField: "club.user_club",
            foreignField: "_id",
            as: "club.user_club",
          },
        },
        {
          $unwind: "$club.user_club",
        },
        { $sort: { updatedAt: -1 } },
        { $limit: limit },
        { $skip: offset },
      ]);
      //console.log(clubManage[0]);
      const maped_clubs = clubManage.map((clubMember) => {
        let club = clubMember.club;
        club.members = [];
        club.user_role = clubMember.status;
        return club;
      });

      for (clubs of maped_clubs) {
        /* fetch the views counts of posts */
        const posts_count = Posts.aggregate([{ $match: { clubId: clubs._id } }, { $group: { _id: null, view_counts: { $sum: "$views_count" } } }])
        clubs.members = (
          await ClubMembers.find({
            clubId: clubs._id,
            status: { $ne: "pending-invite" },
          })
            .populate("user")
            .limit(5)
        ).map((clubMember) => clubMember.user);
      }
      return maped_clubs;
    },
    clubsIBelongTo: async (parent, args, context, info) => {
      const { offset, limit } = args;

      const clubManage = await ClubMembers.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(context.decoded.obj._id),
            status: "member",
          },
          //$match: { status: "member" },
        },
        {
          $lookup: {
            from: "clubs",
            localField: "clubId",
            foreignField: "_id",
            as: "club",
          },
        },

        { $unwind: "$club" },
        {
          $lookup: {
            from: "users",
            localField: "club.user_club",
            foreignField: "_id",
            as: "club.user_club",
          },
        },
        {
          $unwind: "$club.user_club",
        },
        { $sort: { updatedAt: -1 } },
        { $limit: limit },
        { $skip: offset },
      ]);
      const maped_clubs = clubManage.map((clubMember) => {
        let club = clubMember.club;
        club.members = [];
        club.user_role = clubMember.status;
        return club;
      });

      for (clubs of maped_clubs) {
        console.log(clubs.updatedAt);
        clubs.members = (
          await ClubMembers.find({
            clubId: clubs._id,
            status: { $ne: "pending-invite" },
          })
            .populate("user")
            .limit(5)
        ).map((clubMember) => clubMember.user);
      }
      return maped_clubs;
    },
    timeLineClubs: async (parent, args, context, info) => {
      /* fetch the user categories */
      let categories_id = [];
      let user = await Users.findOne({ _id: context.decoded.obj._id });
      let fech_suggest_conditions = {};
      if (user.category.length != 0) {
        if (!context.decoded.obj.category) context.decoded.obj.category = [];
        let my_categories = context.decoded.obj.category.map(
          (category) => category.category_id
        );
        categories_id = user.category.map((category) => category.category_id);

        fech_suggest_conditions["category.category_id"] = { $in: categories_id };
      }
      let clubs_i_member = await ClubMembers.find({
        user: context.decoded.obj._id,
      });
      clubs_i_member = clubs_i_member.map((club) => club.clubId);

      /* fetch clubs i requested */
      let clubs_i_requests = await Requests.find({ from_user :context.decoded.obj._id});
      clubs_i_requests = clubs_i_requests.map((request) => request.clubId)
      clubs_i_member = [...clubs_i_member , ...clubs_i_requests]
      // clubs_i_member._id = {
      //   $nin: clubs_i_member
      // }
      //hashTags: { $elemMatch: { $regex: args.tag, $options: "i" } },
      let suggest_clubs = await Clubs.find({
        ...fech_suggest_conditions,
        _id: { $nin: clubs_i_member },
      });
      for (clubs of suggest_clubs) {
        clubs.members = (
          await ClubMembers.find({
            clubId: clubs._id,
            status: { $ne: "pending-invite" },
          })
            .populate("user")
            .limit(5)
        ).map((clubMember) => clubMember.user);
      }
      return suggest_clubs;
    },
    feechrClubs: async (parent, args, context, info) => {
      const { limit, offset } = args;
      /* fetch the clubs that the user is part of */
      const fetched_clubs_memebers = await ClubMembers.find({
        user: context.decoded.obj._id,
        status: { $ne: "pending-invite" },
      });
      let clubs_id = fetched_clubs_memebers.map(
        (club_member) => club_member.clubId
      );
      /* fetch the clubs that the user has blocked */
      const blockedClubs = await BlockedClub.find({
        user: context.decoded.obj._id,
      });
      const mapedBlockedClub = blockedClubs.map(
        (blockedClub) => blockedClub.club
      );
      /* merge the arrays */
      clubs_id = clubs_id.concat(mapedBlockedClub);
      /* fetch the clubs that the user is not member of */
      const fetched_clubs = await Clubs.find({ _id: { $nin: clubs_id } })
        .populate("user_club")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
      if (fetched_clubs.length == 0) return [];
      const maped_clubs = fetched_clubs.map((clubMember) => {
        club = clubMember;
        club.members = [];
        club.user_role = clubMember.status;
        return club;
      });

      for (let i = 0; i < maped_clubs.length; i++) {
        // check if has a pending invite
        const fetched_status = await ClubMembers.findOne({
          user: context.decoded.obj._id,
          clubId: maped_clubs[i]._id,
        });
        maped_clubs[i].pending_invite = false;
        maped_clubs[i].join_request = false;
        /* check if he has a join request */
        const join_request = await Requests.findOne({
          from_user: context.decoded.obj._id,
          clubId: maped_clubs[i]._id,
        });
        if (fetched_status) {
          maped_clubs[i].pending_invite = true;
        }
        if (join_request) {
          maped_clubs[i].join_request = true;
        }
        maped_clubs[i].members = (
          await ClubMembers.find({
            clubId: maped_clubs[i]._id,
            status: { $ne: "pending-invite" },
          })
            .populate("user")
            .limit(5)
        ).map((clubMember) => clubMember.user);
      }

      return maped_clubs;
    },
    fetchRules: async (parent, args, context, info) => {
      const { clubId, limit, offset } = args;
      const rules = await Rule.find({
        $or: [{ club: clubId }, { isDefault: true }],
      })
        .limit(limit)
        .skip(offset);
      return rules;
    },
    updateClubProfileImage: async (parent, args, context, info) => {
      const { clubId } = args;
      let result_upload = await uploadMedia(args.profile);
      args.clubImage = result_upload.file_name;
      result_upload = await uploadMedia(args.profile, 2);
      args.compressedClubImage = result_upload.file_name;
      const club_result = await Clubs.findOneAndUpdate(
        { _id: clubId },
        {
          clubImage: args.clubImage,
          compressedClubImage: args.compressedClubImage,
        },
        { new: true }
      );
      return club_result;
    },
    updateClubCoverImage: async (parent, args, context, info) => {
      const { clubId } = args;
      let result_upload = await uploadMedia(args.cover);
      args.clubCoverImage = result_upload.file_name;
      const club_result = await Clubs.findOneAndUpdate(
        { _id: clubId },
        {
          clubCoverImage: args.clubCoverImage,
        },
        { new: true }
      );
      return club_result;
    },
    suggestUsers: async (parent, args, context, info) => {
      const { limit, offset, search, clubId } = args;
      /* fetch my friends ids */
      const friends = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchUserContacts`,
        {
          limit: limit,
          offset: offset,
          user_id: context.decoded.obj.user_id,
          searchName: search,
        }
      );
      /* map the user ids */
      const friends_ids = friends.data.data.map((friends) => friends.user_id);
      /* fetch their mongo data */
      let fetch_user = await Users.find({
        user_id: { $in: friends_ids },
        type: { $ne: "club" },
      });
      /* check if already invited */
      if (clubId) {
        for (let i = 0; i < fetch_user.length; i++) {
          const already_invited = await ClubMembers.find({
            user: fetch_user[i]._id,
            clubId,
          });
          console.log(already_invited);
          if (already_invited.length != 0) fetch_user[i].already_invited = true;
          else fetch_user[i].already_invited = false;
        }
      }

      return fetch_user;
    },
    inviteMember: async (parent, args, context, info) => {
      const { userId, clubId } = args;
      /* create the pending-invite */
      await ClubMembers.findOneAndUpdate(
        {
          user: userId,
          clubId: clubId,
          status: "pending-invite",
        },
        {},
        { upsert: true }
      );
      axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "club",
          from_user: context.decoded.obj._id,
          to_user: mongoose.Types.ObjectId(userId),
          tag: "INVITATION_CLUB",
          payload: { club: mongoose.Types.ObjectId(clubId) },
        }
      );
      return "invite sent";
    },
    fetchClubMember: async (parent, args, context, info) => {
      //{ $regex: args.tag, $options: "i" }
      const { limit, offset, search, clubId } = args;
      console.log(clubId);
      //const members = await ClubMembers.find({clubId});
      const members = await ClubMembers.aggregate([
        {
          $match: {
            $and: [
              { clubId: mongoose.Types.ObjectId(clubId) },
              {
                $or: [
                  { status: "owner" },
                  { status: "admin" },
                  { status: "moderator" },
                  { status: "member" },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: { "user.fullName": { $regex: search, $options: "i" } } },
        { $skip: offset },
        { $limit: limit },
      ]);
      return members;
    },
    fetchPendingPosts: async (parent, args, context, info) => {
      const { clubId, limit, offset } = args;
      /* fetch the pending posts for the given club */
      return await Posts.find({ clubId, visibility: 3, active: true })
        .populate("owner")
        .populate({
          path: "medias.videos.song",
        })
        .limit(limit)
        .skip(offset);
    },
    handlePostsRequests: async (parent, args, context, info) => {
      const { verdict, postId, clubId } = args;
      const updated_post = await Posts.findOne({ _id: postId });
      if (verdict == "accept") {
        /* update the post */
        await Posts.findOneAndUpdate({ _id: postId }, { visibility: 4 });
        /* update the total post count */
        await Clubs.findOneAndUpdate(
          { _id: clubId },
          { $inc: { post_counter_total: 1 } }
        );
      } else {
        await Posts.deleteOne({ _id: postId });
      }
      /* delete the notification */
      const fetched_admins = await ClubMembers.find({
        clubId: clubId,
        status: { $in: ["owner", "admin", "moderator"] },
      });
      /* map the ids */
      const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
      for (let i = 0; i < mapped_admins_ids.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/deleteNotification`,
          {
            origin: "club",
            //from_user: mongoose.Types.ObjectId(updated_post.owner),
            to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
            tag: "POST_CLUB_PENDING",
            payload: {
              post: mongoose.Types.ObjectId(postId),
              club: mongoose.Types.ObjectId(clubId),
            },
          }
        );
      return "post updated";
    },
    blockClub: async (parent, args, context, info) => {
      const { clubId } = args;
      /* add the club to the blocked list */
      await BlockedClub.create({ club: clubId, user: context.decoded.obj._id });
      /* remove the user from the club if he is already a member */
      const checkUserMember = await ClubMembers.findOne({
        user: context.decoded.obj._id,
        clubId,
      });
      if (checkUserMember) {
        /* remove the user from the club */
        await ClubMembers.deleteOne({ _id: checkUserMember._id });
        await Clubs.findOneAndUpdate(
          { _id: clubId },
          { $set: { $inc: { members_count: -1 } } }
        );
      }
      return "club Blocked";
    },
    reportClub: async (parent, args, context, info) => {
      try {
        await reportSchema.findOneAndUpdate(
          {
            user_id: context.decoded.obj._id,
            club_id: args.clubId,
            reportMotif_id: args.motifId,
          },
          {},
          { upsert: true, new: true }
        );
        return "club reported";
      } catch (err) {
        throw new ApolloError(err);
      }
    },
    removeMyJoinRequest: async (parent, args, context, info) => {
      const { clubId } = args;
      await Requests.deleteOne({ from_user: context.decoded.obj._id, clubId });
      return "request removed";
    },
    acceptInviteRequest: async (parent, args, context, info) => {
      /* accept the request */
      try {
        const { clubId } = args;
        await ClubMembers.findOneAndUpdate(
          { user: context.decoded.obj._id, clubId },
          { $set: { status: "member" } }
        );
        await Clubs.findOneAndUpdate(
          { _id: clubId },
          { $inc: { members_count: 1 } }
        );
        if (club.members_count == 5) {
          const fetched_admins = await ClubMembers.find({
            clubId: clubId,
            status: { $in: ["owner", "admin", "moderator"] },
          });
          /* map the ids */
          const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
          /* loop and send notifications to them */
          for (let i = 0; i < mapped_admins_ids.length; i++)
            axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "club",
                from_user: context.decoded.obj._id,
                to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
                tag: "MEMBER_REACHED",
                payload: {
                  club: mongoose.Types.ObjectId(args.clubId),
                },
              }
            );
        }
        // fetch the admins and owner of the club
        const fetched_admins = await ClubMembers.find({
          clubId: clubId,
          status: { $in: ["owner", "admin", "moderator"] },
        });
        /* map the ids */
        const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
        /* loop and send notifications to them */
        for (let i = 0; i < mapped_admins_ids.length; i++)
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "club",
              from_user: context.decoded.obj._id,
              to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
              tag: "ACCEPT_JOIN_CLUB",
              payload: { club: mongoose.Types.ObjectId(clubId) },
            }
          );
        return "invite accepted";
      } catch (err) {
        throw new ApolloError("Something went wrong ...", 500, {
          code: 500,
          message: "Club with the same name already exists",
        });
      }
    },
    declineInviteRequest: async (parent, args, context, info) => {
      const { clubId } = args;
      await ClubMembers.deleteOne({ user: context.decoded.obj._id, clubId });
      return;
    },
    externalShareClub: async (parent, args, context, info) => {
      // fetch the club to share
      const { clubId } = args
      const club = await Clubs.findOne({ _id: clubId });
      // generate the dynamic link
      try {
        const dynamic_url = await dynamicLinkInfo(
          clubId,
          "clubId",
          club.clubName,
          config.bucket_url + club.clubImage
        );
        return dynamic_url;
      } catch (err) {
        throw new ApolloError(err);
      }
    }
  },
  Subscription: {
    postUpdated: {
      subscribe: () => {
        console.log(pubsub.asyncIterator(["POST_LIKED"]));
        return pubsub.asyncIterator(["POST_LIKED"]);
      },
    },
  },
};

