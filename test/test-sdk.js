// 测试脚本 - 验证SDK方法是否正确
require('dotenv').config();
const OpenApi = require('@alicloud/openapi-client');
const { default: Alidns20150109 } = require('@alicloud/alidns20150109');
const { default: Ecs20140526 } = require('@alicloud/ecs20140526');

console.log('=== 测试阿里云SDK方法 ===\n');

// 测试DNS客户端
console.log('1. 测试DNS客户端...');
try {
    const dnsConfig = new OpenApi.Config({
        accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || 'test',
        accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || 'test',
        endpoint: 'alidns.cn-hangzhou.aliyuncs.com'
    });
    const dnsClient = new Alidns20150109(dnsConfig);
    
    // 检查方法是否存在
    console.log('   - describeDomainRecordsWithOptions:', typeof dnsClient.describeDomainRecordsWithOptions);
    console.log('   - updateDomainRecordWithOptions:', typeof dnsClient.updateDomainRecordWithOptions);
    
 // 测试脚本 - 验证SDK方法是否正确
require('dotenv').confirrequire('dotenv').config();
const OpenApi = Reconst OpenApi = require('@sRconst { default: Alidns20150109 } = require('@alicl dconst { default: Ecs20140526 } = require('@alicloud/ecs20140526')A'
    }
console.log('=== 测试阿里云SDK方法 ===\n');

// 测?:', ty
// 测试DNS客户端
console.log('1. 测试DNS?Dconsole.log('1. 测??try {
    const dnsConfig = new OpenApi.e    ('        accessKeyId: process.env.ALIBABAror        accessKeySecret: process.env.ALIB
console.log('2. 测试ECS客?       endpoint: 'alidns.cn-hangzhou.aliyuncs.com'
   ig({
        accessKeyId:    });
    const dnsClient = new Alidns20150109(d,
    co      
    // 检查方法是否存在
    console.loEY   CR    console.log('   - describe:     console.log('   - updateDomainRecordWithOptions:', typeof dnsClient.updateDomainRecordWithOptions);
    ??    
 // 测试脚本 - 验证SDK方法是否正确
require('dotenv').confirrequire('dotenv').config()ec //tyrequire('dotenv').confirrequire('dotenv').conkeconst OpenApi = Reconst OpenApi = require('@sRconseS    }
console.log('=== 测试阿里云SDK方法 ===\n');

// 测?:', ty
// 测试DNS客户端
console.log('1. 测试DNS?Dconsole.log('1. 测??try {
  uest;
    coconsau
// 测?:', ty
// 测试DNS客户端
console.lo   // 测试DNS?cconsole.log('1. 测?s    const dnsConfig = new OpenApi.e    ('        access  console.log('2. 测试ECS客?       endpoint: 'alidns.cn-hangzhou.aliyuncs.com'
   ig({
        accessKeyId:    });
    co);   ig({
        accessKeyId:    });
    const dnsClient = new Alidns201 authReques      da    const dnsClient = new Se    co      
    // 检查方法licloud/ecs2    // 检?v    console.loEY   CR    consoon    ??    
 // 测试脚本 - 验证SDK方法是否正确
require('dotenv').confirrequire('dotenv').config()ec //tyrequire('dotenv').confirrequire('dotenv' p // 测?'require('dotenv').confirrequire('dotenv').con',console.log('=== 测试阿里云SDK方法 ===\n');

// 测?:', ty
// 测试DNS客户端
console.log('1. 测试DNS?Dconsole.log('1. 测??try {
  uest;
    cco
// 测?:', ty
// 测试DNS客户端
console.lo;
}// 测试DNS?{console.log('1. 测?   uest;
    coconsau
// 测???:', error.message, '\n');    cons// 测?:'= // 测试DNS?=c);
