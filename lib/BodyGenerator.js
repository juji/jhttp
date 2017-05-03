'use strict';

var Transform = require('stream').Transform;

var Thru = require('./Thru.js');
var Q = require('q');
var qfs = require('q-io/fs');
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var StreamQue = require('stream-que');

class BodyGen {

	constructor(data){
		this.data = data;
		return Q(0).then(()=>{ return this.generate(); });
	}

	generate(){
		if(this.data.type && this.data.content) return this.genFreeType();
		if(this.data.type && this.data.filename) return this.genFreeStream();
		if(this.data.content && !this.data.file) return this.genForm();
		if(this.data.file && this.data.file.constructor === Array) return this.genMultipart();
	}

	genMultipart(){
		var useStream = false;
		this.data.file.forEach((val)=>{ if(!val.content) useStream = true; });
		if(useStream) return this.genMultipartStream();
		else return this.genMultipartString();
	}

	__genMultipartForm(sep,data){
		var strings = '';
		for(var i in data)
				strings += '--'+sep+'\r\n'+
							'Content-Disposition: form-data; name="'+i+'"\r\n\r\n'+
							data[i]+'\r\n';
		return strings;
	}

	__genMultipartFileBanner(row){
		return 'Content-Disposition: form-data; name="'+row.name+'"; filename="'+path.basename(row.filename)+'"\r\n'+
				'Content-Type: '+(row.mime||mime.lookup(row.filename))+'\r\n\r\n';
	}

	__genMultipartFileRow(sep,row){
		return '--'+sep+'\r\n' + this.__genMultipartFileBanner(row) + row.content + '\r\n';
	}

	genMultipartStream(){

		var separator = '0734ar07t3w3jhttp-client';
		var arr = [];
		if(this.data.content) arr.push(this.__genMultipartForm(separator,this.data.content));

		this.data.file.forEach((val,idx)=>{
			if(val.content) arr.push(this.__genMultipartFileRow(separator,val));
			else {
				arr.push( '--' + separator + '\r\n' );
				arr.push( this.__genMultipartFileBanner(val) );
				arr.push(fs.createReadStream(val.filename));
				arr.push('\r\n');
			}
		})

		arr.push( '--' + separator + '--\r\n' );

		var streamQue = StreamQue(arr);
		return streamQue.count().then((n)=>{
			return {
				type: (this.data.type||'multipart/form-data') + '; boundary=' + separator,
				size: n,
				stream: streamQue.stream()
			}
		})
	}

	genMultipartString(){
		var strings = '';
		var separator = '0734ar07t3w3jhttp-client';

		if(this.data.content) strings = this.__genMultipartForm(separator,this.data.content);

		this.data.file.forEach((val,idx)=>{
			strings += this.__genMultipartFileRow(separator,val);
		});

		strings += '--'+separator+'--\r\n';

		return {
			type: (this.data.type||'multipart/form-data') + '; boundary=' + separator,
			size: strings.length,
			string: strings
		}
	}

	genForm(){
		var f = [];
		for(var i in this.data.content) f.push(encodeURIComponent(i)+'='+encodeURIComponent(this.data.content[i]));
		f = f.join('&');
		return {
			type: 'application/x-www-form-urlencoded',
			size: Buffer.byteLength(f, 'utf8'),
			string: f,
		};
	}

	genFreeStream(){
		return qfs.stat(this.data.filename).then((o)=>{
			return {
				type: this.data.type,
				size: o.size,
				stream: fs.createReadStream(this.data.filename),
			};
		})
	}

	genFreeType(){
		return {
			type: this.data.type,
			size: Buffer.byteLength(this.data.content, 'utf8'),
			string: this.data.content,
		}
	}

}


module.exports = exports = function(data){
	return new BodyGen(data);
}