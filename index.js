var http = require('http');
var https = require('https');
var fs = require('fs');
var q = require('q');
var ua = require('random-ua');
var urlParse = require('url');
var encoding = require('encoding');
var cheerio = require('cheerio');
var mime = require('mime');

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
	saveCookie: true,
	auth:'',
	headers:{
		'user-agent': ua.generate(),
		'accept-encoding': 'gzip; q=1.0, deflate; q=0.6, identity; q=0.3, *; q=0'
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

	if(obj.data && obj.method!='get'){
		c['content-type'] = getContentType(obj.data);

		var bound = '';
		if(c['content-type'] == 'multipart/form-data'){
			bound = getBound();
			c['content-type']+='; boundary='+bound;
		}

		obj.data = constructData(obj.data,bound);
		c['content-length'] = obj.data.length;
	}

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
		s += encodeURIComponent(data[i].name) + '=' + encodeURIComponent(data[i].value) + '&';
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
			content += 'Content-Disposition: form-data; name="' + data.content[i].name + '"\n\n' + 
						data.content[i].value + '\n' + '--' + bound + '\n';
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
	this.request = false;

	this.cookies = [];

	if(obj && typeof obj == 'object') this.options = extendObj(this.options,obj);
	if(obj && typeof obj == 'string') this.options.url = normalizeUrl(obj);

};

jhttp.prototype.abort = function(){
	this.request.abort();
}

jhttp.prototype.send = function(obj){

	if(obj && typeof obj == 'object') obj = extendObj(this.options,obj);
	if(obj && typeof obj == 'string') {
		var url = normalizeUrl(obj);
		obj = extendObj(this.options);
		obj.url = url;
	}

	if(!obj) obj = extendObj(this.options);

	var url = urlParse.parse(obj.url);
	var d = q.defer();

	var transport = http;
	if(url.protocol=='https:') {
		//console.log('\tUsing HTTPS');
		transport = https;
	}
	
	var opt = {
		hostname: url.hostname,
		path: url.path,
		method: obj.method.toUpperCase(),
		headers: constructHeaders(obj)
	}

	if(url.port) opt.port = url.port;
	if(obj.auth) opt.auth = obj.auth;

	var t = this;
	this.request = transport.request(opt,function(res){

		//get headers
		var headers = lowerCaseKeys( res.headers );

		//read status
		if( res.statusCode != obj.expect && !isRedirection(res.statusCode)) {
			d.reject({
				status: res.statusCode,
				text: 'Unexpected HTTP Status'
			});
			return;
		}

		if( res.statusCode != obj.expect && isRedirection(res.statusCode) && obj.followRedirect) {
			obj.url = headers['location'];
			d.resolve( t.send( obj ) );
			return;
		}

		var respEncoding = headers['content-type'].match('charset=(.*?)(;|$)')[1];
		
		////////////////////////////

		var b = '';
		res.on('data',function(d){ b += d.toString(); });
		res.on('end',function(){

			b = encoding.convert( b , obj.charset,  respEncoding);
			var r = { 
				status: res.statusCode,
				headers: lowerCaseKeys(res.headers),
				body: b
			}

			if( obj.output == 'string' ) r.body = r.body.toString();
			if( obj.output == 'json' ) r.body = JSON.parse(r.body.toString());
			if( obj.output == '$' ) r.body = cheerio.load(r.body.toString());

			d.resolve( r );

		});
	});

	this.request.on('error', function(e) {
		d.reject({ status:0, text: 'HTTP failed. Internet down?' });
	});

	if(obj.data && obj.method != 'get')
	this.request.write( constructData( obj.data ) );
	
	this.request.end();

	return d.promise;
}

module.exports = exports = jhttp;