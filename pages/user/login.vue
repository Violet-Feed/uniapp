<template>
	<view class="login-container">
		<!-- 背景装饰 -->
		<view class="background-decoration">
			<view class="circle circle-1"></view>
			<view class="circle circle-2"></view>
			<view class="circle circle-3"></view>
		</view>
		
		<!-- 顶部Logo区域 -->
		<view class="logo-section">
			<view class="logo-icon">
				<text class="logo-text">🎬</text>
			</view>
			<text class="app-name">欢迎回来</text>
			<text class="app-slogan">登录你的账号</text>
		</view>
		
		<!-- 登录表单 -->
		<view class="form-section">
			<!-- 用户名输入框 -->
			<view class="input-wrapper">
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
			<view class="input-wrapper">
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
			
			<!-- 登录按钮 -->
			<button 
				class="login-btn" 
				:class="{ 'btn-loading': isLoading }"
				@click="login"
				:disabled="isLoading"
			>
				<view v-if="isLoading" class="loading-spinner"></view>
				<text v-else class="btn-text">登录</text>
			</button>
			
			<!-- 底部链接 -->
			<view class="footer-links">
				<text class="link-text">还没有账号？</text>
				<text class="link-btn" @click="goToRegister">立即注册</text>
			</view>
		</view>
		
		<!-- 装饰波浪 -->
		<view class="wave-decoration"></view>
	</view>
</template>

<script>
import JSONbig from 'json-bigint';
import file from '@/utils/file.js';
import DB from '@/utils/sqlite.js';
import { init } from '@/utils/init.js';
import { login } from '@/request/user.js';

export default {
	data() {
		return {
			username: '',
			password: '',
			isLoading: false,
			focusedField: ''
		};
	},
	methods: {
		onFocus(field) {
			this.focusedField = field;
		},
		
		onBlur() {
			this.focusedField = '';
		},
		
		async login() {
			if (!this.username || !this.password) {
				uni.showToast({
					title: '用户名和密码不能为空',
					icon: 'none'
				});
				return;
			}
			
			this.isLoading = true;
			let res = await login(this.username,this.password);
			if(res){
				uni.setStorageSync('token', res.token);
				uni.setStorageSync('user_id', res.user_id);
	
				try {
					await DB.createTable(res.user_id);
				} catch (err) {
					console.error("createTable err", err);
				}
				
				init();
				
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				});
				
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/creation/home'
					});
				}, 500);
			}
			this.isLoading = false;
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

/* Logo区域 */
.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 50px;
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
	margin-bottom: 20px;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 16px;
	display: flex;
	align-items: center;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
	transition: all 0.3s;
}

.input-wrapper:focus-within {
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

/* 登录按钮 */
.login-btn {
	width: 100%;
	height: 54px;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	border-radius: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 30px;
	box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
	transition: all 0.3s;
	border: none;
	padding: 0;
}

.login-btn:active:not(.btn-loading) {
	transform: scale(0.98);
	box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.login-btn.btn-loading {
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