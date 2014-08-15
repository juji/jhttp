

var Http = require('../');
var http = new Http();
var chai = require('chai');
var should = chai.should;
var q = require('q');

describe('#http',function(done){

	it('should fetch google.com',function(){

		return http.send('google.com')
		.then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.status.should.equal( 200 ),
				resp.headers.should.be.an( 'object' )
			]);

		}).fail(function( resp ){
			
			console.log('\tFAILED');
			console.log(resp);
			return q.all([
				(/^3/.test(resp.status+'')).should.equal(true),
				resp.status.should.equal( 200 ),
				resp.text.should.be.a( 'string' )
			]);

		});
		
	});
});

describe('#https',function(){

	this.timeout(10000);
	it('should fetch https://google.com',function(done){

		http.send('https://google.com')
		.then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.status.should.equal( 200 ),
				resp.headers.should.be.an( 'object' )
			]);

		}).fail(function( resp ){
			
			console.log('\tFAILED');
			console.log(resp);
			return q.all([
				(/^3/.test(resp.status+'')).should.equal(true),
				resp.status.should.equal( 200 ),
				resp.text.should.be.a( 'string' )
			]);

		});

	});

});