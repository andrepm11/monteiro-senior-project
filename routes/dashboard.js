var stripeTestKey = process.env.STRIPETEST; 
var stripeLiveKey = process.env.STRIPELIVE; 

var express = require("express");
var router = express.Router();
var db = require('../db.js');
var _  = require("underscore");

var models = require("../texttobuy/models/customer.js");
var TextCustomer = models.TextCustomer;
var SchoolInfo = models.SchoolInfo;
var TextOrder = models.TextOrder;

var isLoggedIn = require("../isLoggedIn.js");

var stripe = require("stripe")(stripeTestKey);
// var stripe = require("stripe")(stripeLiveKey);

var accountSid = process.env.twilioSID;
var authToken = process.env.twilioAUTH; 
var twilio  = require("twilio");
var client = new twilio(accountSid, authToken);
var MessagingResponse = require('twilio').twiml.MessagingResponse;

// var slackPost = require("../slackPost.js");

var https = require('https');
var fs = require('fs');

router.get("/dashboard", isLoggedIn, function(req,res){
    var dashboardData = {};
    var finished = _.after(9, doRender);

    TextCustomer.aggregate(
    [{$match:
        {"firstName":
            {$ne:"Customer"}
        }
    },
    {"$project":
        {
            "numchats":{"$size":"$chat"},
            "totalOrders":1
        }
    },
    { "$group":{ "_id":null, "totalOrders":{"$sum":"$totalOrders"},"totalTexts":{"$sum":"$numchats"}}}], 
    function(err,agg){
        if(err){
            console.log(err);
        } else {
            console.log(agg);
            if(agg[0]){
                dashboardData.textsPerOrderBought = agg[0].totalTexts / agg[0].totalOrders;
                console.log('here');
            } else{
                dashboardData.textsPerOrderBought = 0;
            }
            finished();

        }
    });

    TextCustomer.aggregate(
    [{$match:
        {"firstName":
            {$ne:""}
        }
    },
    {"$project":
        {
            "numchats":{"$size":"$chat"},
            "totalOrders":1
        }
    },
    { "$group":{ "_id":null, "totalOrders":{"$sum":"$totalOrders"},"totalTexts":{"$sum":"$numchats"}}}], 
    function(err,agg){
        if(err){
            console.log(err);
        } else {
            if(agg[0]){
                dashboardData.textsPerOrderAll = agg[0].totalTexts / agg[0].totalOrders;
            } else{
                dashboardData.textsPerOrderAll = 0;
            }
            finished();

        }
    });

    // TextOrder.aggregate([{$match:{"orderType":{$ne:""}}},{ "$group":{ "_id":null, "avg_value":{"$avg":"$paid"}, count:{"$sum":1}}}], function(err,agg){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if(agg[0]){
    //             dashboardData.paidPerOrder = agg[0].avg_value;
    //             dashboardData.totalOrders = agg[0].count;    
    //         } else {
    //             dashboardData.paidPerOrder = 0;
    //             dashboardData.totalOrders = 0;
    //         }

    //         finished();
    //     }
    // });

    TextCustomer.count({}, function(err,count){
        if(err){
            console.log(count);
        } else {
            dashboardData.totalCustomers = count;
            finished();
        }
    });
    TextCustomer.count({"firstName":{$ne:"Customer"}}, function(err,count){
        if(err){
            console.log(count);
        } else {
            dashboardData.boughtCustomers = count;
            finished();
        }
    });

    var graph = {};
    TextOrder.aggregate([{ "$group":{ "_id":'$totalQuant', count:{$sum:1}}},{"$sort":{"_id":1}}], function(err,agg){
        if(err){
            console.log(err);
        } else{
        
            // graph.max=agg.slice(-1)[0]['_id'];
            var values = {};
            agg.forEach(function(val){
                values[val['_id']] = val['count'];
            });
            // console.log(values);
            graph.values=values;
            finished();
        }
    });


    TextOrder.aggregate([{ "$group":{"_id": { "hour":{"$hour":{ "$subtract": [ "$completionDate", 5 * 60 * 60 * 1000 ] }}},count:{$sum:1}}},{"$sort":{"_id":1}}], function(err,agg){
        if(err){
            console.log(err);
        } else{
            
            var hours = {};
           
            var i=0;
            agg.forEach(function(val){
                if(val['_id']['hour'] == i){
                    i+=1;
                    hours[val['_id']['hour']] = val['count'];
                } else{
                    while(i <= val['_id']['hour']){
                        hours[i] = 0;
                        i+=1;
                    }
                    hours[val['_id']['hour']] = val['count'];
                }
                // hours[val['_id']['hour']] = val['count'];
            });
            graph.hours = hours;
            finished();
        }
    });

    TextOrder.aggregate([{ "$group":{"_id": { "day":{"$dayOfWeek":{ "$subtract": [ "$completionDate", 5 * 60 * 60 * 1000 ] }}},count:{$sum:1}}},{"$sort":{"_id":1}}], function(err,agg){
        if(err){
            console.log(err);
        } else{
            
            var days = {};
            console.log(agg);
            if(agg[1]){
                days['Monday'] = agg[1]['count'];
                days['Tuesday'] = agg[2]['count'];
                days['Wednesday'] = agg[3]['count'];
                days['Thursday'] = agg[4]['count'];
                days['Friday'] = agg[5]['count'];
                days['Saturday'] = agg[6]['count'];
                days['Sunday'] = agg[0]['count'];
            }


            graph.days = days;
            console.log(graph);
            finished();
        }
    });


    TextOrder.aggregate([
    { "$project": {
        "year": { "$year": { "$subtract": [ "$completionDate", 5 * 60 * 60 * 1000 ] } }, 
        "month": { "$month": { "$subtract": [ "$completionDate", 5 * 60 * 60 * 1000 ] } }, 
        "day": { "$dayOfMonth": { "$subtract": [ "$completionDate", 5 * 60 * 60 * 1000 ] } },
        "paid":"$paid",
        "fullcustomer" : {"$gt":["$paid",2]},
        "trial" : {"$lte":["$paid",2]}
    } },
    { "$group":{"_id": {
                    year : "$year" ,        
                    month : "$month",        
                    day : "$day", fullcustomer:"$fullcustomer" },count:{$sum:1},revenue:{$sum:"$paid"}}},{"$sort":{"_id":1}},
    ],
    function(err,agg){
        if(err){
            console.log(err);
        } else{

            var daily = {};
            agg.forEach(function(val){
                var dateString = val['_id']['year']+'-'+val['_id']['month']+'-'+val['_id']['day'];
                if(daily[dateString]){
                    if(val['_id']['fullcustomer']){
                        daily[dateString]['fullcustomer'] = {'count':val['count'],'revenue':val['revenue']};
                    } else {
                        daily[dateString]['trial'] = {'count':val['count'],'revenue':val['revenue']};
                    }
                } else {
                    if(val['_id']['fullcustomer']){
                        daily[dateString] = {'fullcustomer':{'count':val['count'],'revenue':val['revenue']},
                                                'trial':{'count':0,'revenue':0}};
                    } else {
                        daily[dateString] = {'trial':{'count':val['count'],'revenue':val['revenue']},
                                                'fullcustomer':{'count':0,'revenue':0}};
                    }
                }
                // daily[dateString] = {'count':val['count'],'revenue':val['revenue']};
                // console.log(val);    
            });


            graph.daily = daily;

            finished();
        }
    });

    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = new Date(y, m, 1);
    
    TextOrder.aggregate([
    { "$match" : {"completionDate":{$gte:new Date(firstDay)}}},
    { "$group":{"_id": {"$gt":["$paid",2]},count:{$sum:1},revenue:{$sum:"$paid"}, packsSold:{$sum:{ "$trunc":{"$divide":["$totalQuant",10]}}}}}
    ],
    function(err,agg){
        if(err){
            console.log(err);
        } else{

            if(!agg[0]){
                agg.unshift({'revenue':0,'count':0,'packsSold':0});
            }
            
            if(!agg[1]){
                if(agg[0]){
                    if(agg[0]['boxesSold']){
                        agg.push({'revenue':0,'count':0,'packsSold':0})
                    } else {
                        agg.unshift({'revenue':0,'count':0,'packsSold':0})
                    }
                }
            }

            if(agg[1]){
                dashboardData['monthlystats'] = {
                    trial : {
                        'revenue' : agg[1]['revenue'],
                        'count' : agg[1]['count']
                    },
                    full : {
                        'revenue' : agg[0]['revenue'],
                        'count' : agg[0]['count'],
                        'totalBoxes' : agg[0]['packsSold']
                    }
                };
            } 

            finished();
        }
    });




    var campuses = ['Ground', 'Yale', 'Wesleyan', 'YaleOld'];

    dashboardData.campuses = campuses;

    function doRender(){
        res.render("dashboard/texttobuydash", {dashboardData:dashboardData,graph:graph});
    }

});


router.get("/textcustomers", isLoggedIn, function(req,res){
    TextCustomer.find({},{chat:0},{sort:{"created":-1}},function(err,found){
        res.render("dashboard/textcustomers", {found:found});
    });
});

router.get("/textcustomers/:id", isLoggedIn, function(req,res){
    var loadQuant=parseInt(req.query.loadQuant) || 0;
    loadQuant += 10;
    TextCustomer.findOne({phone:req.params.id}, function(err, found){
        if(err){
            console.log(err);
        } else{
            if(found){
                res.render("dashboard/textcustomerPage", {found:found, loadQuant:loadQuant, price:20});
            } else{
                res.redirect("/404");
            }
        }
    });
});

router.get("/textOrders", isLoggedIn, function(req,res){
    TextOrder.find({},{chat:0},{sort:{"invoiceNumber":-1}},function(err,found){
        res.render("dashboard/textorders", {found:found});
    });
});

router.get("/textOrders/:id", isLoggedIn, function(req,res){

    TextOrder.findOne({invoiceNumber:req.params.id}, function(err, found){
        if(err){
            console.log(err);
        } else{
            if(found){
                res.render("dashboard/textorderPage", {found:found});
            } else {
                res.redirect("/404");
            }
        }
    });
});


module.exports = router;

