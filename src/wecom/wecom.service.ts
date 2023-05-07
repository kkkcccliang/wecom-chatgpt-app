import { Injectable, Logger } from '@nestjs/common'
import { getSignature, encrypt, decrypt } from '@wecom/crypto'
import { parseString } from 'xml2js'
import axios, { AxiosResponse } from 'axios'
import { WX_CODE } from './constant'
import { config } from '../config'

const wecomCgi = axios.create({
    baseURL: 'https://qyapi.weixin.qq.com/cgi-bin/',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
})

export enum WecomMesageType {
    TEXT = 'text',
    IMAGE = 'image',
    VOICE = 'voice',
    VIDEO = 'video',
    LOCATION = 'location',
    LINK = 'link',
}

export interface WecomMessage {
    fromUsername: string
    corpId: string
    createTime: number
    messageType: WecomMesageType
    content: string
    messageId: string
    agentId: string
}

/**
 * 生成企微xml消息格式
 * @param encryptedMsg
 * @param signature
 * @param nonce
 * @param timestamp
 * @returns {string}
 */
const generate = (encryptedMsg: string, signature: string, nonce: string, timestamp: string): string => {
    return [
        '<xml>',
        `<Encrypt><![CDATA[${encryptedMsg}]]></Encrypt>`,
        `<MsgSignature><![CDATA[${signature}]]></MsgSignature>`,
        `<TimeStamp>${timestamp}</TimeStamp>`,
        `<Nonce><![CDATA[${nonce}]]></Nonce>`,
        '</xml>',
    ].join()
}

/**
 * 提取企微xml数据包中的加密消息
 * @param postData
 * @returns {Promise}
 */
const extraceData = (postData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        parseString(postData, { explicitArray: false, ignoreAttrs: true }, (e, result) => {
            if (e) {
                reject(e)
            }
            resolve(result.xml.Encrypt)
        })
    })
}

const extraceMessage = (xmlString: string): Promise<WecomMessage> => {
    return new Promise((resolve, reject) => {
        parseString(xmlString, { explicitArray: false, ignoreAttrs: true }, (e, result) => {
            if (e) {
                reject(e)
            }
            const o = result.xml
            resolve({
                fromUsername: o.FromUserName,
                corpId: o.ToUserName,
                createTime: o.CreateTime,
                messageType: o.MsgType,
                content: o.Content,
                messageId: o.MsgId,
                agentId: o.AgentID,
            })
        })
    })
}

@Injectable()
export class WecomService {
    private readonly logger = new Logger(WecomService.name);
    private readonly token = config.wecomToken // 企业微信管理后台的 token
    private readonly encodingAESKey = config.wecomEncodingAesKey // 企业微信管理后台的 EncodingAESKey
    private readonly corpId = config.wecomCorpId // 企业微信管理后台的 corpId
    private readonly agentId = config.wecomAgentId
    private readonly agentSecret = config.wecomAgentSecret
    private lastTokenTime = 0

    constructor() {
        if (this.encodingAESKey.length !== 43) {
            throw new Error('Length of encodingAESKey must be 43')
        }
    }

    public verifyUrl(msgSignature: string, timestamp: string, nonce: string, encryptedStr: string): { code: number; message: string } {
        const sig = getSignature(this.token, timestamp, nonce, encryptedStr)
        if (msgSignature !== sig) {
            return { code: WX_CODE.VALIDATE_SIGNATURE_ERROR, message: null }
        }
        const { message, id } = decrypt(this.encodingAESKey, encryptedStr)
        if (id !== this.corpId) {
            return { code: WX_CODE.VALIDATE_CORPID_ERROR, message: null }
        }
        return { code: WX_CODE.OK, message }
    }

    /**
     * 将消息以企微的格式加密, 用于构建被动回复消息响应
     * https://developer.work.weixin.qq.com/document/path/90241
     * @param message
     * @param timestamp 时间戳，可以自己生成，也可以用URL参数的timestamp
     * @param nonce 随机串，可以自己生成，也可以用URL参数的nonce
     * @returns {string} xml string
     */
    encryptMsg(message: string, timestamp?: string, nonce?: string): string {
        const encryptedMsg = encrypt(this.encodingAESKey, message, this.corpId)
        if (timestamp === null) {
            timestamp = Math.round(Date.now() / 1000).toString()
        }
        const sign = getSignature(this.token, timestamp, nonce, encryptedMsg)
        return generate(encryptedMsg, sign, timestamp, nonce)
    }

    /**
     * 解密企微消息格式
     * https://developer.work.weixin.qq.com/document/path/90239
     * <xml>
     *   <ToUserName><![CDATA[toUser]]></ToUserName>
     *   <AgentID><![CDATA[toAgentID]]></AgentID>
     *   <Encrypt><![CDATA[msg_encrypt]]></Encrypt>
     * </xml>
     * 其中 Encrypt 的内容也是 xml 格式
     * <xml>
     *   <ToUserName><![CDATA[toUser]]></ToUserName>
     *   <FromUserName><![CDATA[fromUser]]></FromUserName>
     *   <CreateTime>1348831860</CreateTime>
     *   <MsgType><![CDATA[text]]></MsgType>
     *   <Content><![CDATA[this is a test]]></Content>
     *   <MsgId>1234567890123456</MsgId>
     *   <AgentID>1</AgentID>
     * </xml>
     * @param postData 密文，对应POST请求的数据
     * @param signature 对应URL参数的msg_signature
     * @param timestamp 时间戳，对应URL参数的timestamp
     * @param nonce 随机串，对应URL参数的nonce
     * @returns {Promise<WecomMessage>}
     */
    async decryptMsg(postData: any, signature: string, timestamp: string, nonce: string): Promise<WecomMessage> {
        const encryptedStr = await extraceData(postData)
        const sign = getSignature(this.token, timestamp, nonce, encryptedStr)
        if (sign != signature) {
            throw new Error('Signature invalid')
        }
        const { message, id } = decrypt(this.encodingAESKey, encryptedStr)
        if (this.corpId !== id) {
            throw new Error('CorpId not match')
        }
        return await extraceMessage(message)
    }

    async getAccessToken() {
        const nowInSecond = Math.ceil(Date.now() / 1000)
        let accessToken: string
        // Check if token is outdated
        if (nowInSecond > this.lastTokenTime) {
            const res = await wecomCgi.get(`gettoken?corpid=${this.corpId}&corpsecret=${this.agentSecret}`)
            this.logger.debug('getAccessToken', res)
            accessToken = res.data.access_token
            this.lastTokenTime = nowInSecond + 7000
        }
        return accessToken
    }

    async sendText(toUser: string, message: string) {
        // https://developer.work.weixin.qq.com/document/path/90236
        const maxLength = 1000 // TODO 最长为2048字节，需要计算
        let offset = 0
        let res: AxiosResponse<any, any>
        while (offset < message.length) {
            res = await this.send({
                touser: toUser,
                msgtype: 'text',
                agentid: this.agentId,
                text: {
                    content: message.substring(offset, offset + maxLength)
                }
            })
            offset += maxLength
        }
        return res
    }

    async send(data: any) {
        const accessToken = await this.getAccessToken()
        const res = await wecomCgi.post(`message/send?access_token=${accessToken}`, data)
        this.logger.debug('send', data, res)
        return res
    }
}
