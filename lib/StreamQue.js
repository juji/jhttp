/*
	converting array of strings and streams into a sequential flow of data in a single stream.
*/

'use strict';

var Transform = require('stream').Transform;
var fs = require('fs');

class StreamQue{
	constructor(arr){
		this.que = arr;

		// vars
		this.started = false;

		// pass thru
		this.streamer = new Transform();
		this.streamer._transform = function(c,e,d){ this.push(c); d(); };
		this.streamer.on('pipe',()=>{ this.start() })
		.on('newListener',(e,l)=>{ if( e == 'data' || e == 'readable') this.start() })

		// itterator for fun
		this.itt = this._itt(this.que);
	}

	*_itt(ar){ for(let i of ar) yield i; }

	stream(){ return this.streamer; }

	count(num){

		if(!num) num = 0;

		var i = this.itt.next();
		if(!i.value) return Promise.resolve(num);

		return new Promise((ok,no)=>{
			if(typeof i.value == 'string' ) {

				ok( num + Buffer.byteLength(i.value, 'utf8') );

			}else{

				// should be a file readstream
				fs.stat(i.value.path,(e,r)=>{
					
					if(e) no(e);
					else ok( num + r.size );
				});
			}

		}).then((total)=>{ return this.count(total) });

	}

	_shift(){

		return new Promise((ok,no)=>{

			let elm = this.que.shift();
			if(typeof elm == 'string'){
				
				this.streamer.write(elm);
				ok(this.que.length); 

			}else{

				elm.pipe(this.streamer,{end:false});
				elm.on('end',()=>{ ok(this.que.length); });
				elm.on('error',(e)=>{ no(e); });

			}

		}).then((num)=>{
			if(num) return this._shift();
			this.streamer.end();
			return 0;
		})
		
	}

	start(){
		if(this.started) return;
		this.started = true;
		return this._shift();
	}
}

module.exports = exports = function(ar){
	return new StreamQue(ar);
}