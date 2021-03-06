var DrawingBoard = DrawingBoard || {};

DrawingBoard.initDrawingBoard = function(username) {
	this.config = {
		chatip: (window.location.href.indexOf("localhost") >-1) ? "http://localhost:81" : "http://rtdrawingboardchat.jit.su:80",
		drawingip: (window.location.href.indexOf("localhost") >-1 ) ? "http://localhost:82" : "http://rtdrawingboarddraw.jit.su:80",	
	};

	this.initializeCanvases();
	var self = this;
	this.room = this.Utils.getParam("room");
	if(this.room == undefined) {
	this.room = "Lobby"
	}

	this.username = this.Utils.getGuestName();

	this.userData = {
		name: this.username, 
		room: this.room,
		provider: "drawingboard",
		brushData: { 
			brushName: "line",
			brushColor: "rgb(230, 51, 51)",
			brushWidth: 1,
		}
	}

	this.connectToEventsServer();
	this.connectToChatServer();

	var owner = this.Users.initialize(this.socket, this.userData, function () {
		self.drawCurrentBrush();
	});

	this.owner = owner;
	this.users = this.Users.getUsers();
	

	this.Chat.initialize(this.chatsocket, owner, this.users);
	
	this.Events.bindEventHandlers(this.canvas, this.socket, this.chatsocket, owner,
	 	//callback for emitting events
		function (location) {
			self.refresh(location);
		}, 
		//callback for drawingnd over
		function (eventType, userID, brushlocation) {
			self.draw(eventType, userID, brushlocation)
		}, 
		//callback for sending chat messages
		function (message) {
			self.Chat.sendChatMessage(message);
		},
		//callback for changing brush color locally and over network
		function (color, uid) {
			self.changeBrushColor(color, uid);
			if(uid == self.owner.uid) { 
				self.emitBrushColor(color, uid);
			}
		},
		//callback for changing brush size locally and over network
		function (width, uid) {
			self.changeBrushWidth(width, uid);
			if(uid == self.owner.uid) {
				self.emitBrushWidth(width, uid);
			}
		});
}

DrawingBoard.initializeCanvases = function() {
	var canvas = document.getElementById("drawingboard");
	var context = canvas.getContext("2d");
	this.brushViewContext = document.getElementById("brush").getContext("2d");
	this.brushViewContext.canvas.width = 100;
	this.brushViewContext.canvas.height = 100;
	this.brushlocation = {x:0, y:0};
	this.context = context;
	this.canvas = canvas;
}


DrawingBoard.emitBrushColor = function(color, id) {
	this.socket.emit('changebrushcolor', {c: color, uid: id});
}

DrawingBoard.emitBrushWidth = function(width, id) {
	this.socket.emit('changebrushwidth', {w: width, uid: id});
}

DrawingBoard.changeBrushWidth = function(width, uid) {
	var user = this.users[uid];
	user.changeBrushWidth(width);
	if(uid == this.owner.uid) {
		this.drawCurrentBrush();
	}
}

DrawingBoard.changeBrushColor = function(color, uid) {
	var user = this.users[uid];
	user.changeBrushColor(color);
	if(uid == this.owner.uid) {
		this.drawCurrentBrush();
	}
}

DrawingBoard.setBrushLocation = function(brushlocation) {
	this.brushlocation = brushlocation;
}

DrawingBoard.refresh = function(location) {
		var event = this.Events.getNextMouseEvent();

		if(event.type == "mousedown") {
			this.paint = true;
			this.socket.emit('mousedown', {
					brushlocation: location,
					ownerId:this.owner.uid,
					room: this.room
				});
		} 

		if(event.type == "mousemove") {
			if(this.paint == true) {
				this.socket.emit('mousemove', {
					brushlocation: location,
					ownerId:this.owner.uid,
					room: this.room
				});
			}
		}

		if(event.type == "mouseup") {
			this.paint = false;
				this.socket.emit('mouseup', {
					brushlocation: location,
					ownerId:this.owner.uid,
					room: this.room
				});
		}
}

DrawingBoard.connectToEventsServer = function () {
	var socket = io.connect(this.config.drawingip);
	this.socket = socket;
}

DrawingBoard.connectToChatServer = function () {
	var chatsocket = io.connect(this.config.chatip);
	this.chatsocket = chatsocket;
}

DrawingBoard.setBrush = function(brush) {
	this.activeBrush = brush;
}

DrawingBoard.drawCurrentBrush = function() {
	var thisuser = this.users[this.owner.uid];
	thisuser.drawCurrentBrush(this.brushViewContext);
}

DrawingBoard.draw = function(eventType, userID, brushlocation) {
	if(this.users[userID]!=null) {
		var user = this.users[userID];
		user.draw(brushlocation, this.context, eventType);
	}
}

DrawingBoard.initSocialUser = function() {
	this.Events.initSocialUser(this.userData);
}

DrawingBoard.changeOwner = function(owner) {
	this.owner = owner;
	this.Users.setOwnerId(owner);
}