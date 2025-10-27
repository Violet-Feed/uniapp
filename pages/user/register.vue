<template>
	<view class="register-container">
		<!-- 背景装饰 -->
		<view class="background-decoration">
			<view class="circle circle-1"></view>
			<view class="circle circle-2"></view>
			<view class="circle circle-3"></view>
		</view>
		
		<!-- 返回按钮 -->
		<view class="back-btn" @click="goBack">
			<text class="back-icon">←</text>
		</view>
		
		<!-- 顶部Logo区域 -->
		<view class="logo-section">
			<view class="logo-icon">
				<text class="logo-text">🎬</text>
			</view>
			<text class="app-name">创建账号</text>
			<text class="app-slogan">加入我们的社区</text>
		</view>
		
		<!-- 注册表单 -->
		<view class="form-section">
			<!-- 用户名输入框 -->
			<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'username' }">
				<view class="input-icon">
					<text class="icon">👤</text>
				</view>
				<input 
					class="input-field" 
					v-model="username" 
					placeholder="请输入用户名"
					placeholder-class="input-placeholder"
					@focus="onFocus('username')"
					@blur="onBlur"
				/>
			</view>
			
			<!-- 密码输入框 -->
			<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'password' }">
				<view class="input-icon">
					<text class="icon">🔒</text>
				</view>
				<input 
					class="input-field" 
					v-model="password" 
					type="password" 
					placeholder="请输入密码"
					placeholder-class="input-placeholder"
					@focus="onFocus('password')"
					@blur="onBlur"
				/>
			</view>
			
			<!-- 确认密码输入框 -->
			<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'confirm' }">
				<view class="input-icon">
					<text class="icon">🔐</text>
				</view>
				<input 
					class="input-field" 
					v-model="confirmPassword" 
					type="password" 
					placeholder="请再次输入密码"
					placeholder-class="input-placeholder"
					@focus="onFocus('confirm')"
					@blur="onBlur"
				/>
			</view>
			
			<!-- 密码强度提示 -->
			<view class="password-strength" v-if="password">
				<view class="strength-bar">
					<view class="strength-fill" :style="{ width: passwordStrength + '%', background: passwordStrengthColor }"></view>
				</view>
				<text class="strength-text" :style="{ color: passwordStrengthColor }">{{ passwordStrengthText }}</text>
			</view>
			
			<!-- 注册按钮 -->
			<button 
				class="register-btn" 
				:class="{ 'btn-loading': isLoading }"
				@click="register"
				:disabled="isLoading"
			>
				<view v-if="isLoading" class="loading-spinner"></view>
				<text v-else class="btn-text">注册</text>
			</button>
			
			<!-- 底部链接 -->
			<view class="footer-links">
				<text class="link-text">已有账号？</text>
				<text class="link-btn" @click="goToLogin">立即登录</text>
			</view>
		</view>
		
		<!-- 装饰波浪 -->
		<view class="wave-decoration"></view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			username: '',
			password: '',
			confirmPassword: '',
			isLoading: false,
			focusedField: ''
		};
	},
	computed: {
		passwordStrength() {
			if (!this.password) return 0;
			let strength = 0;
			
			// 长度检查
			if (this.password.length >= 6) strength += 25;
			if (this.password.length >= 8) strength += 25;
			
			// 包含数字
			if (/\d/.test(this.password)) strength += 25;
			
			// 包含字母
			if (/[a-zA-Z]/.test(this.password)) strength += 25;
			
			return strength;
		},
		passwordStrengthColor() {
			if (this.passwordStrength < 50) return '#ff6b6b';
			if (this.passwordStrength < 75) return '#ffa500';
			return '#51cf66';
		},
		passwordStrengthText() {
			if (this.passwordStrength < 50) return '弱';
			if (this.passwordStrength < 75) return '中等';
			return '强';
		}
	},
	methods: {
		onFocus(field) {
			this.focusedField = field;
		},
		
		onBlur() {
			this.focusedField = '';
		},
		
		goBack() {
			uni.navigateBack();
		},
		
		async register() {
			// 验证用户名
			if (!this.username) {
				uni.showToast({
					title: '请输入用户名',
					icon: 'none'
				});
				return;
			}
			
			if (this.username.length < 3) {
				uni.showToast({
					title: '用户名至少3个字符',
					icon: 'none'
				});
				return;
			}
			
			// 验证密码
			if (!this.password) {
				uni.showToast({
					title: '请输入密码',
					icon: 'none'
				});
				return;
			}
			
			if (this.password.length < 6) {
				uni.showToast({
					title: '密码至少6个字符',
					icon: 'none'
				});
				return;
			}
			
			// 验证确认密码
			if (this.password !== this.confirmPassword) {
				uni.showToast({
					title: '两次密码输入不一致',
					icon: 'none'
				});
				return;
			}
			
			this.isLoading = true;
			
			try {
				const res = await uni.request({
					url: 'http://127.0.0.1:3000/api/user/register',
					method: 'POST',
					header: {
						'content-type': 'application/json'
					},
					data: {
						username: this.username,
						password: this.password,
						confirm_password: this.confirmPassword,
					}
				});
				
				if (res.statusCode === 200) {
					const data = res.data;
					if (data.code === 1000) {
						uni.showToast({
							title: '注册成功',
							icon: 'success'
						});
						
						setTimeout(() => {
							uni.reLaunch({
								url: '/pages/user/login'
							});
						}, 500);
					} else {
						uni.showToast({
							title: data.message || '注册失败',
							icon: 'none'
						});
					}
				} else {
					uni.showToast({
						title: '网络错误，请稍后重试',
						icon: 'none'
					});
				}
			} catch (err) {
				console.error('注册错误:', err);
				uni.showToast({
					title: '注册失败，请稍后重试',
					icon: 'none'
				});
			} finally {
				this.isLoading = false;
			}
		},
		
		goToLogin() {
			uni.navigateBack();
		}
	}
};
</script>

<style scoped>
.register-container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 30px;
	position: relative;
	overflow: hidden;
}

/* 背景装饰圆圈 */
.background-decoration {
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
	overflow: hidden;
	z-index: 0;
}

.circle {
	position: absolute;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.1);
	animation: float 20s infinite ease-in-out;
}

.circle-1 {
	width: 150px;
	height: 150px;
	top: -50px;
	left: -50px;
	animation-delay: 0s;
}

.circle-2 {
	width: 200px;
	height: 200px;
	top: 50%;
	right: -80px;
	animation-delay: 5s;
}

.circle-3 {
	width: 120px;
	height: 120px;
	bottom: -40px;
	left: 30%;
	animation-delay: 10s;
}

@keyframes float {
	0%, 100% {
		transform: translateY(0) scale(1);
		opacity: 0.3;
	}
	50% {
		transform: translateY(-30px) scale(1.1);
		opacity: 0.5;
	}
}

/* 返回按钮 */
.back-btn {
	position: absolute;
	top: 20px;
	left: 20px;
	width: 40px;
	height: 40px;
	background: rgba(255, 255, 255, 0.2);
	backdrop-filter: blur(10px);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	transition: all 0.3s;
}

.back-btn:active {
	transform: scale(0.95);
	background: rgba(255, 255, 255, 0.3);
}

.back-icon {
	font-size: 24px;
	color: #fff;
}

/* Logo区域 */
.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 40px;
	z-index: 1;
}

.logo-icon {
	width: 80px;
	height: 80px;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20px;
	backdrop-filter: blur(10px);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.logo-text {
	font-size: 40px;
}

.app-name {
	font-size: 28px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 8px;
	text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.app-slogan {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.9);
	letter-spacing: 1px;
}

/* 表单区域 */
.form-section {
	width: 100%;
	max-width: 400px;
	z-index: 1;
}

.input-wrapper {
	position: relative;
	margin-bottom: 18px;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 16px;
	display: flex;
	align-items: center;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
	transition: all 0.3s;
}

.input-wrapper.input-focused {
	background: #fff;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
	transform: translateY(-2px);
}

.input-icon {
	width: 50px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon {
	font-size: 20px;
}

.input-field {
	flex: 1;
	height: 54px;
	padding: 0 20px 0 0;
	font-size: 15px;
	color: #333;
	background: transparent;
	border: none;
}

.input-placeholder {
	color: #999;
}

/* 密码强度 */
.password-strength {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 20px;
	padding: 0 4px;
}

.strength-bar {
	flex: 1;
	height: 4px;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	overflow: hidden;
}

.strength-fill {
	height: 100%;
	border-radius: 2px;
	transition: all 0.3s;
}

.strength-text {
	font-size: 12px;
	font-weight: 600;
	min-width: 30px;
	text-align: right;
}

/* 注册按钮 */
.register-btn {
	width: 100%;
	height: 54px;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	border-radius: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 10px;
	box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
	transition: all 0.3s;
	border: none;
	padding: 0;
}

.register-btn:active:not(.btn-loading) {
	transform: scale(0.98);
	box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.register-btn.btn-loading {
	background: linear-gradient(135deg, #ff8b8b 0%, #ff7a8f 100%);
	opacity: 0.8;
}

.btn-text {
	font-size: 16px;
	font-weight: 600;
	color: #fff;
	letter-spacing: 2px;
}

.loading-spinner {
	width: 20px;
	height: 20px;
	border: 3px solid rgba(255, 255, 255, 0.3);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

/* 底部链接 */
.footer-links {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-top: 30px;
	gap: 8px;
}

.link-text {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.8);
}

.link-btn {
	font-size: 14px;
	color: #fff;
	font-weight: 600;
	text-decoration: underline;
}

/* 波浪装饰 */
.wave-decoration {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 80px;
	background: rgba(255, 255, 255, 0.1);
	z-index: 0;
	clip-path: polygon(0 50%, 100% 30%, 100% 100%, 0% 100%);
}
</style>