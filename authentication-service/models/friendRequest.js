module.exports = (sequelize, DataTypes) => {
  const friendRequestModel = sequelize.define(
    "friendRequest",
    {
      friendRequest_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      from_user_id: {
        type: DataTypes.INTEGER
      },
      to_user_id: {
        type: DataTypes.INTEGER
      },
      date_accept_following: {
        type: DataTypes.DATE
      },
      date_unfollowing: {
        type: DataTypes.DATE
      },
      date_following: {
        type: DataTypes.DATE
      },
      following_status: {
        type: DataTypes.STRING
      },
      active: {
        type: DataTypes.STRING
      },
      hideType: { type: DataTypes.STRING },
      hideDuration: { type: DataTypes.DATE },

    },
    {
      tableName: "friendRequest",
      timestamps: true
    }
  );

  // friendRequestModel.associate = function (models) {
  //   friendRequestModel.belongsTo(models.users, {
  //     foreignKey: 'to_user_id',
  //     as: 'to_user'
  //   })
  // }

  friendRequestModel.associate = function (models) {
    friendRequestModel.belongsTo(models.users, {
      foreignKey: 'to_user_id',
      as: 'to_user'
    }),
      friendRequestModel.belongsTo(models.users, {
        foreignKey: 'from_user_id',
        as: 'from_user'
      })
  }

  return friendRequestModel;
};