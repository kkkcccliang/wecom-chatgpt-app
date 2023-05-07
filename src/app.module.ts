import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { WecomModule } from './wecom/wecom.module'

@Module({
    imports: [WecomModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
