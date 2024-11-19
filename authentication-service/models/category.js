module.exports = (sequelize, DataTypes) => {
  const categoryModel = sequelize.define(
    "category",
    {
      category_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      parent_category_id: {
        type: DataTypes.INTEGER
      },
      categoryName: {
        type: DataTypes.STRING
      },
      categoryIconeUrl: {
        type: DataTypes.STRING
      },
      categoryImageUrl: {
        type: DataTypes.STRING
      },
      active: {
        type: DataTypes.STRING
      },
      language: {
        type: DataTypes.STRING
      }
    },
    {
      tableName: "category",
      timestamps: true
    }
  );

  categoryModel.associate = function (models) {

    categoryModel.hasMany(models["category"],{
      foreignKey: 'parent_category_id',
      as:"categories"
    }),
    categoryModel.belongsTo(models["category"], {
      foreignKey: "parent_category_id",
      as: "parent_category",
    }),
      categoryModel.belongsToMany(models["users"], {
        through: models["user_categories"],
        foreignKey: 'category_id',
        as: 'users'
      }),
      categoryModel.belongsToMany(models["verifProfil"], {
        through: models["verifProfil_categories"],
        foreignKey: 'category_id',
        as: 'verifProfils'
      })
  }





  return categoryModel;
};