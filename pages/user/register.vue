<template>
	<view class="register-container">
		<view class="input-group">
			<input v-model="username" placeholder="请输入用户名" />
		</view>
		<view class="input-group">
			<input v-model="password" type="password" placeholder="请输入密码" />
		</view>
		<view class="input-group">
			<input v-model="confirmPassword" type="password" placeholder="确认密码" />
		</view>
		<button @click="register">注册</button>
		<view class="login-link" @click="goToLogin">已有账号？去登录</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				username: '',
				password: '',
				confirmPassword: '',
			};
		},
		methods: {
			register() {
				if (!this.username || !this.password) {
					uni.showToast({
						title: '用户名和密码不能为空',
						icon: 'none'
					});
					return;
				}
				if (this.password != this.confirmPassword) {
					uni.showToast({
						title: '密码不一致',
						icon: 'none'
					});
					return;
				}
				uni.request({
					url: 'http://127.0.0.1:3000/api/action/user/register',
					method: 'POST',
					header: {
						'content-type': 'application/x-www-form-urlencoded'
					},
					data: {
						username: this.username,
						password: this.password,
						confirmPassword: this.confirmPassword,
					},
					success: (res) => {
						if (res.statusCode === 200) {
							const data = res.data;
							if (data.message === "success") {
								uni.showToast({
									title: '注册成功',
									icon: 'success'
								});
								uni.reLaunch({
									url: '/pages/user/login'
								});
							} else {
								uni.showToast({
									title: data.message,
									icon: 'none'
								});
							}
						} else {
							uni.showToast({
								title: '网络错误，请稍后重试',
								icon: 'none'
							});
						}
					},
					fail: (err) => {
						uni.showToast({
							title: '网络错误，请稍后重试',
							icon: 'none'
						});
					}
				});
			},
			goToLogin() {
				uni.navigateTo({
					url: '/pages/user/login'
				});
			}
		}
	};
</script>

<style scoped>
	.register-container {
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

	.login-link {
		margin-top: 20px;
		text-align: center;
		color: #0084ff;
		cursor: pointer;
	}
</style>