const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).

  type Query {
    testQuery: String
  }

  type File {
    _id: ID!
    type: String
    url: String!
  }

  type mediaType {
    images: [File]
    videos: [File]
  }

  type userType {
    user_id: Int
    _id: String
    email: String
    fullName: String
    phone_number: String
    profile_image_compressed:String
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
    isTalent: String
    country: String
    city: String
    location: String
    user_friends_with: Boolean
    profilLink: String
  }

  # event

  type eventLocationType {
    site: String,
    latitude: String,
    longitude: String,
  }

  input eventLocationInput {
    site: String,
    latitude: String,
    longitude: String,
  }

  input memberInput {
    " user_id has to be mongo _id "
    user_id: String,
    invitationStatus: String
  }

  type memberType {
    user_id: ownerType
    invitationStatus: String
  }

  type ticketType {
    available: Boolean
    locations: [eventLocationType]
  }

  input ticketInput {
    available: Boolean
    eventLocation: [eventLocationInput]
  }

  type CategoryType {
    category_id: Int
    parent_category_id: Int
    categoryName: String
    categoryIconeUrl: String
    categoryImageUrl: String
    active: String
    language: String
  }

  type rulesType {
    _id: ID
    titleRule: String
    descriptionRule: String
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
    already_invited: Boolean

    comment_total_fans: Int
    profilLink: String
  }

  type locType {
    type:String
      coordinates:[Float]
  }

  type pointType {
      loc: locType
   }
   

  type clubType {
     _id: ID
    clubCoverImage: String
    clubImage: String
    clubName: String
    clubPurpose: String
    compressedClubImage: String
    category: CategoryType
    " 0:public , 2:private"
    privacy: Int
    rules: [rulesType]
    post_counter_total: Int
    likes_counter_total: Int
    vues_counter_total: Int
    user_role: String
    members: [ownerType]
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
    eventLocation: eventLocationType
    eventCoordinates: pointType
    eventCountry: String
    eventDate: String
    eventDuration: String
    endOfEvent: String
    tickets : ticketType
    category: CategoryType
    owner: userType
    clubId: clubType
    members: [memberType]
    belongStatus: Boolean
    comment_total_count: Int
    members_total_count: Int
    event_views_count: Int
    refeechr_total_count: Int
    createdAt: String
    updatedAt: String
  }
  
  type eventsSuggestionType {
    events: [eventType]
    totalEvents: Int
  }

  type commentEventType{
    _id: ID
    user_id: userType
    event_id: eventType
    comment: String
    tags: [userType]
    hashTags: [String]
    createdAt: String
    updatedAt: String
  }
  
  type Mutation {

    singleUpload(file: Upload): File!

    " fetch all friends to invite in creation event, but in update event passe the eventId so the already invited friends get excluded of the list, the searchTag is case insensitibe and used for searching by fullName " 
    fetchUsersToInvite(limit:Int,offset:Int,user_id:Int, eventId:String, searchTag: String ):[userType]

    " to create an event pass eventType as 'streetEvent' or 'event',  ,  "
    createEvent(
      eventProfileImage: Upload
      eventCoverImage: Upload
      imageType: String
      eventName: String
      eventType: String
      eventDescription: String
      eventSite: String
      " example : eventCoordinates: [-73.97 , 40.77] Which means this takes longitude at index 0 and latitude at index 1 "
      eventCoordinates: [Float]
      " has to be ISO country code "
      eventCountry: String
      " eventDate must follow this regex : '2019-03-01T15:55:31.542+00:00' "
      eventDate: String
      eventDuration: String
      " endOfEvent must follow this regex : '2021-03-01T15:55:31.542+00:00' "
      endOfEvent: String
      tickets: ticketInput
      category: Int
      owner: String
      clubId: String
      members: [memberInput]
      createdAt: String
      updatedAt: String
    ): eventType

    " fetch my events as owner "
    fetchMyEvents(limit: Int, offset:Int):[eventType]

    " fetch event by _id "
    fetchEventById(eventId: String):eventType

    " delete event, only if you are the onwer's event "
    deleteEvent(eventId: String):String

    " update event, only if you are the onwer's event "
    updateMyEvent(
      eventId: String
      eventName: String
      eventType: String
      eventDescription: String
      eventSite: String
      " example : eventCoordinates: [-73.97 , 40.77] "
      eventCoordinates: [Float]
      eventLocation: eventLocationInput
      eventCountry: String
      eventDate: String
      eventDuration: String
      " endOfEvent must follow this regex : '2021-03-01T15:55:31.542+00:00' "
      endOfEvent: String
      tickets: ticketInput
      category: Int
      members: [memberInput]
    ):eventType

    "invite members"
    inviteMembers(
      eventId: String
      members: [memberInput]
    ):eventType

    " update cover, profile or both at once, only if you are the onwer's event  "
    updateEventPhoto(
      eventId: String
      eventProfileImage: Upload
      eventCoverImage: Upload
    ):eventType

    " invitationStatus is caseSensitive and has to be either 'going' or 'notGoing', this mutation is used from a user attending an event or neglecting it, either he is invited or not, example (eventId: '621d76733f646f0133d7c646', invitationStatus:'going' )  " 
    updateUserEventAction(
      eventId: String
      invitationStatus: String
    ):eventType

    " fetch events "
    fetchEvents(
      " eventTag could be either 'upcoming' , 'forYou' , 'nearby' , 'discover' or 'attending' to fetch filtred events ( by date ) or events for you (by country) or events near you in an area of 5km or a specifique country by searchTag you can also add category  "
      eventTag: String
      "only in discover filter to search for a specific country "
      searchTag: String
      " only when tag is nearby, send your actual position , to fetch the streetEvents only, use searchTag:'streetEvent' "
      longitude: Float
      latitude: Float
      " only when tag is upcoming, send the user's mongo id "
      owner: String
      " only when tag is upcoming, send the club's mongo id "
      clubId: String
      category: Int
      limit: Int
      offset: Int
    ):[eventType]

    commentEvent(
      event_id: String
      comment: String
      tags: [String]
      hashTags: [String]
    ):[commentEventType]
    
    updateCommentEvent(
      event_id: String
      comment_id: String
      comment: String
      tags: [String]
      hashTags: [String]
    ):[commentEventType]

    deleteCommentEvent(
      event_id: String
      comment_id: String
    ):[commentEventType]

    ownerEventDeleteComment(
      event_id: String
      comment_id: String
    ):[commentEventType]

    fetchCommentsEvent(
      event_id: String
      limit: Int
      offset: Int
    ):[commentEventType]

    timelineTalents(limit: Int, offset: Int): [ownerType]

    timelineEvents(limit: Int, offset: Int): eventsSuggestionType

    syncAllUsers(limit: Int, offset: Int):[ownerType]

    updateEventView(eventId: String):eventType

    externalShareEvent(eventId:String):String
  }

    type Subscription {
      testSubscription(test: String): String
    }
`;
