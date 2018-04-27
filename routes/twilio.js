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


router.post("/slack", function(req,res){
	if(req.body){
		if(req.body.event.type){
			console.log(req.body.event);
			if(req.body.event.type == 'message'){
				TextCustomer.findOne({slackChannel:req.body.event.channel}, function(err,found){
					if(err){
						console.log(err);
					} else {
						if(found){
							if(req.body.event.subtype){
								// console.log(req.body.event.file);
								if(req.body.event.subtype == 'file_share' && !req.body.event.file.is_public){
									web.files.sharedPublicURL(req.body.event.file.id, function(err,file){
										if(err){
											console.log(err);
										} else{

											var firstPart = file.file.url_private;
											var secret = file.file.permalink_public;

											// console.log(file.file);

											// client.messages.create({
											// 	to: found.phone,
											// 	from: '+14159158372',
											// 	mediaUrl: firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
											// });
											// var time = new Date();
											// var message = firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1);
											// found.chat.push({
											// 	message : message,
											// 	sender : 'Verb',
											// 	timestamp : time
											// });
											// found.save();

											client.messages.create({
				                                  to:found.phone,
				                                  from:'+14159158372',
				                                  mediaUrl: firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
				                                  statusCallback: 'https://dash.verbenergybar.com/twilioCallBack',
				                              }, function(err,message){
				                                  if(err){
				                                      console.log('ERROR - Sending slack text');
				                                      console.log('Phone: '+found.phone);
				                                      console.log(err);
				                                  } else{
				                                      found.chat.push({
				                                          message : firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
				                                          sender : 'Verb',
				                                          timestamp : new Date(),
				                                          messageID : message.sid,
				                                          status : 'pending'
				                                      });
				                                      found.save();
				                                  }
				                              });

										}
									});

								} else if(req.body.event.subtype == 'file_share'){

									var file = req.body.event.file;
									var firstPart = file.url_private;
									var secret = file.permalink_public;

									// console.log(file.file);
									client.messages.create({
		                                  to:found.phone,
		                                  from:'+14159158372',
		                                  mediaUrl: firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
		                                  statusCallback: 'https://dash.verbenergybar.com/twilioCallBack',
		                              }, function(err,message){
		                                  if(err){
		                                      console.log('ERROR - Sending slack text');
		                                      console.log('Phone: '+found.phone);
		                                      console.log(err);
		                                  } else{
		                                      found.chat.push({
		                                          message : firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
		                                          sender : 'Verb',
		                                          timestamp : new Date(),
		                                          messageID : message.sid,
		                                          status : 'pending'
		                                      });
		                                      found.save();
		                                  }
		                              });

									// client.messages.create({
									// 	to: found.phone,
									// 	from: '+14159158372',
									// 	mediaUrl: firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1),
									// });
									// var time = new Date();
									// var message = firstPart+'?pub_secret='+secret.slice(secret.lastIndexOf("-") + 1);
									// found.chat.push({
									// 	message : message,
									// 	sender : 'Verb',
									// 	timestamp : time
									// });
									// found.save();

								}
							} else {
								var regex = /:(.+?):/g;
								var messageBody = req.body.event.text.replace(regex, function(match,capture){
									return emoji.get(match);
								});


								client.messages.create({
	                                  body:messageBody,
	                                  to:found.phone,
	                                  from:'+14159158372',
	                                  statusCallback: 'https://dash.verbenergybar.com/twilioCallBack',
	                              }, function(err,message){
	                                  if(err){
	                                      console.log('ERROR - Sending slack text');
	                                      console.log('Phone: '+found.phone);
	                                      console.log(err);
	                                  } else{
	                                      found.chat.push({
	                                          message : messageBody,
	                                          sender : 'Verb',
	                                          timestamp : new Date(),
	                                          messageID : message.sid,
	                                          status : 'pending'
	                                      });
	                                      found.save();
	                                  }
	                              });
								// var time = new Date();
								// found.chat.push({
								// 	message : message,
								// 	sender : 'Verb',
								// 	timestamp : time
								// });

								// console.log('Message being sent is: '+message);

								// client.messages.create({
								// 	body:message,
								// 	to:found.phone,
								// 	from:'+14159158372'
								// });
								// found.save();
							}
						} else{
							//This will happen if we want to text someone that has never texted us 
						}
					}
				});
			}
		}

		res.sendStatus(200);
		
	} else {
		res.sendStatus(200);
	}

	
})

router.post("/twilioCall", function(req,res){
	// const VoiceResponse = twilio.twiml.VoiceResponse;

	// const twiml = new VoiceResponse();

	const twiml = new twilio.twiml.VoiceResponse();

	twiml.play({
	    loop: 1
	}, 'https://dash.verbenergybar.com/voicemail.mp3');


	res.header('Content-Type', 'text/xml');
  	res.send(twiml.toString());

	client.messages.create({
		body:'Call from '+req.body.From,
		to:'+17863008768',
		from:'+14159158372'
	});

});

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
						status : 'unread'
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
                    io.emit('chat message', data);


					

				} else{
					var firstReply = 'Thanks for texting! You can order TP by checking out online at monteiro-senior-project.herokuapp.com. Let me know if you have any questions!';

					TextCustomer.create({
						phone : req.body.From,
						firstName : 'Customer',
						lastName : '',
						chat : [
							{
								message : req.body.Body,
								sender : 'Customer',
								timestamp : new Date(),
								status : 'unread'
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
										sender : 'Verb',
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

					var payload = {
						token : process.env.SLACKTOKEN,
						channel : found.slackChannel,
						text : "",
						attachments : JSON.stringify([{title:"",image_url:req.body.MediaUrl0}]),
						as_user : false,
						icon_url : 'https://cdn2.iconfinder.com/data/icons/perfect-flat-icons-2/512/User_man_male_profile_account_person_people.png',
						username : found.firstName +' ' + found.lastName
					};

					slackPost('chat.postMessage', [payload]);



				} else {
					web.groups.create(req.body.From, function(err,res){
					// web.channels.create(req.body.From, function(err,res){
						if(err){
							console.log(err);
						} else {
							var finished = _.after(3, channelsCreated);

							web.groups.invite(res.group.id,process.env.ISAACSLACK, function(error,res){
							// web.channels.invite(res.channel.id,process.env.ISAACSLACK, function(error,res){
								if(err){
									console.log(err);
								} else {
									finished();
								}
							});

							web.groups.invite(res.group.id,process.env.MATTSLACK, function(error,res){
							// web.channels.invite(res.channel.id,process.env.MATTSLACK, function(error,res){
								if(err){
									console.log(err);
								} else {
									finished();
								}
							});

							web.groups.invite(res.group.id,process.env.BENNETTSLACK, function(error,res){
							// web.channels.invite(res.channel.id,process.env.BENNETTSLACK, function(error,res){
								if(err){
									console.log(err);
								} else {
									finished();
								}
							});

							function channelsCreated(){


								var payload = {
									token : process.env.SLACKTOKEN,
									// channel : res.channel.id,
									channel : res.group.id,
									text : "",
									attachments : JSON.stringify([{title:"",image_url:req.body.MediaUrl0}]),
									as_user : false,
									icon_url : 'https://cdn2.iconfinder.com/data/icons/perfect-flat-icons-2/512/User_man_male_profile_account_person_people.png',
									username : 'Customer'
								};

								slackPost('chat.postMessage', [payload]);

								TextCustomer.create({
									phone : req.body.From,
									// slackChannel : res.channel.id,
									slackChannel : res.group.id,
									firstName: 'Customer',
									lastName: '',
									chat : [
										{
											message : req.body.MediaUrl0,
											sender : 'Customer',
											timestamp : time
										}
									],
									totalOrders : 0,
    								totalValue : 0,
    								created : new Date()
								});
							}
						}
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
