

var Http = require('../');
var http = new Http();
var chai = require('chai');
var should = chai.should();
var q = require('q');
var urlParse = require('url');


var httpport = 9872;
var httpsport = httpport+1;
/* // create server for testing
var server = require('http').createServer(function(req,resp){
	var path = urlParse.parse(req.url).pathname;
	var f = {
		'/' : function(){
			resp.writeHead(200, {'Content-Type':'text/plain'});
			resp.write('Hello');
			resp.end();
		},
		'/gzip' : function(){
			resp.writeHead(200, {
				'Content-Type':'text/plain',
				'Content-Encoding':'gzip'
			});	
			var z = zlib.createGzip();
			z.pipe(resp);
			z.write('HelloGZIP');
			z.end();
		},
		'/deflate' : function(){
			resp.writeHead(200, {
				'Content-Type':'text/plain',
				'Content-Encoding':'deflate'
			});	
			var z = zlib.createDeflate();
			z.pipe(resp);
			z.write('HelloDEFLATE');
			z.end();
		},
		'/upload' : function(){
			resp.writeHead(200, { 'Content-Type':'application/json' });	
			var z = zlib.createDeflate();
			z.pipe(resp);
			z.write('HelloDEFLATE');
			z.end();
		}
	};
});

server.listen(httpport);

var serverS = require('https').createServer(function(req,resp){
	var url = urlParse.parse(req.url);
	var f = {
		'/' : function(){ 
			resp.writeHead(200, {'Content-Type':'text/plain','Content-Encoding':'identity'});
			resp.write('HelloHTTPS');
			resp.end();
		}
	};
});

serverS.listen(httpsport);

/**/
//start testing
describe('jhttp-client test suite',function(){

this.timeout(6000);

describe('#http',function(){

	it('should fetch localhost:'+httpport,function(){

		return http.request('google.com')
		.then(function( resp ){

			return q.all([
				resp.status.should.equal( 200 ),
				resp.headers.should.be.an( 'object' ) //,
				//resp.body.should.equal( 'Hello' )
			]);

		});
		
	});
});

describe('#https',function(){

	this.timeout(5000);
	it('should fetch https://localhost:'+httpsport,function(){

		return http.request('https://google.com')
		.then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.status.should.equal( 200 ),
				resp.headers.should.be.an( 'object' ) //,
				//resp.body.should.equal( 'HelloHTTPS' )
			]);

		});

	});

});

describe('#json',function(){

	it('should return json object as body from http://api.icndb.com/jokes/random',function(){

		return http.request({
			url: 'http://api.icndb.com/jokes/random',
			output: 'json'
		}).then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.status.should.equal( 200 ),
				resp.headers.should.be.an( 'object' ),
				resp.body.should.be.an( 'object' ),
				resp.body.type.should.not.be.undefined,
				resp.body.type.should.equal( 'success' )
			]);

		});

	});
});


describe('#jQuery',function(){

	it('should return jQuery-like object as body from google.com',function(){

		return http.request({
			url: 'google.com',
			output: '$'
		}).then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.body('body').should.be.an( 'object' )
			]);

		});

	});
});

describe('#buffer',function(){

	it('should return buffer as body from google.com',function(){

		return http.request({
			url: 'google.com',
			output: 'buffer'
		}).then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.body.constructor.should.equal( Buffer )
			]);

		});

	});

});

describe('#upload',function(){

	it('should upload sucessfully to jujiyangasli.com/jhttp-test.php',function(){

		return http.request({
			url: 'jujiyangasli.com/jhttp-test.php',
			output: 'json',
			method: 'post',
			data:{
				content:{
					param: 'paramvalue'
				},
				file:[
					{
						name : 'uploaded[]',
						filename: 'uploaded.txt',
						content: 'this is the content'
					}
				]
			}
		}).then(function( resp ){

			console.log('\tOK');
			return q.all([
				resp.body.status.should.be.ok,
				resp.body.message.should.be.an('object'),
				resp.body.message.param.should.equal('paramvalue'),
				resp.body.message.uploaded.length.should.equal(1),
				resp.body.message.uploaded[0].size.should.equal(19),
				resp.body.message.uploaded[0].name.should.equal('uploaded.txt'),
				resp.body.message.uploaded[0].type.should.equal('text/plain')
			]);

		});

	});

});

describe('#cookie',function(){

	it('should save the cookie from Set-Cookie header',function(){

		var f = http.request('http://jujiyangasli.com/testcookie.php')
		.then(function( resp ){

			resp.body.should.equal('ok');
			return http.request('http://jujiyangasli.com/testcookie.php')
			.then(function(resp){

				return resp.body.should.equal('cookie is good');

			});

		});

		return f;

	});

});

}); 