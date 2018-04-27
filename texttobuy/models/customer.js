var db = require('../../db.js');

var textCustomerSchema = new db.Schema({
    phone : String,
    slackChannel : String,
    chat : [
        {
            message : String,
            messageNormalized : String,
            mediaURL : String,
            sender : String,
            timestamp : Date,
            messageID : String,
            status : String
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
    firstNameNormalized:String,
    lastName : String,
    lastNameNormalized:String,
    fullNameNormalized:String,
    email : String,
    school : String,
    address : {
        billingAddress : {
            name : String,
            address1 : String,
            address2 : String,
            city : String,
            state : String,
            zip : String,
            country : String
        },
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
    textBlast : Boolean,
    lastOrder : Date,
    dontText : Boolean,
    flagged : Boolean,
    flexPlans : [{ type : db.Schema.Types.ObjectId, ref: 'FlexPlan' }]
});

// textCustomerSchema.index({'$**': 'text'});
// textCustomerSchema.index({ firstName:'text',lastName:'text',chat:'text'}, {name: 'My text index', weights: {firstName: 10, lastName: 10, chat:5}});
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
    totalPacks : Number,
    pricePerPack : Number
});



module.exports = {
    TextCustomer : db.model("TextCustomer", textCustomerSchema),
    TextOrder : db.model("TextOrder", textOrderSchema)
};



