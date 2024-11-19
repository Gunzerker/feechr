const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require("sequelize");
const path = require('path');

const models = require("./models/db_init");
const cors = require("cors");
require('./middleware/passport');

const app = express();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

app.use('/',express.static('.well-known'));

app.use(require('./routes/index'));
app.use(cors());
app.set('trust proxy', true);
app.all('*', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization ,Accept');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Expose-Headers', 'Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
  });

// app.get('/', async (request, response) => {
//         const sql = "select * from produit";
//         const result = await models.sequelize.query(sql,{
//             type:models.sequelize.QueryTypes.SELECT
//         })
//         console.log(result)
//         response.json({ info: 'Node.js, Express, and Postgres API' })
//     });

app.listen(3030, () => {
        console.log("server has started on port 3030!!!");
    });
