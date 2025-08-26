import { Component, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ChatMessage {
    content: string;
    isUser: boolean;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: Date;
    lastActivityAt: Date;
    messageCount: number;
}

@Component({
    selector: 'setting',
    templateUrl: './theme-customizer.html',
})
export class ThemeCustomizerComponent implements AfterViewChecked {
    store: any;
    showCustomizer = false;

    // Chat properties
    chatMessages: ChatMessage[] = [];
    userInput = '';
    isLoading = false;
    currentSessionId: string = '';
    currentUserId: string = 'user123'; // 临时用户ID，实际应该从认证服务获取
    quickQuestions = [
        '如何配置防火墙规则？',
        '解释一下网络协议分析',
        '威胁检测的最佳实践',
        '系统日志分析方法'
    ];

    @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef;
    private shouldScrollToBottom = false;

    constructor(
        public storeData: Store<any>,
        public router: Router,
        private http: HttpClient
    ) {
        this.initStore();
        this.initChat();
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    reloadRoute() {
        window.location.reload();
        this.showCustomizer = true;
    }

    // Chat methods
    async initChat() {
        try {
            // 创建新会话
            const session = await this.createNewSession();
            this.currentSessionId = session.id;
            this.addWelcomeMessage();
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.addWelcomeMessage();
        }
    }

    async createNewSession(): Promise<ChatSession> {
        try {
            const response = await this.http.post(`${environment.apiUrl}/chat/session/create?userId=${this.currentUserId}`, {}).toPromise();
            return response as ChatSession;
        } catch (error) {
            console.error('Failed to create session:', error);
            // 如果创建失败，使用临时会话ID
            this.currentSessionId = 'temp-session-' + Date.now();
            return {
                id: this.currentSessionId,
                title: '临时会话',
                createdAt: new Date(),
                lastActivityAt: new Date(),
                messageCount: 0
            };
        }
    }

    addWelcomeMessage() {
        this.chatMessages.push({
            content: '你好！我是AI助手，有什么可以帮助你的吗？',
            isUser: false,
            timestamp: new Date()
        });
        this.shouldScrollToBottom = true;
    }

    async sendMessage() {
        if (!this.userInput.trim() || this.isLoading) return;

        const userMessage = this.userInput.trim();
        this.chatMessages.push({
            content: userMessage,
            isUser: true,
            timestamp: new Date()
        });

        this.userInput = '';
        this.isLoading = true;
        this.shouldScrollToBottom = true;

        try {
            // 调用新的聊天API
            await this.callChatApi(userMessage);
        } catch (error) {
            console.error('Chat API error:', error);
            this.addErrorMessage();
        }
    }

    sendQuickQuestion(question: string) {
        this.userInput = question;
        this.sendMessage();
    }

    private async callChatApi(message: string) {
        try {
            const chatRequest = {
                message: message,
                sessionId: this.currentSessionId,
                userId: this.currentUserId
            };

            // 使用流式API
            await this.callChatApiStream(chatRequest);
        } catch (error) {
            this.isLoading = false;
            this.addErrorMessage();
            console.error('Chat API call failed:', error);
        }
    }

    private async callChatApiStream(chatRequest: any) {
        try {
            // 创建AI消息占位符
            const aiMessageIndex = this.chatMessages.length;
            this.chatMessages.push({
                content: '',
                isUser: false,
                timestamp: new Date()
            });
            this.shouldScrollToBottom = true;

            // 使用fetch进行流式请求
            const response = await fetch(`${environment.apiUrl}/chat/send/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chatRequest)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留最后一个不完整的行

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.content) {
                                    // 逐字符显示效果
                                    await this.typeText(aiMessageIndex, data.content);
                                } else if (data.done) {
                                    this.isLoading = false;
                                    break;
                                } else if (data.error) {
                                    this.chatMessages[aiMessageIndex].content = `错误: ${data.error}`;
                                    this.isLoading = false;
                                    break;
                                }
                            } catch (e) {
                                console.warn('Failed to parse stream data:', line);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            this.isLoading = false;
            this.addErrorMessage();
            console.error('Streaming chat API call failed:', error);
        }
    }

    /**
     * 打字机效果：逐字符显示文字
     */
    private async typeText(messageIndex: number, newText: string): Promise<void> {
        const currentContent = this.chatMessages[messageIndex].content;
        const targetContent = currentContent + newText;

        // 逐字符添加到消息内容
        for (let i = currentContent.length; i < targetContent.length; i++) {
            this.chatMessages[messageIndex].content = targetContent.substring(0, i + 1);
            this.shouldScrollToBottom = true;

            // 控制打字速度（毫秒）
            await this.delay(30);
        }
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 过滤掉AI响应中的<think>标签及其包含的所有内容
     */
    private filterThinkTags(content: string): string {
        if (!content) {
            return content;
        }
        // 移除<think>标签及其包含的所有内容
        return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    private addErrorMessage() {
        this.chatMessages.push({
            content: '抱歉，服务暂时不可用，请稍后再试。',
            isUser: false,
            timestamp: new Date()
        });
        this.shouldScrollToBottom = true;
    }

    // 获取聊天历史
    async loadChatHistory() {
        if (!this.currentSessionId) return;

        try {
            const response = await this.http.get(`${environment.apiUrl}/chat/history/${this.currentSessionId}`).toPromise();
            const history = Array.isArray(response) ? response : [];
            this.chatMessages = history.map((msg: any) => ({
                content: msg.content,
                isUser: msg.isUser,
                timestamp: new Date(msg.timestamp)
            }));
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    // 获取用户会话列表
    async loadUserSessions() {
        try {
            const response = await this.http.get(`${environment.apiUrl}/chat/sessions/${this.currentUserId}`).toPromise();
            const sessions = Array.isArray(response) ? response : [];
            console.log('User sessions:', sessions);
        } catch (error) {
            console.error('Failed to load user sessions:', error);
        }
    }

    // 获取聊天分析
    async getChatAnalytics() {
        try {
            const analytics = await this.http.get(`${environment.apiUrl}/chat/analytics/${this.currentUserId}`).toPromise();
            console.log('Chat analytics:', analytics);
        } catch (error) {
            console.error('Failed to get chat analytics:', error);
        }
    }

    ngAfterViewChecked() {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    /**
     * 自动滚动到聊天容器底部
     */
    private scrollToBottom(): void {
        try {
            if (this.chatContainer && this.chatContainer.nativeElement) {
                const element = this.chatContainer.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        } catch (error) {
            console.error('Failed to scroll to bottom:', error);
        }
    }
}
