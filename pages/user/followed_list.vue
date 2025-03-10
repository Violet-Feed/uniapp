<template>
	<view class="fans-list-container">
		<view>粉丝列表 - {{ userId }} - {{ userName }}</view>
		<!-- 这里可以添加具体的粉丝列表展示逻辑 -->
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userId: null,
				userName: ''
			};
		},
		onLoad(options) {
			this.userId = options.id;
			this.userName = options.name;
		}
	};
</script>

<style scoped>
	.fans-list-container {
		padding: 20px;
	}
</style>