<template>
	<view>
		{{itemId}}
	</view>
</template>

<script>
	export default {
		data() {
			return {
				itemId:null,
			}
		},
		onLoad(options){
			this.itemId=options.id;
		},
		methods: {
			
		}
	}
</script>

<style>

</style>
