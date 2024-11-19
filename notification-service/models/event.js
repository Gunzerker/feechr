const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  category_id: Number,
  parent_category_id: Number,
  categoryName: String,
  categoryIconeUrl: String,
  categoryImageUrl: String,
  active: String,
  language: String,
  createdAt: String,
  updatedAt: String,
});

var PointSchema = new Schema({
  loc: {
    type: { type: String },
    coordinates: [],
  }
});

PointSchema.index({ "loc": "2dsphere" });

const eventMemberSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    invitationStatus: String // invited; going; notGoing;
  },
  { timestamps: true }
);

const eventSchema = new Schema(
  {
    eventProfileImage: String,
    eventCoverImage: String,
    eventName: String,
    eventType: String,
    eventDescription: String,
    eventCountry: String,
    eventSite: String,
    eventCoordinates: PointSchema,
    eventDate: Date,
    eventDuration: String,
    endOfEvent: Date,
    comment_total_count: { type: Number, default: 0 },
    tickets: {
      available: Boolean,
      locations: [{
        site: String,
        latitude: String,
        longitude: String
      }]
    },
    category: CategorySchema,
    owner: { type: Schema.Types.ObjectId, ref: "users" },
    clubId: { type: Schema.Types.ObjectId, ref: "clubs" },
    members: [eventMemberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("events", eventSchema);
