import * as dotenv from 'dotenv'
dotenv.config()

const env = process.env

export const config = {
    openaiApiUrl: env.OPENAI_API_URL,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || 'gpt-3.5-turbo',
    openaiTemperature: env.OPENAI_TEMPERATURE ? parseFloat(env.OPENAI_TEMPERATURE) : 0.6,
    wecomCorpId: env.WECOM_CORP_ID,
    wecomToken: env.WECOM_TOKEN,
    wecomEncodingAesKey: env.WECOM_ENCODING_AES_KEY,
    wecomAgentId: env.WECOM_AGENT_ID,
    wecomAgentSecret: env.WECOM_AGENT_SECRET,
}