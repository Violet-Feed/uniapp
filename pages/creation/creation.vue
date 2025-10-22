<template>
	<view>
		{{creationId}}
	</view>
</template>

<script>
	export default {
		data() {
			return {
				creationId:null,
			}
		},
		onLoad(options){
			this.creationId=options.id;
		},
		methods: {
			
		}
	}
</script>

<style>

</style>
