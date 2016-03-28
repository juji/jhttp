
'use strict';

var Q = require('q');
var userAgentGenerator = require('user-agent-string-generator');
var mime = require('mime');
var http = require('http');
var https = require('https');
var urlUtils = require('url');
var Pass = require('./Pass.js');
var Decompress = require('./Decompress.js');
var cookieman = require('cookie-manager');
var iconv = require('./iconv.js');
var fs = require('fs');
var bodyGenerator = require('./BodyGenerator.js');

Q.longStackSupport = true;

/*--------------------------------------------------------------------------------------------------
/ variables
/
*/

var REDIRECTION = [
	301, 302, 303, 307, 308
];

var optDefault = {
	auth               : '',
	accept             : 'text/html, text/plain, application/json, */*',
	output             : 'string',
	expect             : 200,
	followRedirect     : true,
	useCookie          : true,
	method             : "get",
	url                : "example.com",
	data               : false,
	charset			   : "utf-8",
	proxy              : '',
	ssl                : {
		rejectUnauthorized : false,
	},
	headers            : {
		'user-agent'       : '',
		'Accept-Encoding'  : 'gzip;q=0.9, deflate;q=0.5, identity;q=0.2'
	},
	agent 			   : {
		keepAlive          : true
	},
	log 			   : false
};



/*--------------------------------------------------------------------------------------------------
/ globals
/
*/

global.JHTTPLOG = false;
global.Jlog = {
	log: function(str){
		if(!JHTTPLOG) return;
		console.log(str);
	},
	error: function(str){
		if(!JHTTPLOG) return;
		console.error(str);	
	}
}



/*--------------------------------------------------------------------------------------------------
/ class
/
*/

class jhttp {

	constructor(opt){

		this.opt = this.__merge({},optDefault);
		this.opt.headers['user-agent'] = userAgentGenerator();

		typeof opt == 'string' && (this.opt.url = opt);
		typeof opt == 'object' && (this.opt = this.__merge(opt,this.opt));

		if(this.opt.log) global.JHTTPLOG = true;
		this.cookieman = new cookieman();

	}

	// do the request
	__request( reqopt, opt, data, isredirect ){
		
		return Q(0).then(()=>{

			var p = Q.defer();

			var req = (reqopt.protocol == 'https' ? https : http).request(reqopt, (res)=>{

				if(!res) return;

				// cookie
				res.headers['set-cookie'] && this.cookieman.store(opt.url,res.headers['set-cookie']);

				// redirection
				if(REDIRECTION.indexOf(res.statusCode) >= 0 && opt.followRedirect){
					

					// this is stupid, but it can happen
					if(!res.headers.location)
						p.reject({
							request: reqopt,
							status: res.statusCode,
							headers: res.headers,
							body: '',
							text: 'Location header not found'
						});

					else{ 
						opt.url = urlUtils.resolve( opt.url, res.headers.location );
						p.resolve(this.request(opt, true));
					}

					return;
				}

				// set output stream & buffer
				var buff = opt.output == 'buffer' ? new Buffer([]) : '';
				
				var bodyStream = res

					// decompress
					.pipe(Decompress(res.headers['content-encoding']))

					// iconv
					.pipe(iconv(res.headers['content-type']))

					// parse and convert
					.pipe(Pass(opt.output));

				// all should be in utf-8
				bodyStream.on('data',function(c){
					if(opt.output == 'buffer') buff = Buffer.concat(buff,c);
					if(opt.output == 'string') buff += c;

					// data event will hit only once, for these type of output
					// with the correct data type
					if(opt.output == 'json') buff = c;
					if(opt.output == '$') buff = c;
				});

				bodyStream.on('end',(c)=>{
					if(opt.expect && res.statusCode !== opt.expect)
						p.reject({
							//request: reqopt,
							status: res.statusCode,
							headers: res.headers,
							body: buff,
							text: 'Invalid status code: '+res.statusCode
						});
					else			
						p.resolve({
							//request: reqopt,
							status: res.statusCode,
							headers: res.headers,
							body: buff
						});
				});

				bodyStream.on('error',(e)=>{
					p.reject({
						//request: reqopt,
						status: res.statusCode,
						headers: res.headers,
						body: buff,
						text: e.stack
					});
				});

			});

			req.on('error',(e)=>{
				p.reject({
					request: reqopt,
					status: 0,
					headers: 0,
					body: '',
					text: e.stack
				});
			});

			if(data && data.dataFile) fs.createReadStream(data.dataFile).pipe(req);
			else if(data && data.dataString) { req.write(data.dataString); req.end(); }
			else if(data && data.dataStream) { data.dataStream.pipe(req); }
			else req.end();

			return p.promise;
		});
	}

	// utils
	__getUnixPath(url){
		return url.replace(/http(s)?\:\/\//,'')
				.replace(/unix\:/,'')
				.replace(/\:\/.+/,'');
	}

	// merge object recursive, deep copy
	__merge(opt,optDef){
		if(!opt || typeof opt !== 'object' ) opt = {};
		for(var i in optDef){
			if(typeof optDef[i] == 'object' ) opt[i] = this.__merge(opt[i],optDef[i]);
			else if(typeof opt[i]=='undefined') opt[i] = optDef[i];
		}
		return opt;
	}

	// get request object
	__requestObj(opt){
		var req = {
			method: opt.method.toUpperCase(),
			headers: opt.headers
		};

		if(opt.auth) req.auth = opt.auth;

		if(opt.url.match(/unix\:\//)) {	
			req.socketPath = this.getUnixPath(opt.url);
			req.protocol = 'http'+(opt.url.match(/https\:\//)?'s':'')+':';

		} else {
			var url = urlUtils.parse(opt.url);
			req.hostname = url.hostname;
			req.path = url.path;
			if(url.auth) req.auth = url.auth;
			req.protocol = url.protocol.replace('\/\/','');
			if(url.port) req.port = url.port;
			else if(req.protocol=='https:') req.port = 443;
			else req.port = 80;
		}

		var cookie;
		opt.useCookie && 
		(cookie = this.cookieman.prepare(opt.url)) && 
		(req.headers.cookie = cookie);

		if(opt.agent && req.protocol=='https:')
			req.agent = new https.Agent(opt.agent);
		if(opt.agent && req.protocol=='http:')
			req.agent = new http.Agent(opt.agent);

		return req;		
	}

	// data handling
	__setData(data){
		return bodyGenerator(data);
	}

	// request interface
	request(opt, isredirect){
		return Q(0).then(()=>{
			
			(typeof opt == 'string' && (this.opt.url = opt)) || 
			(opt = this.__merge( opt, this.opt));

			Jlog.log("initializing options: ");
			Jlog.log(JSON.stringify(opt,null,2));
			Jlog.log("================================\n");

			var dataHandling = opt.data && opt.method !== 'get' ? this.__setData(opt.data) : Q(0);
			var reqopt = this.__requestObj( opt );
			return dataHandling.then((o)=>{
				
				if(o) {
					var data = {};
					reqopt.headers['content-type'] = o.type;
					reqopt.headers['content-length'] = o.size;
					if(o.file) data.dataFile = o.file;
					if(o.string) data.dataString = o.string;
					if(o.stream) data.dataStream = o.stream;
				}

				// set headers
				reqopt.headers['accept'] = this.opt.accept;
				if(this.opt.output=='json') reqopt.headers['accept'] = 'application/json';
				if(this.opt.output=='$') reqopt.headers['accept'] = 'text/html';
				if(this.opt.headers.accept) reqopt.headers['accept'] = this.opt.headers.accept;

				reqopt.headers['accept-charset'] = this.opt.charset;

				return this.__request( reqopt, opt, data, isredirect )
				.fin(function(){ if(opt.dataFile) fs.unlink(opt.dataFile); });

			});

		});
	}

};


// the thing
module.exports = exports = function(opt){
	return new jhttp(opt)
};