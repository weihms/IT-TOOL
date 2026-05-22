// 在文件顶部添加 dotenv 引用和正确的阿里云模块引用
require('dotenv').config();
const internalIp = require('internal-ip');
const cron = require('node-cron');
const axios = require('axios');
const OpenApi = require('@alicloud/openapi-client');

// 正确导入阿里云SDK - 使用解构赋值获取默认导出
const { default: Alidns20150109 } = require('@alicloud/alidns20150109');
const { default: Ecs20140526 } = require('@alicloud/ecs20140526');

// 配置参数
const config = {
    // 阿里云访问凭证
    alibabaCloudAccessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    alibabaCloudAccessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,

    // 域名配置
    domainName: process.env.DOMAIN_NAME,           // 主域名，例如：example.com
    lanSubDomain: process.env.LAN_SUBDOMAIN || 'lan',      // 局域网IP子域名，例如：lan.example.com
    wanSubDomain: process.env.WAN_SUBDOMAIN || 'wan',      // 公网IP子域名，例如：wan.example.com

    // ECS配置
    regionId: process.env.REGION_ID || 'cn-hangzhou',
    securityGroupId: process.env.SECURITY_GROUP_ID,  // 安全组ID

    // 更新频率（分钟）
    updateInterval: parseInt(process.env.UPDATE_INTERVAL) || 10,

    // 是否启用DNS更新
    enableDnsRecordUpdate: process.env.ENABLE_DNS_RECORD_UPDATE === 'true',
    // 是否启用安全组IP更新
    enableSecurityGroupUpdate: process.env.ENABLE_SECURITY_GROUP_UPDATE === 'true'
};

// 初始化阿里云DNS客户端 - 使用解构赋值获取的默认导出
function initDnsClient() {
    const configObj = new OpenApi.Config({
        accessKeyId: config.alibabaCloudAccessKeyId,
        accessKeySecret: config.alibabaCloudAccessKeySecret,
        endpoint: `alidns.cn-hangzhou.aliyuncs.com`
    });
    return new Alidns20150109(configObj);
}

// 初始化ECS客户端 - 使用解构赋值获取的默认导出
function initEcsClient() {
    const configObj = new OpenApi.Config({
        accessKeyId: config.alibabaCloudAccessKeyId,
        accessKeySecret: config.alibabaCloudAccessKeySecret,
        endpoint: `ecs.${config.regionId}.aliyuncs.com`
    });
    return new Ecs20140526(configObj);
}

// 获取公网IP
async function getPublicIp() {
    try {
        const response = await axios.get('https://httpbin.org/ip');
        return response.data.origin.split(',')[0].trim();
    } catch (error) {
        console.error('获取公网IP失败:', error.message);
        throw error;
    }
}

// 获取局域网IP
async function getLocalIp() {
    try {
        return await internalIp.v4();
    } catch (error) {
        console.error('获取局域网IP失败:', error.message);
        throw error;
    }
}

// 获取DNS记录
async function getDnsRecord(client, subDomain, recordType = 'A') {
    if (!config.domainName) {
        throw new Error('DOMAIN_NAME 环境变量未设置或为空');
    }

    const request = new (require('@alicloud/alidns20150109')).DescribeDomainRecordsRequest({
        domainName: config.domainName,
        rrKeyWord: subDomain,
        type: recordType
    });

    try {
        const runtime = {};
        const response = await client.describeDomainRecordsWithOptions(request, runtime);

        if (response.body && response.body.domainRecords && response.body.domainRecords.record) {
            let records = response.body.domainRecords.record;

            // 处理单个对象的情况（不是数组）
            if (!Array.isArray(records)) {
                records = [records];
            }

            // 查找精确匹配的记录（大小写不敏感的字段访问）
            const record = records.find(r => {
                const rr = r.RR || r.rr;
                return rr === subDomain;
            });

            if (record) {
                // 大小写不敏感地获取字段值
                const recordId = record.RecordId || record.recordId;
                const value = record.Value || record.value;
                const rr = record.RR || record.rr;

                console.log(`✓ 找到记录: ${rr}.${config.domainName} -> ${value} (RecordId: ${recordId})`);
                return recordId;
            } else {
                console.log(`✗ 未找到精确匹配的记录: ${subDomain}`);
            }
        } else {
            console.log(`✗ 未找到任何DNS记录`);
        }
        return null;
    } catch (error) {
        console.error(`获取DNS记录失败 (${subDomain}):`, error.message);
        return null;
    }
}

// 添加DNS记录
async function addDnsRecord(client, subDomain, ipValue, recordType = 'A') {
    if (!config.domainName) {
        throw new Error('DOMAIN_NAME 环境变量未设置或为空');
    }

    const request = new (require('@alicloud/alidns20150109')).AddDomainRecordRequest({
        domainName: config.domainName,
        RR: subDomain,
        type: recordType,
        value: ipValue,
        ttl: 600
    });

    try {
        const runtime = {};
        const response = await client.addDomainRecordWithOptions(request, runtime);

        // 大小写不敏感地获取recordId
        const recordId = response.body?.RecordId || response.body?.recordId;
        console.log(`✓ 已创建DNS记录: ${subDomain}.${config.domainName} -> ${ipValue} (RecordId: ${recordId})`);
        return recordId;
    } catch (error) {
        console.error(`创建DNS记录失败 (${subDomain}):`, error.message);
        throw error;
    }
}

// 删除DNS记录
async function deleteDnsRecord(client, recordId, subDomain) {
    const request = new (require('@alicloud/alidns20150109')).DeleteDomainRecordRequest({
        recordId: recordId
    });

    try {
        const runtime = {};
        await client.deleteDomainRecordWithOptions(request, runtime);
        console.log(`✓ 已删除DNS记录: ${subDomain}.${config.domainName} (RecordId: ${recordId})`);
        return true;
    } catch (error) {
        console.error(`删除DNS记录失败 (${subDomain}):`, error.message);
        throw error;
    }
}

// 智能更新DNS记录
async function updateDnsRecord(client, recordId, subDomain, ipValue, recordType = 'A') {
    try {
        // 第一步：查询当前DNS记录的IP值
        console.log(`正在查询当前DNS记录: ${subDomain}.${config.domainName}`);

        const request = new (require('@alicloud/alidns20150109')).DescribeDomainRecordInfoRequest({
            recordId: recordId
        });

        const runtime = {};
        const response = await client.describeDomainRecordInfoWithOptions(request, runtime);

        // 获取当前IP值（大小写不敏感）
        const currentIp = response.body?.Value || response.body?.value;
        console.log(`当前DNS记录IP: ${currentIp}, 目标IP: ${ipValue}`);

        // 如果IP相同，不需要更新
        if (currentIp === ipValue) {
            console.log(`✓ DNS记录IP未变化，无需更新: ${subDomain}.${config.domainName} -> ${ipValue}`);
            return recordId;
        }

        // IP不同，执行更新
        console.log(`检测到IP变化，开始更新DNS记录...`);

        // 第二步：删除旧记录
        console.log(`正在删除旧记录: ${subDomain}.${config.domainName}`);
        await deleteDnsRecord(client, recordId, subDomain);

        // 短暂等待，确保删除生效
        await new Promise(resolve => setTimeout(resolve, 500));

        // 第三步：添加新记录
        console.log(`正在添加新记录: ${subDomain}.${config.domainName} -> ${ipValue}`);
        const newRecordId = await addDnsRecord(client, subDomain, ipValue, recordType);

        console.log(`${subDomain}.${config.domainName} 的DNS记录已更新为 ${ipValue}`);
        return newRecordId;
    } catch (error) {
        console.error(`更新DNS记录失败 (${subDomain}):`, error.message);
        throw error;
    }
}

// 查找it-tool创建的安全组规则
async function findItToolSecurityGroupRule(ecsClient) {
    const request = new (require('@alicloud/ecs20140526')).DescribeSecurityGroupAttributeRequest({
        regionId: config.regionId,
        securityGroupId: config.securityGroupId
    });

    try {
        const runtime = {};
        const response = await ecsClient.describeSecurityGroupAttributeWithOptions(request, runtime);

        if (response.body && response.body.permissions && response.body.permissions.permission) {
            let permissions = response.body.permissions.permission;

            // 处理单个对象的情况
            if (!Array.isArray(permissions)) {
                permissions = [permissions];
            }

            // 查找描述为 "it-tool工具" 的规则
            const itToolRule = permissions.find(p => {
                const description = p.description || p.Description;
                return description === process.env.SECURITY_DESCRIPTION;
            });

            if (itToolRule) {
                console.log(`找到${process.env.SECURITY_DESCRIPTION}安全组规则: ${itToolRule.sourceCidrIp || itToolRule.SourceCidrIp}`);
                return itToolRule;
            }
        }
        return null;
    } catch (error) {
        console.error('查询安全组规则失败:', error.message);
        return null;
    }
}

// 智能更新安全组规则
async function updateSecurityGroupRule(ecsClient, ip) {
    // 第一步：查找现有的it-tool规则
    const existingRule = await findItToolSecurityGroupRule(ecsClient);

    if (existingRule) {
        // 获取现有规则的IP
        const existingIp = existingRule.sourceCidrIp || existingRule.SourceCidrIp;
        const existingIpWithoutMask = existingIp.split('/')[0];

        // 如果IP相同，不需要更新
        if (existingIpWithoutMask === ip) {
            console.log(`安全组规则IP未变化，无需更新: ${ip}/32`);
            return;
        }

        // IP不同，删除旧规则
        console.log(`检测到IP变化，删除旧规则: ${existingIp}`);
        await removeSecurityGroupRule(ecsClient, existingIpWithoutMask);
    }

    // 第二步：添加新规则（带描述信息）
    console.log(`添加新的安全组规则: ${ip}/32`);
    await addSecurityGroupRule(ecsClient, ip);
}

// 添加安全组规则（带描述信息）
async function addSecurityGroupRule(ecsClient, ip) {
    const request = new (require('@alicloud/ecs20140526')).AuthorizeSecurityGroupRequest({
        regionId: config.regionId,
        securityGroupId: config.securityGroupId,
        ipProtocol: 'TCP',
        portRange: '1/65535',
        sourceCidrIp: `${ip}/32`,
        policy: 'Accept',
        nicType: 'intranet',
        description: process.env.SECURITY_DESCRIPTION  // 添加描述信息
    });

    try {
        const runtime = {};
        const response = await ecsClient.authorizeSecurityGroupWithOptions(request, runtime);
        console.log(`✓ 已添加安全组规则: ${ip}/32 (描述: ${process.env.SECURITY_DESCRIPTION})`);
        return response;
    } catch (error) {
        console.error('添加安全组规则失败:', error.message);
        throw error;
    }
}

// 移除安全组规则
async function removeSecurityGroupRule(ecsClient, ip) {
    const request = new (require('@alicloud/ecs20140526')).RevokeSecurityGroupRequest({
        regionId: config.regionId,
        securityGroupId: config.securityGroupId,
        ipProtocol: 'TCP',
        portRange: '1/65535',
        sourceCidrIp: `${ip}/32`,
        policy: 'Accept',
        nicType: 'intranet'
    });

    try {
        const runtime = {};
        const response = await ecsClient.revokeSecurityGroupWithOptions(request, runtime);
        console.log(`✓ 已移除安全组规则: ${ip}/32`);
        return response;
    } catch (error) {
        // 忽略错误，因为可能是规则不存在
        console.warn(`移除安全组规则失败或规则不存在: ${ip}/32`);
    }
}

// 主更新函数
async function updateIps() {
    console.log('\n开始更新信息...');

    // 获取当前时间
    const now = new Date().toLocaleString('zh-CN');
    console.log(`更新时间: ${now}`);

    // 获取局域网IP
    const localIp = await getLocalIp();
    console.log(`当前局域网IP: ${localIp}`);

    // 获取公网IP
    const publicIp = await getPublicIp();
    console.log(`当前公网IP: ${publicIp}`);

    // 初始化客户端
    const dnsClient = initDnsClient();

    try {
        // 更新或创建局域网IP DNS记录
        if (config.enableDnsRecordUpdate && config.lanSubDomain) {
            const lanRecordId = await getDnsRecord(dnsClient, config.lanSubDomain);
            if (lanRecordId) {
                await updateDnsRecord(dnsClient, lanRecordId, config.lanSubDomain, localIp);
            } else {
                console.warn(`未找到局域网DNS记录，尝试创建: ${config.lanSubDomain}.${config.domainName}`);
                await addDnsRecord(dnsClient, config.lanSubDomain, localIp);
            }
        }
    } catch (error) {
        console.error('更新局域网IP信息时发生错误:', error.message);
    }
    try {
        // 更新或创建公网IP DNS记录
        if (config.enableDnsRecordUpdate && config.wanSubDomain) {
            const wanRecordId = await getDnsRecord(dnsClient, config.wanSubDomain);
            if (wanRecordId) {
                await updateDnsRecord(dnsClient, wanRecordId, config.wanSubDomain, publicIp);
            } else {
                console.warn(`未找到公网DNS记录，尝试创建: ${config.wanSubDomain}.${config.domainName}`);
                await addDnsRecord(dnsClient, config.wanSubDomain, publicIp);
            }
        }
    } catch (error) {
        console.error('更新公网IP信息时发生错误:', error.message);
    }

    try {
        // 如果启用了安全组更新，智能更新公网IP到安全组
        if (config.enableSecurityGroupUpdate && config.securityGroupId) {
            const ecsClient = await initEcsClient();
            await updateSecurityGroupRule(ecsClient, publicIp);
        }
    } catch (error) {
        console.error('更新安全组时发生错误:', error.message);
    }

    console.log('信息更新完成\n');
}

// 检查必要环境变量
function checkConfig() {
    const requiredVars = [
        'ALIBABA_CLOUD_ACCESS_KEY_ID',
        'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
        'DOMAIN_NAME',
        'SECURITY_GROUP_ID'
    ];

    const missing = [];
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        console.error('缺少必需的环境变量:', missing.join(', '));
        console.log('\n请在 .env 文件中配置以下变量:');
        console.log(`
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
DOMAIN_NAME=your_domain.com
LAN_SUBDOMAIN=lan
WAN_SUBDOMAIN=wan
SECURITY_GROUP_ID=sg-xxxxx
REGION_ID=cn-hangzhou
UPDATE_INTERVAL=5
ENABLE_SECURITY_GROUP_UPDATE=true
        `);
        process.exit(1);
    }
}

// 启动应用
async function startApp() {
    console.log('启动IT工具 - IP地址自动更新服务');

    // 检查配置
    checkConfig();

    // 立即执行一次
    await updateIps();

    // 设置定时任务
    console.log(`设置定时更新间隔: 每${config.updateInterval}分钟`);
    cron.schedule(`*/${config.updateInterval} * * * *`, async () => {
        await updateIps();
    });

    console.log('服务已启动，按 Ctrl+C 停止');
}

// 处理退出信号
process.on('SIGINT', () => {
    console.log('\n正在停止服务...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('收到终止信号，正在停止服务...');
    process.exit(0);
});

// 启动应用
startApp().catch(error => {
    console.error('应用启动失败:', error);
    process.exit(1);
});