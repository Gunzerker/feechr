const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportMotifSchema = new Schema(
    {
        tag_type: {
            fr: String,
            en: String,
            Ar: String,
            de: String,
            es: String,
            ru: String,
        },
        parentId: { type: Schema.Types.ObjectId, ref: "reportsMotif" },
        active: { type: Boolean, default: true },

    },
    { timestamps: true }
);

module.exports = mongoose.model("reportsMotif", reportMotifSchema);