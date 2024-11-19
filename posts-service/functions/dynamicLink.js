const axios = require('axios')
const config = require('../config/config.json')

module.exports = function dynamicLink (id,target,title,image) {
  return new Promise (async(resolve,reject) => {
  const result = await axios.post(
    `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${config.firebase_web_key}`,

    {
      dynamicLinkInfo: {
        domainUriPrefix: config.firebase_domainUriPrefix,
        link: config.firebase_linkPrefix + `${target}=${id}`,
        iosInfo: {
          iosBundleId: config.firebase_iosBundleId,
          iosAppStoreId: config.firebase_iosAppStoreId,
        },
        navigationInfo: {
          enableForcedRedirect: true,
        },
        socialMetaTagInfo: {
          socialTitle: title,
          socialDescription: title,
          socialImageLink: image,
        },
      },
    }
  );
  if (result.err)
    return reject(result.err);

  return resolve (result.data.shortLink);

  })
}