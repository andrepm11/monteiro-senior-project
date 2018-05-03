var db = require('../../db.js');

var textCustomerSchema = new db.Schema({
    phone : String,
    chat : [
        {
            message : String,
            messageNormalized : String,
            mediaURL : String,
            sender : String,
            timestamp : Date,
            messageID : String,
            status : String,
            sentiment : String
        }
    ],
    totalOrders : Number,
    totalValue : Number,
    customerId : String,
    card : {
        last4: String,
        brand: String,
        exp_month : String,
        exp_year : String
    },
    created : Date,
    firstName : String,
    lastName : String,
    email : String,
    address : {
        shippingAddress : {
            name : String,
            address1 : String,
            address2 : String,
            city : String,
            state : String,
            zip : String,
            country : String
        }
    },
    orders : [{invoiceNumber : String, completionDate : Date}],
    customerType : String,
    conversionDate : Date,
    lastInteraction : Date,
    waitingOnResponse : Boolean,
    lastOrder : Date,
    dontText : Boolean,
    flagged : Boolean,
});

textCustomerSchema.index({ firstName:'text',lastName:'text',chat:'text'}, {name: 'My text index', weights: {firstName: 100, lastName: 100, chat:5}});



var textOrderSchema = new db.Schema({
    firstName : String,
    lastName : String,
    invoiceNumber : String,
    customerPhone: String,
    email : String,
    stripeCharge : String,
    completionDate : Date,
    items : [
        {
            id : String,
            name : String,
            quantity : Number,
            price : Number,
            totalPrice : Number,
            subscriptionId : String
        }
    ],
    paid : Number,
    totalQuant : Number,
    pricePerQuant : Number
});



module.exports = {
    TextCustomer : db.model("TextCustomer", textCustomerSchema),
    TextOrder : db.model("TextOrder", textOrderSchema)
};



