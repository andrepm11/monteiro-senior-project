var stripeTestKey = process.env.STRIPETEST; 
var stripeLiveKey = process.env.STRIPELIVE; 

var express = require("express");
var router = express.Router();
var bodyParser  = require("body-parser");
var mongoose    = require("mongoose");
var models = require("../texttobuy/models/customer.js");
var TextCustomer = models.TextCustomer;
var TextConversation = models.TextConversation;
var TextOrder = models.TextOrder;
var SchoolInfo = models.SchoolInfo;
var WebClient = require('@slack/client').WebClient;
var web = new WebClient(process.env.SLACKTOKEN);
var request = require('request');
var emoji = require('node-emoji');
var _  = require("underscore");
var sanitize = require('mongo-sanitize');

var isLoggedIn = require("../isLoggedIn.js");

var stripe = require("stripe")(stripeTestKey);
// var stripe = require("stripe")(stripeLiveKey);

var accountSid = process.env.twilioSID;
var authToken = process.env.twilioAUTH; 
var twilio 	= require("twilio");
var client = new twilio(accountSid, authToken);
var MessagingResponse = require('twilio').twiml.MessagingResponse;

var app = require('../app.js');
var io = app.io;

var slackPost = require("../slackPost.js");

var sentiment = require('node-sentiment');





router.post("/phoneredirect", function(req,res){
	console.log(req.body.Body);

	client.messages.create({
		body:req.body.Body,
		to:'+17863008768',
		from:'+17864603490'
	});

	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end();

});

router.post("/twilioCallBack", function(req,res){
	// console.log('Twilio Call Back');
	// console.log(req.body);

	console.log('Updating message status of messageID: '+req.body.MessageSid);
	TextCustomer.update({"chat.messageID":req.body.MessageSid},
		{'$set':
			{'chat.$.status':req.body.MessageStatus}
		},
		function(err){
			if(err){
				console.log('Error updating message status');
				console.log(err);
			}
	});

	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end();

});

router.post("/twilio", function(req,res){

	req.body.From = req.body.From.substr(req.body.From.length - 10);
	if(req.body.Body){
		req.body.Body = sanitize(req.body.Body);

		TextCustomer.findOne({"phone" : req.body.From}, function(err,found){
			if(err){
				console.log(err);
			} else {
				var time = new Date();
				if(found){


					found.chat.push({
						message : req.body.Body,
						sender : 'Customer',
						timestamp : time,
						status : 'unread',
						sentiment : sentiment(req.body.Body).vote
					});
					found.lastInteraction = time;
					found.waitingOnResponse = true;
					found.save();

					// io.emit('trial');
					
					var data = {};
					data.sender = 'customer';
					data.message = req.body.Body;
					data.phone = found.phone;
					data.timestamp = time;
                    data.firstName = found.firstName;
                    data.lastName = found.lastName;
                    data.sentiment = sentiment(req.body.Body).vote;
                    io.emit('chat message', data);


					

				} else{

					var firstReply = 'Thanks for texting! You can order by checking out online at monteiro-senior-project.herokuapp.com. Let me know if you have any questions!';

					TextCustomer.create({
						phone : req.body.From,
						firstName : 'Customer',
						lastName : '',
						chat : [
							{
								message : req.body.Body,
								sender : 'Customer',
								timestamp : new Date(),
								status : 'unread',
								sentiment : sentiment(req.body.Body).vote
							}
						],
						totalOrders : 0,
						totalValue : 0,
						created : new Date()
					}, function(err,created){
						if(err){
							console.log(err);
						} else {

							client.messages.create({
								body:firstReply,
								to:req.body.From,
								from:'+17864603490',
								statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
							}, function(err,message){
								if(err){
                                    console.log('ERROR - Sending contact card text');
                                    console.log('Phone: '+phone);
                                    console.log(err);
                                } else {
                                	created.chat.push({
										message : firstReply,
										sender : 'Company',
										timestamp : new Date(),
										messageID : message.sid,
										status : 'pending'
									});
									created.save();
                                }
							});


						}
					});
				}

				res.writeHead(200, {'Content-Type': 'text/xml'});
				res.end();
			}
		});
	} else if(req.body.MediaUrl0){
		TextCustomer.findOne({"phone" : req.body.From}, function(err,found){
			if(err){
				console.log(err);
			} else {
				if(found){
					var time = new Date();

					found.chat.push({
						message : req.body.MediaUrl0,
						mediaURL : req.body.MediaUrl0,
						sender : 'Customer',
						timestamp : time,
						status : 'unread'
					});
					found.lastInteraction = time;
					found.waitingOnResponse = true;

					found.save();


				} else {
		

					TextCustomer.create({
						phone : req.body.From,
						firstName: 'Customer',
						lastName: '',
						chat : [
							{
								message : req.body.MediaUrl0,
								sender : 'Customer',
								timestamp : new Date(),
								status : 'unread'
							}
						],
						totalOrders : 0,
						totalValue : 0,
						created : new Date(),
						lastInteraction : new Date()
					});
							
				}
			}
		});

		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end();

		
	} else {
		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end();
	}
});


module.exports = router;
