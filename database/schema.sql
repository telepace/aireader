-- ================================================
-- AIReader Database Schema
-- ================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 用户表（增强版，支持匿名和认证用户）
-- ================================================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    provider TEXT CHECK (provider IN ('github', 'google', 'anonymous')),
    provider_id TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_token UUID UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_anonymous_token ON users(anonymous_token);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_is_anonymous ON users(is_anonymous);

-- ================================================
-- 提示测试表
-- ================================================
DROP TABLE IF EXISTS prompt_tests CASCADE;
CREATE TABLE prompt_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prompt_object TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    prompt_result TEXT,
    model_name TEXT NOT NULL,
    response_time_ms INTEGER,
    token_count INTEGER,
    cost_estimate NUMERIC(10,4),
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提示测试表索引
CREATE INDEX idx_prompt_tests_user_id ON prompt_tests(user_id);
CREATE INDEX idx_prompt_tests_created_at ON prompt_tests(created_at DESC);
CREATE INDEX idx_prompt_tests_model_name ON prompt_tests(model_name);
CREATE INDEX idx_prompt_tests_is_favorite ON prompt_tests(is_favorite);

-- ================================================
-- 对话表
-- ================================================
DROP TABLE IF EXISTS conversations CASCADE;
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    model_name TEXT,
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 对话表索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ================================================
-- 消息表
-- ================================================
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 消息表索引
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_role ON messages(role);

-- ================================================
-- 对话选项表（用于深化对话）
-- ================================================
DROP TABLE IF EXISTS conversation_options CASCADE;
CREATE TABLE conversation_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('deepen', 'next')),
    content TEXT NOT NULL,
    description TEXT,
    click_count INTEGER DEFAULT 0,
    last_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 对话选项表索引
CREATE INDEX idx_conversation_options_conversation_id ON conversation_options(conversation_id);
CREATE INDEX idx_conversation_options_type ON conversation_options(type);
CREATE INDEX idx_conversation_options_last_message_id ON conversation_options(last_message_id);

-- ================================================
-- 更新触发器函数
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_tests_updated_at 
    BEFORE UPDATE ON prompt_tests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Row Level Security (RLS) 策略
-- ================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_options ENABLE ROW LEVEL SECURITY;

-- 用户表 RLS 策略
CREATE POLICY "Users can view own profile" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 允许匿名用户创建和访问自己的记录
CREATE POLICY "Anonymous users can create records" ON users
    FOR INSERT WITH CHECK (is_anonymous = TRUE);

CREATE POLICY "Anonymous users can view own records" ON users
    FOR SELECT USING (is_anonymous = TRUE AND anonymous_token IS NOT NULL);

-- 提示测试表 RLS 策略
CREATE POLICY "Users can access own prompt tests" ON prompt_tests 
    FOR ALL USING (auth.uid() = user_id);

-- 对话表 RLS 策略  
CREATE POLICY "Users can access own conversations" ON conversations 
    FOR ALL USING (auth.uid() = user_id);

-- 消息表 RLS 策略
CREATE POLICY "Users can access own messages" ON messages 
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM conversations WHERE id = conversation_id
        )
    );

-- 对话选项表 RLS 策略
CREATE POLICY "Users can access own conversation options" ON conversation_options 
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM conversations WHERE id = conversation_id
        )
    );

-- ================================================
-- 实用函数
-- ================================================

-- 创建匿名用户函数
CREATE OR REPLACE FUNCTION create_anonymous_user()
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    anonymous_token UUID;
BEGIN
    -- 生成匿名令牌
    anonymous_token := gen_random_uuid();
    
    -- 创建匿名用户
    INSERT INTO users (is_anonymous, anonymous_token, provider)
    VALUES (TRUE, anonymous_token, 'anonymous')
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 升级匿名用户为正式用户函数
CREATE OR REPLACE FUNCTION upgrade_anonymous_user(
    user_id UUID,
    user_email TEXT,
    user_display_name TEXT,
    user_avatar_url TEXT,
    user_provider TEXT,
    user_provider_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        email = user_email,
        display_name = user_display_name,
        avatar_url = user_avatar_url,
        provider = user_provider,
        provider_id = user_provider_id,
        is_anonymous = FALSE,
        updated_at = NOW()
    WHERE id = user_id AND is_anonymous = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 示例数据（开发环境用）
-- ================================================
-- 注意：生产环境请删除此部分

-- 创建一个测试匿名用户
-- INSERT INTO users (email, display_name, is_anonymous, anonymous_token, provider) 
-- VALUES (NULL, NULL, TRUE, gen_random_uuid(), 'anonymous');