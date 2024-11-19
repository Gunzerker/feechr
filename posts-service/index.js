const { createServer } = require ("http");
const express = require ("express");
const { ApolloServer , gql } = require ("apollo-server-express");
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require("mongoose");
const config = require("./config/config.json")
const jwt = require('jsonwebtoken');
const { ApolloError } = require ('apollo-server-errors');
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const User = require("./models/Users");
const Posts = require("./models/Posts");
var bodyParser = require("body-parser");
const updatePost = require("./functions/updatePost")
const music = require("./models/Music")

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const fs = require ("fs")
const Pusher = require("pusher");
const pusher = new Pusher({
  appId: config.appId,
  key: config.key,
  secret: config.secret,
  cluster: config.cluster,
  useTLS: config.useTLS,
});


//schema
const schema = require("./graphql/schema/schema.js");

//resolver
const resolver = require("./graphql/resolvers/resolvers.js")


const PORT = process.env.PORT || 6001;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

async function getFromS3 (key) {
  return new Promise (async(resolve,reject)=>{
  try{
  if(fs.existsSync(`./asset/${key}`))
    return resolve("finish");
  let params = { Bucket: "digit-u-media-resources", Key: "" };
  params.Key = key;

  s3.headObject(params , function (err , metadata){
    if (err)
      return reject("not_found")
      let file = fs.createWriteStream(`./asset/${params.Key}`);
      let s3_file = s3.getObject(params);
      let object = s3_file.createReadStream();
      let stream = object.pipe(file);
      stream.on("finish", () => {
        return resolve("finish");
      });
  })

}catch(err){
  return reject(err)
  }
})
}
app.get('/video/:filename', async function(req, res) {
  try{
  console.log(req.params.filename);
  await getFromS3(req.params.filename);
  const path = `./asset/${req.params.filename}`;
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1
    const chunksize = (end-start)+1
    const file = fs.createReadStream(path, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
}
  catch(err){
    if (err == "not_found")
      return res.status(404).json({
        status: false,
        message: "API.FILE_NOT_FOUND",
        data: null,
      });
      return res.status(500).json({
        status: false,
        message: "API.INTERNAL_SERVER_ERROR",
        data: null,
      });
    console.log(err)
  }
});

app.get('/post/:id',async function (req,res){
  /* verfiy the token */
  try{
    const token = req.headers.authorization || "";
    if (token == "")
      //throw new APIError({code:401,message:'Unauthaurized'})
      throw new Error("Unauthorized", 401, {
        code: 401,
        message: "Unauthorized",
      });
    const decoded = jwt.verify(token, config.secret_jwt);
    if (decoded) {
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id; 
    }
    // fetch the post
    const required_post = await Posts.findById(req.params.id);
    const found_like = required_post.post_likes.find(
      (post_like) => post_like.user_id == decoded.id
    );
    if (found_like) required_post.user_liked_post = true;
    else required_post.user_liked_post = false;
    if (required_post.visibility == 0)
      return res.status(200).json({
        success: true,
        message: "API.POST-FETCHED",
        data: required_post,
      });
    // check if the user is friends with
    const friends_lists = await axios.get(
      `${config.auth_service_url}api/friendRequest/find?from_user_id=${decoded.id}&following_status=accepted`
    );
    const fetched_friend_list = friends_lists.data.data;
    let friends_ids = [];
    for (let i = 0; i < fetched_friend_list.length; i++)
      friends_ids.push(fetched_friend_list[i].to_user.user_id);
    // check if the owner id exists in the array
    if (friends_ids.includes(decoded.id))
      return res.status(200).json({
        success: true,
        message: "API.POST-FETCHED",
        data: required_post,
      });
    return res.status(200).json({
      success: true,
      message: "API.POST-UNAVAILABLE",
      data: null,
    });
  }catch(err){
    return res.json(err)
  }
})

app.post('/webhook',async (req,res)=>{
  console.log(req.body.data)
  const data = req.body.data;
  for (let j = 0; j < data.length; j++) {
    await updatePost(
      data[j].promises_result,
      data[j].returned_result,
      data[j].i
    );
    if (data[j].generatedsong != null)
      await music.findOneAndUpdate(
        { _id: data[j].generatedsong.song_id },
        {
          s3Url: data[j].generatedsong.generatedmp3result,
          duration: data[j].video_duration,
        }
      );
  }
  pusher.trigger(data[0].returned_result.postId, "post-updated", {
    message: "postUpdated",
  });
  return res.json({status:"ok"})
})
/* app.post('/createPost',async function (req,res){
    const token = req.headers.authorization || "";
    if (token == "")
      //throw new APIError({code:401,message:'Unauthaurized'})
      throw new Error("Unauthorized", 401, {
        code: 401,
        message: "Unauthorized",
      });
    const decoded = jwt.verify(token, config.secret_jwt);
    if (decoded) {
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id;
    }
    const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
      if (err) {
        console.log("error -------- :", err);
        return res.status(401).send({
          status: false,
          data: null,
          message: "ERROR.BAD.REQUEST"
          })
         }
              console.log(fields)
               let promise_array = [];
               let images = [];
               let videos = [];
         for(let i=0 ; i<files.file.length ; i++)
                 //console.log(fields, files.file[i]);
                promise_array.push (uploadMedia(files.file[i]))
                const resolved_uploads = await Promise.all(promise_array);
                console.log(resolved_uploads);
                // prepare the post to create
                // split the videos and images
                let array_song_index = 0;
                for (let i = 0; i < resolved_uploads.length; i++) {
                  if (resolved_uploads[i].mimetype.includes("image"))
                    images.push({
                      _id: resolved_uploads[i]._id,
                      type: "image",
                      url: resolved_uploads[i].url,
                      file_name: resolved_uploads[i].file_name,
                      order: i,
                    });
                  else {
                    videos.push({
                      _id: resolved_uploads[i]._id,
                      type: "video",
                      url: resolved_uploads[i].url,
                      file_name: resolved_uploads[i].file_name,
                      song: args.songs[array_song_index],
                      order: i,
                    });
                    array_song_index++;
                  }
                }
                console.log(images)
                console.log(videos)


              })
                // resolve all promises
})*/

const apollo = new ApolloServer({
  typeDefs: schema,
  resolvers: resolver,
  subscriptions:{
    onConnect:(connectionParams, webSocket , connectionContext)=>{
    }
  },
    onError: ({ networkError, graphQLErrors }) => {
    console.log('graphQLErrors', graphQLErrors)
    console.log('networkError', networkError)
  },
  formatError: (err) => ({
    code:err.extensions.code,message:err.extensions.message,details:err.message
  }),
  context: async({ req , connection }) => {
    if(connection){
      return {user:"loged in"}
    }
    // Note: This example uses the `req` argument to access headers,
    // but the arguments received by `context` vary by integration.
    // This means they vary for Express, Koa, Lambda, etc.
    //
    // To find out the correct arguments for a specific integration,
    // see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#middleware-specific-context-fields

    // Get the user token from the headers.
    const token = req.headers.authorization || "";
    if (token == "")
     //throw new APIError({code:401,message:'Unauthaurized'})
    throw new ApolloError('Unauthorized', 401, {code:401,message:"Unauthorized"});
     const decoded = jwt.verify(token,config.secret_jwt)
     if(decoded){
       if (decoded.role)
        return {decoded}
        const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
        if (mongo_user) {
          decoded.obj._id = mongo_user._id;
          decoded.obj.category = mongo_user.category;
          decoded.obj.country = mongo_user.country;

        } 
        else
        throw new ApolloError('Unauthorized', 401, {});
        decoded.obj.id = decoded.obj.user_id
      return { decoded };
     }
    throw new ApolloError('Unauthorized', 401, {});
  },
});

apollo.applyMiddleware({ app });

const httpServer = createServer(app);

apollo.installSubscriptionHandlers(httpServer);

httpServer.listen({ port: PORT }, () => {
 mongoose
   .connect(`${config.MONGO_DB}`, {
     auth: { authSource: "admin" },
     user: `${config.MONGO_USER}`,
     pass: `${config.MONGO_PSW}`,
     useUnifiedTopology: true,
     useNewUrlParser: true,
   })
   .then(async () => {
     console.log("mongodb connected");
   });
  console.log(`server ready at http://localhost:${PORT}${apollo.graphqlPath}`);
  console.log(
    `Subscriptions ready at ws://localhost:${PORT}${apollo.subscriptionsPath}`
  );
});