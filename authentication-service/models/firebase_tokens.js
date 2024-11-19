module.exports = (sequelize, DataTypes) => {
  const firebaseModel = sequelize.define(
    "firebase",
    {
      firebase_PK: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      firebase_token: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "firebase_tokens",
      timestamps: false,
    }
  );

  return firebaseModel;
};
