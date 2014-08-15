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
}

var extendArray = function(){
	var v = [];
	for(var i in arguments){
		for(var j in arguments[j]){
			v[j] = arguments[i][j];
		}
	}
}

var extendObj = function(){
	console.log(arguments);
	var v = {};
	for(var i in arguments){
		for(var j in arguments){
			if(arguments[i][j].constructor == Array){
				v[j] = extendArray(arguments[i][j]);
			}else if(typeof arguments[i][j] == 'object'){
				v[j] = extendObject(arguments[i][j]);
			}else{
				v[j] = arguments[i][j];
			}
		}
	};
	return v;
}

var defaultOpts = {
	url:'',
	method:'get',
	output: 'string',
	expect:200,
	accept: '*/*',
	charset: 'UTF-8',
	followRedirect: true,
	auth:'',
	saveCookie: true,
	headers:{
		'user-agent': ua.generate(),
		'accept-encoding': 'gzip; q=1.0, deflate; q=0.6, identity; q=0.3, *; q=0'
	},
	data: false
}

function constructHeaders(obj){
	for(var i in obj['headers']){
		c[ i.toLowerCase() ] = obj['headers'][i];
	}
	var charset = typeof obj['charset'] == 'undefined' ? defaultOpts['charset'] : obj['charset'];
	var accept = typeof obj['accept'] == 'undefined' ? defaultOpts['accept'] : obj['accept'];

	if( typeof c['accept-charset'] == 'undefined' ) c['accept-charset'] = charset;
	if( typeof c['accept'] == 'undefined' ) c['accept'] = accept+'; charset='+charset;

	var t = {};
	for(var i in c){
		t[ i.split('-').map(function(s){return s.charAt(0).toUpperCase() + s.slice(1)}).join('-') ] = c[i];
	}
	return t;
}

function constructData(obj){
	if(typeof obj == 'string') return obj;

	/*
	{
		type: 'multipart/form-data',
		content: [
			{
				name: 'name',
				value: 'Jhon Doe'
			},
			{
				name: 'occupation',
				value: 'awesome staff'
			},
		],
		file (optional): [
			name: 'photo',
			filename: 'photo.jpg'  // relative to pwd, will read file if `binary` doesn't exists
			binary (optional): <Buffer ... >
		],
	}

	{
		file : [
			filename: 'photo.jpg'  // relative to pwd, will read file if `binary` doesn't exists
			binary (optional): <Buffer ... >
		],
	}

	{
		file : [
			filename: 'photo.jpg'  // relative to pwd, will read file if `binary` doesn't exists
			binary (optional): <Buffer ... >
		],
	}
	*/
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
	var transport;
	var d = q.defer();
	transport = http;
	if(url.protocol=='https:') transport = https;
	
	var opt = {
		hostname: url.hostname,
		path: url.path,
		method: obj.method.toUpperCase(),
		headers: constructHeaders(obj)
	}

	if(url.port) opt.port = url.port;
	if(obj.auth) opt.auth = obj.auth;

	this.request = transport.request(opt,function(res){

		console.log(res.statusCode);
		console.log(res.headers);
		process.exit();

		////////////////////////////

		var b = '';
		res.on('data',function(d){ b += d; });
		res.on('end',function(){

			var encoding = '';

		});
	});
	this.request.on('error', function(e) {
		d.reject(0,e);
	});

	if(obj.data && obj.method != 'get')
	this.request.write( constructData( obj.data, obj.charset ), obj.charset );
	this.request.end();
	return d.promise;
}

module.exports = exports = jhttp;