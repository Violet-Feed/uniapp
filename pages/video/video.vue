<template>
	<view>
		video
	</view>
	<button @click="ToNetty">Netty</button>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		methods: {
			ToNetty(){
				uni.navigateTo({
					url: '/pages/netty'
				});
			}
		}
	}
</script>

<style>

</style>
