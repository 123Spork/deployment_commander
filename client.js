////////////////////////////////////////////////////////////////////////////
//CLIENT CONFIGURATION DATA
////////////////////////////////////////////////////////////////////////////
var system_config={
	//project configs
	"builds":{
		"admin_dev":{
			"key":"admin_dev", 
			"http_port":"8888",
			"http_location":"../administrative_system-build", 
			"source_location":"../administrative_system", 
			"ssh_repository_location": "/path/to/repository",
			"ssh_server_location": "alantuckwood@127.0.0.1",
			"ssh_rsa_key": "/Users/alantuckwood/.ssh/key_rsa",
		},

		"admin_live":{
			"key":"admin_live", 
			"version_num":"2.5",
			"source_location":"../administrative_system", 
			"ssh_repository_location": "/path/to/repository",
			"ssh_server_location": "alantuckwood@10.254.255.30",
			"ssh_rsa_key": "/Users/alantuckwood/.ssh/key_rsa",
		}
	},

	//server request frequences
	"req_checking_frequencies":{
		"builds": 10000,
		"logs": 3000,
		"servers": 30000,
		"deployments": 15000
	}
};

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//CLIENT-SIDE MESSAGING
////////////////////////////////////////////////////////////////////////////

if(!$){
	//enforce jquery
	console.log("JQUERY NOT DEFINED, FAILED");
}

//Generic message func
var send_sys_msg = function(url, data, success, fail){
	$.ajax({
        type : "GET",
        async: true,
        url : "http://"+window.location.hostname+":3000/"+url,
        dataType: "json",
        data:data,
        success : success,
        error: fail
    })
};

//Check status of running servers
var check_servers = function(){
	if(!system_config || !system_config["builds"]){
		console.log("No builds available...");
		return;
	}
	for(var i in system_config["builds"]){
		send_sys_msg("check-server",system_config["builds"][i],function(e){
        	$('.server_start_btn[name="'+e.data.key+'"]').addClass('hide');
        	$('.server_stop_btn[name="'+e.data.key+'"]').removeClass('hide');
        	$('.server_go_btn[name="'+e.data.key+'"]').removeClass('hide');
        	create_server_link($('.server_go_btn[name="'+e.data.key+'"]'), e.data.key);
        },function(e){
        	$('.server_start_btn[name="'+e.responseJSON.data.key+'"]').removeClass('hide');
        	$('.server_stop_btn[name="'+e.responseJSON.data.key+'"]').addClass('hide');
        	$('.server_go_btn[name="'+e.responseJSON.data.key+'"]').addClass('hide');
        });
	}
};

var check_builds = function(){
	if(!system_config || !system_config["builds"]){
		console.log("No builds available...");
		return;
	}
	for(var i in system_config["builds"]){
		send_sys_msg("is-build-alive",system_config["builds"][i],function(e){
    		$('.stop_build[name="'+e.data.key+'"]').removeClass('hide');
        	$('.run_build[name="'+e.data.key+'"]').addClass('hide');
        },function(e){
        	$('.run_build[name="'+e.responseJSON.data.key+'"]').removeClass('hide');
        	$('.stop_build[name="'+e.responseJSON.data.key+'"]').addClass('hide');
        });
	}
};

var check_deploying = function(){
	for(var i in system_config["builds"]){
		send_sys_msg("is-deploy-alive",system_config["builds"][i],function(e){
        	$('.deploying[name="'+e.data.key+'"]').removeClass('hide');
        	$('.deploy[name="'+e.data.key+'"]').addClass('hide');
        },function(e){
        	$('.deploy[name="'+e.responseJSON.data.key+'"]').removeClass('hide');
        	$('.deploying[name="'+e.responseJSON.data.key+'"]').addClass('hide');
        });
	}
};

var collect_logs = function(){
	send_sys_msg("collect-logs",{},function(e){
		$('.log_box').html('');		
    	for(var i=e.data.logs.length-1;i>=0;i--){
    		$('.log_box').append(e.data.logs[i] + "\n");
    	}
    },function(e){
    });
};

var create_server_link=function(elem, key){
	$(elem).unbind('click');
	$(elem).click(function(){
		window.open("http://127.0.0.1:"+system_config["builds"][key]["http_port"]);
	});
};

var init = function(){
	check_servers();
	window.setInterval(function(){check_servers();},system_config["req_checking_frequencies"]["servers"]);

	check_builds();
	window.setInterval(function(){check_builds();},system_config["req_checking_frequencies"]["builds"]);

	collect_logs();
	window.setInterval(function(){collect_logs();},system_config["req_checking_frequencies"]["logs"]);

	check_deploying();
	window.setInterval(function(){check_deploying();},system_config["req_checking_frequencies"]["deployments"]);

	$('.server_start_btn').click(function(e){
		var key = $(e.currentTarget).attr('name');
		send_sys_msg("generate-server",system_config["builds"][key],function(e){
        	$('.server_start_btn[name="'+key+'"]').addClass('hide');
        	$('.server_stop_btn[name="'+key+'"]').removeClass('hide');
        	$('.server_go_btn[name="'+key+'"]').removeClass('hide');
        	create_server_link($('.server_go_btn[name="'+key+'"]'), key);
        },function(e){
        	$('.server_start_btn[name="'+key+'"]').removeClass('hide');
        	$('.server_stop_btn[name="'+key+'"]').addClass('hide');
        	$('.server_go_btn[name="'+key+'"]').addClass('hide');
        });
	});

	$('.server_stop_btn').click(function(e){
		var key = $(e.currentTarget).attr('name');
		send_sys_msg("stop-server",system_config["builds"][key],function(e){
        	$('.server_start_btn[name="'+key+'"]').removeClass('hide');
        	$('.server_stop_btn[name="'+key+'"]').addClass('hide');
        	$('.server_go_btn[name="'+key+'"]').addClass('hide');
        },function(e){
        	$('.server_start_btn[name="'+key+'"]').addClass('hide');
        	$('.server_stop_btn[name="'+key+'"]').removeClass('hide');
        	$('.server_go_btn[name="'+key+'"]').removeClass('hide');
        	create_server_link($('.server_go_btn[name="'+key+'"]'), key);
        });
	});

	$('.run_build').click(function(e){
		var key = $(e.currentTarget).attr('name');
		send_sys_msg("run-build",system_config["builds"][key],function(e){
        	$('.stop_build[name="'+key+'"]').removeClass('hide');
        	$('.run_build[name="'+key+'"]').addClass('hide');
        },function(e){
        	$('.run_build[name="'+key+'"]').removeClass('hide');
        	$('.stop_build[name="'+key+'"]').addClass('hide');
        });
	});

	$('.stop_build').click(function(e){
		var key = $(e.currentTarget).attr('name');
		send_sys_msg("stop-build",system_config["builds"][key],function(e){
        	$('.run_build[name="'+key+'"]').removeClass('hide');
        	$('.stop_build[name="'+key+'"]').addClass('hide');
        },function(e){
        	$('.stop_build[name="'+key+'"]').removeClass('hide');
        	$('.run_build[name="'+key+'"]').addClass('hide');
        });
	});

	$('.deploy').click(function(e){
		var key = $(e.currentTarget).attr('name');
		send_sys_msg("deploy-server-ssh",system_config["builds"][key],function(e){
        	$('.deploying[name="'+key+'"]').removeClass('hide');
        	$('.deploy[name="'+key+'"]').addClass('hide');
        },function(e){
        	$('.deploying[name="'+key+'"]').addClass('hide');
        	$('.deploy[name="'+key+'"]').removeClass('hide');
        });
	});
};