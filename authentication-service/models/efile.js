module.exports = (sequelize, DataTypes) => {
    const EfileModel = sequelize.define(
      "efile",
      {
        efile_id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER
        },
        origin_name: {
          type: DataTypes.STRING
        },
        file_name: {
          type: DataTypes.STRING
        },
        uri: {
          type: DataTypes.STRING
        },
        active: {
          type: DataTypes.STRING
        },
        mimetype_file: {
          type: DataTypes.STRING
        },
        is_photo: {
          type: DataTypes.INTEGER
        },
        is_video: {
          type: DataTypes.STRING
        },
        is_attachement: {
          type: DataTypes.STRING
        },
        module: {
          type: DataTypes.STRING
        },
      },
      {
        tableName: "efile",
        timestamps: true
      }
    );
  
    return EfileModel;
  };
  