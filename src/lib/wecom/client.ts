/**
 * 企业微信 API 客户端
 *
 * 支持发送应用消息到个人或群组
 */
import logger from '../logger'

// ==================== 类型定义 ====================

export interface WeComConfig {
  corpId: string
  corpSecret: string
  agentId: number
}

export interface SendMessageOptions {
  /** 接收人类型: userid 或 partyid 或 tagid */
  touser?: string
  toparty?: string
  totag?: string
  /** 消息类型 */
  msgtype: 'text' | 'markdown' | 'news'
  /** 应用 ID */
  agentid: number
  /** 消息内容 */
  content: string
}

export interface SendMessageResult {
  errcode: number
  errmsg: string
  invaliduser?: string
  invalidparty?: string
}

// ==================== 企微客户端 ====================

export class WeComClient {
  private config: WeComConfig | null = null
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  /**
   * 配置客户端
   */
  configure(config: WeComConfig): void {
    this.config = config
    logger.info('WeCom client configured', { corpId: config.corpId })
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.config !== null
  }

  /**
   * 获取 Access Token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('WeCom client not configured')
    }

    // 检查缓存
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    // 获取新 token
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.corpId}&corpsecret=${this.config.corpSecret}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.errcode !== 0) {
      throw new Error(`Failed to get WeCom access token: ${data.errmsg}`)
    }

    this.accessToken = data.access_token
    // 提前 5 分钟过期
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000

    return this.accessToken!
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(
    content: string,
    options: {
      touser?: string
      toparty?: string
      totag?: string
    } = {}
  ): Promise<SendMessageResult> {
    if (!this.config) {
      throw new Error('WeCom client not configured')
    }

    const token = await this.getAccessToken()
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`

    const body = {
      touser: options.touser || '@all',
      toparty: options.toparty,
      totag: options.totag,
      msgtype: 'text' as const,
      agentid: this.config.agentId,
      text: {
        content,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const result: SendMessageResult = await response.json()

    if (result.errcode !== 0) {
      logger.error('WeCom send message failed', undefined, {
        errcode: result.errcode,
        errmsg: result.errmsg,
      })
    }

    return result
  }

  /**
   * 发送 Markdown 消息（仅支持企业微信应用）
   */
  async sendMarkdownMessage(
    content: string,
    options: {
      touser?: string
      toparty?: string
      totag?: string
    } = {}
  ): Promise<SendMessageResult> {
    if (!this.config) {
      throw new Error('WeCom client not configured')
    }

    const token = await this.getAccessToken()
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`

    const body = {
      touser: options.touser || '@all',
      toparty: options.toparty,
      totag: options.totag,
      msgtype: 'markdown' as const,
      agentid: this.config.agentId,
      markdown: {
        content,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const result: SendMessageResult = await response.json()

    if (result.errcode !== 0) {
      logger.error('WeCom send markdown message failed', undefined, {
        errcode: result.errcode,
        errmsg: result.errmsg,
      })
    }

    return result
  }

  /**
   * 发送政策简报消息
   */
  async sendPolicyBriefMessage(
    brief: {
      title: string
      summary: string
      source: string
    },
    options: {
      touser?: string
      toparty?: string
    } = {}
  ): Promise<SendMessageResult> {
    const content = `**${brief.title}**

> 来源: ${brief.source}

${brief.summary}

---
*来自恒识 Evercog 政策情报系统*`

    return this.sendMarkdownMessage(content, options)
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      return true
    } catch (error) {
      logger.error('WeCom connection test failed', error as Error)
      return false
    }
  }
}

// ==================== 单例导出 ====================

let _wecomClient: WeComClient | null = null

export function getWeComClient(): WeComClient {
  if (!_wecomClient) {
    _wecomClient = new WeComClient()

    // 从环境变量配置
    const corpId = process.env.WECOM_CORP_ID
    const corpSecret = process.env.WECOM_CORP_SECRET
    const agentId = process.env.WECOM_AGENT_ID

    if (corpId && corpSecret && agentId) {
      _wecomClient.configure({
        corpId,
        corpSecret,
        agentId: parseInt(agentId, 10),
      })
    }
  }
  return _wecomClient
}
