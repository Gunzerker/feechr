var admin = require("firebase-admin");
const models = require('../models/db_init');
const axios = require ("axios")

module.exports = function send_notification(data,topic,type) {

// These registration tokens come from the client FCM SDKs.

// Subscribe the devices corresponding to the registration tokens to the
// topic.
if(type=="sub"){
  axios.get(`${config.auth_service_url}api/user/fetchFirebaseToken/${data.to_user}`).then ((data)=>{
  var registrationTokens = [
    data.data.firebase_token
  ];
  admin.messaging().subscribeToTopic(registrationTokens, String(topic))
  .then(function(response) {
    // See the MessagingTopicManagementResponse reference documentation
    // for the contents of response.
    console.log('Successfully subscribed to topic:', response);
  })
  .catch(function(error) {
    console.log('Error subscribing to topic:', error);
  });

})
}
else{
  axios.get(`${config.auth_service_url}api/user/fetchFirebaseToken/${data.to_user}`).then ((data)=>{
  var registrationTokens = [
    data.data.firebase_token
  ];
  admin.messaging().unsubscribeFromTopic(registrationTokens, topic)
  .then(function(response) {
    // See the MessagingTopicManagementResponse reference documentation
    // for the contents of response.
    console.log('Successfully unsubscribed from topic:', response);
  })
  .catch(function(error) {
    console.log('Error unsubscribing from topic:', error);
  });

})
}
}
