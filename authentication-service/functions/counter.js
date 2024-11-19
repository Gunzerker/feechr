const models = require("../models/db_init");
const UserModel = models["users"];
const friendRequestModel = models["friendRequest"]

module.exports = {
  
    counterFollowers: function ( user_id ) {
        return friendRequestModel.count(
            { where : { to_user_id : user_id , following_status : "following" } }
        )
    },

    counterFollowing: function ( user_id ) {
        return friendRequestModel.count(
            { where : { from_user_id : user_id , following_status : "following" } }
        )
    },

    counterPosts: function ( user_id, step) {
        return UserModel.increment(
            { "posts_count": +step },
            { where: { user_id } }
        )
    },
    counterLikes: function ( user_id, step) {
        return UserModel.increment(
            { "likes_count": +step }, 
            { where: { user_id } }
        )
    },
    counterViews: function ( user_id, step) {
        return UserModel.increment(
            { "views_count": +step },
            { where: { user_id } }
        )
    }

}
