<template>
</template>

<script>
	import DB from '@/utils/sqlite.js'
	import Snowflake from '@/utils/snowflake.js';
	import {
		initAuth
	} from '@/utils/auth.js';
	import {
		getByInit
	} from '@/request/get_by_init';
	export default {
		onLaunch() {
			const deviceId=uni.getSystemInfoSync().deviceId;
			const platform = uni.getSystemInfoSync().platform;
			getApp().globalData.deviceId=deviceId;
			getApp().globalData.platform=platform;
			if (platform === "android" || platform == "ios") {
				DB.openSqlite();
			}
			initAuth();
			getApp().globalData.msgIdGenerator=new Snowflake();
		},
	};
</script>

<style>
</style>