var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DATABASEURL,function(error){
	if(error){
		console.log(error);
	}
});

mongoose.connection.on('connected', function() {
    console.log('Mongo DB connection open');
});

	

module.exports = mongoose;