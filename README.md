#NOT DONE!!

reservation

#jhttp-client

node.js promise-based http client

##features
- HTTP & HTTPS
- GET, POST, PUT, DELETE, HEAD
- return string as response `body`
- return jQuery like object  as response `body` ([cheerio](https://www.npmjs.org/package/cheerio))
- return json object as response `body`
- return buffer as response `body`
- support file upload or other arbitrary HTTP data transfer

##install
```javascript
npm install jhttp-client
```

##usage
```javascript

var HTTP = require("jhttp");
var http = new HTTP();

http.send("google.com")
.then(function( response ){
	
	console.log(response.status);
	console.log(response.headers);
	console.log(response.body);		

})
.fail(function( response ){
	
	console.log(response.status);
	console.log(response.text);

});

```

---

##Options
```javascript
// global options
var http = new HTTP( options );

// per-request options
// will extend global options
http.send( options );
```

###`options` [object]
```javascript
{
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

// above are the default values
```

**`options.url`** "http://domain.com/path" or "https://domain.com" or "domain.com".

**`options.method`** "get", "post", "put", "delete", "head".

**`options.accept`** will be used in `Accept` headers.

- `options.accept = "*/*"` will be overriden by <br />`options.output = "json"` or `options.output = "$"`.

**`options.output`** "string", "buffer", "json", "$". The `$` will output jQuery-like object.

- `options.output = "json"` will change `options.accept` from `*/*` to `application/json`.

- `options.output = "$"` will change `options.accept` from `*/*` to `text/html`.

**`options.expect`** HTTP status to expect. Will *reject* the *promise* if not fulfilled.

**`options.charset`** will be used in `Accept` and `Accept-Charset` headers.

**`options.followRedirect`**. If `true`, will not *reject* *promise* on redirect status (3**).

**`options.saveCookie`** will save cookie and use them for future requests with the same domain.

**`options.auth`** basic HTTP auth: "user:password".

**`options.headers.accept`** will override **`options.accept`** regardless of **`options.output`**.

**`options.headers["accept-charset"]`** will override **`options.charset`**.

---

##Data Transfer

Use `options.data` object to transfer data. Below are some example of data transfers.

**NOTE:** `GET` request will not use the `options.data` attribute.

####HTML form upload
The following will create an `application/x-www-form-urlencoded` data transfer:
```javascript
{
	content:{
		name: 'JohnDoe',
		occupation: 'Awesome Staff'
	}
}
```

Will create:
```text
POST /path HTTP/1.1
Host: domain.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 39

name=JohnDoe&occupation=Awesome%20Staff
```

A `multipart/form-data` data transfer can also be created:
```javascript
{
	content: {
			name: 'JohnDoe',
			occupation: 'Awesome Staff'
	},
	file:[
		{ 
			// will read the file and send it
			name:'uploaded1',
			filename: 'some/file.txt' 
		},
		{
			// construct your own
			name:'uploadedFile',
			filename: 'file2.jpg',
			mime: 'image/jpg',
			content: 'jpeg strings.....'
		},
		{
			// use automatic MIME based on `filename` extension
			name:'uploadedFile',
			filename: 'file3.jpg',
			content: 'jpeg strings.....'
		}
	]
}
```

Will create:
```text
POST /path HTTP/1.1
Host: domain.com
Content-Type: multipart/form-data; boundary=o98aywaw74eyo
Content-Length: 2234766

--o98aywaw74eyo
Content-Disposition: form-data; name="name"

JohnDoe
--o98aywaw74eyo
Content-Disposition: form-data; name="occupation"

Awesome Staff
--o98aywaw74eyo
Content-Disposition: form-data; name="uploaded1"; filename="file.txt"
Content-Type: text/plain

text here
--o98aywaw74eyo
Content-Disposition: form-data; name="uploadedFile"; filename="file2.jpg"
Content-Type: image/jpg

file2.jpg content here ...
--o98aywaw74eyo
Content-Disposition: form-data; name="uploadedFile"; filename="file3.jpg"
Content-Type: image/jpg

file3.jpg content here ...
--o98aywaw74eyo--
```


####Arbitrary Data Transfer
You can construct everything yourself:
```javascript
{
	type : 'application/xml',
	content: '<some>XML</some>'
}
```
Remember that using `options.data.type` will override `Content-Type` header.

Use it only to send strings with `options.data.content`, unless you know what you're doing..



cheers,

[jujiyangasli.com](http://jujiyangasli.com)
