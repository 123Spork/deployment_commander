/*!
 =========================================================
 * Deployment Commander - v1.0.0
 =========================================================
 * Github Repo: https://github.com/123Spork/deployment_commander
 * Distributed under GNU General Public Licence
 * Created by Alan Tuckwood
 =========================================================
 */


var express = require('express'),
	http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    shell = require('shelljs'),
    resolve = require('path').resolve,
    terminate = require('terminate'),
    active_servers = {},
    async_shells = {},
    deployment_shells = {};


////////////////////////////////////
/* LOGGING */
////////////////////////////////////
var logs = [];
console.log = function() {
    logs.push([].slice.call(arguments));
    if(logs.length>100){
		logs.slice[0,99];
	}
};

////////////////////////////////////
/* HTTP SERVER GENERATOR */
////////////////////////////////////
//loc -> local path to directory you want to generate the server for
//port -> the port you want to create that local server on
var server_gen = function(loc, port){
	if(!loc || !port){
		throw "NO LOCATION OR PORT PROVIDED";
	}

	//type handling
	var reqtype = function(path) {
	    var t = path.split(".")[path.split(".").length-1];
	    if(t=="js"){
	      type="javascript";
	    }else if(t=="pem"){
	      type="x-pem-file";    
	    }else if(t=="cer"){
	      return "application/pkix-cert"
	    }else {
	      type = t;
	    }
	    return "text/"+type;
	};

	//Generic http server generator
	var server = http.createServer(function(request, response) {
	  	var uri = url.parse(request.url).pathname
	    , filename = path.join(loc, uri);

	  	fs.exists(filename, function(exists) {
	    	var type = reqtype(filename);
		    if(!exists) {
		      response.writeHead(404, {"Content-Type" : type});
		      response.write("404 Not Found\n");
		      response.end();
		      return;
		    }

		    if (fs.statSync(filename).isDirectory()) filename += '/index.html'; type="text/plain";
		    var type = reqtype(filename);
		    fs.readFile(filename, "binary", function(err, file) {
		      if(err) {        
		        response.writeHead(500, {"Content-Type" : type});
		        response.write(err + "\n");
		        response.end();
		        return;
		      }

		      response.writeHead(200, {"Content-Type" : type});
		      response.write(file, "binary");
		      response.end();
		    });
	  	});
	});
	process.on('uncaughtException', function(err) {
		console.log("ERROR");
	});  
	server.timeout = 0;
	server.listen(parseInt(port, 10));
	return server
};
/*Create Initial HTTP Server for this build system, for the deployment frontend*/
active_servers['8088'] = server_gen('./', 8088);
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////



////////////////////////////////////
/*App Server & Endpoints*/
////////////////////////////////////
var app = express()

//Localserver
app.use(function(req, res, next) {
  //localhost only
  var allowedOrigins = ['http://127.0.0.1:8088', 'http://localhost:8088', 'http://127.0.0.1:8088', 'http://localhost:8088'];
  var origin = req.headers.origin;
  if(allowedOrigins.indexOf(origin) > -1){
       res.setHeader('Access-Control-Allow-Origin', origin);
  }
  //headers to prevent access control origin issues
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Content-Type', "application/json");
  return next();
});

//generate response data, mostly for cleanliness
var create_response=function(res, code, message, args, ignore_logging){
	res.status(code);
	if(code!=200 && ignore_logging!=true){
		console.log(message);
	}
	var data = {
		message: message?message:null,
		data: args?args:null
	};
	res.send(data);
};

app.listen(3000, function(req, res){
	console.log("Ready");
});

//Connection Test Endpoint
app.get('/test', function(req, res){
	console.log('FOUND SERVER!');
	res.send({"test":'FOUND SERVER!'});
});

//Generate http server for request data
app.get('/generate-server', function(req, res){
	var args = req.query;
	if(!args['http_port'] || !args['http_location']){
		return create_response(res, 400, "NO PORT OR HTTP LOCATION PROVIDED", args)
	}
	if(active_servers[args['http_port']]){
		return create_response(res, 409, "SERVER ON PORT "+args['http_port']+" ALREADY EXISTS", args)
	}
	var server = server_gen(args['http_location'], args['http_port']);
	console.log("SERVER GENERATED ON PORT:" + args['http_port']);
	active_servers[args['http_port']] = server;
	create_response(res, 201, "success", args)
});

//Stop http server
app.get('/stop-server', function(req, res){
	var args = req.query;
	if(!active_servers[args['http_port']]){
		return create_response(res, 404, "SERVER ON PORT "+args['http_port']+" DOESNT EXIST", args)
	}
	var shut_down = require('http-shutdown')(active_servers[args['http_port']]);
	shut_down.shutdown(function(){
		delete active_servers[args['http_port']];
	});
	create_response(res, 200, "success", args)
});

//Check http server is running
app.get('/check-server', function(req, res){
	var args = req.query;
	if(!active_servers[args['http_port']]){
		return create_response(res, 404, "SERVER ON PORT "+args['http_port']+" DOESNT EXIST", args, true)
	}
	create_response(res, 200, "success", args)
});

//Run build process for request data
app.get('/run-build', function(req, res){
	//where args.query.build_type can denote test or production builds
	var args = req.query;
	if(!args['source_location'] || !args["key"]){
		return create_response(res, 400, "NO BUILD LOCATION OR KEY PROVIDED", args)
	}else if(async_shells[args['source_location']+"_"+args['key']] || async_shells[args['source_location']+"_"+args['key']]) {
		return create_response(res, 400, "SOMETHING IS ALREADY RUNNING", args)
	}

	var build_version = args['version_num']?args['version_num']:Math.floor((((new Date().getTime())/1000)/60)/15);
		async_shells[args['source_location']+"_"+args['key']] = shell.exec("cd "+resolve(args['source_location'])+"; BUILD_VERSION=\""+build_version+"\" bash build_all.sh;",  {async:true}, function(){delete async_shells[args['source_location']+"_"+args['key']];})		
	async_shells[args['source_location']+"_"+args['key']].stdout.on('data', (data) => {
	  console.log(data);
	});
	console.log("BUILD STARTED" + args['source_location']);
	create_response(res, 200, "success", args)
});

//Stop build process
app.get('/stop-build', function(req, res){
	var args = req.query;
	if(!args['source_location'] || !args["key"]){
		return create_response(res, 400, "NO BUILD LOCATION OR KEY PROVIDED", args)
	}else if(!async_shells[args['source_location']+"_"+args['key']]){
		return create_response(res, 404, "NOT RUNNING", args)
	}
	terminate(async_shells[args['source_location']+"_"+args['key']].pid, function(e){console.log(e)})
	delete async_shells[args['source_location']+"_"+args['key']];
	console.log("BUILD ENDED" + args['source_location']);
	create_response(res, 200, "success", args)
});

//Check status of build process
app.get('/is-build-alive', function(req, res){
	var args = req.query;
	if(!args['source_location'] || !args["key"]){
		return create_response(res, 400, "NO BUILD LOCATION OR KEY PROVIDED", args, true)
	}else if(!async_shells[args['source_location']+"_"+args['key']]){
		return create_response(res, 404, "NOT RUNNING", args, true)
	}
	if(!async_shells[args['source_location']+"_"+args['key']].pid){
		terminate(async_shells[args['source_location']+"_"+args['key']].pid, function(e){console.log(e)})
		delete async_shells[args['source_location']+"_"+args['key']];
		return create_response(res, 404, "BUILD FOUND, BUT NOT RUNNING. ENDED", args, true)
	}
	create_response(res, 200, "success", args)
});

//Deploy project to build server
app.get('/deploy-server-ssh', function(req, res){
	var args = req.query;
	if(!args['ssh_repository_location'] || !args['ssh_rsa_key'] || !args['ssh_server_location']){
		return create_response(res, 400, "NO BUILD LOCATION, RSA KEY OR DEPLOYMENT SERVER PROVIDED", args);
	}else if(deployment_shells[args['ssh_repository_location']]){
		return create_response(res, 400, "DEPLOY IS ALREADY RUNNING", args);
	}
	var commands = 'sudo ssh -tt '+args['ssh_server_location']+' -i '+args['ssh_rsa_key']+' \'cd '+args['ssh_repository_location']+'; sudo -H bash -c  "git pull;"\'; exit; exit; exit;'
	deployment_shells[args['ssh_repository_location']] = shell.exec(commands, {async:true}, function(){
	 	console.log("DEPLOY ENDED");
	 	delete deployment_shells[args['ssh_repository_location']];
	});		
	deployment_shells[args['ssh_repository_location']].stdout.on('data', (data) => {
	  console.log(data);
	});
	console.log("DEPLOY STARTED " + args['ssh_repository_location']);
	create_response(res, 200, "success", args)
});

//Check status of deployment
app.get('/is-deploy-alive', function(req, res){
	var args = req.query;
	if(!deployment_shells[args['ssh_repository_location']]){
		return create_response(res, 404, "DEPLOY NOT FOUND", args, true);
	}
	if(!deployment_shells[args['ssh_repository_location']].pid){
		terminate(deployment_shells[args['ssh_repository_location']].pid, function(e){console.log(e)})
		delete deployment_shells[args['ssh_repository_location']];
		return create_response(res, 404, "DEPLOY FOUND BUT NOT RUNNING, ENDED", args, true);
	}
	create_response(res, 200, "success", args);
});

//Grab logging data
app.get('/collect-logs', function(req, res){
	res.send({"data":{logs:logs}});
});
