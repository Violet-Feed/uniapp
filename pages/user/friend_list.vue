<template>
	<view class="friend-list-container">
		<view>互关列表 - {{ userId }} - {{ username }}</view>
		<!-- 这里可以添加具体的粉丝列表展示逻辑 -->
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userId: null,
				username: ''
			};
		},
		onLoad(options) {
			this.userId = options.userId;
			this.username = options.username;
		}
	};
</script>

<style scoped>
	.friend-list-container {
		padding: 20px;
	}
</style>