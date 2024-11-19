const VerifProfil = require('./verifProfil');
const categoryModel = require('./category');

module.exports = (sequelize, DataTypes) => {
    const verifProfil_categoriesModel = sequelize.define(
        "verifProfil_categories",
        {
            verifProfilCategories_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            verifProfil_id: {
                type: DataTypes.INTEGER,

            },
            category_id: {
                type: DataTypes.INTEGER,

            },
        },
        {
            tableName: "verifProfil_categories",
            timestamps: false,
        }
    );

    verifProfil_categoriesModel.associate = function (models) {
        verifProfil_categoriesModel.belongsTo(models.verifProfil, {
            foreignKey: "verifProfil_id",
            as: "verifProfils",
        });
        verifProfil_categoriesModel.belongsTo(models.category, {
            foreignKey: "category_id",
            as: "categories",
        });
    };

    return verifProfil_categoriesModel;
};