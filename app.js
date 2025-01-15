const mongoose = require('mongoose');
 mongoose.connect('mongodb+srv://sarthakjain206:Sarthak.123@cluster2.hhpt5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster2',{

    connectTimeoutMS: 30000,
}); 
const express = require('express'); 
require('dotenv').config();

 const app=express();
 const http= require('http').Server(app);
const userRoute= require('./routes/userRoute');
const User=require('./models/userModel');
const Chat= require('./models/chatModel');
app.use(express.static('public'));


app.use('/', userRoute);
const io = require('socket.io')(http);
var usp=io.of('user-namespace');
usp.on('connection', async function(socket){
    console.log('User Connected');
    var user_id= socket.handshake.auth.token;
    await User.findByIdAndUpdate(user_id, { is_online: '1' });
    //user broadcast online status
    socket.broadcast.emit('getOnlineUser', { user_id: user_id });
    socket.on('disconnect', async function(){
        console.log('User Disconnected');
        await User.findByIdAndUpdate(user_id, { is_online: '0' });
            //user broadcast offline status
    socket.broadcast.emit('getOfflineUser', { user_id: user_id });
    });

    // Chatting implementation
    socket.on('newChat', function(data){
        socket.broadcast.emit('loadNewChat', data);
    })
    // load old chats
    socket.on('existsChat', async function(data){ 
        var chats= await Chat.find({$or:[           // agar await use kiya hai to function ke peeche async bhi lagana pdega
            { sender_id: data.sender_id, receiver_id: data.receiver_id},
            { sender_id: data.receiver_id, receiver_id: data.sender_id },
        ]});
        socket.emit('loadChats', {chats: chats});
    });
    // delete chats
    
    socket.on('chatDeleted', function(id){
        socket.broadcast.emit('chatMessageDeleted', id)
});

app.post('/delete-chat', async (req, res) => {
    try {
        const chatId = req.body.id;
        const chat = await Chat.findByIdAndDelete(chatId);  // Delete chat from DB

        if (!chat) {
            return res.json({ success: false, msg: 'Chat not found' });
        }

        res.json({ success: true });  // Send success response
    } catch (err) {
        res.json({ success: false, msg: 'Error deleting chat' });
    }
});

// update chats
socket.on('chatUpdated', function(updatedChat){
    
    io.emit('chatMessageUpdated', updatedChat);
});
app.post('/update-chat', async (req, res) => {
    try {
        const { id, message } = req.body;
        const chat = await Chat.findByIdAndUpdate(id, { message: message }, { new: true }); // Fetch updated chat
        if (!chat) {
            return res.json({ success: false, msg: 'Chat not found' });
        }
        io.emit('chatMessageUpdated', { id: chat._id, message: chat.message });

        res.json({ success: true, data: chat });
    } catch (err) {
        res.json({ success: false, msg: 'Error updating chat' });
    }
});


});

http.listen(3000,function(socket){
    console.log('Connected');
});