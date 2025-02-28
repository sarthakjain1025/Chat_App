const mongoose=require('mongoose');
const memberSchema= new mongoose.Schema({
        group_id:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'Group'
        },
        user_id:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'User'
        }

},
{timestamps:true }   // The CURRENT_TIMESTAMP function returns the current date and time
);

module.exports = mongoose.model('Member', memberSchema);