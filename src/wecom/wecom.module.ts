import { Module } from '@nestjs/common'
import { WecomService } from './wecom.service'
import { WecomController } from './wecom.controller'

@Module({
    imports: [],
    controllers: [WecomController],
    providers: [WecomService],
})
export class WecomModule {}
