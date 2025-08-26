// Supabase配置文件
// 请将下面的URL和KEY替换为您的实际Supabase项目信息

const SUPABASE_CONFIG = {
    // Supabase项目URL
    url: 'https://ulknatpzvxuxeafdvzos.supabase.co',
    
    // Supabase anon public key
    anonKey: 'sb_publishable_NN81ezEFlZixDpv2r8j3_w_8SRbZC_D'
};

// 初始化Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
        // 默认启用会话持久化，确保认证检查可靠
        persistSession: true,
        // 自动刷新token
        autoRefreshToken: true,
        // 检测URL中的会话信息
        detectSessionInUrl: true,
        // 设置存储类型为localStorage
        storage: window.localStorage
    }
});

// 导出配置
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabase = supabase;

// 测试连接
async function testSupabaseConnection() {
    try {
        console.log('测试Supabase连接...');
        console.log('URL:', SUPABASE_CONFIG.url);
        console.log('Key:', SUPABASE_CONFIG.anonKey.substring(0, 20) + '...');
        
        const { data, error } = await supabase
            .from('applications')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Supabase连接失败:', error);
            return false;
        } else {
            console.log('Supabase连接成功！');
            return true;
        }
    } catch (err) {
        console.error('连接测试失败:', err);
        return false;
    }
}

// 页面加载时测试连接
document.addEventListener('DOMContentLoaded', function() {
    testSupabaseConnection();
});

// 报名表单提交函数
async function submitApplication(formData) {
    try {
        // 确保formData包含所有必要字段（去掉grade）
        const applicationData = {
            name: formData.name,
            student_id: formData.student_id,
            major: formData.major,
            email: formData.email,
            phone: formData.phone,
            department: formData.department,
            skills: formData.skills,
            experience: formData.experience,
            motivation: formData.motivation,
            photo_url: formData.photo_url,
            status: 'pending'
        };

        const { data, error } = await supabase
            .from('applications')
            .insert([applicationData]);
        
        if (error) {
            console.error('提交失败:', error);
            return { success: false, error: error.message };
        } else {
            console.log('报名提交成功:', data);
            return { success: true, data: data };
        }
    } catch (err) {
        console.error('提交异常:', err);
        return { success: false, error: err.message };
    }
}

// 获取报名列表
async function getApplications(status = null) {
    try {
        let query = supabase
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('获取报名列表失败:', error);
            return { success: false, error: error.message };
        } else {
            return { success: true, data: data };
        }
    } catch (err) {
        console.error('获取报名列表异常:', err);
        return { success: false, error: err.message };
    }
}

// 更新报名状态
async function updateApplicationStatus(id, status) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .update({ status: status })
            .eq('id', id);
        
        if (error) {
            console.error('更新状态失败:', error);
            return { success: false, error: error.message };
        } else {
            console.log('状态更新成功:', data);
            return { success: true, data: data };
        }
    } catch (err) {
        console.error('更新状态异常:', err);
        return { success: false, error: err.message };
    }
}

// 管理员登录
async function adminLogin(email, password) {
    try {
        // 注意：这里需要根据您的认证方式调整
        // 如果使用Supabase Auth，使用以下代码：
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('登录失败:', error);
            return { success: false, error: error.message };
        } else {
            console.log('登录成功:', data);
            return { success: true, data: data };
        }
    } catch (err) {
        console.error('登录异常:', err);
        return { success: false, error: err.message };
    }
}

// 获取统计数据
async function getStatistics() {
    try {
        // 获取总报名数
        const { count: total } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true });
        
        // 获取待处理报名数
        const { count: pending } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        // 获取已通过报名数
        const { count: approved } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved');
        
        // 获取已拒绝报名数
        const { count: rejected } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rejected');
        
        return {
            success: true,
            data: {
                total: total || 0,
                pending: pending || 0,
                approved: approved || 0,
                rejected: rejected || 0
            }
        };
    } catch (err) {
        console.error('获取统计数据异常:', err);
        return { success: false, error: err.message };
    }
}

// 导出函数到全局作用域
window.submitApplication = submitApplication;
window.getApplications = getApplications;
window.updateApplicationStatus = updateApplicationStatus;
window.adminLogin = adminLogin;
window.getStatistics = getStatistics; 