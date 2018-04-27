var request = require('request');


function slackPost(endpoint, payloads){
	var headers = {
	    'Content-Type': 'application/x-www-form-urlencoded'
	}

	if(payloads.length > 0){

		var options = {
			url: 'https://slack.com/api/'+endpoint,
		    method: 'POST',
		    headers: headers,
		    form: payloads[0]
		}

		request(options, function(err,res,body){
			if(err){
				console.log(err);
			} else if (!err && res.statusCode != 200) {
	        	// Print out the response body
	        	console.log(body)
	    	} else if (!err && res.statusCode == 200) {
	        	slackPost(endpoint, payloads.slice(1));
	    	}
		});

	} 
}

module.exports = slackPost;