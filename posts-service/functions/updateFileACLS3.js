const AWS = require("aws-sdk");
AWS.config.loadFromPath("../config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });


var params = {
  Bucket: "digit-u-media-resources",
  GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers",
  Key:
    "public/test-S3-iOS-3DA64760-5A75-4AD7-8C64-6C4204F059CF-11690-00000517CD5C52D3.png",
};
s3.putObjectAcl(params, function (err, data) {
  if (err) console.log(err, err.stack);
  // an error occurred
  else console.log(data); // successful response
  /*
   data = {
   }
   */
});
//aws s3api put-object-acl --bucket digit-u-media-resources --key public/test-S3-iOS-3476E963-025B-4395-84CC-A645262EAD83-11690-00000517CD8906C8.png --grant-read uri=http://acs.amazonaws.com/groups/global/AllUsers