function cartPost(url, data, callback){

	// $('#loading-indicator').show();

	$.ajax({
		url: url,
		type: "POST",
		dataType: "json",
		data: JSON.stringify(data),
		contentType: "application/json",
		cache: false,
		timeout: 15000,
		complete: function() {
		//called when complete
			// console.log('Complete');
		},
		success: function(data) {

			if(data.result == 'success'){
				// stopLoading();
				$('.alert-div').html('');
				callback();
			} else {
				if(data.errMessage){
					console.log(data);
					// alert(data.errMessage);
					if(data['alertId']){
						console.log($(data['alertId']));
						$('#'+data['alertId']).html('<div class="alert alert-danger alert-dismissible fade show" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p class="mb-0 pr-3">'+data.errMessage+'</p></div>');
						document.getElementById(data['alertId']).scrollIntoView();
						// $('#'+data['alertId']).removeClass('collapse');
						// $('#'+data['alertId']).addClass('show');
					}
					stopLoading();
				}
				if(data.error){
					stopLoading();
					$('#stripeTokenInput').remove();
					$('#card-errors').html('<span>'+data.error+'</span>');
					$('#complete-order').prop('disabled', false);
					$('#complete-order').removeClass('disabled');
				}

			}
		},
		error: function() {
			alert('Error. Please try again later.');
			$('#complete-order').prop('disabled', false);
			$('#complete-order').removeClass('disabled');

		}
	});

}

$(document).on('submit', '#friend-form', function(evt){
	evt.preventDefault();
	loading();
	

	stopLoading();

	$('#payment-complete').css('display','none');
	$('#friend-complete').css('display','block');

		
	return false;
});

$(document).on('submit', '#information-form', function(evt){
	evt.preventDefault();

	var url = "/cart/set-session";
	var data = {
		"firstName" : $('#firstName').val(),
		"lastName" : $('#lastName').val(),
		"email" : $('#email').val(),
		"phone" : $('#phone').val()
	};
	cartPost(url, data, partial(cartButton,$('#information-form')));
	
	
	return false;
});


$(document).on('submit', '#shipping-form', function(evt){
	evt.preventDefault();

	var url = "/cart/set-session";

	var type = $('#shipping-input').val();

	if(type == 'campus'){
		var data = {
			"shipping" : $('#shipping-input').val(),
			"school" : $('#school').val()
		}

		
	} else{
		var data = {
			"shipping" : $('#shipping-input').val(),
			"address1" : $('#address1').val(),
			"address2" : $('#address2').val(),
			"city" : $('#city').val(),
			"state" : $('#state').val(),
			"zip" : $('#zip').val()
		}		
	}

	cartPost(url, data, partial(cartButton,$('#shipping-form')));

	return false;
});

function quantUpdate(v){
	if(v<1){
		$('#quantity').val(1);
		$('#price').val('$'+ parseInt($('#item').val()));
		$('#price-display').val('$'+ parseInt($('#item').val()));
	} else {
		$('#price').val('$'+ $('#item').val()*v);
		$('#price-display').val('$'+ $('#item').val()*v);				
	}
}

function changePrice(idx){
	$('#total'+idx.toString()).val('$'+($('#quantity'+idx.toString()).val()*($('#price'+idx.toString()).val())).toFixed(2));

	updateTotal();
}

function changeQuantity(obj){
	if($(obj).data('action')!=-1 || $('#quantity'+$(obj).data('idx').toString()).val()>1){
		$('#quantity'+$(obj).data('idx').toString()).val(parseInt($('#quantity'+$(obj).data('idx').toString()).val())+$(obj).data('action'));
		changePrice($(obj).data('idx'));
	}
}












// Add an instance of the card Element into the `card-element` <div>
function stripeCard(){

	var stripe = Stripe('pk_test_zOY8S0whbIDRAbHll4PObECR');


	// Create an instance of Elements
	var elements = stripe.elements();

	// Custom styling can be passed to options when creating an Element.
	// (Note that this demo uses a wider set of styles than the guide below.)
	var style = {
		base: {
			color: '#32325d',
			lineHeight: '24px',
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#aab7c4'
			}
		},
		invalid: {
			color: '#fa755a',
			iconColor: '#fa755a'
		}
	};

	// Create an instance of the card Element
	var card = elements.create('card', {
		style: style
	});

	card.mount('#card-element');

	// Handle real-time validation errors from the card Element.
	card.addEventListener('change', function(event) {

		var displayError = document.getElementById('card-errors');
		if (event.error) {
			displayError.textContent = event.error.message;
		} else {
			displayError.textContent = '';
		}
	});



	// Handle form submission
	// var form = document.getElementById('payment-form');
	var form = document.getElementById('cart-form');
	form.addEventListener('submit', function(event) {
		event.preventDefault();

		loading();

		stripe.createToken(card).then(function(result) {
			if (result.error) {
				// Inform the user if there was an error
				var errorElement = document.getElementById('card-errors');
				errorElement.textContent = result.error.message;

				console.log('ERROR creating token');
				stopLoading();
			} else {
				// Send the token to your server
				stripeTokenHandler(result.token);
			}
		});
	});
}


stripeCard();

function stripeTokenHandler(token) {
	// Insert the token ID into the form so it gets submitted to the server
	var form = document.getElementById('cart-form');
	var hiddenInput = document.createElement('input');
	hiddenInput.setAttribute('type', 'hidden');
	hiddenInput.setAttribute('name', 'stripeToken');
	hiddenInput.setAttribute('value', token.id);
	hiddenInput.setAttribute('id', 'stripeTokenInput');
	form.appendChild(hiddenInput);


	var url="/validatephone";
	var data = {
		"phone":$("#phone").val(),
		"alert":"place-order-alert"
	}
	setTimeout(function(){
		cartPost(url,data,paymentFormSubmit);
	},150);
	// Submit the form
	// paymentFormSubmit();
}

function loading(){
	$('#loading-indicator').show();
	$('.cart-buttons').prop('disabled', true);
	$('.cart-buttons').addClass('disabled');
}

function stopLoading(){
	$('#loading-indicator').hide();
	$('.cart-buttons').prop('disabled', false);
	$('.cart-buttons').removeClass('disabled');
}

function paymentFormSubmit(){
	var url = "/cart/web-charge";

	// $('#complete-order').prop('disabled', true);
	// $('#complete-order').addClass('disabled');

	var i=0;
	var items = [];
	var cartTotal = 0;

	while($('#item-id'+i.toString()).length){
		var id = $('#item-id'+i.toString()).data('id');
		var quantity = $('#item-id'+i.toString()).text();
		var itemName = $('#item-name'+i.toString()).text();
		var image = $('#item-image'+i.toString()).attr('src');
		var price = $('#item-price'+i.toString()).data('price');
		// var total = $('#total'+i.toString()).val();
		if(quantity == 'Trial'){
			quantity = 1;
		}

		cartTotal+=quantity*price;
		var item = {
			"id":id,
			"name": itemName,
			"quantity": quantity,
			"image": image,
			"price": price
		}
		items.push(item);
		i+=1;
		// console.log(id)


		// cartTotal+=quantity*price;
		// var item = {
		// 	"id":id,
		// 	"quantity": quantity,
		// }
		// items.push(item);
		// i+=1;
	}

	var data = {
		firstName : $('#firstName').val(),
		lastName : $('#lastName').val(),
		email : $('#email').val(),
		phone : $('#phone').val(),
		address1 : $('#address1').val(),
		address2 : $('#address2').val(),
		city : $('#city').val(),
		state : $('#state').val(),
		zip : $('#zip').val(),
		items : items,
		stripeToken : $('#stripeTokenInput').val(),
		cartTotal : cartTotal,
		shipping : 'ground'
	};

	
	cartPost(url, data, paymentComplete);

	
	return false;
}

function paymentComplete(){

	
	stopLoading();
	$('#cart').css('display', 'none');
	$('#payment-complete').css('display','block');
}


function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}



$('input[type=radio][name=shipping]').change(function() {
    $('.shipping-div').css('display','none');
    $('#'+$(this).data('div')).css('display','block');
    
    var type = $(this).val();

    if(type == 'campus'){
		$('.address-field').prop('required',false);
	} else{
		$('.address-field').prop('required',true);
		$('#address2').prop('required',false);
	}
});

$("#phone").on("change keyup paste", function () {
    var output;
    var input = $("#phone").val();
    
    input = input.substr(3);

    input = input.replace(/[^0-9]/g, '');

    var area = input.substr(0, 3);
    var pre = input.substr(3, 3);
    var tel = input.substr(6, 4);


    if (area.length < 3) {
        output = "(" + area;
    } else if(area.length ==3 && pre.length == 0){
    	output = "(" + area;
    } else if (area.length == 3 && pre.length < 3) {
        output = "(" + area + ")" + " " + pre;
    } else if (area.length == 3 && pre.length == 3 && tel.length == 0) {
    	output = "(" + area + ")" + " " + pre;
    } else if (area.length == 3 && pre.length == 3){
		output = "(" + area + ")" + " " + pre + "-" + tel;
    }

    $("#phone").val('+1 '+output);
});

$(".form-control").on("change", function () {

	// console.log($(this));
	var attributeId = $(this).attr("id");

	console.log('here');

	if($(this).attr("id") == "phone"){
		var url="/validatephone";
		var data = {
			"phone":$("#phone").val(),
			"alert":"phone-alert"
		}
		
		setTimeout(function(){
			cartPost(url,data,function(){console.log('phone');});
		},150);

	} else if($(this).attr("id") != 'card-element'){
		var url = "/cart/set-session";
		var data = {
		};
		data[attributeId] = $(this).val();
		cartPost(url, data, function(){});

	}
    
});

// $('.cart-plus').on('click', function(){
// 	var quant = parseInt($($($(this).parent()).children()[1]).text());
// 	$($($(this).parent()).children()[1]).html(quant+1);

// 	var priceObj = $($($(this).parent()).next()).children()[0];

// 	var price = $(priceObj).data('price');
// 	$(priceObj).text('$'+(price*(quant+1)));

// 	$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))+parseFloat(price)).toFixed(2));
// 	// console.log($($($($($(this).parent()).parent()).children()[2]).children()[0]);
// });
// $('.cart-minus').on('click', function(evt){
// 	if($(this).parent().children().length == 2){
// 		var obj = $($($(this).parent()).children()[0]);
// 		var quant = obj.text();
// 		var itemId = obj.data('id');
// 	} else {
// 		var quant = parseInt($($($(this).parent()).children()[1]).text());
// 	}

// 	if(quant == 'Trial'){
// 		var priceObj = $($($(this).parent()).next()).children()[0];

// 		var price = $(priceObj).data('price');
		

// 		$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

// 		removeFromCart(itemId);

// 		$($($($(this).parent()).parent()).parent()).parent().remove();



// 		if(!$('.cart-product').length){
// 			$('#cart').css('display','none');
// 			$('#no-cart').css('display','block');
// 		}
		
// 	} else if( quant > 1){
		
// 		$($($(this).parent()).children()[1]).html(quant-1);
// 		var priceObj = $($($(this).parent()).next()).children()[0];

// 		var price = $(priceObj).data('price');
// 		$(priceObj).text('$'+(price*(quant-1)));

// 		$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

// 	} else {
// 		var priceObj = $($($(this).parent()).next()).children()[0];


// 		var price = $(priceObj).data('price');
		
// 		var itemId = $($(this).next()).data('id');
// 		$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

// 		removeFromCart(itemId);


// 		$($($($(this).parent()).parent()).parent()).parent().remove();
		
// 		if(!$('.cart-product').length){
// 			$('#cart').css('display','none');
// 			$('#no-cart').css('display','block');
// 		}

// 		// Delete this
// 		// $($($(this).parent()).children()[1]).html(quant-1);
// 	}
// 	// $($($(this).parent()).children()[1]).html('hey');
// });

// function removeFromCart(id){
// 	var url="/cart/removefromcart";
// 	var data = {
// 		"id":id
// 	}
// 	setTimeout(function(){
// 		cartPost(url,data,function(){});
// 	},150);
// }

// $('#orderSummaryBtn').on('click', function(evt){
// 	if($(this).hasClass('collapsed')){
// 		$('#orderSummaryText').html('Hide order summary &and;');
// 	} else{
// 		$('#orderSummaryText').html('Show order summary &or;');
// 	}
// });

$("#phone").on("focus", function (e) {
	$(this).setCursorPosition(100);
});

$.fn.setCursorPosition = function(pos) {
  this.each(function(index, elem) {
    if (elem.setSelectionRange) {
      elem.setSelectionRange(pos, pos);
    } else if (elem.createTextRange) {
      var range = elem.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  });
  return this;
};




function bindCartSection(){

	var promo = $($('#promo-list').children()[0]).children();
	// console.log(promo);

	$('.cart-plus').on('click', function(){
		var quant = parseInt($($($(this).parent()).children()[1]).text());
		$($($(this).parent()).children()[1]).html(quant+1);

		var priceObj = $($($(this).parent()).next()).children()[0];

		var price = $(priceObj).data('price');
		$(priceObj).text('$'+(price*(quant+1)));

		var total = (parseFloat($(".cart-total").text().substr(1))+parseFloat(price)).toFixed(2);
		$(".cart-total").text('$'+total);

		if(promo.length){
			var id = promo.data('id');
			var type = promo.data('type');
			var number = promo.data('number');

			codeValue([id, type, number, promo.text()]);
		}
		

		// console.log($($($($($(this).parent()).parent()).children()[2]).children()[0]);
	});
	$('.cart-minus').on('click', function(evt){
		if($(this).parent().children().length == 2){
			var obj = $($($(this).parent()).children()[0]);
			var quant = obj.text();
			var itemId = obj.data('id');
		} else {
			var quant = parseInt($($($(this).parent()).children()[1]).text());
		}

		if(quant == 'Trial'){
			var priceObj = $($($(this).parent()).next()).children()[0];

			var price = $(priceObj).data('price');
			

			$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

			removeFromCart(itemId);

			$($($($(this).parent()).parent()).parent()).parent().remove();



			if(!$('.cart-product').length){
				$('#cart').css('display','none');
				$('#no-cart').css('display','block');
			}
			
		} else if( quant > 1){
			
			$($($(this).parent()).children()[1]).html(quant-1);
			var priceObj = $($($(this).parent()).next()).children()[0];

			var price = $(priceObj).data('price');
			$(priceObj).text('$'+(price*(quant-1)));

			$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

		} else {
			var priceObj = $($($(this).parent()).next()).children()[0];


			var price = $(priceObj).data('price');
			
			var itemId = $($(this).next()).data('id');
			$(".cart-total").text('$'+(parseFloat($(".cart-total").text().substr(1))-price).toFixed(2));

			removeFromCart(itemId);


			$($($($(this).parent()).parent()).parent()).parent().remove();
			
			if(!$('.cart-product').length){
				$('#cart').css('display','none');
				$('#no-cart').css('display','block');
			}

			// Delete this
			// $($($(this).parent()).children()[1]).html(quant-1);
		}

		if(promo.length){
			var id = promo.data('id');
			var type = promo.data('type');
			var number = promo.data('number');

			codeValue([id, type, number, promo.text()]);
		}
		// $($($(this).parent()).children()[1]).html('hey');
	});

	function removeFromCart(id){
		var url="/cart/removefromcart";
		var data = {
			"id":id
		}
		setTimeout(function(){
			cartPost(url,data,function(){});
		},150);
	}

	$('#orderSummaryBtn').on('click', function(evt){
		if($(this).hasClass('collapsed')){
			$('#orderSummaryText').html('Hide order summary &and;');
		} else{
			$('#orderSummaryText').html('Show order summary &or;');
		}
	});

	$('#promo-code').keypress(function(e){
		var code = e.keyCode || e.which;
		if( code === 13 ) {
			e.preventDefault();
			promoCode();
			$( "#promo-code" ).focus();
		}
	});
	$('#promo-btn').on('click', function(){
		promoCode();
		$( "#promo-code" ).focus();
	});



	function codeValue(code){

		if(code[1] == 'percent'){
			var difference = (parseFloat($($('.cart-total')[0]).text().substring(1))*(code[2])/100).toFixed(2)
			var newTotal = (parseFloat($($('.cart-total')[0]).text().substring(1)-difference)).toFixed(2);
			$('.discounted-total').text('$'+newTotal);
		} else if(code[1] == 'amount'){
			var difference = parseFloat(code[2]).toFixed(2);
			var newTotal = (parseFloat($($('.cart-total')[1]).text().substring(1))-difference).toFixed(2);
			$('.discounted-total').text('$'+newTotal);
		}

		if($('#cart-total').children().length < 2){
			$('#cart-total').html('<h6 class="cart-total strikethrough">'+$($('.cart-total')[0]).text()+'</h6><h6 class="discounted-total cart-promo">$'+newTotal+'</h6>');
		}

		var newPromo = '<div class="offset-2 col-6 text-left cart-header"><h6 id="'+code[3]+'" data-id="'+code[0]+'" data-type="'+code[1]+'" data-number="'+code[2]+'" class="cart-promo">'+code[3]+'</h6></div><div class="col-4 text-right cart-header pr-0"><h6 class="cart-promo">- $'+difference+'</h6></div>';
		$('#promo-list').css('display','flex');
		//Multiple Codes
		// $('#promo-list').append(newPromo);
		$('#promo-list').html(newPromo);
		promo = $($('#promo-list').children()[0]).children();
	}

	function promoCode(){
		var url="/promocode";
		var data = {
			"code":$("#promo-code").val(),
			"alert":"promo-code-alert"
		};

		$.ajax({
			url: url,
			type: "POST",
			dataType: "json",
			data: JSON.stringify(data),
			contentType: "application/json",
			cache: false,
			timeout: 15000,
			complete: function() {
			//called when complete
				// console.log('Complete');
			},
			success: function(data) {

				if(data.result == 'success'){
					// stopLoading();
					$('.alert-div').html('');
					codeValue(data.code);
					$('#promo-code-alert').html('<div class="alert alert-success alert-dismissible fade show mb-0" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p class="mb-0 pr-3">Success!</p></div>');

				} else {
					if(data.errMessage){
						// alert(data.errMessage);
						if(data['alertId']){
							// console.log($(data['alertId']));
							$('#'+data['alertId']).html('<div class="alert alert-danger alert-dismissible fade show mb-0" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p class="mb-0 pr-3">'+data.errMessage+'</p></div>');
							// document.getElementById(data['alertId']).scrollIntoView();
							// $('#'+data['alertId']).removeClass('collapse');
							// $('#'+data['alertId']).addClass('show');
						}
						stopLoading();
					}
					if(data.error){
						stopLoading();
						$('#stripeTokenInput').remove();
						$('#card-errors').html('<span>'+data.error+'</span>');
						$('#complete-order').prop('disabled', false);
						$('#complete-order').removeClass('disabled');
					}

				}
			},
			error: function() {
				alert('Error. Please try again later.');
				$('#complete-order').prop('disabled', false);
				$('#complete-order').removeClass('disabled');

			}
		});
	}
}

function cartSection(){
	var url='/cart-section';
	$.ajax({ 
		type: 'GET', 
		url: url,
		dataType: 'html', 
		success: function(data){ 
			// data = JSON.parse(data);
			$('#cart-section').html(data);
			bindCartSection();
		}
	});
}
cartSection();






