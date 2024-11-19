const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  input updatedNotification {
    post_notifications: Boolean
    feechrup_notifications: Boolean
    message_notifications: Boolean
    event_notifications: Boolean
    user_notifications: Boolean
  }

  type notificationSetting {
    post_notifications: Boolean
    feechrup_notifications: Boolean
    message_notifications: Boolean
    event_notifications: Boolean
    user_notifications: Boolean
    newNotification: Boolean
  }

  type ownerType {
    user_id: Int
    id: String
    _id: String
    email: String
    fullName: String
    phone_number: String
    profile_image_compressed: String
    country_code: String

    gender: String

    visibility: String

    profile_image: String

    cover_image: String

    status: String

    followers_count: Int

    following_count: Int

    likes_count: Int

    posts_count: Int

    views_count: Int

    description: String

    speciality: String

    isTalent: Boolean
    isVerified: Boolean
    country: String

    city: String

    location: String

    user_friends_with: Boolean

    profilLink: String
  }

  type mediaType {
    original_post_id: ID
    images: [File]
    videos: [File]
  }

  type File {
    _id: ID
    type: String
    url: String!
    file_name: String
    order: Int
    compressed_video: String
    thumbnail: String
    video_speed: Float
    isLandscape: Boolean
  }

  type FetchedPost {
    _id: ID!
    type: String
    description: String
    textColor: String
    medias: mediaType
    visibility: Int
    category: String
    createdAt: String
    updatedAt: String
    post_likes_total: Int
    post_comments_total: Int
    post_views_total: Int
    user_liked_post: Boolean
    clubId: ClubsType
    hashTags: [String]
    allowComments: Boolean
    active: Boolean
    total_posts: Int
    location: String
    feechr_up_count: Int
    posted_as_admin: Boolean
    post_parent_id: ReferencedPost
  }
  type ReferencedPost {
    _id: ID
    owner: ID
    post_likes_total: Int
    type: String
    description: String
    medias: mediaType
  }
  type ClubsType {
    _id: ID
    clubCoverImage: String
    clubImage: String
    clubName: String
    clubPurpose: String
    compressedClubImage: String
    " 0:public , 2:private"
    privacy: Int
    post_counter_total: Int
    likes_counter_total: Int
    vues_counter_total: Int
    user_role: String
    members: [ownerType]
    members_count: Int
    allowMembersToPost: Boolean
    tiktok: String
    instagram: String
    twitter: String
    facebook: String
    youtube: String
    tumblr: String
    vkontakte: String
    skype: String
  }

  type eventType {
    _id: ID!
    eventProfileImage: String
    eventCoverImage: String
    eventName: String
    eventType: String
    eventDescription: String
    eventSite: String
  }

  type payloadType {
    club: ClubsType
    post: FetchedPost
    event: eventType
  }
  type notificationType {
    _id: ID
    from_user: ownerType
    #to_user: ownerType
    tag: String
    payload: payloadType
    readStatus: Boolean
    users_count: Int
    createdAt: String
    updatedAt: String
    unread_count: Int
    unread_message_count: Int
  }

  type Query {
    test: String
    fetchCurrentSetting: notificationSetting
  }
  type Mutation {
    updateUserNotificationStatus(update: updatedNotification): String
    disableNotificationPost(postId: ID): String
    enableNotificationPost(postId: ID): String
    fetchMyNotifications(
      limit: Int
      offset: Int
      "takes either 'all' or a combination of 'likes','comments','mentions','followers','clubs','events'"
      filter: [String]
    ): [notificationType]
    updateFireBaseToken(firebaseToken: String): String
    subToPostOrUser(postId: ID, userId: ID, clubId: ID): String
    unsubToPostOrUser(postId: ID, userId: ID, clubId: ID): String
    deleteNotification(notificationId: ID): String
    updateReadNotification(notificationId: ID): String
    updateNewNotification(status:Boolean): Boolean
  }
`;
