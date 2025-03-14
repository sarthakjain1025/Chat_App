(function($) {

	"use strict";

	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	$(document).ready(function() {
		
		$('#sidebarCollapse').on('click', function () {
		  $('#sidebar').toggleClass('active');
		});
	  });
	  

})(jQuery);
 
function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}
var userData= JSON.parse(getCookie('user'));
console.log('Cookie Data', userData)

var sender_id = userData._id;
    var receiver_id;
    var socket = io('/user-namespace', {
        auth: {
            token: userData._id  // Pass user._id in the auth token for socket connection
        }
    });

    socket.on('connect', () => {
        console.log('Connected to server with token:', '<%= user._id %>');
    });

    $(document).ready(function () {
        $('.user-list').click(function () {
            var UserId = $(this).attr('data-id');
            receiver_id = UserId;
            $('.start-head').hide();
            $('.chat-section').show();

            socket.emit('existsChat', { sender_id: sender_id, receiver_id: receiver_id });
        });

        // Update user online status
        socket.on('getOnlineUser', function (data) {
            $('#' + data.user_id + '-status').text('Online').removeClass('offline-status').addClass('online-status');
        });

        // Update user offline status
        socket.on('getOfflineUser', function (data) {
            $('#' + data.user_id + '-status').text('Offline').addClass('offline-status').removeClass('online-status');
        });

        // Save chats of user
        $('#chat-form').submit(function (event) {
            event.preventDefault(); // message send krne se refresh nahi hoga ab.
            var message = $('#message').val();
            $.ajax({
                url: '/save-chat',
                type: 'POST',
                data: { sender_id: sender_id, receiver_id: receiver_id, message: message },
                success: function (response) {
                    if (response.success) {
                        $('#message').val('');
                        let chat = response.data.message;
                        let html = `<div class="current-user-chat" id='` + response.data._id + `'>
                            <h5><span>` + chat + `</span>
                                <i class="fa fa-trash" aria-hidden="true" data-id='` + response.data._id + `' data-toggle="modal" data-target="#deleteChatModal"></i>
                                <i class="fa fa-edit" aria-hidden="true" data-id='` + response.data._id + `' data-msg='`+chat+`'data-toggle="modal" data-target="#editChatModal"></i>
                            </h5>
                        </div>`;

                        $('#chat-container').append(html);
                        socket.emit('newChat', response.data);

                        scrollChat();
                    } else {
                        alert(response.msg);
                    }
                }
            });
        });

        socket.on('loadNewChat', function (data) {
            if (sender_id == data.receiver_id && receiver_id == data.sender_id) {
                let html = `<div class="distance-user-chat" id='` + data._id + `'>
                    <h5><span>` + data.message + `</span></h5>
                </div>`;

                $('#chat-container').append(html);
            }

            scrollChat(); 
        });

        // Load old chats
        socket.on('loadChats', function (data) {
            $('#chat-container').html('');
            var chats = data.chats;

            let html = '';
            for (let x = 0; x < chats.length; x++) {
                let addClass = chats[x]['sender_id'] == sender_id ? 'current-user-chat' : 'distance-user-chat';
                
                html += `
                <div class='` + addClass + `' id='` + chats[x]['_id'] + `'>
                    <h5><span>` + chats[x]['message'] + `</span>
                        ${chats[x]['sender_id'] == sender_id ? 
                        `<i class="fa fa-trash" aria-hidden="true" data-id='` + chats[x]['_id'] + `' data-toggle="modal" data-target="#deleteChatModal"></i>
                         <i class="fa fa-edit" aria-hidden="true" data-id='` + chats[x]['_id'] + `' data-msg='`+chats[x]['message']+`'data-toggle="modal" data-target="#editChatModal"></i>` : ''}
                    </h5>
                </div>`;
            }
            $('#chat-container').append(html);

            scrollChat();
        });

        function scrollChat() { // jab kholte hai to latest chat pehle dikhegi
            $('#chat-container').animate({
                scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
            }, 0);
        }

        // Handle delete chat
        $(document).on('click', '.fa-trash', function() { // jab delete icon pe click hoga to kya hoga
            let msg = $(this).parent().text();
            $('.delete-message').text(msg.trim());
            $('#delete-message-id').val($(this).attr('data-id'));
        });

        $('#delete-chat-form').submit(function(event) { // delete button dabane pe jo hoga uska function
            event.preventDefault();  // refresh nahi hone
            var id = $('#delete-message-id').val();
            $.ajax({
                url: '/delete-chat',
                type: 'POST',
                data: { id: id },
                success: function(res) {
                    if (res.success== true) {
                        $('#' + id).remove();
                        $('#deleteChatModal').modal('hide');
                        socket.emit('chatDeleted', id);          // broadcast krne ke liye doosre taraf ke user se bhi delete kro chat
                    } else {
                        alert(res.msg);
                    }
                }
            });
        });

        // Listen for chat deletion
        socket.on('chatMessageDeleted', function(id) {
            $('#' + id).remove();
        });
    });

    // update user chat
    $(document).on('click','.fa-edit',function(){
        $('#edit-message-id').val($(this).attr('data-id') );
        $('#update-message').val($(this).attr('data-msg') );
    });

    $('#update-chat-form').submit(function(event) { // update button dabane pe jo hoga uska function
            event.preventDefault();  // refresh nahi hone
            var id = $('#edit-message-id').val();
            var msg = $('#update-message').val();

            $.ajax({
                url: '/update-chat',
                type: 'POST',
                data: { id: id, message:msg },
                success: function(res) {
                    if (res.success) {
                        $('#editChatModal').modal('hide');
                        $('#' + id).find('span').text(msg);
                        $('#' + id).find('.fa-edit').attr('data-msg',msg); // msg bhi update krna pdega aur span bhi
                        socket.emit('chatUpdated', {id:id, message:msg });          // broadcast krne ke liye doosre taraf ke user se bhi update kro chat
                    } else {
                        alert(res.msg);
                    }
                },
                error: function() {
            alert('An error occurred while updating the chat.'); // Handle AJAX errors
        }
            });
        });

        socket.on('chatMessageUpdated', function(data){
    // Find the chat element in the DOM
    
    $('#'+data.id).find('span').text(data.message);

});


// add member js

$('.addMember').click(function () {
    var id = $(this).attr('data-id');
    var limit = $(this).attr('data-limit');

    $('#group_id').val(id);
    $('#limit').val(limit);

    $.ajax({
        url: '/get-members',
        type: 'POST',
        data: { group_id: id },
        success: function (res) {
            console.log(res); // Debugging output

            if (res.success == true) {
                let users = res.data;
                let html = '';

                for (let i = 0; i < users.length; i++) {
                    let isMemberOfGroup = users[i]['member'] && users[i]['member'].length > 0;

                    html += `
                        <tr>
                            <td>
                                <input type="checkbox" ${isMemberOfGroup ? 'checked' : ''} 
                                    name="members[]" value="${users[i]['_id']}"/>
                            </td>
                            <td>${users[i]['name']}</td>
                        </tr>
                    `;
                }

                $('.addMembersInTable').html(html);
            } else {
                alert(res.msg);
            }
        }
    });
});


// add member from submit code

$('#add-member-form').submit(function(event){
    event.preventDefault();

    var formData= $(this).serialize();
    $.ajax({
        url:"/add-members",
        type:"POST",
        data:formData,
        success:function(res){

            if(res.success){
                $('#memberModal').modal('hide');
                $('#add-member-form')[0].reset();
                alert(res.msg);
            }
            else
            {
                $('#add-member-error').text(res.msg);
                setTimeout(()=>{
                    $('#add-member-error').text('');
                },3000);
            }
        }
    })
});

//update group script
$('.updateMember').click(function(){
    var obj= JSON.parse($(this).attr('data-obj'));

    $('#update_group_id').val(obj._id);
    $('#last_limit').val(obj.limit);
    $('#group_name').val(obj.name);
    $('#group_limit').val(obj.limit);


});

$('#updateChatGroupForm').submit(function(e){
    e.preventDefault();

    var formData = new FormData(this);
   

    $.ajax({
        url: "/update-chat-group",
        type: "POST",
        data: formData,
        contentType: false,
        cache: false,
        processData: false,
        success: function(res){
            
            alert(res.msg);
            if(res.success){
                location.reload();
            } else {
                $('#update-group-error').text(res.msg);
                setTimeout(() => {
                    $('#update-group-error').text('');
                }, 3000);
            }
        },
        error: function(xhr, status, error) {
            
            $('#update-group-error').text('An error occurred while updating the group.');
            setTimeout(() => {
                $('#update-group-error').text('');
            }, 3000);
        }
    });
});


//delete group script
$('.deleteGroup').click(function(){

    $('#delete_group_id').val($(this).attr('data-id'));
    $('#delete_group_name').val($(this).attr('data-name'));
});

$('#deleteChatGroupForm').submit(function(e){
    e.preventDefault();

    var formData = $(this).serialize();

    $.ajax({
        url: "/delete-chat-group",
        type: "POST",
        data: formData,
        success: function(res){
            alert(res.msg);
            if(res.success){
                location.reload();
            }
        },
        error: function(xhr, status, error) {
            alert('An error occurred while deleting the group.');
        }
    });
}
);

// copy shareable link

$('.copy').click(function(){
    
    $(this).prepend('<span class="copied_text">Copied</span>');
   var group_id = $(this).attr('data-id');
   var url = window.location.host+'/share-group/'+group_id;
   var temp= $("<input>");
    $("body").append(temp);
    temp.val(url).select();
    document.execCommand("copy");
    temp.remove();
    setTimeout(()=>{
        $('.copied_text').remove();
    },2000);
}
);