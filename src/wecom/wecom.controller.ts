import { Controller, Get, Post, Res, Body, Query, Logger } from '@nestjs/common'
import { WecomService } from './wecom.service'
import { WX_CODE } from './constant'
import { chatgpt } from '../openai/openai'

@Controller('wecom')
export class WecomController {
    private readonly logger = new Logger(WecomController.name)
    private readonly token = 'your_token' // 企业微信后台配置的Token
    private readonly encodingAESKey = 'your_encoding_aes_key' // 企业微信后台配置的EncodingAESKey
    private readonly corpID = 'your_corp_id' // 企业微信CorpID
    private readonly chatGPTAPIKey = 'your_chatgpt_api_key' // ChatGPT API Key

    constructor(private readonly wecomService: WecomService) {}

    @Get()
    async handleGet(@Query() query: any) {
        const { msg_signature, timestamp, nonce, echostr } = query
        if (!(msg_signature && timestamp && nonce && echostr)) {
            this.logger.error('handleGet invalid request', msg_signature, timestamp, nonce, echostr)
            return 'Invalid request'
        }
        const { code, message } = this.wecomService.verifyUrl(msg_signature, timestamp, nonce, echostr)
        if (code !== WX_CODE.OK) {
            this.logger.error('Verify url fail', code)
        }
        return message
    }

    @Post()
    async handlePost(@Query() query: any, @Body() body: any, @Res() res: any) {
        const { msg_signature, timestamp, nonce } = query
        if (!(msg_signature && timestamp && nonce)) {
            this.logger.error('handlePost invalid request', msg_signature, timestamp, nonce)
            return 'Invalid request'
        }
        try {
            const wecomMessage = await this.wecomService.decryptMsg(body, msg_signature, timestamp, nonce)
            const user = wecomMessage.fromUsername
            const content = wecomMessage.content
            this.logger.debug('User', user, 'send', content)
            const reply = await chatgpt(user, content)
            this.logger.debug('GPT reply', reply)
            await this.wecomService.sendText(user, reply)
            res.send('OK')
        } catch (e) {
            this.logger.error('handlePost', e.message)
            return e.message
        }
    }
}
