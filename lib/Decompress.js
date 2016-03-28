/* 
set a decompressor from http Content-Encoding header
zlib, gzip, lzw, identity
*/

var LZWDecoder = require('lzw-stream/decoder');
var zlib = require('zlib');
var thru = require('./Thru.js');

module.exports = exports = function(encoding){

	if(!encoding) encoding = '';
	Jlog.log('encoding: '+encoding);

	// set compression
	if(encoding == 'deflate') 
		return zlib.createInflateRaw();
	else if(encoding == 'gzip') 
		return zlib.createGunzip();
	else if(encoding == 'compress') 
		return new LZWEncoder;

	return thru();
}