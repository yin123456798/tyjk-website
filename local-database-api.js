// 本地数据库API - 替代Supabase功能
// 使用 SQLite 或 MySQL

class LocalDatabaseAPI {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    // 初始化数据库连接
    async init(databaseType = 'sqlite', config = {}) {
        try {
            if (databaseType === 'sqlite') {
                // SQLite 配置
                const sqlite3 = require('sqlite3').verbose();
                const path = require('path');
                
                const dbPath = config.dbPath || path.join(__dirname, 'tyjk_club.db');
                this.db = new sqlite3.Database(dbPath);
                
                console.log('SQLite数据库连接成功:', dbPath);
            } else if (databaseType === 'mysql') {
                // MySQL 配置
                const mysql = require('mysql2/promise');
                
                this.db = await mysql.createConnection({
                    host: config.host || 'localhost',
                    user: config.user || 'root',
                    password: config.password || '',
                    database: config.database || 'tyjk_club'
                });
                
                console.log('MySQL数据库连接成功');
            }
            
            this.isConnected = true;
            return { success: true };
        } catch (error) {
            console.error('数据库连接失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 用户认证相关方法
    async signUp(email, password, userData = {}) {
        try {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const query = `
                INSERT INTO users (email, password_hash, name, role) 
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await this.executeQuery(query, [
                email, 
                hashedPassword, 
                userData.name || email, 
                userData.role || 'user'
            ]);
            
            if (result.success) {
                // 创建用户档案
                await this.createUserProfile(result.data.insertId, userData);
                return { success: true, user: { id: result.data.insertId, email } };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const bcrypt = require('bcrypt');
            
            const query = 'SELECT * FROM users WHERE email = ?';
            const result = await this.executeQuery(query, [email]);
            
            if (!result.success || !result.data.length) {
                return { success: false, error: '用户不存在' };
            }
            
            const user = result.data[0];
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                return { success: false, error: '密码错误' };
            }
            
            return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUser(userId) {
        try {
            const query = `
                SELECT u.*, up.* 
                FROM users u 
                LEFT JOIN user_profiles up ON u.id = up.user_id 
                WHERE u.id = ?
            `;
            
            const result = await this.executeQuery(query, [userId]);
            
            if (result.success && result.data.length > 0) {
                return { success: true, user: result.data[0] };
            }
            
            return { success: false, error: '用户不存在' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 报名管理
    async submitApplication(applicationData) {
        try {
            const query = `
                INSERT INTO applications (
                    name, student_id, major, email, phone, department, 
                    skills, experience, motivation, photo_url, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await this.executeQuery(query, [
                applicationData.name,
                applicationData.student_id,
                applicationData.major,
                applicationData.email,
                applicationData.phone,
                applicationData.department,
                applicationData.skills,
                applicationData.experience,
                applicationData.motivation,
                applicationData.photo_url || '',
                'pending'
            ]);
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getApplications(status = null) {
        try {
            let query = 'SELECT * FROM applications ORDER BY created_at DESC';
            let params = [];
            
            if (status) {
                query = 'SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC';
                params = [status];
            }
            
            return await this.executeQuery(query, params);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateApplicationStatus(id, status) {
        try {
            const query = 'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            return await this.executeQuery(query, [status, id]);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 项目管理
    async createProject(projectData) {
        try {
            const query = `
                INSERT INTO projects (
                    name, description, category, image_url, doc_url, 
                    ppt_url, other_attachment_url, owner_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await this.executeQuery(query, [
                projectData.name,
                projectData.description,
                projectData.category,
                projectData.image_url,
                projectData.doc_url,
                projectData.ppt_url,
                projectData.other_attachment_url,
                projectData.owner_id
            ]);
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getProjects(userId = null) {
        try {
            let query = 'SELECT * FROM projects ORDER BY created_at DESC';
            let params = [];
            
            if (userId) {
                query = 'SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC';
                params = [userId];
            }
            
            return await this.executeQuery(query, params);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 文件上传（本地存储）
    async uploadFile(file, folder = 'uploads') {
        try {
            const fs = require('fs');
            const path = require('path');
            const crypto = require('crypto');
            
            // 创建上传目录
            const uploadDir = path.join(__dirname, 'uploads', folder);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 生成唯一文件名
            const timestamp = Date.now();
            const random = crypto.randomBytes(8).toString('hex');
            const extension = path.extname(file.name);
            const fileName = `${timestamp}_${random}${extension}`;
            const filePath = path.join(uploadDir, fileName);
            
            // 保存文件
            await fs.promises.writeFile(filePath, file.data);
            
            // 返回相对路径
            const relativePath = `/uploads/${folder}/${fileName}`;
            
            return {
                success: true,
                url: relativePath,
                path: relativePath,
                fileName: fileName
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 统计信息
    async getStatistics() {
        try {
            const stats = {};
            
            // 总报名数
            const totalResult = await this.executeQuery('SELECT COUNT(*) as count FROM applications');
            stats.total = totalResult.success ? totalResult.data[0].count : 0;
            
            // 待处理报名数
            const pendingResult = await this.executeQuery('SELECT COUNT(*) as count FROM applications WHERE status = "pending"');
            stats.pending = pendingResult.success ? pendingResult.data[0].count : 0;
            
            // 已通过报名数
            const approvedResult = await this.executeQuery('SELECT COUNT(*) as count FROM applications WHERE status = "approved"');
            stats.approved = approvedResult.success ? approvedResult.data[0].count : 0;
            
            // 已拒绝报名数
            const rejectedResult = await this.executeQuery('SELECT COUNT(*) as count FROM applications WHERE status = "rejected"');
            stats.rejected = rejectedResult.success ? rejectedResult.data[0].count : 0;
            
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 辅助方法
    async createUserProfile(userId, userData) {
        try {
            const query = `
                INSERT INTO user_profiles (
                    user_id, name, student_id, major, grade, email, 
                    phone, birthday, qq, bio, avatar_url, role, introduction
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            return await this.executeQuery(query, [
                userId,
                userData.name,
                userData.student_id,
                userData.major,
                userData.grade,
                userData.email,
                userData.phone,
                userData.birthday,
                userData.qq,
                userData.bio,
                userData.avatar_url,
                userData.role || 'user',
                userData.introduction
            ]);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeQuery(query, params = []) {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve({ success: false, error: '数据库未连接' });
                return;
            }
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('查询执行失败:', err);
                    resolve({ success: false, error: err.message });
                } else {
                    resolve({ success: true, data: rows });
                }
            });
        });
    }

    // 关闭数据库连接
    async close() {
        if (this.db) {
            await this.db.close();
            this.isConnected = false;
            console.log('数据库连接已关闭');
        }
    }
}

// 创建全局实例
const localDB = new LocalDatabaseAPI();

// 导出
module.exports = localDB; 