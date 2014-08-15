var Http = require('../');
var http = new Http();

describe('#get',function(){

	it('should fetch google.com',function(done){

		http.send('google.com')
		.then(function(status, header, body){
			console.log('status: '+status);
			console.log('header: '+header);
		}).fail(function(status,text){
			console.log('FAILED');
			console.log('status: '+status);
			console.log('text: '+text);
		});
		done();
	});

	it('should fetch https://google.com',function(done){

		http.send('https://google.com')
		.then(function(status, header, body){
			console.log('status: '+status);
			console.log('header: '+header);
		}).fail(function(status,text){
			console.log('FAILED');
			console.log('status: '+status);
			console.log('text: '+text);
		});
		done();
	});

});