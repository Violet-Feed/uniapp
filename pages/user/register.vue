<template>
    <view class="register-container">
        <view class="input-group">
            <input v-model="username" placeholder="请输入用户名" />
        </view>
        <view class="input-group">
            <input v-model="password" type="password" placeholder="请输入密码" />
        </view>
		<view class="input-group">
		    <input v-model="password" type="password" placeholder="确认密码" />
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
            password: ''
        };
    },
    methods: {
        register() {
            // 这里可以添加注册逻辑，例如调用后端接口进行注册
            console.log('注册用户名:', this.username, '密码:', this.password);
            // 示例：模拟注册成功后跳转到登录页
            // uni.navigateTo({
            //     url: '/pages/login/login'
            // });
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