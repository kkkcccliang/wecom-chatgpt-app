import { Controller, Get, Post, Res, Body, Query, Logger } from '@nestjs/common'
import { WecomService } from './wecom.service'
import { WX_CODE } from './constant'

@Controller('wecom')
export class WecomController {
    private readonly logger = new Logger(WecomController.name)

    constructor(private readonly wecomService: WecomService) {}

    @Get()
    async handleGet(@Query() query: any) {
        this.logger.debug('handleGet ' + query)
        const { msg_signature, timestamp, nonce, echostr } = query
        if (!(msg_signature && timestamp && nonce && echostr)) {
            this.logger.error(`handleGet invalid request: ${msg_signature}, ${timestamp}, ${nonce}, ${echostr}`)
            return 'Invalid request'
        }
        const { code, message } = this.wecomService.verifyUrl(msg_signature, timestamp, nonce, echostr)
        if (code !== WX_CODE.OK) {
            this.logger.error('Verify url fail:' + code)
        }
        return message
    }

    @Post()
    async handlePost(@Query() query: any, @Body() body: any, @Res() res: any) {
        this.logger.debug(`handlePost ${query} ${body}`)
        const { msg_signature, timestamp, nonce } = query
        if (!(msg_signature && timestamp && nonce)) {
            this.logger.error(`handleGet invalid request: ${msg_signature}, ${timestamp}, ${nonce}`)
            res.status(500).send('Invalid request')
            return
        }
        try {
            const wecomMessage = await this.wecomService.decryptMsg(body, msg_signature, timestamp, nonce)
            // 先回复微信，必须回复成功并且空字串。否则会重发消息
            res.send('')
            this.wecomService.messageHandler(wecomMessage.fromUsername, wecomMessage.content)
        } catch (e) {
            this.logger.error('handlePost' +  e.message)
            res.status(500).send(e.message)
        }
    }
}
