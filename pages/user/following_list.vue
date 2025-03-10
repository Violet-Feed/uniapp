<template>
	<view class="following-list-container">
		<view>关注列表 - {{ userId }} - {{ userName }}</view>
		<!-- 这里可以添加具体的关注列表展示逻辑 -->
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
	.following-list-container {
		padding: 20px;
	}
</style>