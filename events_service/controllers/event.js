const User = require("../models/Users")
const Event = require("../models/event")
const EventMember = require("../models/eventMember");
const EventComments = require("../models/eventComments");

class interestController {

    async fetchEventById(req, res) {
        const { payload: { obj } } = req;
        const { eventId } = req.body
       // console.log("req.headers", obj);
        try {
            /*get my events */
            let event = await Event.findOne({
                '_id': eventId
            })

            let user = await User.findOne({
                user_id: `${obj.user_id}`
            })

            console.log("userMongoId",user);

            // check if belong to event
            let checkBelongToEvent = await Event.find({
                $or: [
                    { owner: `${user._id}` },
                    {
                        $and: [
                            { 'members.user_id': `${user._id}` },
                            { 'members.invitationStatus': `going` }
                        ]
                    }
                ]
            })

            // belong status
            let belongArray = [];
            belongArray = checkBelongToEvent.map(event => event._id);
            let arrayIdToString = belongArray.toString().split(',');

            // update belongStatus
            let newString = event._id.toString();
            if (arrayIdToString.includes(newString)) {
                event.belongStatus = true;
            } else {
                event.belongStatus = false;
            }

            // update members count
            let membersCount = await EventMember.find({
                '_id': event._id,
                'invitationStatus': 'going'
            })
            event.members_total_count = membersCount.length;

            // update comments count
            
            let commentsCount = await EventComments.find({
                'event_id': event._id,
            })
            event.comment_total_count = commentsCount.length;


            await Event.populate(event, "members.user_id")
            await Event.populate(event, "owner");
            await Event.populate(event, "clubId");
            return res.status(200).json({ data: event })
        } catch (err) {
            console.log("fetchEventById err", err);
            return reject(err);
        }
    }


}

module.exports = interestController;
