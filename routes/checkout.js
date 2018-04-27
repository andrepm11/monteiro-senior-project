var stripeTestKey = process.env.STRIPETEST; 

var express = require("express");
var router = express.Router();
var bodyParser  = require("body-parser");
var mongoose    = require("mongoose");
var db = require('../db.js');

var models = require("../texttobuy/models/customer.js");
var TextCustomer = models.TextCustomer;
var TextOrder = models.TextOrder;


var _  = require("underscore");

var sanitize = require('mongo-sanitize');

var slackPost = require("../slackPost.js");
var stripe = require("stripe")(stripeTestKey);


var accountSid = process.env.twilioSID;
var authToken = process.env.twilioAUTH; 
var twilio  = require("twilio");
var client = new twilio(accountSid, authToken);
var MessagingResponse = require('twilio').twiml.MessagingResponse;

router.post("/cart/addtocart", function(req,res){

  var addItem = {
    id:req.body.id,
    name:req.body.name,
    quantity:req.body.quantity,
    image:req.body.image,
    price:20
  }
  if(req.session.items){
    var found = false;
    var trial = false;
    req.session.items.forEach(function(item){
      if(item.id == req.body.id){
        if(item.id == 'oc-3bar-trial' || item.id == 'oc-3bar-trial-referred'){
          trial = true;  
        } else {
          item.quantity = parseInt(item.quantity)+parseInt(req.body.quantity)
        }
        found = true;
      }
    });
    if(!found){
      req.session.items.push(addItem);
      // req.session.totalPrice += req.body.quantity*req.body.price;
    }
    if(!trial){
      req.session.cartTotal += req.body.quantity*20
    }
  } else {
    req.session.items = [addItem];
    req.session.cartTotal = req.body.quantity*20
  }
  // req.session.items = 0;
  // res.sendStatus(200);
  res.send({result:"success"});
});

router.post("/cart/removefromcart", function(req,res){


  if(req.session.promocode){
    Object.keys(req.session.promocode).forEach(function(key){
      console.log(req.session.promocode[key]);
      if(req.body.id == req.session.promocode[key][0]){
        delete req.session.promocode[key];
      }
    });
  }

  req.session.items = req.session.items.filter(function( obj ) {
      return obj.id !== req.body.id;
  });

  req.session.cartTotal = 0;
  req.session.items.forEach(function(item){
    req.session.cartTotal+= item.quantity*item.price;
  });
  if(req.session.items.length < 1){
    req.session.cart = false;
  }
  res.send({result:"success"});
});


router.post("/cart/set-session", function(req,res){


  var success = true;
  var errMessage = "";

  var finished = _.after(Object.keys(req.body).length, returnCart);

  for (var key in req.body) {
    if(typeof req.body[key] == 'string'){
        if(key == 'phone'){
            req.body[key] = req.body[key].replace(/-/g,'');
            req.body[key] = req.body[key].replace(/ /g,'');
            req.body[key] = req.body[key].replace(/\(/g,'');
            req.body[key] = req.body[key].replace(/\)/g,'');
            req.body[key] = req.body[key].trim();
            req.session[key] = req.body[key];

            if(req.body[key].length < 10){
              success=false;
              errMessage = 'Please enter a 10 digit mobile phone number.';
            }

            client.lookups.v1.phoneNumbers(req.body[key]+'?Type=carrier').fetch({ countryCode: 'US'}, function(err,number){
              if(err){
                console.log(err);
                success=false;
                errMessage = 'Please enter a valid mobile phone number.';
                finished();
              } else{
                
                if(number.carrier.type != 'mobile'){
                  success=false;
                  errMessage = 'Please enter a valid mobile phone number.';
                }

                finished();
              }
            });



            // finished();

        } else if(key == 'firstName' || key == 'lastName'){
            var trimmed = req.body[key].trim();
            var upperString = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            req.session[key] = sanitize(upperString);
            
            finished();
        } else{
            req.session[key] = sanitize(req.body[key].trim());
            finished();
        }
    } else {
        req.session[key] = req.body[key];
        finished();
    }
    
  }

  function returnCart(){
    if(success){
      res.send({result:"success"});
    } else{
      res.send({result:"error", errMessage:errMessage});
    }    
  }


});

router.post("/validatephone", function(req,res){
  var phone = req.body.phone;


  req.session['phone'] = phone;


  client.lookups.v1.phoneNumbers(phone+'?Type=carrier').fetch({ countryCode: 'US'}, function(err,number){
    if(err){
      console.log(err);
      success=false;
      errMessage = 'Please enter a valid mobile phone number.';
      res.send({result:"error", errMessage:errMessage, alertId:req.body.alert});
    } else{
      
      if(number.carrier.type != 'mobile'){
        success=false;
        errMessage = 'Please enter a valid mobile phone number.';
        res.send({result:"error", errMessage:errMessage, alertId:req.body.alert});
      } else {
        res.send({result:"success"});
      }

    }
  });
});



router.get("/cart", function(req,res){

  var discountedTotal = req.session.cartTotal;

  var pass = {
    query : req.query,
    price : 20,
    firstName : req.session.firstName,
    lastName : req.session.lastName,
    email : req.session.email,
    phone : req.session.phone,
    error : req.session.error,
    items : req.session.items,
    promocodes : req.session.promocode,
    cartTotal : req.session.cartTotal,
    discountedTotal : discountedTotal,
    shipping : req.session.shipping,
    address1 : req.session.address1,
    address2 : req.session.address2,
    city : req.session.city,
    state : req.session.state,
    zip : req.session.zip,
    nav : false,
    trial : false,
    simpleNav: false
  };

  res.render("cart",pass);
});


router.get("/cart-section", function(req,res){

  var discountedTotal = req.session.cartTotal;

  if(req.session.promocode){
    Object.keys(req.session.promocode).forEach(function(key){
      console.log(req.session.promocode[key]);
      if(req.session.promocode[key][1]== 'percent'){
        var difference = discountedTotal*req.session.promocode[key][2]/100;
        req.session.promocode[key][4] = difference;
        discountedTotal = discountedTotal-difference;
      } else if(req.session.promocode[key][1]== 'amount'){
        var difference = req.session.promocode[key][2];
        req.session.promocode[key][4] = difference;
        discountedTotal = discountedTotal-difference;
      }
    });
  }


  var pass = {
    query : req.query,
    price : 20,
    firstName : req.session.firstName,
    lastName : req.session.lastName,
    email : req.session.email,
    phone : req.session.phone,
    error : req.session.error,
    items : req.session.items,
    promocodes : req.session.promocode,
    cartTotal : req.session.cartTotal,
    discountedTotal : discountedTotal,
    shipping : req.session.shipping,
    address1 : req.session.address1,
    address2 : req.session.address2,
    city : req.session.city,
    state : req.session.state,
    zip : req.session.zip,
    nav : false,
    trial : false,
    simpleNav: false
  };

  res.render("cart-section",pass, function(err,html){
    res.send(html);
  });

});

router.post("/cart/web-charge", function(req,res){

    for (var key in req.body) {
      if(typeof req.body[key] == 'string'){
          if(key == 'phone'){
            
            var phone = req.body.phone;
            phone = phone.replace(/-/g,'');
            phone = phone.replace(/ /g,'');
            phone = phone.replace(/\(/g,'');
            phone = phone.replace(/\)/g,'');
            phone = phone.trim();
            phone = phone.substr(2);

            req.session['phone'] = phone;

          } else if(key == 'firstName' || key == 'lastName'){
              var trimmed = req.body[key].trim();
              var upperString = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
              req.session[key] = sanitize(upperString);
              
          } else{
              req.session[key] = sanitize(req.body[key].trim());
          }
      } else {
          req.session[key] = req.body[key];
      }
      
    }
    
    if(req.body.stripeToken){
        var token = req.body.stripeToken; // Using Express
        if(token.isArray){
            token = token[0]; 
        }
    }

    TextCustomer.findOne({"phone":req.session.phone}, function(err,found){
        if(err){
            console.log(err);
        } else {
            if(found){
                if(found.customerId){
                    stripe.customers.update(found.customerId, {
                        source : token,
                        email : req.session.email,
                        metadata : {
                            phone : req.session.phone,
                            firstName : req.session.firstName,
                            lastName : req.session.lastName
                        }
                    }, function(err,customer){
                        if(err){
                            console.log('ERROR - Stripe customer update');
                            console.log(err);
                            req.session.error = err.message;
                            res.send({result:'error',error:err.message});
                            //ERROR
                        } else {

                            var totalQuantity = 0;
                            var totalPrice = 0;
                            req.session.items.forEach(function(item){
                                totalQuantity += item.quantity;
                                totalPrice += 20*item.quantity;
                            });
                            totalQuantity = parseInt(totalQuantity);

                            TextOrder.findOne({}, null, {sort:{"invoiceNumber":-1}}, function(err,order){
                                if(err){
                                    console.log('ERROR - Could not find order');
                                    console.log(err);
                                    res.send({result:'error', error:'Something went wrong. Please refresh the page and try again.'});
                                    //ERROR
                                } else {
                                    if(order){
                                        var number = parseInt(order.invoiceNumber.substr(3))+1;
                                        var newOrder = 'OSHT'+number.toString();
                                    } else {
                                        var newOrder = 'OSHT1000';
                                    }

                                    stripe.charges.create({
                                        amount : Math.round(totalPrice * 100),
                                        currency : 'usd',
                                        customer : found.customerId,
                                        description : (totalQuantity).toString()+" TP Mega Packs",
                                        receipt_email : req.session.email,
                                        metadata : {'invoiceNumber':newOrder}
                                    }, function(err,charge){
                                        if(err){
                                            console.log('ERROR - Stripe Charge');
                                            console.log(err);
                                            req.session.error = err.message;
                                            res.send({result:'error',error:err.message});
                                            //ERROR
                                        } else {
                                            var items = req.session.items;
                                            items.forEach(function(item){
                                                item.price = 20;
                                                item.totalPrice = item.quantity*item.price;
                                            });

                                            var firstName = req.session.firstName;
                                            var lastName = req.session.lastName;
                                            var email = req.session.email;
                                            var phone = req.session.phone;
                                        
                                            
                                            TextOrder.create({
                                                firstName : req.session.firstName,
                                                lastName : req.session.lastName,
                                                email : req.session.email,
                                                invoiceNumber : newOrder,
                                                customerPhone : req.session.phone,
                                                stripeCharge : charge.id,
                                                items : items,
                                                totalPacks : totalQuantity,
                                                pricePerPack : totalPrice / totalQuantity,
                                                address : {
                                                    address1 : req.session.address1,
                                                    address2 : req.session.address2,
                                                    city : req.session.city,
                                                    state : req.session.state,
                                                    zip : req.session.zip
                                                },
                                                completionDate : new Date(),
                                                paid : charge.amount / 100
                                            }, function(err,order){
                                                if(err){
                                                    console.log('ERROR - Creating order');
                                                    console.log('Customer: '+firstName+' '+lastName);
                                                    console.log('Email: '+email);
                                                    console.log(err);
                                                    res.send({result:'error',error:'Something went wrong. Please refresh and try again in a minute.'});
                                                } else {
                                                    console.log('----- Order created -----');
                                                    console.log('Invoice: '+newOrder);
                                                    console.log('Customer: '+firstName+' '+lastName);
                                                    console.log('Phone: '+phone);
                                                    res.send({result:'success'});
                                                }
                                            });

                                            found.firstName = req.session.firstName;
                                            found.lastName = req.session.lastName;
                                            found.email = req.session.email;
                                            found.totalOrders += 1;
                                            found.totalValue += charge.amount / 100;
                                            found.orders.push({'invoiceNumber':newOrder});
                                            found.card = {
                                                last4 : charge.source.last4,
                                                brand : charge.source.brand,
                                                exp_month : charge.source.exp_month,
                                                exp_year : charge.source.exp_year
                                            };

                                            //Change this to order confirmation and reorder. Line 335 on twilio.js
                                            // var message = 'Your order of Verb Bars has been completed! You\'ll get another text as soon as your order ships. For future orders, you won\'t need to re-enter your credit card information and can just text this number to reorder.';
                                            var messageBody = 'Your order has been completed! Just text us if you ever want more toilet paper.';

                                            var phone = req.session.phone;
                                            client.messages.create({
                                                body:messageBody,
                                                to:phone,
                                                from:'+17864603490',
                                                statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
                                            }, function(err,message){
                                                if(err){
                                                    console.log('ERROR - Sending order confirmation text');
                                                    console.log('Phone: '+phone);
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
                                            resetSession(req);
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    stripe.customers.create({
                        source : token,
                        email : req.session.email,
                        metadata : {
                            phone : req.session.phone,
                            firstName : req.session.firstName,
                            lastName : req.session.lastName
                        }
                    }, function(err,customer){
                        if(err){
                            console.log('ERROR - Stripe Customer Create');
                            console.log(err);
                            req.session.error = err.message;
                            res.send({result:'error',error:err.message});
                            //ERROR
                        } else {
                            found.customerId = customer.id;

                            var totalQuantity = 0;
                            var totalPrice = 0;
                            req.session.items.forEach(function(item){
                                totalQuantity += item.quantity;
                                totalPrice += 20*item.quantity;
                            });
                            totalQuantity = parseInt(totalQuantity);


                            TextOrder.findOne({}, null,{sort:{"invoiceNumber":-1}}, function(err,order){
                                if(err){
                                    console.log('ERROR - Could not find order');
                                    console.log(err);
                                    res.send({result:'error', error:'Something went wrong. Please refresh the page and try again.'});
                                } else{
                                    if(order){
                                        var number = parseInt(order.invoiceNumber.substr(3))+1;
                                        var newOrder = 'VRB'+number.toString();
                                    } else{
                                        var newOrder = 'VRB1000';
                                    }
                                    stripe.charges.create({
                                        amount : Math.round(totalPrice*100),
                                        currency : 'usd',
                                        customer : customer.id,
                                        description : (totalQuantity).toString()+" TP Mega Packs",
                                        receipt_email : req.session.email,
                                        metadata : {'invoiceNumber' : newOrder}
                                    }, function(err,charge){
                                        if(err){
                                            console.log('ERROR - Stripe Charge');
                                            console.log(err);
                                            req.session.error = err.message;
                                            res.send({result:'error',error:err.message});
                                        } else {

                                            var items = req.session.items;
                                            items.forEach(function(item){
                                                item.price = 20;
                                                item.totalPrice = item.quantity*item.price;
                                            });

                                            var firstName = req.session.firstName;
                                            var lastName = req.session.lastName;
                                            var email = req.session.email;
                                            var phone = req.session.phone;
                                            
                                            
                                            TextOrder.create({
                                                firstName : req.session.firstName,
                                                lastName : req.session.lastName,
                                                email : req.session.email,
                                                invoiceNumber : newOrder,
                                                customerPhone : req.session.phone,
                                                stripeCharge : charge.id,
                                                items : items,
                                                totalPacks : totalQuantity,
                                                pricePerPack : totalPrice / totalQuantity,
                                                completionDate : new Date(),
                                                paid : charge.amount / 100,
                                            }, function(err,order){
                                                if(err){
                                                    console.log('ERROR - Creating order');
                                                    console.log('Customer: '+firstName+' '+lastName);
                                                    console.log('Email: '+email);
                                                    console.log(err);
                                                    res.send({result:'error',error:'Something went wrong. Please refresh and try again in a minute.'});
                                                } else {
                                                    console.log('----- Order created -----');
                                                    console.log('Invoice: '+newOrder);
                                                    console.log('Customer: '+firstName+' '+lastName);
                                                    console.log('Phone: '+phone);
                                                    res.send({result:'success'});
                                                }
                                            });

                                           
                                            found.firstName = req.session.firstName;
                                            found.lastName = req.session.lastName;
                                            found.email = req.session.email;
                                            found.totalOrders += 1;
                                            found.totalValue += charge.amount / 100;
                                            found.orders.push({'invoiceNumber':newOrder});
                                            found.card = {
                                                last4 : charge.source.last4,
                                                brand : charge.source.brand,
                                                exp_month : charge.source.exp_month,
                                                exp_year : charge.source.exp_year
                                            };
                                            


                                            //Change this to order confirmation and reorder. Line 335 on twilio.js
                                            // var message = 'Your order of Verb Bars has been completed! You\'ll get another text as soon as your order ships. For future orders, you won\'t need to re-enter your credit card information and can just text this number to reorder.';
                                            var messageBody = 'Your order of Toilet Paper has been completed! Your payment method is now securely linked to your phone number. If you want to place another order, just text me at this number (sms:786-460-3490) saying that you want more Toilet Paper and it\'ll ship out the next day.';

                                            client.messages.create({
                                                body:messageBody,
                                                to:phone,
                                                from:'+17864603490',
                                                statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
                                            }, function(err,message){
                                                if(err){
                                                    console.log('ERROR - Sending order confirmation text');
                                                    console.log('Phone: '+phone);
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
                                            resetSession(req);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            } else {
                stripe.customers.create({
                    source : token,
                    email : req.session.email,
                    metadata : {
                        phone : req.session.phone,
                        firstName : req.session.firstName,
                        lastName : req.session.lastName
                    }
                }, function(err,customer){
                    if(err){
                        console.log('ERROR - Stripe customer update');
                        console.log(err);
                        req.session.error = err.message;
                        res.send({result:'error',error:err.message});
                    } else {
                        TextOrder.findOne({},null,{sort:{"invoiceNumber":-1}}, function(err,order){
                            if(err){
                                console.log('ERROR - Could not find order');
                                console.log(err);
                                res.send({result:'error', error:'Something went wrong. Please refresh the page and try again.'});
                            } else{
                                if(order){
                                    var number = parseInt(order.invoiceNumber.substr(3))+1;
                                    var newOrder = 'VRB'+number.toString();
                                } else{
                                    var newOrder = 'VRB1000';
                                }
                            
                                var customerId = customer.id;

                                var totalQuantity = 0;
                                var totalPrice = 0;
                                req.session.items.forEach(function(item){
                                    totalQuantity += item.quantity;
                                    totalPrice += 20*item.quantity;
                                });
                                totalQuantity = parseInt(totalQuantity);

                                stripe.charges.create({
                                    amount : Math.round(totalPrice * 100),
                                    currency : 'usd',
                                    customer : customer.id,
                                    description : totalQuantity.toString()+" TP Mega Packs",
                                    receipt_email : req.session.email,
                                    metadata : {'invoiceNumber':newOrder}
                                }, function(err,charge){
                                    if(err){
                                        console.log('ERROR - Stripe Charge');
                                        console.log(err);
                                        req.session.error = err.message;
                                        res.send({result:'error',error:err.message});
                                    } else{

                                        var items = req.session.items;
                                        items.forEach(function(item){
                                            item.price = 20;
                                            item.totalPrice = item.quantity*item.price;
                                        });

                                        var newCustomer = {
                                            phone : req.session.phone,
                                            customerId : customerId,
                                            firstName : req.session.firstName,
                                            lastName : req.session.lastName,
                                            email : req.session.email,
                                            card : {
                                                last4 : charge.source.last4,
                                                brand : charge.source.brand,
                                                exp_month : charge.source.exp_month,
                                                exp_year : charge.source.exp_year
                                            },
                                            totalOrders : 1,
                                            totalValue : charge.amount / 100,
                                            orders : [
                                                { invoiceNumber : newOrder }
                                            ],
                                            chat : [],
                                            created : new Date()
                                        };

                                        TextOrder.create({
                                            firstName : req.session.firstName,
                                            lastName : req.session.lastName,
                                            email : req.session.email,
                                            invoiceNumber : newOrder,
                                            customerPhone : req.session.phone,
                                            stripeCharge : charge.id,
                                            items : items,
                                            totalPacks : totalQuantity,
                                            pricePerPack : totalPrice / totalQuantity,
                                            completionDate : new Date(),
                                            paid : charge.amount / 100,
                                        }, function(err,order){
                                            if(err){
                                                console.log('ERROR - Creating order');
                                                console.log('Customer: '+newCustomer.firstName+' '+newCustomer.lastName);
                                                console.log('Email: '+newCustomer.email);
                                                console.log(err);
                                                res.send({result:'error',error:'Something went wrong. Please refresh and try again in a minute.'});
                                            } else {
                                                console.log('----- Order created -----');
                                                console.log('Invoice: '+newOrder);
                                                console.log('Customer: '+newCustomer.firstName+' '+newCustomer.lastName);
                                                console.log('Phone: '+newCustomer.phone);
                                                res.send({result:'success'});
                                            }
                                        });
                                        newCustomer.address = {
                                            shippingAddress : {
                                                address1 : req.session.address1,
                                                address2 : req.session.address2,
                                                city : req.session.city,
                                                state : req.session.state,
                                                zip : req.session.zip
                                            }
                                        };


                                        var phone = req.session.phone;
                                        resetSession(req);

                                        TextCustomer.create(newCustomer, function(err,created){
                                            if(err){
                                                console.log('ERROR - Creating customer');
                                                console.log(newCustomer);
                                                console.log(err);
                                                //ERROR
                                            } else {
                                                
                                              var firstText = 'Thanks for trying OHSHT, '+created.firstName+'! Just text us here when you’d like more.'
                                              client.messages.create({
                                                body:firstText,
                                                to:phone,
                                                from:'+17864603490',
                                                statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
                                              }, function(err,message){
                                                  if(err){
                                                      console.log('ERROR - Sending order confirmation text');
                                                      console.log('Phone: '+phone);
                                                      console.log(err);
                                                  } else {
                                                      //TODO add message to a message database and add message ID to customer conversation, unwrap in CRM
                                                      created.chat.push({
                                                          message : firstText,
                                                          sender : 'Verb',
                                                          timestamp : new Date(),
                                                          messageID : message.sid,
                                                          status : 'pending'
                                                      });
                                                      created.save();
                                                  }
                                              }); 

                                              var secondText = 'To make it easier to reorder, here\'s our contact card!';
                                              client.messages.create({
                                                body:secondText,
                                                to:phone,
                                                from:'+17864603490',
                                                statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
                                              }, function(err,message){
                                                  if(err){
                                                      console.log('ERROR - Sending contact card text');
                                                      console.log('Phone: '+phone);
                                                      console.log(err);
                                                  } else{
                                                      created.chat.push({
                                                          message : secondText,
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
                                });

                            }
                        });
                    }
                });
            }
        }
    });
  // }
});

router.post("/reorder", function(req,res){


  TextCustomer.findOne({"phone":req.body.phone}, function(err,found){
      if(err){
          console.log(err);
      } else {
          if(found){
              if(found.customerId){
                  
                  var totalQuantity = req.body.quantity*10;
                  var totalPrice = req.body.quantity * parseFloat(req.body.price);

                  TextOrder.findOne({}, null, {sort:{"invoiceNumber":-1}}, function(err,order){
                      if(err){
                          console.log('ERROR - Could not find order');
                          console.log(err);
                          res.send({result:'error', error:'Something went wrong. Please refresh the page and try again.'});
                          //ERROR
                      } else {
                          if(order){
                              var number = parseInt(order.invoiceNumber.substr(3))+1;
                              var newOrder = 'VRB'+number.toString();
                          } else {
                              var newOrder = 'VRB1000';
                          }
                          var price = req.body.price;
                          stripe.charges.create({
                              amount : Math.round(totalPrice * 100),
                              currency : 'usd',
                              customer : found.customerId,
                              description : (totalQuantity/10).toString()+" Boxes of Verb Bars",
                              receipt_email : found.email,
                              metadata : {'invoiceNumber':newOrder}
                          }, function(err,charge){
                              if(err){
                                  console.log('ERROR - Stripe Charge');
                                  console.log(err);
                                  // req.session.error = err.message;
                                  res.send({result:'error',error:err.message});
                                  //ERROR
                              } else {
                                  klaviyoPlacedOrder(found.email);
                                  klaviyoTextReorder(found.email);
                                  
                                  var items = req.body.items;
                                  items.forEach(function(item){
                                      item.price = price;
                                      item.totalPrice = item.quantity*price;
                                  });

                                  var channel = 'ground shipping';

                                  if(req.body.shipping == 'campus'){
                                      TextOrder.create({
                                          firstName : req.body.firstName,
                                          lastName : req.body.lastName,
                                          email : found.email,
                                          invoiceNumber : newOrder,
                                          customerPhone : found.phone,
                                          stripeCharge : charge.id,
                                          items : items,
                                          totalBars : totalQuantity,
                                          pricePerBar : totalPrice / totalQuantity,
                                          shipping : {
                                              shippingType : req.body.shipping,
                                              status : 'Pending'
                                          },
                                          orderType : 'Reorder',
                                          school : req.body.school,
                                          completionDate : new Date(),
                                          paid : charge.amount / 100
                                      }, function(err,order){
                                          if(err){
                                              console.log('ERROR - Creating order');
                                              console.log('Customer: '+req.body.firstName+' '+req.body.lastName);
                                              console.log('Email: '+found.email);
                                              console.log(err);
                                              res.send({result:'error',error:'Something went wrong. Please refresh and try again in a minute.'});
                                          } else {
                                              console.log('----- Manual Order created -----');
                                              console.log('Invoice: '+newOrder);
                                              console.log('Customer: '+req.body.firstName+' '+req.body.lastName);
                                              console.log('Phone: '+found.phone);
                                              res.send({result:'success'});
                                          }
                                      });


                                      channel = req.body.school;

                                      found.school = req.body.school;

                                      web.groups.rename(found.slackChannel, req.body.school.substr(0,4)+'-'+found.firstName+'-'+found.lastName);
                                  } else {
                                      TextOrder.create({
                                          firstName : req.body.firstName,
                                          lastName : req.body.lastName,
                                          email : found.email,
                                          invoiceNumber : newOrder,
                                          customerPhone : found.phone,
                                          stripeCharge : charge.id,
                                          items : items,
                                          totalBars : totalQuantity,
                                          pricePerBar : totalPrice / totalQuantity,
                                          shipping : {
                                              shippingType : req.body.shipping,
                                              status : 'Pending'
                                          },
                                          orderType : 'Web',
                                          address : {
                                              address1 : req.body.address1,
                                              address2 : req.body.address2,
                                              city : req.body.city,
                                              state : req.body.state,
                                              zip : req.body.zip
                                          },
                                          completionDate : new Date(),
                                          paid : charge.amount / 100
                                      }, function(err,order){
                                          if(err){
                                              console.log('ERROR - Creating order');
                                              console.log('Customer: '+req.body.firstName+' '+req.body.lastName);
                                              console.log('Email: '+found.email);
                                              console.log(err);
                                              res.send({result:'error',error:'Something went wrong. Please refresh and try again in a minute.'});
                                          } else {
                                              console.log('----- Order created -----');
                                              console.log('Invoice: '+newOrder);
                                              console.log('Customer: '+req.body.firstName+' '+req.body.lastName);
                                              console.log('Phone: '+found.phone);
                                              res.send({result:'success'});
                                          }
                                      });

                                      // found.address = {
                                      //     shippingAddress : {
                                      //         address1 : req.body.address1,
                                      //         address2 : req.body.address2,
                                      //         city : req.body.city,
                                      //         state : req.body.state,
                                      //         zip : req.body.zip
                                      //     }
                                      // };

                                      web.groups.rename(found.slackChannel, 'web-'+found.firstName+'-'+found.lastName);
                                  }

                                  found.totalOrders += 1;
                                  found.totalValue += charge.amount / 100;
                                  found.orders.push({'invoiceNumber':newOrder});

                                  // if(req.session.shipping == 'campus'){
                                  //     web.groups.rename(found.slackChannel, req.session.school.substr(0,4)+'-'+found.firstName+'-'+found.lastName);
                                  // } else {
                                  //     web.groups.rename(found.slackChannel, 'web-'+found.firstName+'-'+found.lastName);
                                  // }
                                  
                                  found.status="REORDERED";


                                  //Change this to order confirmation and reorder. Line 335 on twilio.js
                                  // var message = 'Your order of Verb Bars has been completed! You\'ll get another text as soon as your order ships. For future orders, you won\'t need to re-enter your credit card information and can just text this number to reorder.';
                                  if(req.body.shipping == 'campus'){
                                    var messageBody = 'Your order of Verb Bars has been completed!';
                                  }else{
                                    var messageBody = 'Your order of Verb Bars has been completed! We\'ll let you know once they\'ve shipped.';
                                  }
                                  

                                  client.messages.create({
                                      body:messageBody,
                                      to:found.phone,
                                      from:'+14159158372',
                                      statusCallback: 'https://dash.verbenergybar.com/twilioCallBack',
                                  }, function(err,message){
                                      if(err){
                                          console.log('ERROR - Sending order confirmation text');
                                          console.log('Phone: '+phone);
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

                                  var payloads = [];

                                  var payload = {
                                      token : process.env.SLACKTOKEN,
                                      channel : found.slackChannel,
                                      text : messageBody,
                                      as_user : false,
                                      username : 'Verb Bot'
                                  };
                                  payloads.push(payload);

                                  // slackPost('chat.postMessage', payloads);

                                  var payload = {
                                      token : process.env.SLACKTOKEN,
                                      channel : process.env.NOTIFYVERBSLACK,
                                      text : 'Order '+newOrder+ ' - '+channel+'. '+req.body.firstName+' '+req.body.lastName+'. '+totalQuantity.toString()+' Bars',
                                      as_user : false,
                                      username : 'Verb Bot'
                                  };
                                  payloads.push(payload);

                                  slackPost('chat.postMessage', payloads);
                                  
                              }
                          });
                      }
                  });
                      
              }
          }
      }
  });
});



function resetSession(req){

    delete req.session;

    // req.session.cartTotal = 0;
    // req.session.firstName = '';
    // req.session.lastName = '';
    // req.session.email = '';
    // req.session.phone = '';
    // req.session.address1 = '';
    // req.session.address2 = '';
    // req.session.city = '';
    // req.session.state = '';
    // req.session.zip = '';
    // req.session.school = '';
    // req.session.error = '';
    // req.session.items=[];
    // req.session.src = '';
    // delete req.session.promocode;

}

module.exports = router;
