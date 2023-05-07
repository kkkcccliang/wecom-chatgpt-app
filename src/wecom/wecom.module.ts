import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { WecomService } from './wecom.service'
import { WecomController } from './wecom.controller'
import { XmlMiddleware } from '../middleware/xml.middleware'

@Module({
    imports: [],
    controllers: [WecomController],
    providers: [WecomService],
})
export class WecomModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(XmlMiddleware).forRoutes({
            path: 'wecom',
            method: RequestMethod.POST,
        })
    }
}
