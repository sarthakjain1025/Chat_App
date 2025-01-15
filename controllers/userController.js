const User= require('../models/userModel');
const Chat= require('../models/chatModel');
const bcrypt =require('bcrypt');

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



module.exports= {registerLoad, register, loadDashboard, login, logout,loadLogin,deleteChat, saveChat,updateChat}