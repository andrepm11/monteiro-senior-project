var User      = require('./dashboard/models/user.js');
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()){
        User.findOne({"_id":req._passport.session.user}, function(err,found){
            if(err){
                console.log(err);
            } else{
                if(found){

                    if(req.path!='/campuspickup' && req.path!='/campusfulfilled'){
                        if(found.local.group != 'ADMIN'){
                            res.redirect('/campuspickup?campus='+found.local.group);
                        }
                    }
                    req.session.activeUser = found.local.email;
                    return next();
                }    
            }
        });
        
    }
    else { 
        // req.session.route = req.route.path;
        req.session.route = req.originalUrl;
  
        res.redirect('/login');
    }
}

module.exports = isLoggedIn;