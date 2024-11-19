module.exports = (sequelize, DataTypes) => {
    const VerifProfil = sequelize.define(
      "verifProfil",
      {
        verifProfil_id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER
        },
        user_id: {
            type: DataTypes.INTEGER
          },
        username: {
          type: DataTypes.STRING
        },
        fullName: {
          type: DataTypes.STRING
        },
        known_as: {
          type: DataTypes.STRING
        },
        category: {
          type: DataTypes.INTEGER
        },
        image: {
          type: DataTypes.STRING        
        },
        active: {
          type: DataTypes.STRING
        }
  
      },
      {
        tableName: "verifProfil",
        timestamps: true
      }
    );

  VerifProfil.associate = function (models) {
    VerifProfil.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user'
    }),
    VerifProfil.belongsToMany(models["category"], {
      through: models["verifProfil_categories"],
      foreignKey: 'verifProfil_id',
      as: 'categories'
    })
  }  
    return VerifProfil;
  };