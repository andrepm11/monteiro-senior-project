
// function bindCart(){
// 	$('#basket-icon').on('click', function() {
// 	  $('#navbarSide').addClass('reveal');
// 	  $('.overlay').show();
// 	  $("body").addClass("sidebar-open");
// 	});

// 	$('.overlay').on('click', function(){
// 	  $('#navbarSide').removeClass('reveal');
// 	  $('.overlay').hide();
// 	  $("body").removeClass("sidebar-open");
// 	});

// 	$('.close-sidebar').on('click', function(){
// 	  $('#navbarSide').removeClass('reveal');
// 	  $('.overlay').hide();
// 	  $("body").removeClass("sidebar-open");
// 	});

// 	$(document).keyup(function(e) {
// 	     if (e.keyCode == 27) { // escape key maps to keycode `27`
// 	        closeSidebar();
// 	    }
// 	});
// 	function closeSidebar(){
// 	    $('#navbarSide').removeClass('reveal');
// 	    $('.overlay').hide();
// 	    $("body").removeClass("sidebar-open");
// 	}
// }

// bindCart();

// function partial(func /*, 0..n args */) {
//   var args = Array.prototype.slice.call(arguments, 1);
//   return function() {
//     var allArguments = args.concat(Array.prototype.slice.call(arguments));
//     return func.apply(this, allArguments);
//   };
// }

// function bindCart(){
// 	$('.cart-button').off('click');
// 	if(window.location.hash != '!/cart'){
// 		window.location.hash='!/cart';
// 		// openCart();
// 		window.location.replace("/cart");
// 	}
// }

// $('.cart-button').on('click', function(){
// 	window.location.replace("/cart");
// });
// var tempScrollTop = 0;
// function openCart(){
// 	// $('.modal').modal('hide');
// 	// $('.main-order-button').off('click');

// 	// window.location.hash='!/cart';

// 	if(typeof trial !== 'undefined'){
// 		// var url='/cartpartial?trial='+trial;
// 		bindOrderButton();
// 		window.location.href = '/cart';

// 	} else{
// 		var url='/cartpartial';
	
	
// 	$.ajax({ 
// 		type: 'GET', 
// 		url: url,
// 		dataType: 'html', 
// 		success: function(data){ 


// 			$('#navbarSide').html(data); 

// 			bindCart();

// 			$('#navbarSide').addClass('reveal');
// 			$('.overlay').show();
// 			$("body").addClass("sidebar-open");

// 			// openNav();
// 			// stripeCard();

// 			// $('#payment-modal').modal('show');


// 			// bindEmail();


// 			// bindModalHide();
// 			// if(shipping == 'campus'){
// 			// 	changeShipping($('#campus-button'));
// 			// }
// 			$('.cart-button').on('click',openCart); 
// 			// $('.main-order-button').on('click',addToCart);
// 			bindOrderButton();
// 			// var w = $(window).width();
			
// 			// if(w < 768){
// 			// 	tempScrollTop = $(window).scrollTop();
// 			// 	$('#hide-for-cart').css('display','none');
// 			// }
// 		}
// 	});
// 	}
// }
// function removeItem(id){
// 	$('.cart-button').off('click');
// 	$('.main-order-button').off('click');
// 	var url="/cart/removefromcart";
// 	console.log(id);
// 	var data = {
// 		"id":id
// 	}
// 	$('.modal').modal('hide');
// 	setTimeout(function(){
// 		cartPost(url,data,openCart);
// 	},150);

// }


function addToCart(obj){
	// $('.cart-button').off('click');
	// $('.main-order-button').off('click');

	// var obj = '.main-order-button';
	// var obj = $(this);
	console.log(obj);

	var cartVal = $(obj).data('item-quantity')*$(obj).data('item-price');

	var url="/cart/addtocart";
	var data = {
		"id": $(obj).data('item-id'),
		"name": $(obj).data('item-name'),
		"quantity": $(obj).data('item-quantity'),
		"image": $(obj).data('item-image'),
		// "price": $(obj).data('item-price')
	};
	cartPost(url,data, function(){window.location.replace("/cart")});

}

// $('#main-order-button').on('click',addToCart);
// function bindOrderButton(){
	$('.main-order-button').on('click', function(){
		$('.main-order-button').off('click');
		addToCart($(this));
	});	
// }
// bindOrderButton();

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
				callback();
			} else {
				if(data.errMessage){
					alert(data.errMessage);
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


// function removeHash () { 
//     history.pushState("", document.title, window.location.pathname
//                                                        + window.location.search);
// }

// $(document).ready(function(){

	

//     //If there is no trailing shash after the path in the url add it
//     if (window.location.pathname.endsWith('/') === false) {
//         var url = window.location.protocol + '//' + 
//                 window.location.host + 
//                 window.location.pathname + '/' + 
//                 window.location.search;

//         window.history.replaceState(null, document.title, url);
//     }
//     $('.cart-button').click(function(){
// 		$('.cart-button').off('click');
// 		if(window.location.hash != '!/cart'){
// 			window.location.hash='!/cart';
// 			openCart();
// 			// window.location.replace("/cart");
			
// 		}
// 	});
// 	if(window.location.hash){
// 		var hashString = window.location.hash;

// 		if(hashString.indexOf('#!/') != -1){
// 			// $('.cart-button').off('click');
// 			// openCart();
// 		}

// 	}

	

// });

