const User= require('../models/userModel');
const Chat= require('../models/chatModel');
const Group= require('../models/groupModel');
const Member= require('../models/memberModel');
const bcrypt =require('bcrypt');
const mongoose = require('mongoose');

const registerLoad = async (req, res) => {
    try {
        // Pass an empty message or any default value if necessary
        res.render('register');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('An error occurred while loading the register page.');
    }
};


const register= async(req,res)=>{
    try{
        const passwordHash= await bcrypt.hash(req.body.password, 10);
       const user=  new User({
            name: req.body.name,
            email:req.body.email,
            image:'images/'+ req.file.filename,
            password: passwordHash,
        })
        await user.save();
        res.render('register',{message: 'Your Registration has been completed!!'});
    } 
    catch(error)
    {
        res.render('register', { message: 'Registration failed: ' + error.message });
    }
}
const loadLogin= async(req,res)=>
{
    try{
        res.render('login');
    }
    catch(error)
    {
        console.log(error.message);
    }
}
const login= async(req,res)=>
{
    try{
        const email= req.body.email;
        const password= req.body.password;

        const userData= await User.findOne({email:email}); // to check database if email exists
        if(userData)
        {
           const passwordMatch = await bcrypt.compare(password, userData.password);
           if(passwordMatch)
           {
                req.session.user= userData;   // session mei saari info saved
                res.cookie(`user`, JSON.stringify(userData));
                res.redirect('/dashboard');
           }
           else
           {
            res.render('login', {message: 'Email and password is Incorrect'});
           }
        }
        else
        {
            res.render('login', {message: 'Email and password is Incorrect'});
        }
    }
    catch(error)
    {
        console.log(error.message);
    }
}
const logout= async(req,res)=>
{
    try{
        res.clearCookie('user');
        req.session.destroy();
        res.redirect('/');
    }
    catch(error)
    {
        console.log(error.message);
    }
}

const loadDashboard= async(req,res)=>
{
    try{
        var users= await User.find({ _id: { $nin:[req.session.user._id] } } ); //nin: not in
        res.render('dashboard', { user:req.session.user,users:users });
    }
    catch(error)
    {
        console.log(error.message);
    }
}

const saveChat= async(req,res)=>
{
    try{
      var chat= new Chat({
            sender_id:req.body.sender_id,
            receiver_id:req.body.receiver_id,
            message:req.body.message,
        });

       var newChat = await chat.save();
        res.status(200).send({ success:true, msg:'Chat inserted!', data:newChat});

    }
    catch(error)
    {
        res.status(400).send({ success:false,msg:error.message })
    }
}
const deleteChat = async (req, res) => {
    try {
        const result = await Chat.deleteOne({ _id: req.body.id }); // Await the deletion
        if (result.deletedCount === 0) {
            // Handle case where no document was deleted
            return res.status(404).send({ success: false, msg: 'Chat not found' });
        }
        res.status(200).send({ success: true, msg: 'Chat deleted successfully' });
    } 
    catch (error) {
        res.status(500).send({ success: false, msg: error.message }); // Corrected status code
    }
};

const updateChat = async (req, res) => {
    try {
        if (!req.body.id || !req.body.message) {
            return res.status(400).send({ success: false, msg: 'Chat ID and message are required' });
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            req.body.id, // ID should be passed directly
            { $set: { message: req.body.message } }, 
            { new: true } // Return the updated document
        );

        if (!updatedChat) {
            return res.status(404).send({ success: false, msg: 'Chat not found' });
        }

        // Assuming `io` is defined globally or passed in
        if (typeof io !== 'undefined') {
            io.emit('chatMessageUpdated', updatedChat);
        }

        res.status(200).send({ success: true, data: updatedChat });
    } 
    catch (error) {
        res.status(500).send({ success: false, msg: error.message });
    }
};


const loadGroups = async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user || !req.session.user._id) {
            return res.status(401).render('group', { message: 'Unauthorized access' });
        }

        const groups = await Group.find({ creator_id: req.session.user._id });

        // Ensure groups is always passed
        res.render('group', { groups: groups || [] });
    } catch (error) {
        console.log(error.message);
        res.status(500).render('group', { message: 'Error loading groups', groups: [] });
    }
};



const createGroup = async (req, res) => {
    try {
        // Validate session
        if (!req.session.user || !req.session.user._id) {
            return res.status(401).send("Unauthorized: User not logged in.");
        }

        // Validate request body
        const { name, limit } = req.body;
        if (!name || !limit || !req.file) {
            return res.status(400).render("group", {
                message: "All fields are required (name, limit, and image).",
            });
        }

        // Create group
        const group = new Group({
            creator_id: req.session.user._id,
            name: req.body.name,
            image: "images/" + req.file.filename,
            limit: req.body.limit,
        });

        // Save to database
        await group.save();

        // Redirect to the groups page after successful creation
        res.redirect('/groups');
    } catch (error) {
        console.error("Error creating group:", error.message);
        res.status(500).render("group", { message: "Failed to create group." });
    }
};

const getMembers = async (req, res) => {
    try {
        if (!req.body.group_id) {
            return res.status(400).send({ success: false, msg: "Group ID is required" });
        }

        const groupId = new mongoose.Types.ObjectId(req.body.group_id);
        const userId = new mongoose.Types.ObjectId(req.session.user._id);

        var users = await User.aggregate([
            {
                $lookup: {
                    from: "members",
                    localField: "_id",
                    foreignField: "user_id",
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$group_id", groupId] }
                            }
                        }
                    ],
                    as: "member"
                }
            },
            {
                $match: {
                    _id: { $nin: [userId] }
                }
            }
        ]);

        res.status(200).send({ success: true, data: users });
    } 
    catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};

const addMembers = async (req, res) => {
    try {
        if (!req.body.members) {
            return res.status(200).send({ success: false, msg: 'Please select at least one member' });
        }

        if (req.body.members.length > parseInt(req.body.limit)) {
            return res.status(200).send({ success: false, msg: 'You cannot select more than ' + req.body.limit + ' Members' });
        }

        await Member.deleteMany({ group_id: req.body.group_id });

        const data = req.body.members.map(member => ({
            group_id: req.body.group_id,
            user_id: member
        }));

        await Member.insertMany(data);

        res.status(200).send({ success: true, msg: 'Members added successfully' });
    } catch (error) {
        return res.status(400).send({ success: false, msg: error.message });
    }
};
const updateChatGroup = async (req, res) => {
    try{
        if(parseInt(req.body.limit) < parseInt(req.body.last_limit)){
            await Member.deleteMany({ group_id: req.body.id });
        }
        var updateObj;
        if(req.file !=undefined){
            updateObj = {
                name: req.body.name,
                image: 'images/' + req.file.filename,
                limit: req.body.limit
            };
    }
    else
    {
        updateObj = {
            name: req.body.name,
            limit: req.body.limit
        };
    }
    await Group.findByIdAndUpdate({ _id: req.body.id},{
        $set: updateObj
    });
    res.status(200).send({ success: true, msg: 'Chat group updated successfully' });
    }
    catch(error){
        res.status(400).send({ success: false, msg:error.message});
    }
}

const deleteChatGroup = async (req, res) => {
    try {
        await Group.deleteOne({ _id: req.body.id });
        await Member.deleteMany({ group_id: req.body.id });
        res.status(200).send({ success: true, msg: 'Group deleted successfully' });
    }
    catch (error) {
        res.status(500).send({ success: false, msg: error.message });
    }
    
}

const shareGroup = async (req, res) => {
    try {
        var groupData = await Group.findOne({ _id: req.params.id });
        if (!groupData) {
            return res.render('error', { message: 'Group not found' });
        }   
        if (!req.session.user) {
            return res.render('error', { message: 'Please login with Apni Gallan to continue!!' });
        }

        var totalMembers = await Member.countDocuments({ group_id: req.params.id });
        var available = groupData.limit - totalMembers;
        var isOwner = groupData.creator_id.toString() === req.session.user._id.toString();
        var isJoined = await Member.countDocuments({ group_id: req.params.id, user_id: req.session.user._id }) > 0;

        res.render('shareLink', { group: groupData, available,totalMembers, isOwner, isJoined });

    } catch (error) {
        console.error("Error sharing group:", error.message);
        res.status(500).render("group", { message: "Failed to share group." });
    }
};


module.exports = {
    registerLoad,
    register,
    loadDashboard,
    login,
    logout,
    loadLogin,
    deleteChat,
    saveChat,
    updateChat,
    loadGroups,
    createGroup,
    getMembers,
    addMembers,
    updateChatGroup,
    deleteChatGroup,
    shareGroup
};