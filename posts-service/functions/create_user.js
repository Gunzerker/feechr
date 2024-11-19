const User = require("../models/User");

async function create(){
    await User.create({id:27,fullname:"houssem",profile_image:"image.png",bio:"fun"})
}

create()