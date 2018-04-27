var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    db = require('./db.js'),
    request     = require("request"),
    passport    = require("passport"),
    flash = require("connect-flash"),
    LocalStrategy = require('passport-local').Strategy,
    _  = require("underscore"),
    favicon = require('serve-favicon'),
    path = require('path');

var http = require('http').Server(app);
var io = require('socket.io')(http);

module.exports = {
    io : io
};

// app.use(favicon('./favicon-96x96.png'));

var isLoggedIn = require("./isLoggedIn.js");


require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));


var dashboardRoutes = require("./routes/dashboard"),
    checkoutRoutes  = require("./routes/checkout"),
    twilioRoutes  = require("./routes/twilio"),
    crmRoutes = require("./routes/crm"),
    socketRoutes = require("./routes/socket")(io);


var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

app.use(session({secret:'anystringoftext',
                saveUninitialized:true,
                resave:true,
                store: new MongoStore({ mongooseConnection : db.connection, stringify:false})

                }));
app.use(passport.initialize());
app.use(passport.session());

app.use(dashboardRoutes);
app.use(checkoutRoutes);
app.use(crmRoutes);
app.use(twilioRoutes);

app.set('view engine', 'ejs');


app.get('/', function (req, res) {
  var pass = {
    firstName : req.session.firstName,
    lastName : req.session.lastName,
    email : req.session.email,
    phone : req.session.phone,
    items : req.session.items,
    cartTotal : req.session.cartTotal,
    shipping : req.session.shipping,
    address1 : req.session.address1,
    address2 : req.session.address2,
    city : req.session.city,
    state : req.session.state,
    zip : req.session.zip
  }

  res.render("index",pass);
});

app.get('/login', function(req, res) {
    res.render('dashboard/login', { message: req.flash('loginMessage') }); 
});

app.post('/login', passport.authenticate('local-login',{
   failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}), function(req,res){
    console.log(req.session);
    res.redirect(req.session.route || '/');
    req.session.route = '';
    // successRedirect : '/', // redirect to the secure profile section
    // failureRedirect : '/login', // redirect back to the signup page if there is an error
    // failureFlash : true // allow flash messages
});

app.get('/signup', function(req, res) {

    // render the page and pass in any flash data if it exists
    res.render('dashboard/signup', { message: req.flash('signupMessage') });
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.get("*", function(req,res){
    res.render("index");
});

http.listen(process.env.PORT,process.env.IP,function(){
    console.log("Verb is listening . . .");
});
