var app = require('express')();
var compression = require('compression-zlib');
var bodyparser = require('body-parser');
var multer  = require('multer')
var fs = require('fs');

var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

app.use(compression());
app.use(bodyparser.urlencoded({extended:false}));

app.get('/',function(req,res,next){
	res.end('this is content');
});

app.get('/test.json',function(req,res,next){
	res.json({
		asdf: 'asdf',
		zxcv: 2134
	});
});

app.get('/test.html',function(req,res,next){
	res.send('<title id="test">this is test content</title>');
});

app.get('/deflate',function(req,res,next){
	
	res.send('<title id="test">this is test content</title>');

});


app.post('/upload',function(req,res,next){
	
	res.send(JSON.stringify(req.body,null,2));

});

app.post('/multer',upload.fields([
	{ name: 'file1', maxCount: 1 },
	{ name: 'file2', maxCount: 1 }
]),function(req,res,next){
	

	// req.files['file1'][0].content = fs.readFileSync(req.files['file1'][0].path,'utf8');
	// req.files['file2'][0].content = fs.readFileSync(req.files['file2'][0].path,'utf8');

	req.files['file1'][0].buffer = req.files['file1'][0].buffer.toString();
	req.files['file2'][0].buffer = req.files['file2'][0].buffer.toString();

	res.send(JSON.stringify({
		body: req.body,
		file: req.files
	},null,2));

});


module.exports = exports = app;

//app.listen(9999);