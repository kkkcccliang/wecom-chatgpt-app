import { Controller, Get, Post, Res, Body, Query, Logger } from '@nestjs/common'
import { WecomService } from './wecom.service'
import { WX_CODE } from './constant'
import { chatgpt } from '../openai/openai'

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
            res.send({ status: 500, message: 'Invalid request' })
            return
        }
        try {
            const wecomMessage = await this.wecomService.decryptMsg(body, msg_signature, timestamp, nonce)
            const user = wecomMessage.fromUsername
            const content = wecomMessage.content
            this.logger.debug(`User ${user} send ${content}`)
            const reply = await chatgpt(user, content)
            this.logger.debug(`GPT reply ${reply}`)
            await this.wecomService.sendText(user, reply)
            res.send({ status: 200, message: 'OK' })
        } catch (e) {
            this.logger.error('handlePost' +  e.message)
            res.send({ status: 500, message: e.message })
        }
    }
}
