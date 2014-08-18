var http = require('http');
var https = require('https');
var fs = require('fs');
var q = require('q');
var ua = require('random-ua');
var urlParse = require('url');
var encoding = require('encoding');
var cheerio = require('cheerio');
var mime = require('mime');
var CookieManager = require('cookie-manager');
var concatStream = require('concat-stream')
var zlib = require('zlib');
var passStream = require('stream').PassThrough;

var normalizeUrl = function(str){
	if(/^https\:\/\//.test(str)) return str;
	if(/^http\:\/\//.test(str)) return str;
	return 'http://'+(str.replace(/^\//,''));
};

var extendArray = function(){
	var v = [];
	for(var i in arguments){
		for(var j in arguments[i]){
			v[j] = arguments[i][j];
		}
	}
	return v;
};

var extendObj = function(){
	var v = {};
	for(var i in arguments){
		for(var j in arguments[i]){
			if(arguments[i][j].constructor == Array){
				v[j] = extendArray(arguments[i][j]);
			}else if(typeof arguments[i][j] == 'object'){
				v[j] = extendObj(arguments[i][j]);
			}else{
				v[j] = arguments[i][j];
			}
		}
	};

	return v;
};

var defaultOpts = {
	url:'',
	method:'get',
	accept: '*/*',
	output: 'string',
	expect:200,
	charset: 'UTF-8',
	followRedirect: true,
	useCookie: true,
	auth:'',
	headers:{
		'user-agent': ua.generate()
	},
	data: false
}

function lowerCaseKeys(c){
	var t = {};
	for(var i in c){
		t[ i.toLowerCase() ] = c[i];
	}
	return t;
}

function upperCaseKeys(c){
	var t = {};
	for(var i in c){
		t[ i.split('-').map(function(s){return s.charAt(0).toUpperCase() + s.slice(1)}).join('-') ] = c[i];
	}
	return t;
}

function constructHeaders(obj){

	var c = lowerCaseKeys(obj['headers']);

	var charset = typeof obj['charset'] == 'undefined' ? defaultOpts['charset'] : obj['charset'];
	var accept = typeof obj['accept'] == 'undefined' ? defaultOpts['accept'] : obj['accept'];

	if( typeof c['accept-charset'] == 'undefined' ) c['accept-charset'] = charset;
	if( typeof c['accept'] == 'undefined' ) c['accept'] = accept;

	return upperCaseKeys(c);
}

function getBound(){
	return 'seinrv'+Math.round(Math.random()*98237498679869879878976)+'asdfgkljh';
}

function getContentType(data){
	if(typeof data.type != 'undefined') return data.type;
	if(typeof data.file != 'undefined') return 'multipart/form-data';
	return 'application/x-www-form-urlencoded';
}


function encodePostData(data){
	var s = '';
	for(var i in data){
		s += encodeURIComponent(i) + '=' + encodeURIComponent(data[i]) + '&';
	}
	return s.replace(/&$/,'');
}

function constructData(data,bound){

	if(typeof data == 'string') return data;
	if(typeof data.content == 'string') return data.content;

	if(typeof data.content == 'object' && typeof data.file == 'undefined')
		return encodePostData(data.content);

	var content = '--' + bound + "\n";
	if(typeof data.content != 'undefined'){
		for(var i in data.content) 
			content += 'Content-Disposition: form-data; name="' + i + '"\n\n' + 
						data.content[i] + '\n' + '--' + bound + '\n';
	}

	for(var i in data.file){

		(function(){

			var filename = data.file[i].filename.replace(/\\/,'/').split('/').pop();
			if(typeof data.file[i].content == 'undefined')
				data.file[i].content = fs.readSync(data.file[i].filename);
			if(typeof data.file[i].mime == 'undefined')
				data.file[i].mime = mime.lookup(filename);

			content += 'Content-Disposition: form-data; name="' + data.file[i].name + '"; filename="' + 
						filename + '"\n' + 'Content-Type: '+ data.file[i].mime + '\n\n' + 
						data.file[i].content + '\n' + '--' + bound + '\n';
		})();
	}

	return content.replace(/\n$/,'--');

}

function isRedirection(status){
	return /^3/.test(status+'');
}

var jhttp = function(obj){

	this.options = extendObj(defaultOpts);
	this.req = false;

	this.cookies = new CookieManager();

	if(obj && typeof obj == 'object') this.options = extendObj(this.options,obj);
	if(obj && typeof obj == 'string') this.options.url = normalizeUrl(obj);

};

jhttp.prototype.abort = function(){
	this.req.abort();
}

jhttp.prototype.request = function(obj){

	if(obj && typeof obj == 'object') obj = extendObj(this.options,obj);
	if(obj && typeof obj == 'string') {
		var url = obj;
		obj = extendObj(this.options);
		obj.url = url;
	}

	obj.url = normalizeUrl(obj.url);

	if(!obj) obj = extendObj(this.options);

	var url = urlParse.parse(obj.url);
	var d = q.defer();

	// configure transport
	var transport = http;
	if(url.protocol=='https:') {
		transport = https;
	}

	// prepare data and headers
	var bound = getBound();
	var dataCons = '';
	var headers = constructHeaders(obj);
	if(obj.data && obj.method!='get'){
		headers['Content-Type'] = getContentType(obj.data);
		if(headers['Content-Type'] == 'multipart/form-data')
			headers['Content-Type']+='; boundary='+bound;

		dataCons = constructData(obj.data,bound);
		headers['Content-Length'] = dataCons.length;
	}

	if(typeof headers['Cookie'] == 'undefined') headers['Cookie'] = this.cookies.prepare( url.href );
	if( !headers['Cookie'] || !obj.useCookie )  delete headers['Cookie'];
	headers['Accept-Encoding'] = 'gzip, deflate, identity';

	this.last = {};
	this.last.header = headers;
	this.last.body = dataCons;
	this.last.url = url.href;
	
	// set opts for native http/https
	var opt = {
		hostname: url.hostname,
		path: url.path,
		method: obj.method.toUpperCase(),
		headers: headers
	}

	if(url.port) opt.port = url.port;
	if(obj.auth) opt.auth = obj.auth;


	// start request
	var t = this;
	this.req = transport.request(opt,function(res){

		//read status
		if( res.statusCode != obj.expect && !isRedirection(res.statusCode)) {
			d.reject({
				status: res.statusCode,
				text: 'Unexpected HTTP Status'
			});
			return;
		}

		if( res.statusCode != obj.expect && isRedirection(res.statusCode) && obj.followRedirect) {
			obj.url = res.headers['location'];
			d.resolve( t.req = t.request( obj ) );
			return;
		}

		//read & save cookie
		if(typeof res.headers['set-cookie'] != 'undefined'){
			t.cookies.store( url.href, res.headers['set-cookie'] );
		}

		//read charset
		var charset = res.headers['content-type'].match('charset=(.*?)(;|$)');
		charset = charset && charset.length > 1 ? charset[1] : 'UTF-8';
		
		//read encoding
		var contentEncoding = typeof res.headers['content-encoding'] == 'undefined' ? '' : res.headers['content-encoding'];
		contentEncoding = contentEncoding=='identity' ? false : contentEncoding;
		////////////////////////////
		
		res.pipe( contentEncoding ? zlib.createUnzip() : passStream() )
		.pipe(concatStream(function(b){
			if( obj.charset != charset )
			b = encoding.convert( b , obj.charset,  charset);
			var r = { 
				status: res.statusCode,
				headers: res.headers,
				body: b
			}

			if( obj.output == 'string' ) r.body = r.body.toString();
			if( obj.output == 'json' ) r.body = JSON.parse(r.body.toString());
			if( obj.output == '$' ) r.body = cheerio.load(r.body.toString());

			d.resolve( r );
		}));

	});

	this.req.on('error', function(e) {
		d.reject({ status:0, text: 'HTTP failed. Internet down?' });
	});

	// send data if any
	if(dataCons && obj.method != 'get')
	this.req.write( dataCons );
	
	this.req.end();

	return d.promise;
}

module.exports = exports = jhttp;