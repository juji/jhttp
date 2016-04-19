
var jhttp = require('../lib/jhttp.js');
var IP = '127.0.0.1:9999';
var Q = require('q');
var should = require('chai').should()

require('../dev/server.js').listen(9999);


describe('simpleget', function() {

	it('should do simple get', function() {

    	return jhttp({log:false}).request({
    		url: 'http://'+IP
    	}).then(function(d){
    		d.status.should.equal(200);
    		d.body.should.be.a('string');
    		d.body.should.equal('this is content');
    	});

  	});
  	
});

describe('keepalive', function() {

	it('should do keepalive', function() {

		var  f = jhttp({log:false});

    	return Q.all([
    		
    		f.request({
	    		url: 'http://'+IP
	    	}),

	    	f.request({
	    		url: 'http://'+IP
	    	})

    	]).then(function(d){
    		for(var i in d) d[i].status.should.equal(200);
    	});


  	});
  	
});

describe('json', function() {

	it('should do json', function() {
		return jhttp({log:false}).request({
	    		url: 'http://'+IP+'/test.json',
	    		output:'json'
	    	}).then(function(d){
	    		d.status.should.equal(200);
    			d.body.should.be.an('object');
    			should.exist(d.body.asdf);
    			d.body.asdf.should.equal('asdf');
	    	});
    });
});

describe('html', function() {

	it('should do html', function() {
		return jhttp({log:false}).request({
	    		url: 'http://'+IP+'/test.html',
	    		output:'$'
	    	}).then(function(d){
	    		d.body('#test').text().should.equal('this is test content');
	    	});	
    });
});


describe('https', function() {

	it('should do https', function() {
		return jhttp().request({
	    		url: 'https://www.google.com',
	    		output:'$'
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    	});	
    });
});

describe('gzip', function() {
	this.timeout(10000);

	it('should do gzip', function() {
		return jhttp().request({
	    		url: 'http://developer.mozilla.org',
	    		output:'$',
	    		headers: {'Accept-Encoding'  : 'gzip'}
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    		d.body(d.body('title')[0]).html().should.be.a('string');
	    	});
    });
});

describe('deflate', function() {
	this.timeout(10000);

	it('should do deflate', function() {
		return jhttp().request({
	    		url: 'http://live.com',
	    		output:'$',
	    		headers: {'Accept-Encoding'  : 'deflate'}
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    		d.body(d.body('title')[0]).html().should.be.a('string');
	    	});	
    });
});

describe('form', function() {
	this.timeout(10000);

	it('should do form submit', function() {
		return jhttp().request({
	    		url: 'http://'+IP+'/upload',
	    		output:'json',
	    		method:'post',
	    		data:{
	    			content:{
	    				"hello there": 'world',
	    				it: 'is happy'
	    			}
	    		}
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    		d.body.should.be.an('object');
	    		d.body.it.should.equal('is happy');
	    	});	
    });
})


describe('multipart', function() {
	this.timeout(10000);

	it('should do multipart', function() {
		return jhttp().request({
	    		url: 'http://'+IP+'/multer',
	    		output:'string',
	    		method:'post',
	    		data:{
	    			content:{
	    				"hello there": 'world',
	    				it: 'is happy'
	    			},
	    			file:[
	    				{
	    					name: 'file1',
	    					filename: 'dev/asdf',
	    					mime: 'text/plain'
	    				},
	    				{
	    					name: 'file2',
	    					filename: 'hello.txt',
	    					content: 'Hello world'
	    				}
	    			]
	    		}
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    		JSON.parse(d.body).should.be.an('object');
	    	});	
    });
})

describe('unix',function(){

	it('should do unix socket',function(){

		return jhttp().request({
	    		url: 'http://unix:/home/juji/sock:/',
	    	}).then(function(d){
	    		d.status.should.equal(200);
	    		d.body.should.not.equal('');
	    	});

	});

});

describe('stream',function(){

	it('should stream body',function(){

		var f = jhttp().request({
	    		url: 'http://google.com',
	    		stream: true
	    	});

		f.then(function(d){
	    	d.status.should.equal(200);
	    	d.body.should.equal('');
	    });

		var len = 0;
	    f.stream
	    .on('redirect',function(c){
	    	
	    	console.log('------------------');
	    	console.log('Redirect: '+c);

	    }).on('headers',function(c){
	    	console.log('------------------');
	    	console.log('Headers: ');
	    	console.log('------------------');
	    	console.log(c);
	    	console.log('------------------');
	    }).on('data',function(c){
	    	len += c.length;
	    }).on('end',function(c){
	    	console.log('content length: '+len);
	    });

	    return f;

	});

});