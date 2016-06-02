/*
	return a transform stream based on character encoding
	determined by content-type
*/

var iconv = require('iconv-lite');
var Thru = require('./Thru.js'); // utf8 passthru

module.exports = exports = function(contentType){

	// default: assume utf8
	Jlog.log('contentType: '+contentType);

	if(!contentType) return Thru();

	var charset = contentType.replace(/\s/g,'').match(/;charset=([^;$]+)/);

	if(!charset || (charset && charset.length<2)) return Thru();

	//console.log(charset);
	charset = charset[1].toLowerCase().replace(/-/g,'');
	if(charset=='utf8') return Thru();
	else if(iconv.encodingExists(charset)) return iconv.decodeStream(charset);

	return Thru();

};