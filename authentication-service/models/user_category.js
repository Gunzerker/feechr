const UserModel = require('./users');
const categoryModel = require('./category');

module.exports = (sequelize, DataTypes) => {
  const userCategoryModel = sequelize.define(
    "user_category",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: UserModel,
          key: "user_id",
        },
      },
      category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: categoryModel,
          key: "category_id",
        },
      },
    },
    {
      tableName: "user_category",
      timestamps: false,
    }
  );

  userCategoryModel.associate = function (models) {
    userCategoryModel.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
    });
  };

    userCategoryModel.associate = function (models) {
      userCategoryModel.belongsTo(models.category, {
        foreignKey: "category_id",
        as: "category",
      });
    };

  return userCategoryModel;
};