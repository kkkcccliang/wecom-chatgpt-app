import { Injectable, NestMiddleware } from '@nestjs/common'
import * as bodyParser from 'body-parser'

const bodyParserMiddleware = bodyParser.text({
    limit: '1024kb',
    type: 'text/xml',
})

@Injectable()
export class XmlMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        bodyParserMiddleware(req, res, next)
    }
}
