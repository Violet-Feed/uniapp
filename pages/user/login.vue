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
export default {
    data() {
        return {
            username: '',
            password: ''
        };
    },
    onLoad() {
        // 检查本地是否有 token
        const token = uni.getStorageSync('token');
        if (token) {
            this.getUserInfo(token);
        }
    },
    methods: {
        login() {
            if (!this.username || !this.password) {
                uni.showToast({
                    title: '用户名和密码不能为空',
                    icon: 'none'
                });
                return;
            }
            uni.request({
                url: 'http://127.0.0.1:3000/api/action/user/login/',
                method: 'POST',
				header: { 'content-type': 'application/x-www-form-urlencoded' },
                data: {
                    username: this.username,
                    password: this.password
                },
                success: (res) => {
                    if (res.statusCode === 200) {
                        const data = res.data;
                        if (data.message === "success") {
                            const token = data.token;
                            // 存储 token 到本地
                            uni.setStorageSync('token', token);
                            uni.showToast({
                                title: '登录成功',
                                icon: 'success'
                            });
                            // 登录成功后获取用户信息
                            this.getUserInfo(token);
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
        getUserInfo(token) {
            uni.request({
                url: 'http://127.0.0.1:3000/api/action/user/get_info/',
                method: 'GET',
                header: {
                    Authorization: `Bearer ${token}`
                },
                success: (res) => {
                    if (res.statusCode === 200) {
                        const data = res.data;
                        if (data.message === "success") {
                            // 存储用户信息到本地，可根据实际返回字段调整
							getApp().globalData.userId =  data.userId;
							getApp().globalData.username = data.username;
							getApp().globalData.avatar = data.avatar;
                            // uni.setStorageSync('user_id', data.user_id);
                            // uni.setStorageSync('username', data.username);
                            // uni.setStorageSync('avatar', data.avatar);
                            uni.switchTab({
                                url: '/pages/im/home'
                            });
                        } else {
                            // 获取用户信息失败，跳转到登录界面
                            uni.showToast({
                                title: '登录过期',
                                icon: 'none'
                            });
							uni.removeStorageSync('token');
                            uni.navigateTo({
                                url: '/pages/user/login'
                            });
                        }
                    } else {
                        // 请求失败
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