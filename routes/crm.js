var express = require("express");
var router = express.Router();
var db = require('../db.js');
var _  = require("underscore");

var models = require("../texttobuy/models/customer.js");
var TextCustomer = models.TextCustomer;
var SchoolInfo = models.SchoolInfo;
var TextOrder = models.TextOrder;

var isLoggedIn = require("../isLoggedIn.js");

// var stripe = require("stripe")(stripeTestKey);

var accountSid = process.env.twilioSID;
var authToken = process.env.twilioAUTH; 
var twilio  = require("twilio");
var client = new twilio(accountSid, authToken);
var MessagingResponse = require('twilio').twiml.MessagingResponse;

var slackPost = require("../slackPost.js");

var moment = require('moment');

router.get("/crm", isLoggedIn, function(req,res){

  if(req.query.phone){
    TextCustomer.findOne({'phone':req.query.phone}, {'lastInteraction':1}, function(err,foundCustomer){
      if(err){
        console.log(err);
      } else {
        
        var dayBehind = new Date(foundCustomer.lastInteraction-(24 * 60 * 60 * 1000));
        console.log(dayBehind);
        TextCustomer.find({'lastInteraction':{'$gte':dayBehind}},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).exec(function(err,found){
            if(err){
                console.log('CRM ERROR 1');
                console.log(err);
            } else {
              if(found.length < 100){
                TextCustomer.find({},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).exec(function(err,newFind){
                    if(err){
                        console.log(err);
                    } else {
                        res.render("crm/text", {found:newFind, moment: moment,user:req.session.activeUser, loadCustomer:req.query.phone});
                    }
                });
              } else {
                res.render("crm/text", {found:found, moment: moment,user:req.session.activeUser, loadCustomer:req.query.phone});
              }
            }
        });
      }
    });
  } else {
    TextCustomer.find({},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).exec(function(err,found){
        if(err){
            console.log('CRM ERROR 1');
            console.log(err);
        } else {
            res.render("crm/text", {found:found, moment: moment,user:req.session.activeUser, loadCustomer:false});
        }
    });
  }

});


router.get("/load-conversations", function(req,res){
  // console.log(req.query.conversationSkip);
    // TextCustomer.find({"firstNameNormalized":{$regex:req.query.search.toLowerCase()}},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).skip(parseInt(req.query.conversationSkip)).exec(function(err,found){
    
    //TODO FIGURE OUT TEXT SEARCH
    if(req.query.search){
      TextCustomer.find({$text: {$search: req.query.search}},{ 'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1,score : { $meta: "textScore" }}).sort({ score : { $meta : 'textScore', 'lastInteraction':-1} }).skip(parseInt(req.query.conversationSkip)).exec(function(err,found){
    
          if(err){
            console.log('CRM ERROR 2');
              console.log(err);
          } else {
              // console.log(found[0]);
              // console.log(found[0].chat[0].timestamp);
              // console.log(moment(found[0].chat[0].timestamp).fromNow());

              res.render("crm/partials/load-conversations", {found:found, moment: moment,user:req.session.activeUser}, function(err,html){res.send(html)});
              // res.render('crm/partials/chat-loading', {found:chats}, function(err, html){ res.send(html); });
          }
      });
    } else {
      TextCustomer.find({},{ 'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({'lastInteraction':-1}).skip(parseInt(req.query.conversationSkip)).limit(100).exec(function(err,found){
    
          if(err){
            console.log('CRM ERROR 2');
              console.log(err);
          } else {

              res.render("crm/partials/load-conversations", {found:found, moment: moment,user:req.session.activeUser}, function(err,html){res.send(html)});
              // res.render('crm/partials/chat-loading', {found:chats}, function(err, html){ res.send(html); });
          }
      }); 
    }
});

router.get("/normalize", function(req,res){
  TextCustomer.find({}, function(err,found){
    if(err){
      console.log(err);
    } else{
      console.log(found.length);
      found.forEach(function(customer){
        customer.firstNameNormalized = customer.firstName.toLowerCase();
        if(customer.lastName){
          customer.lastNameNormalized = customer.lastName.toLowerCase();
          customer.fullNameNormalized = customer.firstNameNormalized+' '+customer.lastNameNormalized;
        } else{
          customer.fullNameNormalized = customer.firstNameNormalized;
        }

        customer.chat.forEach(function(message){
          message.messageNormalized = message.message.toLowerCase();
        });

        customer.save();
        console.log(customer.firstNameNormalized);
      });
    }
  });
  res.sendStatus(200);
});

router.get("/textsearch", function(req,res){
  TextCustomer.find({$text: {$search: "Weenie"}},{ score : { $meta: "textScore" }}).sort({ score : { $meta : 'textScore' } }).exec(function(err,found){
    if(err){
      console.log(err);
    } else{
      console.log(found.length)
      console.log(found[0]);
    }
  });
  res.sendStatus(200);
});

router.get("/conversationfilter", function(req,res){
  var query = req.query.query;
  if(query == 'true'){
    TextCustomer.find({"waitingOnResponse":query},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).exec(function(err,found){
        if(err){
          console.log('CRM ERROR 8');
            console.log(err);
        } else {
            res.render("crm/partials/conversation-filter", {found:found, moment: moment,user:req.session.activeUser}, function(err,html){res.send(html)});
        }
    });
  } else if(query == 'flagged'){
    TextCustomer.find({"flagged":true},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).exec(function(err,found){
        if(err){
          console.log('CRM ERROR 8');
            console.log(err);
        } else {
            res.render("crm/partials/conversation-filter", {found:found, moment: moment,user:req.session.activeUser}, function(err,html){res.send(html)});
        }
    });


  } else{
    TextCustomer.find({},{'firstName':1,'lastName':1,'phone':1,'chat': { $slice:-1 },'waitingOnResponse':1}).sort({"lastInteraction":-1}).limit(100).exec(function(err,found){
        if(err){
          console.log('CRM ERROR 9');
            console.log(err);
        } else {
            res.render("crm/partials/conversation-filter", {found:found, moment: moment,user:req.session.activeUser}, function(err,html){res.send(html)});
        }
    });
  }
});

router.get("/crm-chat", function(req,res){

    if(req.query.skip){


      TextCustomer.aggregate([
        {$match:{"phone":req.query.phone}},
        {$unwind : '$chat'},
        {$project : {'chat':1}},
        {$sort : {'chat.timestamp' : -1}},
        {$skip : parseInt(req.query.skip)},
        {$limit : 10},
        {$sort : {'chat.timestamp' : 1}}],
        function(err,chats){
          if(err){
            console.log('CRM ERROR 3');
            console.log(err);
          } else{
            console.log(chats);
            if(chats.length){
              res.render('crm/partials/chat-loading', {found:chats,user:req.session.activeUser}, function(err, html){ res.send(html); });
            } else{
              res.send('None');
            }
          }
      });

    } else{
       TextCustomer.findOne({'phone':req.query.phone},
        {
          'firstName':1,'lastName':1,'chat':{$slice:-10},'totalValue':1,'totalOrders':1,
          'phone':1,'customerId':1,'email':1,'created':1,'orders':1,'address':1,'card':1,'dontText':1,'flagged':1
        }).exec(function(err,found){
        if(err){
          console.log('CRM ERROR 4');
          console.log(err);
        } else{
          found.waitingOnResponse = false;
          found.save();
          res.render('crm/partials/conversation', {found:found,user:req.session.activeUser}, function(err, html){ 
            if(err){
              console.log(err);
            } else {
              var data = {};
              data.html = html;
              res.render('crm/partials/right-sidebar', {found:found, user:req.session.activeUser}, function(err,sidebar){
                if(err){
                  console.log(err);
                } else {

                  data.sidebar = sidebar;
                  res.send(data);
                }
              });
            }
          });
        }
      });
    }


});

router.post("/setflag", function(req,res){


  var data = {'result':'success'};
  TextCustomer.findOne({'phone':req.body.phone},
        {
          'firstName':1,'lastName':1,'chat':{$slice:-10},'totalValue':1,'totalOrders':1,
          'phone':1,'customerId':1,'email':1,'created':1,'orders':1,'address':1,'card':1,'dontText':1,'flagged':1
        }).exec(function(err,foundCustomer){
        if(err){
          console.log('CRM ERROR 4');
          console.log(err);
        } else{

          foundCustomer[req.body.flag] = req.body.bool;
          foundCustomer.save(function(err,saved){
            if(err){
              console.log(err);
            } else {

              console.log(saved);

                res.render('crm/partials/right-sidebar', {found:foundCustomer, user:req.session.activeUser}, function(err,sidebar){
                  if(err){
                    console.log(err);
                  } else {

                    data.sidebar = sidebar;
                    res.send(data);
                  }
                });
            }
          });
        }
      });

});


router.get("/lastInteraction", function(req,res){
    TextCustomer.find({},null,{sort:{"created":1}}, function(err,found){
      console.log(found.length);
        found.forEach(function(customer){

            var len = customer.chat.length;
            // console.log(customer.firstName + ' '+customer.lastName);
            if(customer.firstName == 'Andre'){
              console.log('andre');
            }
            // console.log(customer.lastInteraction);
            if(customer.chat.length){

              // console.log(customer.chat);
              customer.lastInteraction = new Date(customer.chat[len - 1].timestamp);
              customer.save(function(err,saved){
                  if(err){
                      console.log('CRM ERROR 5');
                      console.log(err);
                  }
              });
            }
        });
    });
    // TextCustomer.findOne({"phone":"7863008768"},null,{sort:{"created":1}}, function(err,found){
    //     // console.log(found);
    //     var len = found.chat.length;
    //     found.firstName = 'Andre';
    //     console.log(found.lastInteraction);
    //     console.log(found.chat[len - 1]);
    //     console.log(found.chat[len - 1].timestamp);
    //     found.lastInteraction = new Date(found.chat[len - 1].timestamp);
    //     found.save(function(err,saved){
    //         if(err){
    //             console.log(err);
    //         } else{
    //             console.log(saved.lastInteraction);
    //         }
    //     });
    //     // found.forEach(function(customer){
    //     //     var len = customer.chat.length;
    //     //     console.log(customer.firstName + ' '+customer.lastName);
    //     //     // console.log(customer.lastInteraction);
    //     //     customer.lastInteraction = new Date(customer.chat[len - 1].timestamp);
    //     //     customer.save(function(err,saved){
    //     //         if(err){
    //     //             console.log(err);
    //     //         }
    //     //     });
    //     // });
    // });
    res.sendStatus(200);
});




router.post("/updateinfo", function(req,res){


  TextCustomer.findOne({'phone':req.body.phone},{'firstName':1,'lastName':1,'email':1,'phone':1,'address':1,'totalOrders':1}, function(err,found){
    if(err){
      console.log(err);
    } else if(found){

      console.log(found);

      Object.keys(req.body).forEach(function(key){
        console.log(found[key]);
        found[key] = req.body[key];

      });

      found.save(function(err,saved){
        if(err){
          res.send({result:'error',error:err.message});
        } else {
          res.send({result:'success'});
        }
      });


    }
  });

});


module.exports = router;

