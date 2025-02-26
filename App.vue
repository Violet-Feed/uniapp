<template>
</template>

<script>
	import {checkAuth} from '@/utils/auth.js';
	export default {
		onLaunch() {
			checkAuth();
			this.initRouterGuard();
		},
		methods: {
			initRouterGuard() {
				const routerMethods = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'];
				routerMethods.forEach((method) => {
					uni.addInterceptor(method, {
						invoke(args) {
							const noAuthPages = ['/pages/user/login', '/pages/user/register']; // 不需要权限验证的页面路径
							if (!noAuthPages.includes(args.url)) {
								return checkAuth().then((hasAuth) => {
									if (hasAuth) {
										return args; // 权限验证通过，继续跳转
									}
									return false; // 权限验证未通过，阻止跳转
								});
							}
							return args; // 不需要权限验证，继续跳转
						}
					});
				});
			}
		},
	};
</script>

<style>
</style>