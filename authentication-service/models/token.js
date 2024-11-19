module.exports = (sequelize, DataTypes) => {
    const tokenModel = sequelize.define(
      "token",
      {
        token_id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER
        },
        tokenGeneratedAt: {
          type: DataTypes.DATE
        },
        codeGeneratedAt: {
          type: DataTypes.DATE
        },
        socialMediaAuth: {
          type: DataTypes.STRING
        },
        token: {
          type: DataTypes.STRING
        },
        reset_code: {
          type: DataTypes.STRING
        },
        email: {
          type: DataTypes.STRING
        },
        phone_number: {
          type: DataTypes.STRING
        },
        country_code: {
          type: DataTypes.STRING
        },
        user_id: {
          type: DataTypes.INTEGER
        },
        appleId: {
          type: DataTypes.STRING
        }

        //   active: {
        //     type: DataTypes.STRING
        //   },
      },
      {
        tableName: "token",
        timestamps: false
      }
    );
  
    return tokenModel;
  };