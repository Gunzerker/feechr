const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.

  type SearchType {
    _id: ID
    user_id: Int
    eventProfileImage: String
    eventName: String
    clubName: String
    clubImage: String
    fullName: String
    profile_image: String
    isTalent: Boolean
    type: String
    speciality: String
    country: String
    city: String
    tag: String
    posts_count: String
    country_code: String
  }

  type EventType {
    _id: ID
    eventProfileImage: String
    eventCoverImage: String
    eventName: String
    eventType: String
    eventDescription: String
    owner: ownerType
    clubId: ClubsType
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

  type ClubsType {
    _id: ID
    clubCoverImage: String
    clubImage: String
    clubName: String
    clubPurpose: String
    compressedClubImage: String
    category: CategoryType
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

  type HashTag {
    _id: ID
    tag: String
    posts_count: Int
  }

  type RecentSearch {
    _id: ID
    from: ID
    talent: ownerType
    hashTag: HashTag
  }

  type songType {
    _id: ID
    name: String
    author: String
    albumImage: String
    s3Url: String
    usedCount: Int
    duration: Int
    generatedByName: String
  }
  type File {
    _id: ID
    type: String
    url: String!
    file_name: String
    order: Int
    song: songType
    compressed_video: String
    thumbnail: String
    video_speed: Float
    isLandscape: Boolean
  }

  type Music {
    _id: String
    name: String
    author: String
    albumImage: String
    s3Url: String
    usedCount: Int
    duration: Int
    generatedByName: String
  }

  type Likes_posts {
    _id: ID!
    user: ownerType
    post: String
    relation: String
  }

  type Likes {
    _id: ID!
    user_id: Int
    email: String

    phone_number: String

    fullName: String

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
  }

  type CommentsComments {
    _id: String
    user: ownerType
    likes: [Likes]
    hashTags: [String]
    comment: String
    comments_likes_total: Int
    user_liked_post: String
    tags: [ownerType]
    createdAt: String
  }

  type Comments {
    _id: ID
    user: ownerType
    comments_comments: [CommentsComments]
    likes: [Likes]
    hashTags: [String]
    comment: String
    comments_likes_total: Int
    comments_comments_total: Int
    user_liked_post: String
    tags: [ownerType]
    createdAt: String
  }

  type Media {
    image: [String]
    video: [String]
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

  type PostCreated {
    _id: ID!
    owner: ownerType
    type: String
    description: String
    medias: mediaType
    visibility: Int
    category: String
    createdAt: String
    updatedAt: String
    post_likes: [Likes]
    post_comments: [Comments]
    post_likes_total: Int
    post_comments_total: Int
    post_views_total: Int
    post_parent_id: ID
  }

  type ReferencedPost {
    _id: ID
    owner: ownerType
    post_likes_total: Int
    type: String
    description: String
    medias: mediaType
    posted_as_admin: Boolean
    clubId: ClubsType
  }

  type FetchedPost {
    _id: ID!
    owner: ownerType
    type: String
    description: String
    textColor: String
    medias: mediaType
    visibility: Int
    category: String
    createdAt: String
    updatedAt: String
    post_likes: [Likes]
    post_comments: [Comments]
    #likes: [Likes]
    #comments: [Comments]
    post_likes_total: Int
    post_comments_total: Int
    post_views_total: Int
    post_parent_id: ReferencedPost
    user_liked_post: Boolean
    clubId: ClubsType
    tags: [ownerType]
    hashTags: [String]
    allowComments: Boolean
    active: Boolean
    total_posts: Int
    location: String
    feechr_up_count: Int
    feechr_up_user: [ownerType]
    posted_as_admin: Boolean
    eventId: refeechrEventType
    "this is you are a random user and subbed to this specific post"
    subbedToPost: Boolean
    "this if you are the owner and disabled your notifications"
    activeNotification: Boolean
    hashTagsCounts: Int
  }

  type eventLocationType {
    site: String
    latitude: String
    longitude: String
  }

  type pointType {
    loc: locType
  }

  type locType {
    type: String
    coordinates: [Float]
  }

  type ticketType {
    available: Boolean
    locations: [eventLocationType]
  }

  type memberType {
    user_id: ownerType
    invitationStatus: String
  }

  type refeechrEventType {
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
    tickets: ticketType
    category: CategoryType
    owner: ownerType
    clubId: ClubsType
    members: [memberType]
    belongStatus: Boolean
    comment_total_count: Int
    members_total_count: Int
    createdAt: String
    updatedAt: String
  }

  type UserStats {
    _id: ID
    totalPosts: Int
    totalLikes: Int
    totalViews: Int
  }

  type TagResult {
    _id: ID
    tag: String
  }

  type TagsOutput {
    user_id: Int
    image_url: String
    tag: String
  }

  #signal posts
  type SignalType {
    _id: ID!
    active: String
    reportMotif_id: String
    user_id: String
    post_id: String
    createdAt: String
    updatedAt: String
  }

  #create motif signal
  type SignalMotifType {
    _id: ID!
    tag_type: languageType
    parentId: subSignalMotifType
    active: Boolean
    createdAt: String
    updatedAt: String
  }

  type subSignalMotifType {
    _id: ID!
    tag_type: languageType
    active: Boolean
    createdAt: String
    updatedAt: String
  }

  input mediaInput {
    image: [String]
    video: [String]
  }

  input TagsInput {
    user_id: Int
    image_url: String
    tag: String
  }

  input PostUpdate {
    description: String
    visibility: Int
    category: String
    tags: [String]
    allowComments: Boolean
    location: String
    hashTags: [String]
    draft: Boolean
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    uploads: [File]
    fetcheSavedPosts: [FetchedPost]
    "fetch a club post for suggestion"
    fetchClubPostForSuggestion: [FetchedPost]
  }

  input SignalInput {
    post_id: String
    reportMotif_id: String
  }

  input SignalMotifInput {
    tag_type: language
    parentId: String
  }

  input language {
    fr: String
    en: String
    Ar: String
    de: String
    es: String
    ru: String
  }

  type languageType {
    fr: String
    en: String
    Ar: String
    de: String
    es: String
    ru: String
  }

  type Mutation {
    getMusics(
      offset: Int!
      limit: Int!
      "searchType : recent or trending"
      searchType: String!
      name: String
    ): [Music]

    getPostsByMusic(musicId: ID!, limit: Int!, offset: Int!): [FetchedPost]

    fetchReportMotifs(limit: Int!, offset: Int!): [SignalMotifType]

    singleUpload(
      postId: String
      file: Upload
      "type can be either 'post' or 'feechring' "
      type: String!
      description: String
      textColor: String
      " visibility can take value 0:public , 1:friends only , 2 private "
      songs: [String]
      visibility: Int!
      category: String!
      tags: [String]
      hashTags: [TagsInput]
      " pass the value of clubId if "
      clubId: String
      allowComments: Boolean
      "feechering_video_position can be either 'after' or 'with'"
      feechering_video_position: String
      " accept feechring by passing the value of the original post in 'original_post_id' "
      original_post_id: ID
      order: Int
    ): FetchedPost

    #### feecher here ####
    uploadMedia("either video or image" type: String, media: Upload): File!
    "this mutation is used to create a post , posts in groups  or accept a feechring  "
    createPost(
      "type can be either 'post' or 'feechring' "
      type: String!
      description: String
      textColor: String
      " visibility can take value 0:public , 1:friends only , 2 private "
      songs: [String]
      " type of the video"
      isLandscape: [Boolean]
      visibility: Int!
      category: String!
      tags: [String]
      hashTags: [String]
      media: [Upload]
      "pass the file name of the disired filters if none is selected then pass the string 'original'"
      filters: [String]
      "video speed : pass the speed of the video "
      video_speed: [Float]
      " pass the value of clubId if "
      clubId: String
      allowComments: Boolean
      "feechering_video_position can be either 'after' or 'with'"
      feechering_video_position: String
      " accept feechring by passing the value of the original post in 'original_post_id' "
      original_post_id: ID
      location: String
    ): FetchedPost

    createPostS3(
      "type can be either 'post' or 'feechring' "
      type: String!
      description: String
      textColor: String
      " visibility can take value 0:public , 1:friends only , 2 private "
      songs: [String]
      visibility: Int!
      category: String!
      tags: [String]
      hashTags: [TagsInput]
      media: [String]
      "pass the file name of the disired filters if none is selected then pass the string 'original'"
      filters: [String]
      "video speed : pass the speed of the video "
      video_speed: [Float]
      " pass the value of clubId if "
      clubId: String
      allowComments: Boolean
      "feechering_video_position can be either 'after' or 'with'"
      feechering_video_position: String
      " accept feechring by passing the value of the original post in 'original_post_id' "
      original_post_id: ID
      location: String
    ): FetchedPost
    "save a post to draft"
    saveDraft(
      type: String!
      description: String!
      textColor: String
      visibility: Int!
      category: String!
      media: [Upload!]
      clubId: String
      songs: [String]
      tags: [String]
      hashTags: [String]
      location: String
    ): FetchedPost

    saveDraftIOS(
      type: String!
      description: String!
      textColor: String
      visibility: Int!
      category: String!
      media: Upload
      clubId: String
      songs: [String]
      postId: String
      order: Int
    ): FetchedPost

    uploadToS3(object: Upload): String

    " update a draft "
    updateDraftToPost(postId: ID!, postUpdate: PostUpdate): FetchedPost
    " fetch current user drafts"
    fetchMyDrafts(
      limit: Int!
      "pages starts from 0"
      offset: Int!
    ): [FetchedPost]
    " fetch a specific draft by passing it's id "
    fetchDraftById(draftId: ID!): FetchedPost
    " discover posts "
    discoverPosts(
      limit: Int!
      "offset starts from 0"
      offset: Int!
      "filter takes : post or feechring or all"
      filter: String
    ): [FetchedPost]
    " updated a post created by the user"
    updatePost(postId: ID!, postUpdate: PostUpdate): FetchedPost
    " fetch a post by its id "
    findPostById(postId: ID!): FetchedPost
    " fetch the passed user id posts"
    findPostByUserId(
      userId: ID!
      limit: Int!
      "pages starts from 0"
      offset: Int!
      " to get the right following stautus you can refere to fetchUserProfil - relation - following status, if you are fetching your own profile following status is ignored "
      following_status: String
      "all , video , image"
      filter: String
    ): [FetchedPost]
    " like a post"
    likePost(postId: ID!): String
    " comment a post"
    commentPost(
      postId: ID!
      comment: String
      tags: [String]
      hashTags: [String]
    ): FetchedPost
    " like a comment "
    likeComment(postId: ID!, commentId: ID!): FetchedPost
    " comment a comment "
    commentAComment(
      postId: ID!
      commentId: ID!
      comment: String
      tags: [String]
      hashTags: [String]
    ): FetchedPost
    " like a commented comment"
    likeCommentComment(
      postId: ID!
      commentId: ID!
      subComment: ID!
    ): FetchedPost
    deleteComment(postId: ID!, commentId: ID!): String
    deleteCommentComment(postId: ID!, commentId: ID!, subComment: ID!): String
    updateComment(
      postId: ID!
      commentId: ID!
      updatedText: String
      tags: [String]
      hashTags: [String]
    ): String
    updateCommentCOmment(
      postId: ID!
      commentId: ID!
      subComment: ID!
      updatedText: String
      tags: [String]
      hashTags: [String]
    ): String
    " share a post"
    sharePost(
      postId: String
      description: String
      visibility: Int!
      category: String!
      tags: [String]
      hashTags: [String]
      allowComments: Boolean
      textColor: String
      postType: String
    ): FetchedPost
    " fetch current user friends posts"
    friendsPosts(limit: Int!, offset: Int!): [FetchedPost]
    " delete a post"
    deletePosts(postId: ID!): String
    " update the views count of a post"
    updateViewsCounter(postId: ID!): FetchedPost
    " fetch a clubs posts by passing the clubId"
    fetchClubPosts(
      clubId: ID!
      filter: String
      page: Int
      limit: Int
    ): [FetchedPost]

    " save a post "
    savePost(postId: ID): String

    " fetch current user saved posts"
    fetchMySavedPosts(limit: Int, offset: Int): [FetchedPost]

    " fetch the user stats (total like , total posts , total views)"
    fetchUserStats(userId: ID!): UserStats
    " suggest tags"
    searchHashTags(tag: String, limit: Int, offset: Int): [HashTag]
    # update user posts when he changes the profile visibility #
    # updatePostsVis(userId: ID, visibility: String): String #
    "hide a post"
    hidePost(
      postId: ID
      "always : true if the post is hidden permantly else always:false"
      always: Boolean
    ): String
    "fetch refeechring"
    fetchRefeechredPosts(
      original_post_id: ID
      limit: Int
      offset: Int
    ): [FetchedPost]
    fetchLikes(postId: ID, limit: Int, offset: Int): [Likes_posts]
    fetchPostsCounts(
      "filter takes : post or feechring or all"
      filter: String
    ): Int

    "this mutation will fetch all the users begining with the searchName string"
    suggestUsers(limit: Int, offset: Int, searchName: String): [ownerType]

    feechrup(
      media: [Upload]!
      "either 'with' or 'after'"
      type: String
      filters: [String]!
      song: [String]!
      video_speed: [Int]!
      description: String
      category: String
      post_parent_id: String!
      tags: [String]
      hashTags: [String]
    ): String

    "create signal post with : user_id from token and post_id"
    report(signalInput: SignalInput): SignalType

    "create signal motif with children if exists "
    reportMotif(signalMotifInput: SignalMotifInput): SignalMotifType

    "Trending talent profile"
    trendingTalent(limit: Int, offset: Int, category: Int): [FetchedPost]
    "Discover talent posts"
    discoverTalentPosts(limit: Int, offset: Int, category: Int): [FetchedPost]
    "Talents may intrests you"
    talentsMayIntrestsYou(limit: Int, offset: Int): [ownerType]
    "search in discover , it's used to search for the talents or friends : filter takes either 'top' or 'friends'"
    searchDiscoverTalents(
      limit: Int
      offset: Int
      search: String
      filter: String
    ): [ownerType]
    "fetch recent search for talents / friends"
    recentSearchTalent(limit: Int, offset: Int): [ownerType]
    "fetch recent search for clubs"
    recentSearchClubs(limit: Int, offset: Int): [ClubsType]
    "fetch recent search for events"
    recentSearchEvents(limit: Int, offset: Int): [EventType]
    "fetch recent search hashTags"
    recentSearchHashTags(limit: Int, offset: Int): [HashTag]
    "add to recent list , pass null if one is added instead of the other"
    addRecent(talentId: ID, hashTagId: ID, clubId: ID, eventId: ID): String
    "search clubs"
    searchDiscoverClubs(limit: Int, offset: Int, search: String): [ClubsType]
    "search hashTags search is passed without the #"
    searchDiscoverHashTags(limit: Int, offset: Int, search: String): [HashTag]
    "search discover events"
    searchDiscoverEvents(limit: Int, offset: Int, search: String): [EventType]
    "fetch posts by hashtags , tag is passed without the #"
    fetchPostsByHashTags(limit: Int, offset: Int, tag: String): [FetchedPost]
    refeechrEvent(
      " a refeechred event is a post with a populated eventId attribute and type is event "
      eventId: String
    ): FetchedPost
    "create HashTag"
    createHashTag(hashTag: [String]): String
    recentSearchDelete(
      "can be either 'event','club','hashTag','talent'"
      from: String
      _id: String
    ): String
    searchAll(limit: Int, offset: Int, search: String): [SearchType]
    fetchAllRecentSearch(limit: Int, offset: Int): [SearchType]
    externalSharePost(postId: ID!): String
  }
  type Subscription {
    postUpdated(roomId: String): FetchedPost
  }
`;
