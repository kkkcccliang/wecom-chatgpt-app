import { Configuration, CreateImageRequestResponseFormatEnum, CreateImageRequestSizeEnum, OpenAIApi } from 'openai'
import fs from 'fs'
import chatCache from './cache'
import { config } from '../config'

const configuration = new Configuration({
    apiKey: config.openaiApiKey,
    basePath: config.openaiApiUrl,
})
const openai = new OpenAIApi(configuration)

/**
 * Get completion from OpenAI
 * @param username
 * @param message
 */
async function chatgpt(username: string, message: string): Promise<string> {
    const messages = chatCache.addUserMessage(username, message)
    const response = await openai.createChatCompletion({
        model: config.openaiModel,
        messages: messages,
        temperature: config.openaiTemperature,
    })
    let assistantMessage = ''
    try {
        if (response.status === 200) {
            assistantMessage = response.data.choices[0].message?.content.replace(/^\n+|\n+$/g, '') as string
        } else {
            const err = `Something went wrong, status: ${response.status}, ${response.statusText}`
            console.error(err)
            throw new Error(err)
        }
    } catch (e: any) {
        if (e.request) {
            assistantMessage = '请求出错'
            console.error(assistantMessage)
        }
    }
    return assistantMessage
}

/**
 * Get image from Dall·E
 * @param username
 * @param prompt
 */
async function dalle(username: string, prompt: string) {
    const response = await openai
        .createImage({
            prompt: prompt,
            n: 1,
            size: CreateImageRequestSizeEnum._256x256,
            response_format: CreateImageRequestResponseFormatEnum.Url,
            user: username,
        })
        .then(res => res.data)
        .catch(err => console.log(err))
    if (response) {
        return response.data[0].url
    } else {
        return 'Generate image failed'
    }
}

/**
 * Speech to text
 * @param username
 * @param videoPath
 */
async function whisper(username: string, videoPath: string): Promise<string> {
    const file: any = fs.createReadStream(videoPath)
    const response = await openai
        .createTranscription(file, 'whisper-1')
        .then(res => res.data)
        .catch(err => console.log(err))
    if (response) {
        return response.text
    } else {
        return 'Speech to text failed'
    }
}

export { chatgpt, dalle, whisper }
