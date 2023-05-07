import { Controller, Get, Post, Res, Body, Param, Logger } from '@nestjs/common'
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
    async handleGet(
        @Param('msg_signature') sig: string,
        @Param('timestamp') timestamp: string,
        @Param('nonce') nonce: string,
        @Param('echostr') echostr: string,
    ) {
        if (!(sig && timestamp && nonce && echostr)) {
            this.logger.error('handleGet invalid request', sig, timestamp, nonce, echostr)
            return 'Invalid request'
        }
        const { code, message } = this.wecomService.verifyUrl(sig, timestamp, nonce, echostr)
        if (code !== WX_CODE.OK) {
            this.logger.error('Verify url fail', code)
        }
        return message
    }

    @Post()
    async handlePost(
        @Param('msg_signature') sig: string,
        @Param('timestamp') timestamp: string,
        @Param('nonce') nonce: string,
        @Body() body: any,
        @Res() res: any
    ) {
        if (!(sig && timestamp && nonce)) {
            this.logger.error('handlePost invalid request', sig, timestamp, nonce)
            return 'Invalid request'
        }
        try {
            const wecomMessage = await this.wecomService.decryptMsg(body, sig, timestamp, nonce)
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
