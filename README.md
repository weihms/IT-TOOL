# IT-TOOL 工具 - 自动更新IP地址到阿里云

在家庭宽带场景下，本工具可自动检测您设备的本机局域网IP和公网IP，并定时更新到阿里云DNS记录中，同时将公网IP添加到指定的安全组规则中，减少阿里云服务器端口开放范围，提高网络安全性。

尝试为每台设备分配私有域名，开放云服务器安全组网络策略，将多台开发设备: Mac mini, MacBook Pro, Windows等协同运行，实现局域网IP和公网IP的动态更新，回家轻松继续当牛马。 

## 功能特性

- ✅ 自动获取本机局域网IP地址
- ✅ 自动获取公网IP地址
- ✅ 定时更新局域网IP到指定DNS记录
- ✅ 定时更新公网IP到指定DNS记录
- ✅ 可选：将公网IP添加到阿里云安全组规则
- ✅ 支持自定义更新频率

## 安装步骤

### 1. 环境要求

- Node.js >= 14.x
- npm 或 yarn

### 2. 安装依赖

```bash
npm install --registry=http://registry.npmmirror.com
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env` 并填入正确的值：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的阿里云访问凭证和域名配置。

### 4. 阿里云配置准备

#### 创建访问密钥
1. 登录 [阿里云控制台](https://home.console.aliyun.com/)
2. 访问 [访问控制台](https://ram.console.aliyun.com/manage/ak)
3. 创建 AccessKey 并填入 `.env` 文件

#### 准备域名信息
1. 在阿里云DNS解析中确保拥有目标域名的管理权限
2. 确认域名已添加到DNS解析列表中

#### 准备安全组信息（如果需要更新安全组）
1. 获取需要更新的安全组ID
2. 确保账户有安全组管理权限

## 使用方法

### 开发模式运行
```bash
npm run dev
```

### 生产模式运行
```bash
npm start
```

## 配置说明

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| ALIBABA_CLOUD_ACCESS_KEY_ID | 阿里云访问密钥ID | - |
| ALIBABA_CLOUD_ACCESS_KEY_SECRET | 阿里云访问密钥Secret | - |
| DOMAIN_NAME | 主域名 | - |
| LAN_SUBDOMAIN | 局域网IP子域名 | lan |
| WAN_SUBDOMAIN | 公网IP子域名 | wan |
| SECURITY_GROUP_ID | 安全组ID | - |
| REGION_ID | 地域ID | cn-hangzhou |
| SECURITY_DESCRIPTION | 安全组描述 |  description |
| UPDATE_INTERVAL | 更新间隔（分钟） | 10 |
| ENABLE_DNS_RECORD_UPDATE | 是否启用DNS记录更新 | true |
| ENABLE_SECURITY_GROUP_UPDATE | 是否启用安全组IP更新 | true |

## 注意事项

1. 请确保您的阿里云访问密钥具有DNS管理和ECS安全组管理权限
2. 首次运行前，请在阿里云DNS控制台添加对应的子域名记录
3. 安全组更新功能会先删除旧的对应IP规则，再添加新的规则
4. 建议将更新频率设置为10分钟以上，避免请求过于频繁

## 权限策略

### 最小权限原则

本工具遵循最小权限原则，仅需要以下7个API权限：

#### DNS相关权限（4个）
- `alidns:DescribeDomainRecords` - 查询域名解析记录列表
- `alidns:DescribeDomainRecordInfo` - 查询单个解析记录的详细信息
- `alidns:AddDomainRecord` - 添加域名解析记录
- `alidns:DeleteDomainRecord` - 删除域名解析记录

#### ECS相关权限（3个）
- `ecs:DescribeSecurityGroupAttribute` - 查询安全组属性
- `ecs:AuthorizeSecurityGroup` - 授权安全组规则
- `ecs:RevokeSecurityGroup` - 撤销安全组规则

### RAM权限策略配置

#### 方案一：精确资源限制（推荐）

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "alidns:DescribeDomainRecords",
        "alidns:DescribeDomainRecordInfo",
        "alidns:AddDomainRecord",
        "alidns:DeleteDomainRecord"
      ],
      "Resource": [
        "acs:alidns:*:*:domain/您的域名"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeSecurityGroupAttribute",
        "ecs:AuthorizeSecurityGroup",
        "ecs:RevokeSecurityGroup"
      ],
      "Resource": [
        "acs:ecs:区域ID:账号ID:securitygroup/安全组ID"
      ]
    }
  ]
}
```

**替换说明**：
- `您的域名` - 例如：`example‌.com.cn`
- `区域ID` - 例如：`cn-hangzhou`
- `账号ID` - 您的阿里云账号ID
- `安全组ID` - 例如：`sg-xxxxx`

#### 方案二：通配符资源（简化版）

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "alidns:DescribeDomainRecords",
        "alidns:DescribeDomainRecordInfo",
        "alidns:AddDomainRecord",
        "alidns:DeleteDomainRecord",
        "ecs:DescribeSecurityGroupAttribute",
        "ecs:AuthorizeSecurityGroup",
        "ecs:RevokeSecurityGroup"
      ],
      "Resource": "*"
    }
  ]
}
```

### 配置步骤

1. **登录RAM控制台**
   - 访问 [RAM控制台](https://ram.console.aliyun.com/)

2. **创建自定义策略**
   - 进入"权限管理" > "权限策略" > "创建权限策略"
   - 选择"脚本编辑"模式
   - 粘贴上述JSON策略
   - 命名策略，如：`IT-Tool-Minimal-Policy`

3. **授予权限给用户**
   - 进入"身份管理" > "用户"
   - 找到您的AccessKey对应的用户
   - 点击"添加权限"
   - 选择刚创建的自定义策略

### 权限对比

| 权限类型 | 权限数量 | 安全性 | 推荐场景 |
|---------|---------|--------|---------|
| **最小权限** | 7个API | ⭐⭐⭐⭐⭐ | 生产环境（推荐） |
| AliyunDNSFullAccess + AliyunECSFullAccess | 所有API | ⭐⭐ | 测试环境 |

### 安全建议

✅ **推荐使用最小权限策略** - 仅授予必需的7个API权限  
✅ **限制Resource范围** - 指定具体的域名和安全组  
❌ **避免使用FullAccess** - 不要授予完整的DNS或ECS管理权限  
❌ **定期审查权限** - 定期检查并清理不再需要的权限  

## 贡献

欢迎提交 Issue 和 Pull Request。