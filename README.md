# wecom-chatgpt-app

企业微信自建对话应用对接 ChatGPT

## features
- Chat 支持上下文
- 自定义 Prompt
- 支持 Dalle 生成图片
- 发送 /help 查看帮助

## 需要准备
- OpenAI 账号和 apiKey
- 企业微信账号
- OpenAI 接口代理（若部署在可访问 openai 的云服务上可不需要）

## 部署
- `git clone https://github.com/liangjingzhan/wecom-chatgpt-app.git && cd wecom-chatgpt-app`
- `cp .env.example .env`
- 修改相应的环境变量（企业微信的环境变量见下文）
- `docker-compose up -d`

## 企微配置
- 登录企微管理后台，[“应用管理-应用-自建-创建应用”](https://work.weixin.qq.com/wework_admin/frame#apps)
- 创建完成后进入应用管理页（以下信息在此页面获取）
- WECOM_AGENT_ID：即创建应用的 AgentId
- WECOM_AGENT_SECRET：点击创建的应用，获取 Secret
- 点击“设置API接收”配置接收消息服务器，设置和获取以下参数
    - URL 为 wecom-chatgpt-app 部署后的接口地址，例如 `http://x.x.x.x:3000/wecom`
    - Token 和 EncodingAESKey 分别对应 WECOM_TOKEN 和 WECOM_ENCODING_AES_KEY，点击“随机获取”即可
- 点击“企业可信IP”配置可信服务器 ip，即 wecom-chatgpt-app 部署后的 ip