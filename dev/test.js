'use strict';

class asdf{
	construstor(){

	}

	*example(r) {
		var f = 0;
		for(var i of r) yield f++;
	}	
}


var a = new asdf();
for(var x of a.example([1,2,3,234,43,'a',5,4,3,4,3,'a',4,4,'a',44,4,4,4,'a',4,6,6,6,6,6,6])){
	console.log(x);
}