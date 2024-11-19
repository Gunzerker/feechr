const Channels = require("../models/Channels");
const clubMembers = require("../models/ClubMembers");
const users = require("../models/Users");
const mongoose = require("mongoose");

const api = require("../helpers/Configaxios");

exports.getMyClubs = async (req, res, next) => {
  const user = req.user;
  console.log(user);
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  try {
    const clubs = await users.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(user._id) } },

      {
        $lookup: {
          from: "clubmembers",
          as: "members",
          //let: { user: "$user", status: "$status" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$user", mongoose.Types.ObjectId(user._id)],
                    },
                    { $in: ["$status", ["owner", "admin"]] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "clubs",
          localField: "members.clubId",
          foreignField: "_id",
          as: "clubs",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clubs.user_club",
          foreignField: "_id",
          as: "myclubs",
        },
      },
      //   {
      //     $project: {
      //       _id: 0,
      //       myclubs: 1,
      //     },
      //   },
      {
        $facet: {
          metadata: [
            { $count: "totalItems" },
            {
              $addFields: {
                limit: limit,
                offset: offset,
              },
            },
          ],
          data: [{ $skip: offset }, { $limit: limit }],
        },
      },
    ]);
    clubs[0].metadata =
      clubs[0].metadata?.length === 1
        ? clubs[0].metadata[0]
        : { totalItems: 0, where: req.query, offset: offset, limit: limit };
    clubs[0].data = clubs[0].data[0].myclubs;
    res.status(200).json({
      status: true,
      data: clubs[0],
      message: "MY_CLUBS_FETCHED_SUCCUSSFULLY",
    });
  } catch (e) {
    res.status(400).json({
      status: false,
      data: e.message,
      message: "FAIL_TO_FETCH_MY_CLUBS",
    });
  }
};
