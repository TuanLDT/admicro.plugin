var express = require('express');
var app = express();
var fs = require('fs');

app.get('/log', function (req, res) {
	var d = new Date();
	fileName = d.getFullYear() + "_" + d.getMonth() + "_" + d.getDate() + ".txt";
	
  	var filePath = __dirname + '/dist/P2PHLSPlayer/dist/log/' + fileName;
	//switch (req.query.log
  	fs.appendFile(filePath, JSON.stringify(req.query) + '\n', function () {
		res.end();
  	});
});

app.get('/', function(req, res){
 res.sendfile(__dirname + '/example.html');
});

app.get('/testlink', function(req, res){
 res.sendfile(__dirname + '/index.html');
});

app.set('view engine', 'ejs');

app.get('/videojs', function(req, res){
 res.sendfile(__dirname + '/example.html');
});

app.get('/getlink', function(req, res){
	console.log('getlink');
 res.render(__dirname + '/page', {
        url: req.query.url
    });
});

app.use('/src', express.static(__dirname + '/src'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/playlists', express.static(__dirname + '/flashls-0.4.0.4/examples/playlists'));
app.use('/dist', express.static(__dirname + '/dist'));
app.use('/lib', express.static(__dirname + '/lib'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/ads', express.static(__dirname + '/ads'));
app.use('/draff', express.static(__dirname + '/draff'));

app.listen(3003);

console.log('server is running: http://localhost:3003');