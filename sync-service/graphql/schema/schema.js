const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.

  type File {
    _id: ID
    type: String
    url: String!
    file_name: String
    order: Int
  }

  type messageResult {
    exists: Boolean
    channelId: ID
  }

  type messageType {
    type: String
    data: String
  }
  type userType {
    id: ID
    fullname: String
    profile_image: String
    banner: String
  }

  type Messages {
    _id: ID
    from_user: userType
    channel_id: String
    message: messageType
    read_status: Boolean
  }

  type MessagesFromUser {
    exists: Boolean
    messages: [Messages]
  }

  type Channels {
    _id: ID
    members: [userType]
    messages_counts: Int
    last_message: Messages
    status: String
  }

  input User {
    id: ID
    fullname: String
    profile_image: String
    banner: String
  }

  input Message {
    type: String
    data: String
  }

  input messageInput {
    type: String
    data: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    uploads: [File]
  }

  type Mutation {
    singleUpload(file: Upload): File!
    sendMessage(
      "if there is no channelId don't pass it , it's a check if a channel already exists or in need to create one "
      channelId: ID
      toUser: User
      message: messageInput
    ): messageResult
    fetchMessagesHistory(
      channelId: ID!
      limit: Int
      "offset start from 0"
      offset: Int
    ): [Messages]
    readMessage(messageId: ID): String
    "if it's null that means they never talked before , if it' an empty array you got to the end of the offset else an array of messages with the channel Id"
    fetchMessageFromUserId(
      userId: ID
      limit: Int
      "offset start from 0"
      offset: Int
    ): [Messages]
    fetchMyChannels(limit: Int, "offset start from 0" offset: Int ,"filter takes : all or read or unread or recent or stranger" filter:String): [Channels]
    # confirmeSubscription():
  }
  type Subscription {
    postUpdated(roomId: String): String
  }
`;
