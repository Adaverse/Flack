import os
from time import localtime, strftime

from flask import Flask, render_template, request, url_for, redirect, jsonify
from flask_socketio import SocketIO, emit, send, join_room, leave_room


app = Flask(__name__)
app.config["SECRET_KEY"] = 'some secret key'
socketio = SocketIO(app)

user_dict = {}
username_list = []
rooms = []
roomwise_msg = {}
test_roomwise_msg = {}

# passing username into the url 
@app.route("/<string:username>")
def index(username):
	''' Returns the index page '''
	
	return render_template('index.html', username = username, rooms = rooms)

@app.route('/username')
def username():
	''' Takes the display name of the user '''

	username = request.args.get('username')
	if username is None:
		return render_template('username.html')
	else:
		current_user = username
		user_dict[username] = None
		return redirect(url_for('index', username= username))

@app.route('/message/<string:room>')
def get_roomwise_message(room):
	''' return the message of a room '''

	return jsonify(test_roomwise_msg[room])

@app.route('/get_rooms')
def get_rooms():
	''' getting the rooms on refresh or when the page is first loaded ''' 

	return jsonify(rooms)


@socketio.on('create-room')
def create_room_handler(data):
	''' Announces the creation of a room '''

	rooms.append(data['room'])
	socketio.emit('create-room-announced', data)

@socketio.on('join-room')
def join_room_handler(data):
	''' User joins the room '''

	# when users joins the room 
	if data['room'] not in roomwise_msg:
		roomwise_msg[data['room']] = []
	join_room(data['room'])
	data['time_stamp'] = strftime('%b-%d %I:%M', localtime())
	socketio.emit('join-room-announced', data)

@socketio.on('leave-room')
def leave_room_handler(data):
	''' User leaves the room '''

	leave_room(data['room'])
	data['time_stamp'] = strftime('%b-%d %I:%M', localtime())
	socketio.emit('leave-room-announced', data)

# Sending message in a room
@socketio.on('send_message_join')
def send_message_join(data):
	''' Send the message to all the users in the room '''

	# storing the time stamp of the message
	data['time_stamp'] = strftime('%b-%d %I:%M', localtime())

	# if room is in test_roomwise_msg dict or else create one and insert the data
	if data['room'] in test_roomwise_msg:
		test_roomwise_msg[data['room']].append([data['username'], data['msg'], 
											   data['time_stamp'], data['room']])
	else:
		test_roomwise_msg[data['room']] = []
		test_roomwise_msg[data['room']].append([data['username'], data['msg'], 
											   data['time_stamp'], data['room']])

	emit('receive_message_join', data, room = data['room'])

@socketio.on('typing-alert')
def typing_alert_handler(data):
	''' alerts users that a person is typing in a room '''
	emit('receive-typing-alert', data, room = data['room'])

@socketio.on('remove-typing-alert')
def remove_typing_alert_handler(data):
	''' handler for typing alert ''' 
	emit('received-remove-typing-alert', data, room = data['room'])

if __name__ == "__main__":
	socketio.run(app, debug = True)
