/*
a simple passthru transform
*/

var Transform = require('stream').Transform;
var inherits = require('util').inherits;

var Thru = function(){ Transform.call(this); }
inherits(Thru,Transform);
Thru.prototype._transform = function(c,e,d){ this.push(c); d(); }

module.exports = exports = function(){
	return new Thru();
}