<template>
</template>

<script>
	import DB from '@/utils/sqlite.js'
	import Snowflake from '@/utils/snowflake.js';
	import {
		initAuth
	} from '@/utils/auth.js';
	export default {
		onLaunch() {
			const deviceId=uni.getSystemInfoSync().deviceId;
			const platform = uni.getSystemInfoSync().platform;
			getApp().globalData.deviceId=deviceId;
			getApp().globalData.platform=platform;
			if (platform !== "android") {
				console.log("暂不支持该平台")
			}else{
				DB.openSqlite();
				initAuth();
				getApp().globalData.msgIdGenerator=new Snowflake();
			}
		},
	};
</script>

<style>
</style>