const mongoose=require('mongoose');
const groupSchema= new mongoose.Schema({
        creator_id:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'User'
        },
        name:{
            type: String,
            required: true
        },
        image:{
            type:String,
            required:true
        },
        limit:{
            type:Number,
            required:true
        }

},
{timestamps:true }   // The CURRENT_TIMESTAMP function returns the current date and time
);

module.exports = mongoose.model('Group', groupSchema);