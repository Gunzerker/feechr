const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require("../config/config.json")

var userSchema = new Schema({
    loc: {
        type: { type: String },
        coordinates: [],
    }
});

//userSchema.dropAllIndexes()


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

var geoTest = mongoose.model( "geoTest", userSchema );
//userSchema.dropAllIndexes()
geoTest.dropIndexes()

// var user = new geoTest({ 
//     "loc": { 
//         "type": "Point",
//         "coordinates": [-73.97, 40.77]
//     }
// });
// geoTest.aggregate(
//     [
//         { "$geoNear": {
//             "near": {
//                 "type": "Point",
//                 "coordinates": [-73.97,40.77]
//             },
//             "distanceField": "distance",
//             "spherical": true,
//             "maxDistance": 10000
//         }}
//     ],
//     function(err,results) {
//         console.log(results)
//     }
// )
 });

 