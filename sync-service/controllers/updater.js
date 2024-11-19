const Posts = require ('../models/Posts');
const mongoose= require("mongoose");
const config = require("../config/config.json");
const Clubs = require("../models/Clubs");
const SavePosts = require ("../models/SavedPosts");
const Messages = require ("../models/Messages")
const { addResolveFunctionsToSchema } = require("apollo-server-express");
const axios = require("axios");

class Updater {
    constructor() {
    }

    // update when the user is the owner (done)
    // update when the user liked the post (done)
    // update when the user commented the post (done)
    // update when the user liked the comment (done)
    // update when the user commented the comment (done)
    // update when the user like the commented the comment (done)
    //////////////////////////////////////////////////////
    // update when the user is the club owner (done)
    // update when the user is a member (done)
    // update when the user is admin or moderateur (done)
    //////////////////////////////////////////////////////
    // update user sent messages
    // update user chat room

    // update all posts related data
    async syncPostData (new_user_data) {

    }

    async syncVisibility(data) {
        if (data.status.visibility == "private")
        await Posts.updateMany({ "owner.id": data.id }, { $set: { visibility :2} });
        else
        await Posts.updateMany({ "owner.id": data.id }, { $set: { visibility :0} });
    }

    async syncData (new_user_data) {
        try{
        console.log("Syncing data .....")
        let syncPostsPromie = [];
        // update when the user is the owner
        syncPostsPromie.push (await Posts.updateMany({"owner.id":new_user_data.id},{$set : { "owner.id": new_user_data.id,
            "owner.fullname": new_user_data.fullname,
            "owner.profile_image": new_user_data.profile_image,}}) )
      // update when the user liked the post
        syncPostsPromie.push (await Posts.updateMany({"post_likes.user_id":new_user_data.id},{$set:{            
            "post_likes.$.user_id": new_user_data.id,
            "post_likes.$.fullname": new_user_data.fullname,
            "post_likes.$.profile_image": new_user_data.profile_image,}}))
          // update when the user commented the post
        syncPostsPromie.push (await Posts.updateMany({"post_comments.user_id":new_user_data.id},{$set:{            
            "post_comments.$.user_id": new_user_data.id,
            "post_comments.$.fullname": new_user_data.fullname,
            "post_comments.$.profile_image": new_user_data.profile_image,}}))
        // update when the user liked the comment
        syncPostsPromie.push (await Posts.updateMany({"post_comments.likes.user_id":new_user_data.id},{$set:{            
            "post_comments.0.likes.$.user_id": new_user_data.id,
            "post_comments.0.likes.$.fullname": new_user_data.fullname,
            "post_comments.0.likes.$.profile_image": new_user_data.profile_image,}}))
        // update when the user commented the comment
        syncPostsPromie.push( await Posts.updateMany({"post_comments.comments_comments.user_id":new_user_data.id},{$set:{            
            "post_comments.0.comments_comments.$.user_id": new_user_data.id,
            "post_comments.0.comments_comments.$.fullname": new_user_data.fullname,
            "post_comments.0.comments_comments.$.profile_image": new_user_data.profile_image,}}))
        // update when the user like the commented the comment
        syncPostsPromie.push (await Posts.updateMany({"post_comments.comments_comments.likes.user_id":new_user_data.id},{$set:{            
            "post_comments.0.comments_comments.0.likes.$.user_id": new_user_data.id,
            "post_comments.0.comments_comments.0.likes.$.fullname": new_user_data.fullname,
            "post_comments.0.comments_comments.0.likes.$.profile_image": new_user_data.profile_image,}}))
        // update when the user like the commented the comment
        syncPostsPromie.push (await Posts.updateMany({"post_comments.comments_comments.likes.user_id":new_user_data.id},{$set:{            
            "post_comments.0.comments_comments.0.likes.$.user_id": new_user_data.id,
            "post_comments.0.comments_comments.0.likes.$.fullname": new_user_data.fullname,
            "post_comments.0.comments_comments.0.likes.$.profile_image": new_user_data.profile_image,}}))    
        // update when user views a post
        syncPostsPromie.push (await Posts.updateMany({"post_viwers.user_id":new_user_data.id},{$set:{            
            "post_viwers.$.user_id": new_user_data.id,
            "post_viwers.$.fullname": new_user_data.fullname,
            "post_viwers.$.profile_image": new_user_data.profile_image,}}))

        // update when the user is the club owner
        syncPostsPromie.push (await Clubs.updateMany({"owner.id":new_user_data.id},{$set:{            
            "owner.id": new_user_data.id,
            "owner.fullname": new_user_data.fullname,
            "owner.profile_image": new_user_data.profile_image,}}))       
        // update when the user is a member
        syncPostsPromie.push (await Clubs.updateMany({"members.id":new_user_data.id},{$set:{            
            "members.$.id": new_user_data.id,
            "members.$.fullname": new_user_data.fullname,
            "members.$.profile_image": new_user_data.profile_image,}}))
        // update when the user is an admin
        syncPostsPromie.push (await Clubs.updateMany({"admins.id":new_user_data.id},{$set:{            
            "admins.$.id": new_user_data.id,
            "admins.$.fullname": new_user_data.fullname,
            "admins.$.profile_image": new_user_data.profile_image,}}))  
        // update when the user is an moderateur
        syncPostsPromie.push (await Clubs.updateMany({"moderateurs.id":new_user_data.id},{$set:{            
            "moderateurs.$.id": new_user_data.id,
            "moderateurs.$.fullname": new_user_data.fullname,
            "moderateurs.$.profile_image": new_user_data.profile_image,}}))
        // update the user message
        syncPostsPromie.push (await Messages.updateMany({"from_user.id":new_user_data.id},{$set:{            
            "from_user.id": new_user_data.id,
            "from_user.fullname": new_user_data.fullname,
            "from_user.profile_image": new_user_data.profile_image,}}))     
        // update channels members
        syncPostsPromie.push (await Messages.updateMany({"members.id":new_user_data.id},{$set:{            
            "members.$.id": new_user_data.id,
            "members.$.fullname": new_user_data.fullname,
            "members.$.profile_image": new_user_data.profile_image,}})) 
        await Promise.all(syncPostsPromie)
        console.log("Syncing done ! ")
    }catch(err){
        console.log(err)
    }

    }
    
  }
  
module.exports=Updater;