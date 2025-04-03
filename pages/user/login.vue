<template>
	<view class="login-container">
		<view class="input-group">
			<input v-model="username" placeholder="请输入用户名" />
		</view>
		<view class="input-group">
			<input v-model="password" type="password" placeholder="请输入密码" />
		</view>
		<button @click="login">登录</button>
		<view class="register-link" @click="goToRegister">没有账号？去注册</view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	import file from '@/utils/file.js';
	import DB from '@/utils/sqlite.js'
	import {
		initAuth
	} from '@/utils/auth';
	export default {
		data() {
			return {
				username: '',
				password: ''
			};
		},
		methods: {
			async login() {
				if (!this.username || !this.password) {
					uni.showToast({
						title: '用户名和密码不能为空',
						icon: 'none'
					});
					return;
				}
				let res = await uni.request({
					url: 'http://127.0.0.1:3000/api/user/login',
					method: 'POST',
					header: {
						'content-type': 'application/json'
					},
					data: {
						username: this.username,
						password: this.password
					},
					dataType: 'string',
				});
				if (res.statusCode === 200) {
					res = JSONbig.parse(res.data);
					if (res.code === 1000) {
						uni.setStorageSync('token', res.data.token);
						uni.setStorageSync('user_id', res.data.user_id);
						DB.createTable(res.data.user_id).catch((err) => {
							console.error("createTable err", err);
						})
						initAuth();
						uni.showToast({
							title: '登录成功',
							icon: 'success'
						});
						uni.reLaunch({
							url: '/pages/video/video'
						});
					} else {
						uni.showToast({
							title: res.message,
							icon: 'none'
						});
					}
				} else {
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				}
			},
			goToRegister() {
				uni.navigateTo({
					url: '/pages/user/register'
				});
			}
		}
	};
</script>

<style scoped>
	.login-container {
		padding: 20px;
	}

	.input-group {
		margin-bottom: 20px;
	}

	.input-group input {
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 5px;
	}

	button {
		padding: 10px;
		background-color: #0084ff;
		color: white;
		border: none;
		border-radius: 5px;
	}

	.register-link {
		margin-top: 20px;
		text-align: center;
		color: #0084ff;
		cursor: pointer;
	}
</style>