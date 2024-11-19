const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.

  type songType {
    _id: ID
    name: String
    author: String
    albumImage: String
    s3Url: String
    usedCount: Int
    duration: Int
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

  type Likes {
    _id: ID!
    user_id: String
    fullname: String
    profile_image: String
    gender: String
  }

  type FetchedRules {
    _id: String
    club: String
    title: String
    description: String
    isDefault: Boolean
  }

  type CommentsComments {
    _id: String
    user_id: String
    fullname: String
    comment: String
    profile_image: String
    gender: String
    likes: [Likes]
    comments_likes_total: Int
  }

  type Comments {
    _id: ID
    user_id: String
    fullname: String
    comment: String
    profile_image: String
    gender: String
    likes: [Likes]
    comments_comments: [CommentsComments]
    comments_likes_total: Int
    comments_comments_total: Int
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
    already_invited: Boolean
    profilLink: String
    type:String
  }

  type userType {
    id: String
    fullname: String
    profile_image: String
    gender: String
  }

  type imageType {
    _id: ID
    url: String
  }

  type videoType {
    _id: ID
    url: String
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
  }

  type FetchedPost {
    _id: ID!
    owner: ownerType
    type: String
    description: String
    medias: mediaType
    visibility: Int
    category: String
    createdAt: String
    updatedAt: String
    post_likes_total: Int
    post_comments_total: Int
    post_views_total: Int
    tags: [ownerType]
    hashTags: [String]
    allowComments: Boolean
    active: Boolean
    total_posts: Int
    location: String
    posted_as_admin: Boolean
  }

  type rulesType {
    _id: ID
    titleRule: String
    descriptionRule: String
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

  type FetchedClub {
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
    members_count: Int
    user_role: String
    "when the admin invites the user"
    pending_invite: Boolean
    "when the user joins a private club"
    join_request: Boolean
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
    user_club: ownerType
    is_subed:Boolean
  }

  type FetchedRequests {
    _id: ID
    status: String
    from_user: ownerType
    clubId: ID
    createdAt: String
    updatedAt: String
  }

  type FetchedClubsRoles {
    clubOwner: [FetchedClub]
    clubModerateur: [FetchedClub]
    clubAdmin: [FetchedClub]
    clubMember: [FetchedClub]
  }

  type FetchedClubMember {
    user: ownerType
    status: String
  }

  input Rules {
    _id: ID
    titleRule: String
    descriptionRule: String
  }

  input mediaInput {
    image: [String]
    video: [String]
  }

  input PostInput {
    type: String
    media: mediaInput
  }

  input FileInput {
    _id: ID!
    type: String
    url: String!
  }

  input PostUpdate {
    media: mediaInput
    description: String
    visibility: Int
    category: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    uploads: [File]
    " fetch clubs that the user is either clubOwner clubModerateur clubAdmin clubMember "
    fetchClubs: FetchedClubsRoles
  }

  type Mutation {
    singleUpload(file: Upload): File!

    #### feecher here ####
    " create a club "
    createClub(
      "it's the club cover first then the club image"
      imageUpload: [Upload]
      clubName: String
      clubPurpose: String
      category: Int
      " 0:public , 2:private"
      privacy: Int
      allowMembersToPost: Boolean
      tiktok: String
      instagram: String
      twitter: String
      facebook: String
      youtube: String
      tumblr: String
      vkontakte: String
      skype: String
      usersToInvite: [ID]
    ): FetchedClub

    " find a club by it's id"
    findClubById(clubId: ID!): FetchedClub
    " delete a club"
    deleteClub(clubId: ID!): String
    " leave a joined club "
    leaveClub(clubId: ID!): String
    " update a club "
    updateClub(
      clubId: ID
      "it's the club cover first then the club image , pass null if either of them is not passed or empty array"
      clubName: String
      clubPurpose: String
      category: Int
      " 0:public , 2:private"
      privacy: Int
      allowMembersToPost: Boolean
      tiktok: String
      instagram: String
      twitter: String
      facebook: String
      youtube: String
      tumblr: String
      vkontakte: String
      skype: String
    ): FetchedClub
    " join a public club"
    joinClub(clubId: ID!): String
    " get the club join requests for a specified clubId"
    fetchClubRequests(clubId: ID!): [FetchedRequests]
    " handle the join club requests "
    handleClubRequests(
      requestId: ID!
      clubId: ID
      " takes one of these values accepted , refused"
      status: String
    ): FetchedRequests
    " revoke a role from a member of the club"
    revokeRoles(clubId: ID!, userId: ID!): String
    " update a role from a member of the club target takes : member , moderator , admin , owner"
    updateRoles(
      clubId: ID!
      "it's _id of the user"
      userId: ID!
      target: String
    ): String
    " kick a member from the club"
    kickUser(clubId: ID!, userId: ID!): String
    " create club rules"
    createRules(club: ID!, title: String, description: String): FetchedRules
    " update club rules"
    updateRules(ruleId: ID!, title: String, description: String): FetchedRules
    "delete Rules"
    deleteRule(ruleId: ID): String
    "clubs that the users manage"
    clubsIManage(limit: Int, offset: Int): [FetchedClub]
    "clubs i belongs to"
    clubsIBelongTo(limit: Int, offset: Int): [FetchedClub]
    " suggest clubs in the timeLine for the current user"
    timeLineClubs(limit: Int, offset: Int): [FetchedClub]
    "fetch club rules"
    fetchRules(clubId: ID!, limit: Int, offset: Int): [FetchedRules]
    "update club profile image"
    updateClubProfileImage(clubId: ID, profile: Upload): FetchedClub
    "update club profile cover"
    updateClubCoverImage(clubId: ID, cover: Upload): FetchedClub
    "feecher clubs"
    feechrClubs(limit: Int, offset: Int): [FetchedClub]
    "suggest users to invite"
    suggestUsers(
      limit: Int
      offset: Int
      search: String
      "pass the clubId when inviting the user after they were created"
      clubId: ID
    ): [ownerType]
    "fetch club members"
    fetchClubMember(
      limit: Int
      offset: Int
      search: String
      clubId: ID
    ): [FetchedClubMember]
    "fetch pending posts"
    fetchPendingPosts(limit: Int, offset: Int, clubId: ID): [FetchedPost]
    "handle posts requests"
    handlePostsRequests(
      postId: ID
      clubId: ID
      "'accept' or 'decline'"
      verdict: String
    ): String
    "invite member to club"
    inviteMember(userId: ID, clubId: ID): String
    "block a club"
    blockClub(clubId: ID): String
    "report club"
    reportClub(clubId: ID, motifId: ID): String
    "remove club join request"
    removeMyJoinRequest(clubId: ID): String
    "accept invite request"
    acceptInviteRequest(clubId: ID): String
    "decline invite request"
    declineInviteRequest(clubId: ID): String
    "external share for clubs"
    externalShareClub(clubId:ID):String
  }
  type Subscription {
    postUpdated: FetchedPost
  }
`;
