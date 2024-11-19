module.exports = (sequelize, DataTypes) => {
  const UserModel = sequelize.define(
    "users",
    {
      user_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      fullName: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.STRING
      },
      password: {
        type: DataTypes.STRING
      },
      phone_number: {
        type: DataTypes.STRING
      },
      country_code: {
        type: DataTypes.STRING
      },
      dateOfBirth: {
        type: DataTypes.DATE
      },
      gender: {
        type: DataTypes.STRING
      },
      visibility: {
        type: DataTypes.STRING
      },
      profile_image: {
        type: DataTypes.STRING
      },
      profile_image_compressed: {
        type: DataTypes.STRING
      },
      cover_image: {
        type: DataTypes.STRING
      },
      cover_image_compressed: {
        type: DataTypes.STRING
      },
      socialMediaAuth: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING
      },
      followers_count: {
        type: DataTypes.INTEGER
      },
      following_count: {
        type: DataTypes.INTEGER
      },
      likes_count: {
        type: DataTypes.INTEGER
      },
      posts_count: {
        type: DataTypes.INTEGER
      },
      views_count: {
        type: DataTypes.INTEGER
      },
      description: {
        type: DataTypes.STRING
      },
      speciality: {
        type: DataTypes.STRING
      },
      talent_Category_id: {
        type: DataTypes.INTEGER
      },
      isVerified: {
        type: DataTypes.BOOLEAN
      },
      isTalent: {
        type: DataTypes.BOOLEAN
      },
      country: {
        type: DataTypes.STRING
      },
      city: {
        type: DataTypes.STRING
      },
      profilLink: {
        type: DataTypes.STRING
      },
      appleId: {
        type: DataTypes.STRING
      },
      active: {
        type: DataTypes.STRING
      },
      tiktok: {
        type: DataTypes.STRING
      },
      instagram: {
        type: DataTypes.STRING
      },
      twitter: {
        type: DataTypes.STRING
      },
      facebook: {
        type: DataTypes.STRING
      },
      youtube: {
        type: DataTypes.STRING
      },
      tumblr: {
        type: DataTypes.STRING
      },
      vkontakte: {
        type: DataTypes.STRING
      },
      skype: {
        type: DataTypes.STRING
      },
      location: {
        type: DataTypes.STRING
      },

    },
    {
      tableName: "users",
      timestamps: true
    }
  );

  UserModel.associate = function (models) {
    // UserModel.belongsTo(models.category, {
    //   foreignKey: 'categoryId',
    //   as: 'category'
    // })
      UserModel.belongsTo(models["category"], {
        foreignKey: 'talent_Category_id',
        as: 'talent'
      }),
      UserModel.belongsToMany(models["category"], {
        through: models["user_categories"],
        foreignKey: 'user_id',
        as: 'category'
      })
    //,
    // UserModel.hasMany(models.category, {
    //   foreignKey: 'user_id',
    //   as: 'categories'
    // })
  }


  return UserModel;
};