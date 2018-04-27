var mongoose    = require("mongoose");
var db = require('../db.js');

var models = require("../texttobuy/models/customer.js");
var TextCustomer = models.TextCustomer;
var SchoolInfo = models.SchoolInfo;
var TextOrder = models.TextOrder;

var accountSid = process.env.twilioSID;
var authToken = process.env.twilioAUTH; 
var twilio  = require("twilio");
var client = new twilio(accountSid, authToken);

module.exports = function(io){
  io.on('connection', function(socket){
    console.log('a user connected');
    
    socket.on('disconnect', function(){
      console.log('user disconnected');

    });

    socket.on('chat message', function(data){
      console.log(data);
      // console.log('message: ' + msg);
      TextCustomer.findOne({"phone":data.phone}, function(err,customer){
        if(err){
          console.log('CRM ERROR 6');
          console.log(err);
        } else{
          if(customer){

            client.messages.create({
                body:data.message,
                to:data.phone,
                from:'+17864603490',
                statusCallback: 'https://monteiro-senior-project.herokuapp.com/twilioCallBack',
            }, function(err,message){
                if(err){
                    console.log('CRM ERROR 7');
                    console.log('Phone: '+data.phone);
                    console.log(err);

                    data.error = err;

                    socket.emit('chat error', data);
                } else{
                  var timestamp = new Date();
                    customer.chat.push({
                        message : data.message,
                        sender : 'Company',
                        timestamp : timestamp,
                        messageID : message.sid,
                        status : 'pending'
                    });
                    customer.lastInteraction = timestamp;
                    customer.save();
                    // console.log('Sent to '+firstName+' '+lastName+' and saved '+customer.firstName+' '+customer.lastName);
                    data.sender = 'company'
                    data.timestamp = timestamp;
                    data.firstName = customer.firstName;
                    data.lastName = customer.lastName;
                    io.emit('chat message', data);
                }
            }); 
          }
        }
      });
            



      // io.emit('chat message', data);
    });

    socket.on('typing',function(data){
      socket.broadcast.emit('isTyping', data);
    });
    socket.on('notTyping', function(data){
      io.emit('notTyping');
    });

  });
}
