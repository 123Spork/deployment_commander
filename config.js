var system_config={
	"builds":{
		"admin":{
			"key":"admin", 
			"port":"8888", 
			"build_location":"../game-admin-build", 
			"src_location":"../game-admin", 
			"uat_location":"uat.game-admin", 
			"live_location":"live.game-admin"
		}
	},
	"deployment":{
		"server_location": "alantuckwood@10.254.255.30",
		"repository_location": "/usr/share/nginx/uat.game_admin",
		"rsa_key": "/Users/alantuckwood/.ssh/id_rsa",
		"version_num":"2.5"
	};
},
