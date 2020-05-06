var current_room = ''; 
var room_check = false;

// the rooms this client is a part of.
var users_room = [];

// the current room where the message is being exchanged by this client.
var message_room = '';

// Connect to websocket
var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

// When connected, log it on the console
socket.on('connect', () => {
	console.log('connected')
});

// This fucntion loads all rooms when the page is loaded
function load_rooms() {
	document.querySelector('#room-list').innerHTML = '';

	const request = new XMLHttpRequest();
	request.open('GET', '/get_rooms');

	request.onload = () => {
		console.log('i was here .....')
		var response = JSON.parse(request.responseText);
		var t = Handlebars.compile("<li class = 'list-of-rooms' data-room = {{ room }}>#{{ fill }}</li> <br> <button class = 'click-to-join-room' data-room = {{ room }} type='button'>Join</button>")

		for( var i = 0; i < response.length; i++){
			var content = t({'room': response[i].split(' ')[0], 'fill': response[i]});
			document.querySelector('#room-list').innerHTML += content;
		};

	};

  request.send();
};

// loads all the rooms
load_rooms()

// load the messages of a room when clicked by the user by making a request from the server
function load_messages(room) {
	document.querySelector('#chat-space').innerHTML = '';

	// Creating greeting message
	var p = document.createElement('p')
	p.innerHTML = `Welcome to room <strong>${room}</strong>`
	p.style.textAlign = 'center'
	document.querySelector('#chat-space').append(p)

	// making a get request
	const request = new XMLHttpRequest();
	request.open('GET', `/message/${room}`);

	request.onload = () => {
		var response = JSON.parse(request.responseText);

		// templates to render depending on the which user receives the message
		var template = Handlebars.compile("<p class = 'single-message'><strong>{{username}}</strong> : {{ message }} <br> <em>{{ time_stamp }}</em></p><br>");
		var template1 = Handlebars.compile("<p class = 'single-message-left'><strong>{{username}}</strong>: {{ message }} <br> <em> {{ time_stamp }}</em> </p><br>")

		for (var i = 0; i < response.length; i++){ 
			// if current user 
			if (response[i][0] === username){
				var content1 = template1({'username': response[i][0], 
										  'message': response[i][1],
										  'time_stamp': response[i][2]
										});
				document.querySelector('#chat-space').innerHTML += content1;
				document.querySelector('#chat-space').innerHTML += '<br>';
			}
			else{
				var content = template({'username': response[i][0],
									    'message': response[i][1],
										'time_stamp': response[i][2]
										});
				document.querySelector('#chat-space').innerHTML += content;
				document.querySelector('#chat-space').innerHTML += '<br>';
			};
		};
	};
	request.send();
};

// when create room button is clicked
document.querySelector('#create-room-button').onclick = () => {
	var room = prompt('Room name')

	if (room){
		socket.emit('create-room', {'room':room, 'username':username})
	};
};

// announce room creation to all users 
socket.on('create-room-announced', function(data){
	var template = Handlebars.compile("<li class = 'list-of-rooms' data-room = {{ room }}>#{{ fill }}</li> <button class = 'click-to-join-room' data-room = {{ room }} type='button'>Join</button>")
	const content = template({'fill':data.room + ' created by ' + data.username, 'room': data.room})

	users_room.push(content)
	document.querySelector('#room-list').innerHTML += content
});

// get into message room, join-room, 
document.querySelector('#room-list').addEventListener('click', function(event){
	console.log(event.target.tagName)

	// if room name is clicked => load all the saved messages from the server
	if (event.target.tagName == 'LI'){
		load_messages(event.target.dataset.room);
		message_room = event.target.dataset.room;
	};

	// if join button of a particular room is clicked => users joins the room
	document.querySelectorAll('.click-to-join-room').forEach(function(button){
		button.onclick = function() {

			//convert join button to a leave button
			if (this.innerHTML == 'Join'){
				this.innerHTML = 'Leave';
				var room = this.dataset.room;
				current_room = room;
				console.log(room);
				users_room.push(room);
				socket.emit('join-room', {'room':room, 'username':username})
			}
			else{

				// if user leaves the room
				this.innerHTML = 'Join';
				var room = this.dataset.room;

				// remove this room from user's room
				for(var i = 0; i < users_room.length; i++){
					if ( users_room[i] === this.dataset.room ){
						console.log('removing : ' + users_room[i])
						users_room.splice(i, 1);
					};
				};
				socket.emit('leave-room', {'room':room, 'username':username})
			};
		};
	});

}, true) // using capturing

// announce leave room message to all users in the same room
socket.on('leave-room-announced', function(data){
	const p = document.createElement('p');
	if (users_room.includes(data.room)){
		p.innerHTML = '<strong>' + data.username + '</srong>' + ' left the room ' + data.room
	}
})

// annouce to users in the same room
socket.on('join-room-announced', function(data){
	const p = document.createElement('p');
	// broadcast to users who are in the room
	console.log(users_room.includes(data.room))
	if (users_room.includes(data.room)){
		p.innerHTML = '<strong>' + data.username + '</strong>' + ' joined the room ' + data.room;
		document.querySelector('#chat-space').append(p);
	}

});

// select room before you send the message and enable the button
var room_list = document.querySelectorAll('.list-rooms')
for(var i = 0; i < room_list.length; i++){
    room_list[i].addEventListener("click", function(){
    	console.log('clicked')
        current_room = this.innerHTML;
    }); 
}

// send message in a room 
document.querySelector('#send_message').onclick = () =>{
	console.log(message_room)
	// console.log(document.querySelector('#user_message').value)
	if (message_room){
		socket.emit('send_message_join', {'msg':document.querySelector('#user_message').value,
										  'username':username, 
										  'room':message_room });
	};
	// user_msg[username].push(document.querySelector('#user_message').value);
	document.querySelector('#user_message').value = '';

	// auto focus on the text box
	document.querySelector('#user_message').focus();
}

// message received by the users in the current_room
socket.on('receive_message_join', (data) => {
	console.log(data.username)
	const p = document.createElement('p');
	
	if(data.username === username){
		p.className = 'single-message-left';
	}
	else{
		p.className = 'single-message';
	};

	p.innerHTML = '<strong>' + data.username + '</strong> : ' + ' ' + data.msg + '<br> <em>' + data.time_stamp + '</em>';
	if (users_room.includes(message_room) & (data.room == message_room)){
		document.querySelector('#chat-space').append(p);
		document.querySelector('#chat-space').innerHTML += '<br>'
	};
});


// make enter key submit the message
var msg = document.querySelector('#user_message');
msg.addEventListener('keyup', event => {
	event.preventDefault();
	if (event.keyCode === 13) {
		document.querySelector('#user_message').click();
	}
})

// event listener for user typing
var current = false;
document.querySelector('#user_message').addEventListener('input', () => {
	current = true;
})

// alert message if user types something
socket.on('receive-typing-alert', (data) => {
	if (data.username === username){
		document.querySelector('#typing-alert').innerHTML = '';
	}
	else{
		document.querySelector('#typing-alert').innerHTML = data.username + ' is typing';
	}
});

socket.on('received-remove-typing-alert', (data) => {
	document.querySelector('#typing-alert').innerHTML = '';
})

// checks if user is still typing or not
function update() {
	if( current ){
		socket.emit('typing-alert', {
			'username':username,
			'room':message_room
		});
		console.log('typing')
		current = false;
	}
	else{
		socket.emit('remove-typing-alert', {
			'room':message_room
		});
	}
}

// update the update function after every second
setInterval(update, 1000); // Time in milliseconds
