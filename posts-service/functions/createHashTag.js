/*create the tag if not exists */
const HashTags = require("../models/HashTags");

module.exports = async function hashtags(tag,isPost){
 if (isPost)
 await HashTags.findOneAndUpdate(
   { tag:tag.toUpperCase() },
   { $inc: { posts_count:1 } },
   { upsert: true, new: true }
 );
 else
  await HashTags.findOneAndUpdate(
    { tag: tag.toUpperCase() },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}