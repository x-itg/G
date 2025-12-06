// 用户认证和CFR 21 Part 11电子签名模块
window.Auth = {
    currentUser: null,
    isAuthenticated: false,

    // 初始化认证模块
    init() {
        this.bindEvents();
        this.checkStoredSession();
    },

    // 绑定事件
    bindEvents() {
        // 登录表单提交
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // 退出登录按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // 注册表单提交
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // 密码重置表单提交
        const resetForm = document.getElementById('reset-form');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
        }

        // 新密码设置表单提交
        const newPasswordForm = document.getElementById('new-password-form');
        if (newPasswordForm) {
            newPasswordForm.addEventListener('submit', (e) => this.handleNewPassword(e));
        }

        // 密码显示/隐藏按钮事件
        this.bindPasswordToggleEvents();

        // 实时表单验证
        this.bindRealTimeValidation();

        // 菜单事件监听
        window.electronAPI.menu.onUserManagement(() => this.showUserManagement());
        window.electronAPI.menu.onAuditLog(() => this.showAuditLog());
        
        // 绑定其他按钮事件
        this.bindAdditionalEvents();
    },

    // 绑定其他事件
    bindAdditionalEvents() {
        // 切换到注册页面
        const showRegisterBtn = document.getElementById('show-register-btn');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => this.showRegisterInterface());
        }

        // 切换到登录页面
        const showLoginBtn = document.getElementById('show-login-btn');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => this.showLoginInterface());
        }

        // 从重置页面返回登录
        const showLoginBtnFromReset = document.getElementById('show-login-btn-from-reset');
        if (showLoginBtnFromReset) {
            showLoginBtnFromReset.addEventListener('click', () => this.showLoginInterface());
        }

        // 忘记密码按钮
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => this.showForgotPasswordInterface());
        }

        // 显示密码按钮
        this.bindPasswordToggleEvents();
        
        // 实时表单验证
        this.bindRealTimeValidation();
    },

    // 绑定密码显示切换事件
    bindPasswordToggleEvents() {
        // 处理通用的toggle-password按钮
        const toggleButtons = document.querySelectorAll('.toggle-password');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-target');
                const passwordField = document.getElementById(target);
                const icon = e.target.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordField.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });

        // 处理注册页面的密码显示/隐藏按钮
        const registerPasswordToggle = document.getElementById('toggle-register-password');
        if (registerPasswordToggle) {
            registerPasswordToggle.addEventListener('click', (e) => {
                const passwordField = document.getElementById('register-password');
                const icon = e.target.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    registerPasswordToggle.setAttribute('aria-label', '隐藏密码');
                } else {
                    passwordField.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    registerPasswordToggle.setAttribute('aria-label', '显示密码');
                }
            });
        }

        const registerConfirmPasswordToggle = document.getElementById('toggle-register-confirm-password');
        if (registerConfirmPasswordToggle) {
            registerConfirmPasswordToggle.addEventListener('click', (e) => {
                const passwordField = document.getElementById('register-confirm-password');
                const icon = e.target.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    registerConfirmPasswordToggle.setAttribute('aria-label', '隐藏确认密码');
                } else {
                    passwordField.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    registerConfirmPasswordToggle.setAttribute('aria-label', '显示确认密码');
                }
            });
        }
    },

    // 绑定实时表单验证
    bindRealTimeValidation() {
        // 用户名实时验证
        const usernameField = document.getElementById('register-username');
        if (usernameField) {
            let usernameTimeout;
            usernameField.addEventListener('input', (e) => {
                clearTimeout(usernameTimeout);
                usernameTimeout = setTimeout(() => {
                    this.validateUsername(e.target.value);
                }, 500);
            });
        }

        // 密码强度实时检查
        const passwordFields = ['register-password', 'edit-password', 'reset-password'];
        passwordFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', (e) => {
                    this.checkPasswordStrength(e.target.value, fieldId);
                    // 如果是注册密码，还要检查密码确认
                    if (fieldId === 'register-password') {
                        this.validatePasswordConfirmation('register-confirm-password');
                    }
                });
            }
        });

        // 密码确认实时验证
        const confirmFields = ['register-confirm-password', 'edit-password-confirm', 'reset-confirm-password'];
        confirmFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', (e) => {
                    this.validatePasswordConfirmation(fieldId);
                });
            }
        });
    },

    // 处理登录
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        const loginError = document.getElementById('login-error');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        try {
            // 显示加载状态
            submitBtn.disabled = true;
            submitBtn.textContent = '登录中...';
            loginError.style.display = 'none';

            // 调用认证API
            const result = await window.electronAPI.auth.login(credentials);

            if (result.success) {
                this.currentUser = result.user;
                this.isAuthenticated = true;
                
                // 记录成功登录
                this.log('用户登录成功', 'success');
                
                // 显示主界面
                this.showMainInterface();
                
                // 触发登录完成事件
                this.triggerEvent('loginSuccess', result.user);
            } else {
                throw new Error(result.error || '登录失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'login_failed', {
                username: credentials.username,
                functionName: 'handleLogin'
            });
            
            loginError.textContent = errorInfo.userMessage;
            loginError.style.display = 'block';
            this.log(`登录失败: ${errorInfo.userMessage}`, 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    },

    // 退出登录
    async logout() {
        try {
            await window.electronAPI.auth.logout();
            this.currentUser = null;
            this.isAuthenticated = false;
            
            this.log('用户退出登录', 'info');
            
            // 显示登录界面
            this.showLoginInterface();
            
            // 触发登出事件
            this.triggerEvent('logout');
        } catch (error) {
            ErrorHandler.handleError(error, 'logout_failed', {
                functionName: 'logout',
                currentUser: this.currentUser?.username
            });
        }
    },

    // 检查存储的会话
    checkStoredSession() {
        // 检查是否有有效的会话（这里可以实现JWT验证等）
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                // 验证会话是否有效
                if (this.isValidSession(user)) {
                    this.currentUser = user;
                    this.isAuthenticated = true;
                    this.showMainInterface();
                } else {
                    this.clearStoredSession();
                }
            } catch (error) {
                ErrorHandler.handleError(error, 'session_parse_failed', {
                    storedUser: storedUser,
                    functionName: 'checkStoredSession'
                });
                this.clearStoredSession();
            }
        }
    },

    // 验证会话有效性
    isValidSession(user) {
        // 检查用户是否仍然有效
        if (!user || !user.id || !user.username) {
            return false;
        }
        
        // 可以添加更多验证逻辑，比如检查令牌过期时间
        return true;
    },

    // 存储会话
    storeSession(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    // 清除存储的会话
    clearStoredSession() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('passwordResetToken');
    },

    // 处理用户注册
    async handleRegister(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            fullName: formData.get('fullName'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role') || 'operator',
            phone: formData.get('phone') || '',
            department: formData.get('department') || ''
        };

        const registerError = document.getElementById('register-error');
        const submitBtn = document.getElementById('register-submit-btn');

        try {
            // 显示加载状态
            submitBtn.disabled = true;
            submitBtn.textContent = '注册中...';
            registerError.style.display = 'none';

            // 表单验证
            if (!this.validateRegisterForm(userData)) {
                throw new Error('请检查表单信息');
            }

            // 调用注册API
            const result = await window.electronAPI.auth.register(userData);

            if (result.success) {
                this.log('用户注册成功', 'success');
                
                // 显示成功消息
                this.showSuccessMessage('注册成功！请使用您的账号登录。');
                
                // 切换到登录界面
                setTimeout(() => {
                    this.showLoginInterface();
                }, 2000);
                
            } else {
                throw new Error(result.error || '注册失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'register_failed', {
                username: userData.username,
                functionName: 'handleRegister'
            });
            
            registerError.textContent = errorInfo.userMessage;
            registerError.style.display = 'block';
            this.log(`用户注册失败: ${errorInfo.userMessage}`, 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = '创建账户';
        }
    },

    // 处理密码重置请求
    async handlePasswordReset(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const resetData = {
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        const resetError = document.getElementById('reset-error');
        const submitBtn = document.getElementById('reset-submit-btn');

        try {
            // 显示加载状态
            submitBtn.disabled = true;
            submitBtn.textContent = '重置中...';
            resetError.style.display = 'none';

            // 验证输入
            if (!resetData.email) {
                throw new Error('请输入邮箱地址');
            }

            // 验证邮箱格式
            if (!this.validateEmail(resetData.email)) {
                throw new Error('请输入有效的邮箱地址');
            }

            // 验证密码
            if (!resetData.password) {
                throw new Error('请输入新密码');
            }

            if (!this.validatePassword(resetData.password)) {
                throw new Error('密码不符合安全要求（至少8位，包含大小写字母、数字和特殊字符）');
            }

            // 验证密码确认
            if (resetData.password !== resetData.confirmPassword) {
                throw new Error('两次输入的密码不一致');
            }

            // 调用密码重置API
            const result = await window.electronAPI.auth.resetPassword(resetData);

            if (result.success) {
                this.log('密码重置成功', 'success');
                
                // 显示成功消息
                this.showSuccessMessage('密码重置成功！请使用新密码登录。');
                
                // 切换到登录界面
                setTimeout(() => {
                    this.showLoginInterface();
                }, 3000);
                
            } else {
                throw new Error(result.error || '密码重置失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'password_reset_failed', {
                email: resetData.email,
                functionName: 'handlePasswordReset'
            });
            
            resetError.textContent = errorInfo.userMessage;
            resetError.style.display = 'block';
            this.log(`密码重置失败: ${errorInfo.userMessage}`, 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = '重置密码';
        }
    },

    // 处理新密码设置
    async handleNewPassword(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const passwordData = {
            token: sessionStorage.getItem('passwordResetToken'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        const newPasswordError = document.getElementById('new-password-error');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        try {
            // 显示加载状态
            submitBtn.disabled = true;
            submitBtn.textContent = '设置中...';
            newPasswordError.style.display = 'none';

            // 验证令牌
            if (!passwordData.token) {
                throw new Error('无效的密码重置令牌');
            }

            // 验证密码
            if (!this.validatePassword(passwordData.password)) {
                throw new Error('密码不符合安全要求');
            }

            if (passwordData.password !== passwordData.confirmPassword) {
                throw new Error('两次输入的密码不一致');
            }

            // 调用新密码设置API
            const result = await window.electronAPI.auth.setNewPassword(passwordData);

            if (result.success) {
                this.log('密码重置成功', 'success');
                
                // 清除令牌
                sessionStorage.removeItem('passwordResetToken');
                
                // 显示成功消息
                this.showSuccessMessage('密码重置成功！请使用新密码登录。');
                
                // 切换到登录界面
                setTimeout(() => {
                    this.showLoginInterface();
                }, 3000);
                
            } else {
                throw new Error(result.error || '密码重置失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'set_new_password_failed', {
                functionName: 'handleNewPassword'
            });
            
            newPasswordError.textContent = errorInfo.userMessage;
            newPasswordError.style.display = 'block';
            this.log(`密码重置失败: ${errorInfo.userMessage}`, 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = '设置新密码';
        }
    },

    // 显示登录界面
    showLoginInterface() {
        this.hideAllAuthScreens();
        document.getElementById('login-screen').style.display = 'flex';
        this.clearAllForms();
    },

    // 显示注册界面
    showRegisterInterface() {
        this.hideAllAuthScreens();
        document.getElementById('register-screen').style.display = 'flex';
        this.clearAllForms();
    },

    // 显示密码重置界面
    showForgotPasswordInterface() {
        this.hideAllAuthScreens();
        document.getElementById('forgot-password-screen').style.display = 'flex';
        this.clearAllForms();
    },

    // 显示新密码设置界面
    showNewPasswordInterface(token) {
        this.hideAllAuthScreens();
        document.getElementById('new-password-screen').style.display = 'flex';
        this.clearAllForms();
        
        // 存储重置令牌
        sessionStorage.setItem('passwordResetToken', token);
    },

    // 隐藏所有认证相关界面
    hideAllAuthScreens() {
        const screens = ['login-screen', 'register-screen', 'forgot-password-screen', 'new-password-screen'];
        screens.forEach(screen => {
            const element = document.getElementById(screen);
            if (element) element.style.display = 'none';
        });
    },

    // 清除所有表单
    clearAllForms() {
        const forms = ['login-form', 'register-form', 'reset-form', 'new-password-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
        
        // 清除错误信息
        const errorElements = document.querySelectorAll('.auth-error');
        errorElements.forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });

        // 清除验证状态
        this.clearValidationStates();
    },

    // 清除验证状态
    clearValidationStates() {
        const fields = document.querySelectorAll('.form-control');
        fields.forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
    },

    // 显示主界面
    showMainInterface() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'flex';
        
        // 更新用户信息显示
        this.updateUserInfo();
        
        // 更新界面权限
        this.updateUIPermissions();
        
        // 存储会话
        this.storeSession(this.currentUser);
    },

    // 更新用户信息显示
    updateUserInfo() {
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `${this.currentUser.fullName} (${this.currentUser.role})`;
        }
    },

    // 更新界面权限
    updateUIPermissions() {
        if (!this.currentUser) return;

        const role = this.currentUser.role;
        const permissions = this.getPermissions(role);

        // 根据权限控制界面元素
        this.updateElementVisibility(permissions);
        this.updateElementAccessibility(permissions);
    },

    // 获取用户权限
    getPermissions(role) {
        const permissionMap = {
            ADMIN: {
                users: ['create', 'read', 'update', 'delete', 'unlock'],
                analyses: ['create', 'read', 'update', 'delete', 'approve', 'export'],
                audit: ['read', 'export'],
                system: ['configure', 'validate', 'backup'],
                devices: ['create', 'read', 'update', 'delete'],
                signatures: ['create', 'verify', 'revoke']
            },
            SUPERVISOR: {
                users: ['read'],
                analyses: ['create', 'read', 'update', 'approve', 'export'],
                audit: ['read'],
                system: ['read'],
                devices: ['read', 'update'],
                signatures: ['create', 'verify']
            },
            OPERATOR: {
                users: ['read_self'],
                analyses: ['create', 'read_own', 'update_own'],
                audit: [],
                system: [],
                devices: ['read'],
                signatures: ['create']
            }
        };

        return permissionMap[role] || {};
    },

    // 更新元素可见性
    updateElementVisibility(permissions) {
        // 管理员功能
        if (permissions.users?.includes('create')) {
            this.showElement('create-user-btn');
        }

        // 审计日志
        if (permissions.audit?.includes('read')) {
            this.showElement('audit-log-btn');
        }

        // 系统验证
        if (permissions.system?.includes('validate')) {
            this.showElement('system-validation-btn');
        }
    },

    // 更新元素可访问性
    updateElementAccessibility(permissions) {
        const restrictedElements = {
            'user-management': permissions.users?.includes('read'),
            'audit-log': permissions.audit?.includes('read'),
            'device-management': permissions.devices?.includes('read'),
            'system-validation': permissions.system?.includes('validate')
        };

        Object.entries(restrictedElements).forEach(([id, hasAccess]) => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !hasAccess;
                if (!hasAccess) {
                    element.title = '权限不足';
                }
            }
        });
    },

    // 显示元素
    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'inline-block';
        }
    },

    // 隐藏元素
    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    },

    // 创建电子签名
    async createElectronicSignature(data) {
        if (!this.isAuthenticated) {
            ErrorHandler.handleError(new Error('用户未登录'), 'auth_not_authenticated', {
                functionName: 'createElectronicSignature'
            });
            throw new Error('用户未登录');
        }

        if (!this.currentUser) {
            ErrorHandler.handleError(new Error('用户信息无效'), 'auth_invalid_user_info', {
                functionName: 'createElectronicSignature',
                userId: this.currentUser?.id
            });
            throw new Error('用户信息无效');
        }

        try {
            const signatureData = {
                userId: this.currentUser.id,
                password: data.password,
                reason: data.reason,
                comment: data.comment || '',
                entityType: data.entityType || 'Analysis',
                entityId: data.entityId || 'default',
                action: data.action || 'SIGN',
                ipAddress: 'localhost',
                userAgent: navigator.userAgent
            };

            // 验证签名字段
            this.validateSignatureFields(this.currentUser.role, signatureData);

            const result = await window.electronAPI.signature.sign(signatureData);

            if (result.success) {
                this.log(`电子签名创建成功: ${data.reason}`, 'success');
                return result.signature;
            } else {
                throw new Error(result.error || '签名失败');
            }
        } catch (error) {
            this.log(`电子签名失败: ${error.message}`, 'error');
            throw error;
        }
    },

    // 验证签名字段
    validateSignatureFields(role, data) {
        const requirements = {
            OPERATOR: ['reason'],
            SUPERVISOR: ['reason', 'comment'],
            ADMIN: ['reason', 'comment']
        };

        const required = requirements[role] || [];
        
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                throw new Error(`${role}签名必须包含${field === 'reason' ? '原因' : '注释'}`);
            }
        }

        // 验证密码
        if (!data.password || data.password.length < 1) {
            throw new Error('密码验证失败');
        }
    },

    // 显示用户管理界面
    showUserManagement() {
        if (!this.hasPermission('users', 'read')) {
            this.showAccessDeniedMessage();
            return;
        }

        UI.showModal({
            title: '用户管理',
            content: this.createUserManagementContent(),
            onConfirm: null,
            showConfirmButton: false
        });
    },

    // 显示审计日志界面
    showAuditLog() {
        if (!this.hasPermission('audit', 'read')) {
            this.showAccessDeniedMessage();
            return;
        }

        UI.showModal({
            title: '审计日志',
            content: this.createAuditLogContent(),
            onConfirm: null,
            showConfirmButton: false
        });

        // 加载审计日志
        this.loadAuditLogs();
    },

    // 创建用户管理内容
    createUserManagementContent() {
        const container = Utils.dom.create('div', 'user-management-container');
        
        // 创建用户管理标题栏
        const header = Utils.dom.create('div', 'user-management-header');
        header.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>用户管理</h5>
                <div>
                    <button id="refresh-users-btn" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-sync-alt"></i> 刷新
                    </button>
                    ${this.hasPermission('users', 'create') ? 
                        '<button id="add-user-btn" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 添加用户</button>' : 
                        ''
                    }
                </div>
            </div>
        `;
        container.appendChild(header);
        
        // 创建加载状态
        const loadingDiv = Utils.dom.create('div', 'text-center p-4');
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x"></i><br>加载用户列表...';
        container.appendChild(loadingDiv);
        
        // 创建用户列表容器
        const userListContainer = Utils.dom.create('div', 'user-list-container');
        userListContainer.style.display = 'none';
        container.appendChild(userListContainer);
        
        // 绑定事件
        setTimeout(() => {
            const refreshBtn = document.getElementById('refresh-users-btn');
            if (refreshBtn) {
                refreshBtn.onclick = () => this.loadUserList();
            }
            
            const addUserBtn = document.getElementById('add-user-btn');
            if (addUserBtn) {
                addUserBtn.onclick = () => this.showAddUserDialog();
            }
        }, 100);
        
        // 加载用户列表
        this.loadUserList();
        
        return container;
    },
    
    // 加载用户列表
    async loadUserList() {
        try {
            const loadingDiv = document.querySelector('.user-management-container .text-center');
            const userListContainer = document.querySelector('.user-management-container .user-list-container');
            
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (userListContainer) userListContainer.style.display = 'none';
            
            const response = await fetch('/api/users', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            
            if (result.success) {
                this.renderUserList(result.users, userListContainer);
            } else {
                throw new Error(result.message || '获取用户列表失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'user_list_load_failed', {
                functionName: 'loadUserList',
                apiEndpoint: '/api/users'
            });
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 渲染用户列表
    renderUserList(users, container) {
        container.innerHTML = '';
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-4">暂无用户数据</div>';
            container.style.display = 'block';
            return;
        }
        
        // 创建用户表格
        const table = Utils.dom.create('table', 'table table-striped');
        table.innerHTML = `
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>最后登录</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        users.forEach(user => {
            const tr = Utils.dom.create('tr');
            
            const statusBadge = user.is_active ? 
                (user.is_locked ? 
                    '<span class="badge bg-warning"><i class="fas fa-lock"></i> 已锁定</span>' :
                    '<span class="badge bg-success"><i class="fas fa-check"></i> 活跃</span>'
                ) : 
                '<span class="badge bg-secondary"><i class="fas fa-times"></i> 禁用</span>';
            
            const loginStatusBadge = user.last_login ? 
                `<small class="text-muted">最后登录: ${Utils.formatDateTime(user.last_login)}</small>` :
                '<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> 从未登录</small>';
            
            const roleBadge = this.getRoleBadge(user.role);
            
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${Utils.formatDateTime(user.created_at)}</td>
                <td>${user.last_login ? Utils.formatDateTime(user.last_login) : '从未登录'}</td>
                <td>
                    <div class="btn-group" role="group">
                        ${this.hasPermission('users', 'update') ? 
                            `<button class="btn btn-sm btn-outline-primary" onclick="window.Auth.showEditUserDialog(${user.id})" title="编辑用户">
                                <i class="fas fa-edit"></i>
                            </button>` : ''
                        }
                        ${this.hasPermission('users', 'update') ? 
                            `<button class="btn btn-sm btn-outline-info" onclick="window.Auth.showUserProfileView(${user.id})" title="查看详情">
                                <i class="fas fa-user"></i>
                            </button>` : ''
                        }
                        ${this.hasPermission('users', 'update') && user.id !== this.currentUser.id ? 
                            `<button class="btn btn-sm btn-outline-warning" onclick="window.Auth.resetUserPassword(${user.id})" title="重置密码">
                                <i class="fas fa-key"></i>
                            </button>` : ''
                        }
                        ${this.hasPermission('users', 'update') && user.id !== this.currentUser.id ? 
                            `<button class="btn btn-sm btn-outline-${user.is_locked ? 'success' : 'secondary'}" 
                                     onclick="window.Auth.toggleUserLock(${user.id})" 
                                     title="${user.is_locked ? '解锁用户' : '锁定用户'}">
                                <i class="fas fa-${user.is_locked ? 'unlock' : 'lock'}"></i>
                            </button>` : ''
                        }
                        ${this.hasPermission('users', 'delete') && user.id !== this.currentUser.id ? 
                            `<button class="btn btn-sm btn-outline-danger" onclick="window.Auth.deleteUser(${user.id})" title="删除用户">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
        container.style.display = 'block';
    },
    
    // 获取角色徽章
    getRoleBadge(role) {
        const badges = {
            'admin': '<span class="badge bg-danger">管理员</span>',
            'supervisor': '<span class="badge bg-warning">主管</span>',
            'operator': '<span class="badge bg-info">操作员</span>'
        };
        return badges[role] || `<span class="badge bg-secondary">${role}</span>`;
    },
    
    // 显示添加用户对话框
    showAddUserDialog() {
        UI.showModal({
            title: '添加新用户',
            content: this.createAddUserForm(),
            onConfirm: () => this.handleAddUser(),
            confirmText: '创建用户',
            showConfirmButton: true
        });
    },
    
    // 创建添加用户表单
    createAddUserForm() {
        const form = Utils.dom.create('form', 'user-form');
        form.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-username">用户名 <span class="text-danger">*</span></label>
                        <input type="text" id="new-username" class="form-control" required 
                               placeholder="输入用户名" maxlength="50">
                        <div id="username-feedback" class="form-text"></div>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-role">角色 <span class="text-danger">*</span></label>
                        <select id="new-role" class="form-control" required>
                            <option value="">请选择角色</option>
                            <option value="operator">操作员</option>
                            <option value="supervisor">主管</option>
                            <option value="admin">管理员</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-email">邮箱 <span class="text-danger">*</span></label>
                        <input type="email" id="new-email" class="form-control" required 
                               placeholder="输入邮箱地址">
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-fullName">姓名 <span class="text-danger">*</span></label>
                        <input type="text" id="new-fullName" class="form-control" required 
                               placeholder="输入真实姓名">
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-phone">电话</label>
                        <input type="tel" id="new-phone" class="form-control" 
                               placeholder="输入电话号码">
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="new-department">部门</label>
                        <input type="text" id="new-department" class="form-control" 
                               placeholder="输入所属部门">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="new-password">密码 <span class="text-danger">*</span></label>
                <div class="input-group">
                    <input type="password" id="new-password" class="form-control" required 
                           placeholder="输入密码" minlength="8">
                    <button class="btn btn-outline-secondary toggle-password" type="button" 
                            data-target="new-password">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div id="new-password-strength" class="mt-2"></div>
                <small class="form-text text-muted">密码至少8位，包含大小写字母、数字和特殊字符</small>
                <div class="invalid-feedback"></div>
            </div>
            <div class="form-group">
                <label for="new-password-confirm">确认密码 <span class="text-danger">*</span></label>
                <div class="input-group">
                    <input type="password" id="new-password-confirm" class="form-control" required 
                           placeholder="再次输入密码">
                    <button class="btn btn-outline-secondary toggle-password" type="button" 
                            data-target="new-password-confirm">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="invalid-feedback"></div>
            </div>
        `;
        return form;
    },
    
    // 处理添加用户
    async handleAddUser() {
        const username = document.getElementById('new-username').value.trim();
        const email = document.getElementById('new-email').value.trim();
        const fullName = document.getElementById('new-fullName').value.trim();
        const role = document.getElementById('new-role').value;
        const password = document.getElementById('new-password').value;
        const passwordConfirm = document.getElementById('new-password-confirm').value;
        const phone = document.getElementById('new-phone').value.trim();
        const department = document.getElementById('new-department').value.trim();
        
        // 使用增强的表单验证
        const userData = {
            username,
            email,
            fullName,
            password,
            confirmPassword: passwordConfirm,
            role,
            phone,
            department
        };
        
        if (!this.validateRegisterForm(userData)) {
            return false;
        }
        
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                UI.showSuccess('用户创建成功');
                this.log(`用户创建成功: ${username}`, 'success');
                this.loadUserList(); // 重新加载用户列表
                return true;
            } else {
                throw new Error(result.message || '创建用户失败');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'user_create_failed', {
                username: username,
                role: role,
                functionName: 'handleAddUser'
            });
            
            UI.showError(errorInfo.userMessage);
            this.log(`用户创建失败: ${errorInfo.userMessage}`, 'error');
            return false;
        }
    },

    // 显示用户个人资料编辑
    showUserProfileDialog() {
        if (!this.currentUser) {
            UI.showError('用户未登录');
            return;
        }

        UI.showModal({
            title: '个人资料',
            content: this.createUserProfileForm(),
            onConfirm: () => this.handleUserProfileUpdate(),
            confirmText: '更新资料',
            showConfirmButton: true
        });
    },

    // 创建用户个人资料表单
    createUserProfileForm() {
        const form = Utils.dom.create('form', 'profile-form');
        form.innerHTML = `
            <div class="text-center mb-4">
                <div class="avatar-upload">
                    <div class="avatar-edit">
                        <input type='file' id="avatar-upload" accept=".png,.jpg,.jpeg" />
                        <label for="avatar-upload"><i class="fas fa-camera"></i></label>
                    </div>
                    <div class="avatar-preview">
                        <div id="avatar-preview-img" style="background-image: url('/assets/images/default-avatar.png');">
                        </div>
                    </div>
                </div>
                <small class="text-muted">点击更换头像 (PNG, JPG, 最大2MB)</small>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>用户名</label>
                        <input type="text" class="form-control" value="${this.currentUser.username}" readonly>
                        <small class="form-text text-muted">用户名不可修改</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>角色</label>
                        <input type="text" class="form-control" value="${this.getRoleDisplayName(this.currentUser.role)}" readonly>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="profile-email">邮箱 <span class="text-danger">*</span></label>
                        <input type="email" id="profile-email" class="form-control" required 
                               value="${this.currentUser.email || ''}">
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="profile-fullName">姓名 <span class="text-danger">*</span></label>
                        <input type="text" id="profile-fullName" class="form-control" required 
                               value="${this.currentUser.fullName || ''}">
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="profile-phone">电话</label>
                        <input type="tel" id="profile-phone" class="form-control" 
                               value="${this.currentUser.phone || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="profile-department">部门</label>
                        <input type="text" id="profile-department" class="form-control" 
                               value="${this.currentUser.department || ''}">
                    </div>
                </div>
            </div>
            
            <hr>
            
            <div class="form-group">
                <label>修改密码</label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="change-password-toggle">
                    <label class="form-check-label" for="change-password-toggle">
                        更改密码
                    </label>
                </div>
            </div>
            
            <div id="password-change-section" style="display: none;">
                <div class="form-group">
                    <label for="current-password">当前密码 <span class="text-danger">*</span></label>
                    <input type="password" id="current-password" class="form-control" 
                           placeholder="输入当前密码">
                    <div class="invalid-feedback"></div>
                </div>
                <div class="form-group">
                    <label for="new-password-profile">新密码 <span class="text-danger">*</span></label>
                    <input type="password" id="new-password-profile" class="form-control" 
                           placeholder="输入新密码">
                    <div id="new-password-profile-strength" class="mt-2"></div>
                    <div class="invalid-feedback"></div>
                </div>
                <div class="form-group">
                    <label for="confirm-new-password">确认新密码 <span class="text-danger">*</span></label>
                    <input type="password" id="confirm-new-password" class="form-control" 
                           placeholder="再次输入新密码">
                    <div class="invalid-feedback"></div>
                </div>
            </div>
        `;

        // 绑定头像上传事件
        setTimeout(() => {
            const avatarUpload = document.getElementById('avatar-upload');
            if (avatarUpload) {
                avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
            }

            // 绑定密码修改切换事件
            const passwordToggle = document.getElementById('change-password-toggle');
            const passwordSection = document.getElementById('password-change-section');
            if (passwordToggle && passwordSection) {
                passwordToggle.addEventListener('change', (e) => {
                    passwordSection.style.display = e.target.checked ? 'block' : 'none';
                });
            }
        }, 100);

        return form;
    },

    // 处理头像上传
    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 验证文件类型和大小
        if (!file.type.match('image.*')) {
            UI.showError('请选择图片文件');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            UI.showError('图片大小不能超过2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('avatar-preview-img');
            if (preview) {
                preview.style.backgroundImage = `url(${e.target.result})`;
            }
        };
        reader.readAsDataURL(file);

        // 上传头像
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/api/users/avatar', {
                method: 'POST',
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                UI.showSuccess('头像上传成功');
                this.log('用户头像更新成功', 'success');
            } else {
                throw new Error(result.message || '头像上传失败');
            }
        } catch (error) {
            console.error('头像上传失败:', error);
            UI.showError('头像上传失败: ' + error.message);
        }
    },

    // 处理用户资料更新
    async handleUserProfileUpdate() {
        const email = document.getElementById('profile-email').value.trim();
        const fullName = document.getElementById('profile-fullName').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();
        const department = document.getElementById('profile-department').value.trim();
        
        const changePassword = document.getElementById('change-password-toggle').checked;
        let currentPassword = '', newPassword = '', confirmPassword = '';
        
        if (changePassword) {
            currentPassword = document.getElementById('current-password').value;
            newPassword = document.getElementById('new-password-profile').value;
            confirmPassword = document.getElementById('confirm-new-password').value;
        }

        // 验证基本字段
        if (!email) {
            UI.showError('请输入邮箱地址');
            return false;
        }

        if (!this.validateEmail(email)) {
            UI.showError('请输入有效的邮箱地址');
            return false;
        }

        if (!fullName) {
            UI.showError('请输入姓名');
            return false;
        }

        // 验证密码修改
        if (changePassword) {
            if (!currentPassword) {
                UI.showError('请输入当前密码');
                return false;
            }

            if (!newPassword) {
                UI.showError('请输入新密码');
                return false;
            }

            if (!this.validatePassword(newPassword)) {
                UI.showError('新密码不符合安全要求');
                return false;
            }

            if (newPassword !== confirmPassword) {
                UI.showError('两次输入的新密码不一致');
                return false;
            }
        }

        try {
            const updateData = {
                email,
                fullName,
                phone,
                department
            };

            if (changePassword) {
                updateData.currentPassword = currentPassword;
                updateData.newPassword = newPassword;
            }

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (result.success) {
                UI.showSuccess('个人资料更新成功');
                this.log('用户资料更新成功', 'success');
                
                // 更新本地用户信息
                if (this.currentUser) {
                    this.currentUser.email = email;
                    this.currentUser.fullName = fullName;
                    this.currentUser.phone = phone;
                    this.currentUser.department = department;
                    this.updateUserInfo();
                }
                
                return true;
            } else {
                throw new Error(result.message || '更新失败');
            }
        } catch (error) {
            console.error('更新用户资料失败:', error);
            UI.showError('更新失败: ' + error.message);
            this.log(`用户资料更新失败: ${error.message}`, 'error');
            return false;
        }
    },

    // 锁定/解锁用户账户
    async toggleUserLock(userId, lockReason = '') {
        try {
            const response = await fetch(`/api/users/${userId}/toggle-lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify({ reason: lockReason })
            });

            const result = await response.json();

            if (result.success) {
                const action = result.locked ? '锁定' : '解锁';
                UI.showSuccess(`用户账户${action}成功`);
                this.log(`用户${action}: ${userId}`, 'success');
                this.loadUserList(); // 重新加载用户列表
                return true;
            } else {
                throw new Error(result.message || `${action}用户失败`);
            }
        } catch (error) {
            console.error('切换用户锁定状态失败:', error);
            UI.showError('操作失败: ' + error.message);
            return false;
        }
    },

    // 重置用户密码（管理员功能）
    async resetUserPassword(userId) {
        const confirmed = await UI.showConfirm('重置密码', 
            '确定要重置此用户的密码吗？用户下次登录时需要设置新密码。');
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });

            const result = await response.json();

            if (result.success) {
                UI.showSuccess('密码重置成功');
                this.log(`重置用户密码: ${userId}`, 'success');
                
                // 显示临时密码（如果有）
                if (result.tempPassword) {
                    UI.showAlert('临时密码', 
                        `临时密码: ${result.tempPassword}\n请告知用户并要求其尽快修改密码。`, 
                        'info');
                }
                
                return true;
            } else {
                throw new Error(result.message || '密码重置失败');
            }
        } catch (error) {
            console.error('重置用户密码失败:', error);
            UI.showError('重置密码失败: ' + error.message);
            return false;
        }
    },
    
    // 显示编辑用户对话框
    showEditUserDialog(userId) {
        UI.showModal({
            title: '编辑用户',
            content: this.createEditUserForm(userId),
            onConfirm: () => this.handleEditUser(userId),
            confirmText: '更新用户',
            showConfirmButton: true
        });
    },

    // 显示用户详情查看
    showUserProfileView(userId) {
        UI.showModal({
            title: '用户详情',
            content: this.createUserProfileView(userId),
            onConfirm: null,
            confirmText: '关闭',
            showConfirmButton: true
        });
    },

    // 创建用户详情查看内容
    async createUserProfileView(userId) {
        const container = Utils.dom.create('div', 'user-profile-view');
        
        try {
            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });

            const result = await response.json();

            if (result.success) {
                const user = result.user;
                
                container.innerHTML = `
                    <div class="row">
                        <div class="col-md-4 text-center">
                            <div class="user-avatar-large mb-3">
                                <img src="${user.avatar_url || '/assets/images/default-avatar.png'}" 
                                     alt="用户头像" class="img-thumbnail" style="width: 120px; height: 120px; object-fit: cover;">
                            </div>
                            <h5>${user.fullName || user.username}</h5>
                            <p class="text-muted">${this.getRoleDisplayName(user.role)}</p>
                            <span class="badge bg-${user.is_active ? 'success' : 'secondary'}">
                                ${user.is_active ? '活跃' : '禁用'}
                            </span>
                            ${user.is_locked ? '<br><span class="badge bg-warning mt-2"><i class="fas fa-lock"></i> 已锁定</span>' : ''}
                        </div>
                        <div class="col-md-8">
                            <div class="user-info">
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>用户ID:</strong></div>
                                    <div class="col-sm-8">${user.id}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>用户名:</strong></div>
                                    <div class="col-sm-8">${user.username}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>邮箱:</strong></div>
                                    <div class="col-sm-8">${user.email || '未设置'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>电话:</strong></div>
                                    <div class="col-sm-8">${user.phone || '未设置'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>部门:</strong></div>
                                    <div class="col-sm-8">${user.department || '未设置'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>创建时间:</strong></div>
                                    <div class="col-sm-8">${Utils.formatDateTime(user.created_at)}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>最后登录:</strong></div>
                                    <div class="col-sm-8">${user.last_login ? Utils.formatDateTime(user.last_login) : '从未登录'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>登录次数:</strong></div>
                                    <div class="col-sm-8">${user.login_count || 0}</div>
                                </div>
                                ${user.last_password_change ? `
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>密码修改:</strong></div>
                                    <div class="col-sm-8">${Utils.formatDateTime(user.last_password_change)}</div>
                                </div>
                                ` : ''}
                                ${user.locked_reason ? `
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>锁定原因:</strong></div>
                                    <div class="col-sm-8 text-warning">${user.locked_reason}</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${this.hasPermission('audit', 'read') ? `
                    <hr>
                    <div class="user-activity">
                        <h6><i class="fas fa-history"></i> 最近活动</h6>
                        <div id="user-activity-list">
                            <div class="text-center">
                                <i class="fas fa-spinner fa-spin"></i> 加载中...
                            </div>
                        </div>
                    </div>
                    ` : ''}
                `;

                // 加载用户活动日志
                if (this.hasPermission('audit', 'read')) {
                    this.loadUserActivity(userId);
                }

            } else {
                container.innerHTML = '<div class="alert alert-danger">无法加载用户信息</div>';
            }
        } catch (error) {
            console.error('加载用户详情失败:', error);
            container.innerHTML = '<div class="alert alert-danger">加载用户信息失败</div>';
        }

        return container;
    },

    // 加载用户活动日志
    async loadUserActivity(userId) {
        try {
            const result = await window.electronAPI.audit.getUserActivity(userId, 10);

            if (result.success) {
                const activityList = document.getElementById('user-activity-list');
                if (activityList && result.activities.length > 0) {
                    activityList.innerHTML = result.activities.map(activity => `
                        <div class="activity-item mb-2 p-2 border-start border-primary">
                            <div class="d-flex justify-content-between">
                                <span>${activity.description}</span>
                                <small class="text-muted">${Utils.formatDateTime(activity.timestamp)}</small>
                            </div>
                        </div>
                    `).join('');
                } else if (activityList) {
                    activityList.innerHTML = '<div class="text-muted">暂无活动记录</div>';
                }
            } else {
                throw new Error(result.error || '加载活动日志失败');
            }
        } catch (error) {
            const activityList = document.getElementById('user-activity-list');
            if (activityList) {
                activityList.innerHTML = '<div class="text-danger">加载活动日志失败</div>';
            }
        }
    },
    
    // 创建编辑用户表单
    createEditUserForm(userId) {
        const form = Utils.dom.create('form', 'user-form');
        form.innerHTML = `
            <div class="text-center mb-3">
                <i class="fas fa-user-edit fa-2x text-primary"></i>
                <h6>用户 ID: ${userId}</h6>
            </div>
            <div class="form-group">
                <label for="edit-password">新密码 (留空则不修改)</label>
                <input type="password" id="edit-password" class="form-control" 
                       placeholder="输入新密码" minlength="6">
                <small class="form-text text-muted">留空则保持原密码不变</small>
            </div>
            <div class="form-group">
                <label for="edit-password-confirm">确认新密码</label>
                <input type="password" id="edit-password-confirm" class="form-control" 
                       placeholder="再次输入新密码">
            </div>
            <div class="form-group">
                <label for="edit-role">用户角色</label>
                <select id="edit-role" class="form-control">
                    <option value="operator">操作员</option>
                    <option value="supervisor">主管</option>
                    <option value="admin">管理员</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-status">账户状态</label>
                <select id="edit-status" class="form-control">
                    <option value="true">活跃</option>
                    <option value="false">禁用</option>
                </select>
            </div>
        `;
        return form;
    },
    
    // 处理编辑用户
    async handleEditUser(userId) {
        const password = document.getElementById('edit-password').value;
        const passwordConfirm = document.getElementById('edit-password-confirm').value;
        const role = document.getElementById('edit-role').value;
        const isActive = document.getElementById('edit-status').value === 'true';
        
        // 验证密码
        if (password && password !== passwordConfirm) {
            UI.showError('两次输入的密码不一致');
            return false;
        }
        
        if (password && password.length < 6) {
            UI.showError('密码至少6位字符');
            return false;
        }
        
        try {
            const updateData = { role, is_active: isActive };
            if (password) {
                updateData.password = password;
            }
            
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                UI.showSuccess('用户更新成功');
                this.loadUserList(); // 重新加载用户列表
                return true;
            } else {
                throw new Error(result.message || '更新用户失败');
            }
        } catch (error) {
            console.error('更新用户失败:', error);
            UI.showError('更新用户失败: ' + error.message);
            return false;
        }
    },
    
    // 删除用户
    async deleteUser(userId) {
        if (userId === this.currentUser.id) {
            UI.showError('不能删除自己的账户');
            return;
        }
        
        const confirmed = await UI.showConfirm('删除用户', 
            '确定要删除这个用户吗？此操作不可撤销。');
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                UI.showSuccess('用户删除成功');
                this.loadUserList(); // 重新加载用户列表
            } else {
                throw new Error(result.message || '删除用户失败');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            UI.showError('删除用户失败: ' + error.message);
        }
    },

    // 创建审计日志内容
    createAuditLogContent() {
        const container = Utils.dom.create('div', 'audit-log-container');
        
        // 筛选器
        const filters = Utils.dom.create('div', 'audit-filters');
        filters.innerHTML = `
            <div class="form-group">
                <label>操作类型</label>
                <select id="audit-action-filter" class="form-control">
                    <option value="">全部</option>
                    <option value="CREATE">创建</option>
                    <option value="UPDATE">更新</option>
                    <option value="DELETE">删除</option>
                    <option value="LOGIN">登录</option>
                    <option value="SIGN">签名</option>
                </select>
            </div>
            <div class="form-group">
                <label>实体类型</label>
                <select id="audit-entity-filter" class="form-control">
                    <option value="">全部</option>
                    <option value="User">用户</option>
                    <option value="Analysis">分析</option>
                    <option value="Device">设备</option>
                    <option value="System">系统</option>
                </select>
            </div>
            <button id="audit-filter-btn" class="btn btn-primary btn-sm">筛选</button>
            <button id="audit-export-btn" class="btn btn-success btn-sm">导出</button>
        `;
        container.appendChild(filters);
        
        // 日志表格
        const logTable = Utils.dom.create('table', 'table');
        logTable.innerHTML = `
            <thead>
                <tr>
                    <th>时间</th>
                    <th>操作</th>
                    <th>实体</th>
                    <th>用户</th>
                    <th>详情</th>
                </tr>
            </thead>
            <tbody id="audit-log-body">
                <tr><td colspan="5" style="text-align: center;">加载中...</td></tr>
            </tbody>
        `;
        container.appendChild(logTable);
        
        return container;
    },

    // 加载审计日志
    async loadAuditLogs() {
        try {
            const filters = {
                limit: 100
            };

            // 应用筛选器
            const actionFilter = document.getElementById('audit-action-filter');
            const entityFilter = document.getElementById('audit-entity-filter');
            
            if (actionFilter && actionFilter.value) {
                filters.action = actionFilter.value;
            }
            
            if (entityFilter && entityFilter.value) {
                filters.entityType = entityFilter.value;
            }

            const result = await window.electronAPI.audit.getLogs(filters);

            if (result.success) {
                this.displayAuditLogs(result.logs);
            } else {
                throw new Error(result.error || '加载审计日志失败');
            }
        } catch (error) {
            console.error('加载审计日志失败:', error);
            const tbody = document.getElementById('audit-log-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">加载失败: ${error.message}</td></tr>`;
            }
        }
    },

    // 显示审计日志
    displayAuditLogs(logs) {
        const tbody = document.getElementById('audit-log-body');
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${Utils.formatDateTime(log.timestamp)}</td>
                <td><span class="badge badge-${this.getActionBadgeClass(log.action)}">${log.action}</span></td>
                <td>${log.entity_type}:${log.entity_id}</td>
                <td>${log.signed_by_name || '系统'}</td>
                <td>${log.signature_reason || ''}</td>
            </tr>
        `).join('');
    },

    // 获取操作徽章样式类
    getActionBadgeClass(action) {
        const classMap = {
            'CREATE': 'success',
            'UPDATE': 'warning',
            'DELETE': 'danger',
            'LOGIN': 'info',
            'SIGN': 'primary',
            'FAILED_LOGIN': 'danger'
        };
        return classMap[action] || 'secondary';
    },

    // 验证注册表单
    validateRegisterForm(userData) {
        // 验证用户名
        if (!this.validateUsername(userData.username)) {
            return false;
        }

        // 验证邮箱
        if (!this.validateEmail(userData.email)) {
            UI.showError('请输入有效的邮箱地址');
            return false;
        }

        // 验证姓名
        if (!userData.fullName || userData.fullName.trim().length < 2) {
            UI.showError('请输入有效的姓名');
            return false;
        }

        // 验证密码
        if (!this.validatePassword(userData.password)) {
            UI.showError('密码不符合安全要求：至少8位，包含大小写字母、数字和特殊字符');
            return false;
        }

        // 验证密码确认
        if (userData.password !== userData.confirmPassword) {
            UI.showError('两次输入的密码不一致');
            return false;
        }

        // 验证角色
        if (!['operator', 'supervisor', 'admin'].includes(userData.role)) {
            UI.showError('请选择有效的用户角色');
            return false;
        }

        // 验证电话（如果提供）
        if (userData.phone && !this.validatePhone(userData.phone)) {
            UI.showError('请输入有效的电话号码');
            return false;
        }

        return true;
    },

    // 验证用户名
    validateUsername(username) {
        const usernameField = document.getElementById('register-username');
        const feedback = document.getElementById('username-availability');
        
        if (!username || username.trim().length < 3) {
            this.setFieldValidation(usernameField, false, '用户名至少3个字符');
            if (feedback) feedback.textContent = '用户名至少3个字符';
            return false;
        }

        if (username.length > 50) {
            this.setFieldValidation(usernameField, false, '用户名不能超过50个字符');
            if (feedback) feedback.textContent = '用户名不能超过50个字符';
            return false;
        }

        // 检查用户名格式：只能包含字母、数字、下划线和连字符
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.setFieldValidation(usernameField, false, '用户名只能包含字母、数字、下划线和连字符');
            if (feedback) feedback.textContent = '用户名只能包含字母、数字、下划线和连字符';
            return false;
        }

        // 检查用户名是否已存在（异步验证）
        this.checkUsernameAvailability(username);
        
        this.setFieldValidation(usernameField, true, '用户名可用');
        if (feedback) feedback.textContent = '';
        return true;
    },

    // 检查用户名可用性
    async checkUsernameAvailability(username) {
        const feedback = document.getElementById('username-availability');
        if (feedback) {
            feedback.innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> 检查中...</small>';
        }

        try {
            const result = await window.electronAPI.auth.checkUsernameAvailability(username);
            if (result.success && !result.available) {
                this.setFieldValidation(document.getElementById('register-username'), false, '用户名已存在');
                if (feedback) feedback.innerHTML = '<small class="text-danger">用户名已存在</small>';
            } else if (result.success && result.available) {
                if (feedback) feedback.innerHTML = '<small class="text-success">用户名可用</small>';
            }
        } catch (error) {
            if (feedback) feedback.innerHTML = '<small class="text-danger">检查失败</small>';
        }
    },

    // 验证邮箱
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // 验证密码强度
    validatePassword(password) {
        if (!password || password.length < 8) {
            return false;
        }

        // 检查是否包含大小写字母、数字和特殊字符
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    },

    // 检查密码强度
    checkPasswordStrength(password, fieldId) {
        // 特殊处理注册密码字段
        const strengthIndicator = fieldId === 'register-password' ? 
            document.getElementById('password-strength-indicator') : 
            document.getElementById(`${fieldId}-strength`);
            
        if (!strengthIndicator) return;

        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength += 25;
        else feedback.push('至少8个字符');

        if (/[a-z]/.test(password)) strength += 25;
        else feedback.push('小写字母');

        if (/[A-Z]/.test(password)) strength += 25;
        else feedback.push('大写字母');

        if (/\d/.test(password)) strength += 12.5;
        else feedback.push('数字');

        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 12.5;
        else feedback.push('特殊字符');

        let strengthClass = '';
        let strengthText = '';
        let barClass = '';

        if (strength >= 90) {
            strengthClass = 'text-success';
            barClass = 'bg-success';
            strengthText = '强';
        } else if (strength >= 70) {
            strengthClass = 'text-warning';
            barClass = 'bg-warning';
            strengthText = '中等';
        } else {
            strengthClass = 'text-danger';
            barClass = 'bg-danger';
            strengthText = '弱';
        }

        // 特殊处理注册密码字段的显示格式
        if (fieldId === 'register-password') {
            const strengthBar = strengthIndicator.querySelector('.strength-fill');
            const strengthTextElement = strengthIndicator.querySelector('.strength-text');
            
            if (strengthBar) {
                strengthBar.className = `strength-fill ${barClass}`;
                strengthBar.style.width = `${strength}%`;
            }
            
            if (strengthTextElement) {
                strengthTextElement.className = `strength-text ${strengthClass}`;
                strengthTextElement.textContent = `密码强度：${strengthText}`;
            }
        } else {
            strengthIndicator.innerHTML = `
                <div class="progress" style="height: 5px;">
                    <div class="progress-bar ${barClass}" style="width: ${strength}%"></div>
                </div>
                <small class="text-${strength >= 70 ? 'success' : 'danger'}">密码强度: ${strengthText}</small>
            `;
        }
    },

    // 验证密码确认
    validatePasswordConfirmation(fieldId) {
        const field = document.getElementById(fieldId);
        const passwordField = document.getElementById(fieldId.replace('-confirm', ''));
        
        if (!field || !passwordField) return true;

        // 特殊处理注册确认密码和重置确认密码
        let feedback = null;
        if (fieldId === 'register-confirm-password') {
            feedback = document.getElementById('password-match-indicator');
        } else if (fieldId === 'reset-confirm-password') {
            feedback = document.getElementById('password-match-indicator');
        }

        if (field.value && field.value !== passwordField.value) {
            this.setFieldValidation(field, false, '密码不一致');
            if (feedback) {
                feedback.innerHTML = '<small class="text-danger"><i class="fas fa-times"></i> 密码不一致</small>';
            }
            return false;
        } else if (field.value) {
            this.setFieldValidation(field, true, '密码一致');
            if (feedback) {
                feedback.innerHTML = '<small class="text-success"><i class="fas fa-check"></i> 密码一致</small>';
            }
            return true;
        } else {
            if (feedback) {
                feedback.innerHTML = '';
            }
        }

        return true;
    },

    // 验证电话号码
    validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    },

    // 设置字段验证状态
    setFieldValidation(field, isValid, message = '') {
        if (!field) return;

        field.classList.remove('is-valid', 'is-invalid');
        
        if (isValid) {
            field.classList.add('is-valid');
        } else {
            field.classList.add('is-invalid');
            
            // 显示错误消息
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    },

    // 显示成功消息
    showSuccessMessage(message) {
        // 创建成功提示
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // 添加到当前页面顶部
        const currentScreen = document.querySelector('.auth-screen[style*="flex"]');
        if (currentScreen) {
            currentScreen.insertBefore(successDiv, currentScreen.firstChild);
        }
        
        // 3秒后自动关闭
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    },

    // 检查权限
    hasPermission(resource, action) {
        if (!this.currentUser) return false;
        
        const permissions = this.getPermissions(this.currentUser.role);
        const resourcePermissions = permissions[resource] || [];
        
        // 特殊处理：操作员只能操作自己的数据
        if (this.currentUser.role === 'OPERATOR' && action.includes('own')) {
            return resourcePermissions.includes(action.replace('_own', ''));
        }
        
        return resourcePermissions.includes(action);
    },

    // 显示权限不足消息
    showAccessDeniedMessage() {
        UI.showAlert('权限不足', '您没有权限访问此功能', 'warning');
    },

    // 记录日志
    log(message, level = 'info') {
        const logContainer = document.getElementById('operation-log');
        if (logContainer) {
            const logEntry = Utils.dom.create('div', `log-entry log-level-${level}`);
            const timestamp = Utils.formatDateTime(new Date());
            logEntry.innerHTML = `
                <span class="log-time">${timestamp}</span>
                <span class="log-level ${level}">${level.toUpperCase()}</span>
                <span class="log-message">${message}</span>
            `;
            
            logContainer.insertBefore(logEntry, logContainer.firstChild);
            
            // 限制日志条目数量
            while (logContainer.children.length > 50) {
                logContainer.removeChild(logContainer.lastChild);
            }
            
            // 自动滚动到最新
            logContainer.scrollTop = 0;
        }
        
        // 同时输出到控制台
        console[level]('Auth:', message);
    },

    // 触发自定义事件
    triggerEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    },

    // 获取当前用户
    getCurrentUser() {
        return this.currentUser;
    },

    // 检查是否已认证
    isAuthenticated() {
        return this.isAuthenticated && this.currentUser;
    },

    // 获取用户角色
    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    },

    // 显示电子签名对话框
    showElectronicSignatureDialog(options) {
        const defaultOptions = {
            documentType: 'Analysis',
            documentId: null,
            action: 'SIGN',
            title: '电子签名',
            ...options
        };
        
        UI.showModal({
            title: defaultOptions.title,
            content: this.createSignatureForm(defaultOptions),
            onConfirm: () => this.handleElectronicSignature(defaultOptions),
            confirmText: '确认签名',
            showConfirmButton: true,
            size: 'modal-md'
        });
    },

    // 创建电子签名表单
    createSignatureForm(options) {
        const form = Utils.dom.create('form', 'signature-form');
        
        const isOperator = this.currentUser.role === 'operator';
        const isSupervisor = this.currentUser.role === 'supervisor';
        
        form.innerHTML = `
            <div class="signature-header text-center mb-4">
                <i class="fas fa-certificate fa-3x text-primary"></i>
                <h5>CFR 21 Part 11 电子签名</h5>
                <p class="text-muted">请输入您的密码进行身份验证并签名</p>
            </div>
            
            <div class="form-group">
                <label>文档类型</label>
                <input type="text" class="form-control" value="${options.documentType}" readonly>
            </div>
            
            <div class="form-group">
                <label>操作类型</label>
                <input type="text" class="form-control" value="${options.action}" readonly>
            </div>
            
            ${options.documentId ? `
            <div class="form-group">
                <label>文档ID</label>
                <input type="text" class="form-control" value="${options.documentId}" readonly>
            </div>
            ` : ''}
            
            <div class="form-group">
                <label>签名原因 <span class="text-danger">${isOperator ? '*' : ''}</span></label>
                <textarea id="signature-reason" class="form-control" rows="2" 
                         placeholder="请输入签名的原因或目的" ${isOperator ? 'required' : ''}></textarea>
            </div>
            
            ${isSupervisor || isOperator ? '' : `
            <div class="form-group">
                <label>附加注释</label>
                <textarea id="signature-comment" class="form-control" rows="3" 
                         placeholder="可选：输入附加的注释或说明"></textarea>
            </div>
            `}
            
            <div class="form-group">
                <label>用户密码 <span class="text-danger">*</span></label>
                <input type="password" id="signature-password" class="form-control" 
                       placeholder="输入您的登录密码" required>
            </div>
            
            <div class="signature-info mt-3">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    签名人: ${this.currentUser.username}<br>
                    角色: ${this.getRoleDisplayName(this.currentUser.role)}<br>
                    时间: ${Utils.formatDateTime(new Date())}
                </small>
            </div>
        `;
        
        return form;
    },

    // 获取角色显示名称
    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '管理员',
            'supervisor': '主管',
            'operator': '操作员'
        };
        return roleNames[role] || role;
    },

    // 处理电子签名
    async handleElectronicSignature(options) {
        const reason = document.getElementById('signature-reason')?.value?.trim();
        const comment = document.getElementById('signature-comment')?.value?.trim();
        const password = document.getElementById('signature-password').value;
        
        // 验证输入
        if (!password) {
            UI.showError('请输入您的密码');
            return false;
        }
        
        // Operator角色需要填写原因
        if (this.currentUser.role === 'operator' && !reason) {
            UI.showError('操作员必须填写签名原因');
            return false;
        }
        
        try {
            const signatureData = {
                document_type: options.documentType,
                document_id: options.documentId,
                action: options.action,
                signature_data: JSON.stringify({
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    reason: reason || '',
                    comment: comment || '',
                    timestamp: new Date().toISOString(),
                    ipAddress: 'localhost',
                    userAgent: navigator.userAgent
                })
            };
            
            const response = await fetch('/api/signatures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify(signatureData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.log(`电子签名成功: ${options.action} - ${options.documentType}`, 'success');
                
                // 如果有回调函数，执行它
                if (options.onSuccess && typeof options.onSuccess === 'function') {
                    options.onSuccess(result);
                }
                
                return true;
            } else {
                throw new Error(result.message || '电子签名失败');
            }
        } catch (error) {
            console.error('电子签名失败:', error);
            UI.showError('电子签名失败: ' + error.message);
            return false;
        }
    },

    // 快速签名（无界面）
    async quickSignature(options) {
        if (!this.isAuthenticated) {
            throw new Error('用户未登录');
        }
        
        const defaultOptions = {
            documentType: 'Analysis',
            documentId: null,
            action: 'SIGN',
            reason: '快速签名',
            ...options
        };
        
        try {
            const signatureData = {
                document_type: defaultOptions.documentType,
                document_id: defaultOptions.documentId,
                action: defaultOptions.action,
                signature_data: JSON.stringify({
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    reason: defaultOptions.reason,
                    comment: defaultOptions.comment || '',
                    timestamp: new Date().toISOString(),
                    ipAddress: 'localhost',
                    userAgent: navigator.userAgent
                })
            };
            
            const response = await fetch('/api/signatures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify(signatureData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.log(`快速签名成功: ${defaultOptions.action}`, 'success');
                return result;
            } else {
                throw new Error(result.message || '快速签名失败');
            }
        } catch (error) {
            console.error('快速签名失败:', error);
            this.log(`快速签名失败: ${error.message}`, 'error');
            throw error;
        }
    },

    // 验证电子签名
    async verifySignature(signatureId) {
        try {
            const response = await fetch(`/api/signatures/${signatureId}/verify`, {
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result;
            } else {
                throw new Error(result.message || '签名验证失败');
            }
        } catch (error) {
            console.error('验证签名失败:', error);
            throw error;
        }
    },

    // 获取电子签名列表
    async getSignatureList(filters) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/signatures?${queryParams}`, {
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.signatures;
            } else {
                throw new Error(result.message || '获取签名列表失败');
            }
        } catch (error) {
            console.error('获取签名列表失败:', error);
            throw error;
        }
    },

    // 安全检查和防护功能
    
    // 检查会话过期
    checkSessionExpiry() {
        if (!this.currentUser || !this.currentUser.lastActivity) {
            return;
        }

        const now = Date.now();
        const lastActivity = new Date(this.currentUser.lastActivity).getTime();
        const sessionTimeout = 30 * 60 * 1000; // 30分钟

        if (now - lastActivity > sessionTimeout) {
            this.log('会话已过期，自动退出', 'warning');
            this.logout();
            UI.showAlert('会话过期', '您的登录会话已过期，请重新登录', 'warning');
        } else {
            // 更新最后活动时间
            this.currentUser.lastActivity = new Date().toISOString();
            this.storeSession(this.currentUser);
        }
    },

    // 启动会话监控
    startSessionMonitoring() {
        // 每5分钟检查一次会话
        setInterval(() => {
            this.checkSessionExpiry();
        }, 5 * 60 * 1000);

        // 监听用户活动
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                if (this.currentUser) {
                    this.currentUser.lastActivity = new Date().toISOString();
                    this.storeSession(this.currentUser);
                }
            }, true);
        });
    },

    // 强制用户重新认证
    forceReAuthentication(reason) {
        if (!this.isAuthenticated) return;

        const message = reason || '为了安全起见，请重新验证您的身份';
        
        UI.showModal({
            title: '身份验证',
            content: this.createReAuthForm(message),
            onConfirm: () => this.handleReAuthentication(),
            confirmText: '验证',
            showConfirmButton: true
        });
    },

    // 创建重新认证表单
    createReAuthForm(message) {
        const form = Utils.dom.create('form', 'reauth-form');
        form.innerHTML = `
            <div class="text-center mb-4">
                <i class="fas fa-shield-alt fa-3x text-warning"></i>
                <h5 class="mt-3">安全验证</h5>
                <p class="text-muted">${message}</p>
            </div>
            
            <div class="form-group">
                <label>用户名</label>
                <input type="text" class="form-control" value="${this.currentUser.username}" readonly>
            </div>
            
            <div class="form-group">
                <label for="reauth-password">密码 <span class="text-danger">*</span></label>
                <input type="password" id="reauth-password" class="form-control" 
                       placeholder="输入您的密码" required>
                <div class="invalid-feedback"></div>
            </div>
        `;

        return form;
    },

    // 处理重新认证
    async handleReAuthentication() {
        const password = document.getElementById('reauth-password').value;

        if (!password) {
            UI.showError('请输入密码');
            return false;
        }

        try {
            const result = await window.electronAPI.auth.verifyPassword({
                username: this.currentUser.username,
                password: password
            });

            if (result.success) {
                this.currentUser.lastActivity = new Date().toISOString();
                this.storeSession(this.currentUser);
                this.log('用户重新认证成功', 'success');
                return true;
            } else {
                throw new Error(result.error || '密码验证失败');
            }
        } catch (error) {
            console.error('重新认证失败:', error);
            UI.showError('身份验证失败: ' + error.message);
            this.log(`重新认证失败: ${error.message}`, 'error');
            return false;
        }
    },

    // 记录安全事件
    logSecurityEvent(eventType, details) {
        const securityLog = {
            timestamp: new Date().toISOString(),
            userId: this.currentUser?.id,
            username: this.currentUser?.username,
            eventType: eventType,
            details: details,
            ipAddress: 'localhost',
            userAgent: navigator.userAgent
        };

        // 发送到后端记录
        window.electronAPI.audit.logSecurityEvent(securityLog).catch(error => {
            console.error('记录安全事件失败:', error);
        });

        // 本地日志
        this.log(`安全事件: ${eventType}`, 'warning');
    },

    // 检测异常活动
    detectAnomalousActivity() {
        if (!this.currentUser) return;

        const now = new Date();
        const lastLogin = new Date(this.currentUser.lastLogin || 0);
        const timeDiff = now.getTime() - lastLogin.getTime();
        
        // 如果距离上次登录超过24小时且本次登录时间异常，触发警告
        if (timeDiff > 24 * 60 * 60 * 1000 && now.getHours() < 6) {
            this.logSecurityEvent('UNUSUAL_LOGIN_TIME', {
                lastLogin: lastLogin.toISOString(),
                currentTime: now.toISOString()
            });
        }

        // 检测频繁失败登录（这里应该由后端处理，前端只是记录）
        const failedLogins = JSON.parse(localStorage.getItem('failedLogins') || '[]');
        const recentFailures = failedLogins.filter(time => 
            now.getTime() - new Date(time).getTime() < 60 * 60 * 1000
        );

        if (recentFailures.length > 5) {
            this.logSecurityEvent('MULTIPLE_FAILED_LOGINS', {
                count: recentFailures.length,
                timeWindow: '1小时'
            });
        }
    },

    // 清理安全日志
    cleanupSecurityLogs() {
        const failedLogins = JSON.parse(localStorage.getItem('failedLogins') || '[]');
        const now = new Date();
        
        // 保留24小时内的记录
        const validLogins = failedLogins.filter(time => 
            now.getTime() - new Date(time).getTime() < 24 * 60 * 60 * 1000
        );
        
        localStorage.setItem('failedLogins', JSON.stringify(validLogins));
    },

    // 导出用户数据（管理员功能）
    async exportUserData(format) {
        if (!this.hasPermission('users', 'read')) {
            UI.showError('权限不足');
            return;
        }

        try {
            const response = await fetch(`/api/users/export?format=${format}`, {
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });

            if (!response.ok) {
                throw new Error('导出请求失败');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.log('用户数据导出成功', 'success');
            UI.showSuccess('用户数据导出成功');
        } catch (error) {
            console.error('导出用户数据失败:', error);
            UI.showError('导出失败: ' + error.message);
        }
    },

    // 获取系统统计信息
    async getSystemStats() {
        if (!this.hasPermission('system', 'read')) {
            return null;
        }

        try {
            const result = await window.electronAPI.system.getStats();
            return result.success ? result.stats : null;
        } catch (error) {
            console.error('获取系统统计失败:', error);
            return null;
        }
    },

    // 初始化完整的认证系统
    async initComplete() {
        // 初始化基础认证
        this.init();
        
        // 启动会话监控
        this.startSessionMonitoring();
        
        // 清理安全日志
        this.cleanupSecurityLogs();
        
        // 检测异常活动
        this.detectAnomalousActivity();
        
        this.log('认证系统初始化完成', 'info');
    }
};

// 监听认证事件
document.addEventListener('loginSuccess', (event) => {
    console.log('用户登录成功:', event.detail);
    // 可以在这里添加登录成功后的额外处理
});

document.addEventListener('logout', () => {
    console.log('用户已登出');
    // 可以在这里添加登出后的清理工作
});

console.log('认证模块已加载');

// 监听认证事件
document.addEventListener('loginSuccess', (event) => {
    console.log('用户登录成功:', event.detail);
    // 可以在这里添加登录成功后的额外处理
});

document.addEventListener('logout', () => {
    console.log('用户已登出');
    // 可以在这里添加登出后的清理工作
});

// 在页面加载完成后初始化认证系统
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他模块已加载
    setTimeout(() => {
        window.Auth.initComplete();
    }, 1000);
});

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.Auth.isAuthenticated) {
        // 页面隐藏时记录
        window.Auth.log('页面隐藏', 'info');
    } else if (!document.hidden && window.Auth.isAuthenticated) {
        // 页面显示时检查会话
        window.Auth.checkSessionExpiry();
    }
});

// 监听窗口关闭事件
window.addEventListener('beforeunload', (e) => {
    if (window.Auth.isAuthenticated) {
        // 记录会话结束
        window.Auth.log('用户关闭浏览器', 'info');
    }
});

console.log('认证模块已加载并完善');

// 在页面加载完成后初始化认证系统
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他模块已加载
    setTimeout(() => {
        window.Auth.initComplete();
    }, 1000);
});

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.Auth.isAuthenticated) {
        // 页面隐藏时记录
        window.Auth.log('页面隐藏', 'info');
    } else if (!document.hidden && window.Auth.isAuthenticated) {
        // 页面显示时检查会话
        window.Auth.checkSessionExpiry();
    }
});

// 监听窗口关闭事件
window.addEventListener('beforeunload', (e) => {
    if (window.Auth.isAuthenticated) {
        // 记录会话结束
        window.Auth.log('用户关闭浏览器', 'info');
    }
});

console.log('认证模块已加载并完善');