const UserModel = require('./users');
const categoryModel = require('./category');

module.exports = (sequelize, DataTypes) => {
    const userCategoriesModel = sequelize.define(
        "user_categories",
        {
            userCategories_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            user_id: {
                type: DataTypes.INTEGER,

            },
            category_id: {
                type: DataTypes.INTEGER,

            },
        },
        {
            tableName: "user_categories",
            timestamps: false,
        }
    );

    userCategoriesModel.associate = function (models) {
        userCategoriesModel.belongsTo(models.users, {
            foreignKey: "user_id",
            as: "user",
        });
        userCategoriesModel.belongsTo(models.category, {
            foreignKey: "category_id",
            as: "category",
        });
    };

    return userCategoriesModel;
};