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


	var closed = false;

	var smsCount = req.session.counter || 0;
	req.session.counter = smsCount + 1;

	console.log(req.body);
	req.body.From = req.body.From.substr(req.body.From.length - 10);
	if(req.body.Body){
		req.body.Body = sanitize(req.body.Body);

		// req.body.From = req.body.From.substr(req.body.From.length - 10);
		console.log(req.body.Body);

		// var messageReceived = _.after(1, pushToDialogFlow);
		var messageReceived = _.after(1, closedfunc);

		TextCustomer.findOne({"phone" : req.body.From}, function(err,found){
			if(err){
				console.log(err);
			} else {
				var time = new Date();
				if(found){
					var payloads = [];

					var payload = {
						token : process.env.SLACKTOKEN,
						channel : found.slackChannel,
						text : req.body.Body,
						as_user : false,
						icon_url : 'https://cdn2.iconfinder.com/data/icons/perfect-flat-icons-2/512/User_man_male_profile_account_person_people.png',
						username : found.firstName +' '+found.lastName
					};

					if(req.body.MediaUrl0){
						payload['attachments'] = JSON.stringify([{title:"",image_url:req.body.MediaUrl0}]);
					}
					payloads.push(payload);

					// slackPost('chat.postMessage', payload);
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



					if(closed){
						console.log('here');

						var firstReply = 'Thanks for texting Verb! The Harvard-Yale text to buy number is now closed. We\'ll reach out when we have new stuff coming!';
						client.messages.create({
							body:firstReply,
							to:req.body.From,
							from:'+14159158372'
						});
						payload = {
							token : process.env.SLACKTOKEN,
							channel : found.slackChannel,
							text : firstReply,
							as_user : false,
							username : 'Verb Bot'
						};
						payloads.push(payload);
						// slackPost('chat.postMessage', payload);
					}

					slackPost('chat.postMessage', payloads);
					messageReceived();

					

				} else{
					web.groups.create(req.body.From, function(err,res){
					// web.channels.create(req.body.From, function(err,res){
						if(err){
							console.log(err);
						} else {
							var finished = _.after(2, channelsCreated);

							// web.groups.invite(res.group.id,process.env.ISAACSLACK, function(error,res){
							// // web.channels.invite(res.channel.id,process.env.ISAACSLACK, function(error,res){
							// 	if(err){
							// 		console.log(err);
							// 	} else {
							// 		finished();
							// 	}
							// });
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
								// console.log(res.channel.id);
								// console.log(req.body.Body);

								var payloads = [];

								var payload = {
									token : process.env.SLACKTOKEN,
									channel : res.group.id,
									// channel : res.channel.id,
									text : req.body.Body,
									as_user : false,
									icon_url : 'https://cdn2.iconfinder.com/data/icons/perfect-flat-icons-2/512/User_man_male_profile_account_person_people.png',
									username : 'Customer'
								};
								if(req.body.MediaUrl0){
									payload['attachments'] = JSON.stringify([{title:"",image_url:req.body.MediaUrl0}]);
								}
								payloads.push(payload);

								// slackPost('chat.postMessage', payload);

								if(closed){
									var firstReply = 'Thanks for texting Verb! The Harvard-Yale text to buy number is now closed. We\'ll reach out when we have new stuff coming!';
								} else{
									// var firstReply = 'Welcome to Verb\'s text-to-buy for Harvard-Yale! You can text us whenever you want and we\'ll respond ASAP. You can buy Verb Bars here for just $1 per bar with free delivery. To buy Verb Bars, just text something like "BUY 6 BARS" or "SAUCE ME 10 BARS". Go Bulldogs!';
									var firstReply = 'Welcome to Verb\'s text-to-buy beta! You can order Verb Bars by texting this number. Let us know if you have any questions!';
								}

								TextCustomer.create({
									phone : req.body.From,
									// slackChannel : res.channel.id,
									slackChannel : res.group.id,
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
											from:'+14159158372',
											statusCallback: 'https://dash.verbenergybar.com/twilioCallBack'
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

										payload = {
											token : process.env.SLACKTOKEN,
											// channel : res.channel.id,
											channel : res.group.id,
											text : firstReply,
											as_user : false,
											username : 'Verb Bot'
										};
										payloads.push(payload);

										slackPost('chat.postMessage', payloads);
									}
								});
								messageReceived();
							}
						}
					});
				}
			}
		});


		function closedfunc(){


			res.writeHead(200, {'Content-Type': 'text/xml'});
			res.end();
		}

		function pushToDialogFlow(){
			var request = apiapp.textRequest(req.body.Body, {
			    sessionId: req.body.SmsSid
			});
			 
			request.on('response', function(response) {


				if(response.result.metadata.intentName == 'FALLBACK'){
					console.log('fallback');
					res.writeHead(200, {'Content-Type': 'text/xml'});
					res.end();
				}
				else if(response.result.metadata.intentName == 'BUY'){
					console.log('Buy');
					console.log(response.result);

					if(response.result.parameters.Purchase == 'buy'){
						console.log('here');

						TextCustomer.findOne({"phone": req.body.From}, function(err,found){
							if(err){
								console.log(err);
							} else{
								var message = '';

								if(found){
									if(response.result.parameters.number){
										req.session.buyQuant = parseInt(response.result.parameters.number);
										console.log(req.session.buyQuant);

										if(response.result.parameters.Product){
											console.log(response.result.parameters);
											var item = response.result.parameters.Product.toUpperCase();
										} else {
											var item = 'BOX';
										}

										if(found.customerId){
											console.log('Customer exists');
											stripe.customers.retrieve(found.customerId, function(err, customer) {
												console.log(customer);

												stripe.customers.retrieveCard(customer.id,customer.default_source, function(err, card){
													console.log(card);

													// response.result.parameters.number = parseInt(response.result.parameters.number);
													// req.session.buyQuant = response.result.parameters.number;

													const twiml = new MessagingResponse();
													twimlMessage = twiml.message();

													if(req.session.buyQuant){
														SchoolInfo.findOne({"school":found.school}, function(err,info){
															if(err){
																console.log(err);
															} else {
																if(info){
																	// if(item == 'PACK' || item == 'BOX'){
																	if(item == 'BOX' && req.session.buyQuant >= 1){
																		if(parseInt(info.inventory) - req.session.buyQuant*10 > 100){
																			message = "Your card ending in \'"+card.last4+"\' will be charged a value of $"+(req.session.buyQuant*10).toString()+".00. Reply CONFIRM to complete order, or UNDO to order later.";
																			found.status = 'WAITCONFIRM';
																			info.waitForConfirms +=1;
																			info.save();
																			found.save();
																		} else{
																			message = "Unfortunately, we're out of Verb Bars right now! We'll let you know as soon as we're back in stock.";
																			found.status = 'OUTOFSTOCK';

																			req.session.buyQuant = 0;
																		}
																		
																	} else if (item=='BOX'){
																		message = 'We\'re currently selling Verb Bars with a minimum order size of 1 box (10 bars). Bars are just $1 each.';
																		found.status = 'BUYERROR';
																		req.session.buyQuant = 0;

																	}else {
																		message = 'If you want to buy bars, just reply BUY # where # is however many boxes you want (10 bars per box). Bars are just $1 each.';
																		found.status = 'BUYERROR';
																		req.session.buyQuant = 0;
																	}
																	// found.save();
																	
																	twimlMessage.body(message);
																	res.writeHead(200, {'Content-Type': 'text/xml'});
																	res.end(twiml.toString());

																	var payloads = [];
																	var payload = {
																		token : process.env.SLACKTOKEN,
																		channel : found.slackChannel,
																		text : message,
																		as_user : false,
																		username : 'Verb Bot'
																	};
																	payloads.push(payload);

																	slackPost('chat.postMessage', payloads);
																	
																	var time = new Date();

																	found.chat.push({
																		message : message,
																		sender : 'Verb',
																		timestamp : time
																	});
																	found.save();


																}
															}
														});
													} else {
														message = "Cannot buy 0 or fewer boxes.";
														found.status = 'BUYERROR';
														twimlMessage.body(message);
														res.writeHead(200, {'Content-Type': 'text/xml'});
														res.end(twiml.toString());
													

														var payload = {
															token : process.env.SLACKTOKEN,
															channel : found.slackChannel,
															text : message,
															as_user : false,
															username : 'Verb Bot'
														};


														slackPost('chat.postMessage', [payload]);
														
														var time = new Date();

														found.chat.push({
															message : message,
															sender : 'Verb',
															timestamp : time
														});
														found.save();
													}

													// TextConversation.findOne({"phone" : req.body.From}, function(err,found){
													// 	if(err){
													// 		console.log(err);
													// 	} else {
													// 		var time = new Date();
													// 		if(found){


													// 			found.chat.push({
													// 				message : message,
													// 				sender : 'Verb',
													// 				timestamp : time
													// 			});
													// 			found.save();

													// 		}
													// 	}
													// });



												});

											});

										} else {
											console.log('Customer doesn\'t exist');


											if(req.session.buyQuant >= 1){
												message = 'Complete your checkout at: ';

												var url = 'dash.verbenergybar.com/checkout?q='+(req.session.buyQuant).toString()+'&phone='+req.body.From;
											} else {
												message = 'The minimum order size is 1 box. Complete your checkout at: ';
												req.session.buyQuant = 1;

												var url = 'dash.verbenergybar.com/checkout?phone='+req.body.From;

											}
											googl.shorten(url, process.env.GOOGLEURL, function(err, shortUrl) {
											    if (err) {
											        throw err;
											    }
											    
												message += shortUrl;
											
												const twiml = new MessagingResponse();
												twimlMessage = twiml.message();

												
												twimlMessage.body(message);

												res.writeHead(200, {'Content-Type': 'text/xml'});
												res.end(twiml.toString());

												var payload = {
													token : process.env.SLACKTOKEN,
													channel : found.slackChannel,
													text : message,
													as_user : false,
													username : 'Verb Bot'
												};

												slackPost('chat.postMessage', [payload]);
												found.status = 'RECEIVEDLINK';
												var time = new Date();
												found.chat.push({
													message : message,
													sender : 'Verb',
													timestamp : time
												});
												found.save();
											});

											// TextConversation.findOne({"phone" : req.body.From}, function(err,found){
											// 	if(err){
											// 		console.log(err);
											// 	} else {
											// 		var time = new Date();
											// 		if(found){

											// 			found.chat.push({
											// 				message : message,
											// 				sender : 'Verb',
											// 				timestamp : time
											// 			});
											// 			found.save();

											// 		}
											// 	}
											// });

										}
									} else {


										const twiml = new MessagingResponse();
										twimlMessage = twiml.message();
										message = 'The minimum order size is 1 box (10 bars per box). Complete your checkout at: ';

										var url = 'dash.verbenergybar.com/checkout?&phone='+req.body.From;
										googl.shorten(url, process.env.GOOGLEURL, function(err, shortUrl) {
										    if (err) {
										        throw err;
										    }
											    
											message += shortUrl;

										
											twimlMessage.body(message);

											req.session.buyQuant = 3;

											res.writeHead(200, {'Content-Type': 'text/xml'});
											res.end(twiml.toString());

											var payload = {
												token : process.env.SLACKTOKEN,
												channel : found.slackChannel,
												text : message,
												as_user : false,
												username : 'Verb Bot'
											};


											slackPost('chat.postMessage', [payload]);
											found.status = 'BUYERROR';
											var time = new Date();
											found.chat.push({
												message : message,
												sender : 'Verb',
												timestamp : time
											});
											found.save();
										});

									}
									// console.log("Your card ending in \"");

									// Confirm order and post to charge
								} else{

									console.log('Shouldn\'t be here');

									// If Customer doesn't exist
									// Should never happen
								}
							}
						});
					} else {
						res.writeHead(200, {'Content-Type': 'text/xml'});
						res.end();
					}
				}
				else if(response.result.metadata.intentName == 'CONFIRM'){
					console.log(req.session.buyQuant);
					TextCustomer.findOne({"phone": req.body.From}, function(err,found){
						if(err){
							console.log(err);
						} else {

							var message = '';
							var chargeSuccess = false;

							if(found){
								if(req.session.buyQuant >= 1 && found.customerId){
									chargeSuccess = true;
									TextOrder.findOne({},null,{sort:{"invoiceNumber":-1}}, function(err,order){
										if(err){
											console.log(err);
										} else {
											if(order){
												console.log(order.invoiceNumber);
												console.log(order.invoiceNumber.substr(3));
					    						var number = parseInt(order.invoiceNumber.substr(3))+1;
					    						console.log(number);
					    						// console.log()
					    						var newOrder = 'VRB'+number.toString();
					    					} else{
					    						var newOrder = 'VRB1000';
					    					}

					    					var price = 15;
											stripe.charges.create({
					    						amount:req.session.buyQuant*price*100,
					    						currency:'usd',
					    						customer: found.customerId,
					    						description: req.session.buyQuant.toString()+" Boxes of Verb Bars",
												receipt_email: found.email,
												metadata: {'invoiceNumber':newOrder}
					    					}, function(err,charge){
					    						if(err){
					    							console.log(err);
					    							message = 'Sorry, it seems like your order didn\'t go through. Let me look into what happened.';
					    						} else {
					    							SchoolInfo.findOne({"school":found.school}, function(err,info){
					    								if(err){
					    									console.log(err);
					    								} else {
					    									info.inventory-=charge.amount/100;
					    									info.confirmPurchases+=1;
					    									info.barsSold+=charge.amount/100;
					    									info.save();

					    									if(req.body.school == 'Wesleyan'){
																var message ='New order has come in! Reply "'+newOrder+'" to claim the delivery.';
																var payload = {
																	token : process.env.SLACKTOKEN,
																	channel : found.repSlack,
																	text : message,
																	as_user : false,
																	username : 'Verb Bot'
																};

																slackPost('chat.postMessage', [payload]);
															}
					    								}
					    							});
					    							message = 'Your order of ' +req.session.buyQuant.toString()+' box(es) of Verb Bars has been completed! One of us will text you shortly to deliver your bars.';
					    							
						    						TextOrder.create({
						    							firstName : found.firstName,
						    							lastName : found.lastName,
														invoiceNumber : newOrder,
														customerPhone : found.phone,
													    stripeCharge : charge.id,
													    items : [
													        {
													            id : 'oatsandcocoa-box',
													            name : 'Boxes of Verb Bars',
													            quantity : req.session.buyQuant,
													            price : price,
													            totalPrice : req.session.buyQuant*price,
													        }
													    ],
													    shipping : {
													        shippingType : found.address.shippingAddress.address1,
													        status : 'Pending'
													    },
													    orderType : 'Text',
													    school : found.school,
													    completionDate : new Date(),
													    paid : charge.amount / 100,
													});
													
													found.orders.push({'invoiceNumber':newOrder});

						    						found.totalOrders+=1;
						    						found.totalValue+=charge.amount / 100;
						    					}

					    						// var message = 'Order completed! Your bars will be in your Wesbox by the end of the day.';
					    						const twiml = new MessagingResponse();
												twimlMessage = twiml.message();
												twimlMessage.body(message);
												res.writeHead(200, {'Content-Type': 'text/xml'});
												res.end(twiml.toString());

												var time = new Date();

												found.chat.push({
													message : message,
													sender : 'Verb',
													timestamp : time
												});

												var payload = {
													token : process.env.SLACKTOKEN,
													channel : found.slackChannel,
													text : message,
													as_user : false,
													username : 'Verb Bot'
												};

												slackPost('chat.postMessage', [payload]);
												found.status = 'CONFIRMPURCHASED';

												// web.chat.postMessage(found.slackChannel,message,'true');
												found.save();
												req.session.buyQuant = 0;
												req.session.save()

					    					});
										}
										
									});
									// stripe.charges.create({
			    		// 				amount:req.session.buyQuant*1000,
			    		// 				currency:'usd',
			    		// 				customer: found.customerId,
			    		// 				description: req.session.buyQuant.toString()+" Verb Bars",
									// 	receipt_email: found.email,
									// 	metadata: {'invoiceNumber':newOrder}
			    		// 			}, function(err,charge){
			    		// 				if(err){
			    		// 					message = 'Sorry, it seems like your order didn\'t go through. Let me look into what happened.';
			    		// 				} else {
			    		// 					message = 'Order completed! Your bars will be in your Wesbox by the end of the day.';
			    							


				    	// 					TextOrder.create({
									// 			invoiceNumber : newOrder,
									// 			customerPhone : found.phone,
									// 		    stripeCharge : charge.id,
									// 		    items : [
									// 		        {
									// 		            id : req.body.itemId,
									// 		            name : req.body.item,
									// 		            quantity : req.session.buyQuant,
									// 		            price : 10,
									// 		            totalPrice : req.session.buyQuant*10,
									// 		        }
									// 		    ],
									// 		    shipping : {
									// 		        shippingType : found.address.shippingAddress.address1,
									// 		        status : 'Unfulfilled'
									// 		    },
									// 		    orderType : 'Web',
									// 		    school : 'Wesleyan',
									// 		    completionDate : new Date(),
									// 		    paid : charge.amount / 100,
									// 		});
											
									// 		found.orders.push({'invoiceNumber':newOrder});

				    	// 					found.totalOrders+=1;
				    	// 					found.totalValue+=req.session.buyQuant*12;
				    	// 				}

			    		// 				// var message = 'Order completed! Your bars will be in your Wesbox by the end of the day.';
			    		// 				const twiml = new MessagingResponse();
									// 	twimlMessage = twiml.message();
									// 	twimlMessage.body(message);
									// 	res.writeHead(200, {'Content-Type': 'text/xml'});
									// 	res.end(twiml.toString());

									// 	var time = new Date();

									// 	found.chat.push({
									// 		message : message,
									// 		sender : 'Verb',
									// 		timestamp : time
									// 	});

									// 	var payload = {
									// 		token : process.env.SLACKTOKEN,
									// 		channel : found.slackChannel,
									// 		text : message,
									// 		as_user : false,
									// 		username : 'Verb Bot'
									// 	};

									// 	slackPost('chat.postMessage', payload);

									// 	// web.chat.postMessage(found.slackChannel,message,'true');
									// 	found.save();
									// 	req.session.buyQuant = 0;

			    		// 			});



									// stripe.charges.create({
									// 	amount : req.session.buyQuant*1200,
									// 	currency : 'usd',
									// 	customer: found.customerId
									// }, function(err,charge){
									// 	if(err){
									// 		console.log(err);
									// 		message = 'Sorry, it seems like your order didn\'t go through. Let me look into what happened.';
									// 	} else {
									// 		console.log(charge);
									// 		message = 'Order completed! Your bars will be in your Wesbox by the end of the day.';
									// 	}
									// 	const twiml = new MessagingResponse();
									// 	twimlMessage = twiml.message();
									// 	twimlMessage.body(message);
									// 	res.writeHead(200, {'Content-Type': 'text/xml'});
									// 	res.end(twiml.toString());

									// 	var payload = {
									// 		token : process.env.SLACKTOKEN,
									// 		channel : found.slackChannel,
									// 		text : message,
									// 		as_user : false,
									// 		username : 'Verb Bot'
									// 	};

									// 	slackPost('chat.postMessage', payload);

									// 	found.totalOrders += 1;
									// 	found.totalValue += req.session.buyQuant*12;

									// 	var time = new Date();
									// 	found.chat.push({
									// 		message : message,
									// 		sender : 'Verb',
									// 		timestamp : time
									// 	});
									// 	found.save();
									// 	req.session.buyQuant = 0;



										// TextConversation.findOne({"phone" : req.body.From}, function(err,found){
										// 	if(err){
										// 		console.log(err);
										// 	} else {
										// 		var time = new Date();
										// 		if(found){
										// 			web.chat.postMessage(found.slackChannel,message,'true');

										// 			found.chat.push({
										// 				message : message,
										// 				sender : 'Verb',
										// 				timestamp : time
										// 			});
										// 			found.save();

										// 		}
										// 	}
										// });

									// });

									// req.session.buyQuant = 0;
								} else if (req.session.buyQuant < 1){
									const twiml = new MessagingResponse();
									twimlMessage = twiml.message();
									message = 'Cannot buy fewer than 1 box. Reply "BUY" to check out.';
									twimlMessage.body(message);
									res.writeHead(200, {'Content-Type': 'text/xml'});
									res.end(twiml.toString());

								} else {
									const twiml = new MessagingResponse();
									twimlMessage = twiml.message();
									message = 'Sorry, it seems we don\'t have your info on file. Reply with "BUY" to check out.';
									twimlMessage.body(message);
									res.writeHead(200, {'Content-Type': 'text/xml'});
									res.end(twiml.toString());

								}

								if(!chargeSuccess){

									var payload = {
										token : process.env.SLACKTOKEN,
										channel : found.slackChannel,
										text : message,
										as_user : false,
										username : 'Verb Bot'
									};

									slackPost('chat.postMessage', [payload]);
									found.status = 'BUYERROR';
									var time = new Date();
									found.chat.push({
										message : message,
										sender : 'Verb',
										timestamp : time
									});
									found.save();

								}


							} else {
								console.log('Should never be here -- confirm but didn\'t find customer');

							}
						}
					});

				} else if(response.result.metadata.intentName == 'EDIT'){
					if(!req.session.buyQuant){
						message = 'Change your info at: ';
						var url = 'dash.verbenergybar.com/checkout?phone='+req.body.From;
					} else {
						message = 'Change your info at: ';
						var url = 'dash.verbenergybar.com/checkout?q='+req.session.buyQuant.toString()+'&phone='+req.body.From;
					}
					googl.shorten(url, process.env.GOOGLEURL, function(err, shortUrl) {
					    if (err) {
					        throw err;
					    }
					    
						message += shortUrl;

						const twiml = new MessagingResponse();
						twimlMessage = twiml.message();
						twimlMessage.body(message);

						res.writeHead(200, {'Content-Type': 'text/xml'});
						res.end(twiml.toString());

					

						TextCustomer.findOne({"phone":req.body.From}, function(err,found){
							if(found){
								var payload = {
									token : process.env.SLACKTOKEN,
									channel : found.slackChannel,
									text : message,
									as_user : false,
									username : 'Verb Bot'
								};

								slackPost('chat.postMessage', [payload]);
								var time = new Date();
								found.status = 'EDITLINK';
								found.chat.push({
									message : message,
									sender : 'Verb',
									timestamp : time
								});
								found.save();
							}
						});
					});
					// var time = new Date();
					// found.chat.push({
					// 	message : message,
					// 	sender : 'Verb',
					// 	timestamp : time
					// });
					// found.save();


				} else if(response.result.metadata.intentName == "CANCEL"){
					req.session.buyQuant = 0;
					message = 'Your order has been canceled. Text BUY when you want to reorder.';
					
					const twiml = new MessagingResponse();
					twimlMessage = twiml.message();
					twimlMessage.body(message);

					res.writeHead(200, {'Content-Type': 'text/xml'});
					res.end(twiml.toString());

					TextCustomer.findOne({"phone":req.body.From}, function(err,found){
						if(found){
							var payload = {
								token : process.env.SLACKTOKEN,
								channel : found.slackChannel,
								text : message,
								as_user : false,
								username : 'Verb Bot'
							};

							slackPost('chat.postMessage', [payload]);
							var time = new Date();
							found.status = 'CANCELORDER';
							found.chat.push({
								message : message,
								sender : 'Verb',
								timestamp : time
							});
							found.save();
						}
					});
				}
			});
			 
			request.on('error', function(error) {
			    console.log(error);

			});
			 
			request.end();

		}

		

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
