/*
	transform for jhttp
	auto detect charset based on meta charset for html
	output according to output parameter in opt
	input should be in utf-8 strings
*/

var Transform = require('stream').Transform;
var inherits = require('util').inherits;
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var Pass = function(output){ 
	Transform.call(
		this,
		output=='buffer'||output=='string' ? null : {readableObjectMode:true,writableObjectMode:true}
	);
	this.output = output;
	this.buff = '';
}

inherits(Pass,Transform);

Pass.prototype._transform = function(chunk,enc,done){ 

	if(this.output == 'buffer' || this.output == 'string') this.push(chunk);
	else this.buff += chunk;
	done();

}

Pass.prototype._flush = function(){

	Jlog.log('Flush output type: '+this.output);
	Jlog.log('Buffer: '+this.buff);

	if(this.output == 'json' && this.buff)
		try{this.push(JSON.parse(this.buff));}catch(e){this.push(this.buff)}
	
	else if(this.output == '$' && this.buff){

		// charset was done on iconv
		//var charset = this.buff.match(/;charset=([^"]+)"/) || this.buff.match(/charset="([^"]+)"/);
		//if(charset) charset = charset[1].toLowerCase().replace(/-/g,'');
		this.push(cheerio.load(this.buff))
		
	}

	this.push(null); 
}

module.exports = exports = function(opt){
	return new Pass(opt);
}