import { Component, AfterViewChecked, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
export class ThemeCustomizerComponent implements AfterViewChecked, OnDestroy {
    store: any;
    showCustomizer = false;

    // Chat properties
    chatMessages: ChatMessage[] = [];
    userInput = '';
    isLoading = false;
    currentSessionId: string = '';
    currentUserId: string = 'user123'; // 临时用户ID，实际应该从认证服务获取
    quickQuestions: string[] = [];

    @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef;
    private shouldScrollToBottom = false;
    private langChangeSubscription?: Subscription;

    constructor(
        public storeData: Store<any>,
        public router: Router,
        private http: HttpClient,
        private translate: TranslateService
    ) {
        this.initStore();
        this.initChat();
        this.initTranslations();
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    initTranslations() {
        // 监听语言变化
        this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
            this.updateQuickQuestions();
        });

        // 初始化快速问题
        this.updateQuickQuestions();
    }

    ngOnDestroy() {
        if (this.langChangeSubscription) {
            this.langChangeSubscription.unsubscribe();
        }
    }

    updateQuickQuestions() {
        this.quickQuestions = [
            this.translate.instant('aiAssistant.quickQuestion1'),
            this.translate.instant('aiAssistant.quickQuestion2'),
            this.translate.instant('aiAssistant.quickQuestion3'),
            this.translate.instant('aiAssistant.quickQuestion4')
        ];
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
                title: this.translate.instant('aiAssistant.tempSession'),
                createdAt: new Date(),
                lastActivityAt: new Date(),
                messageCount: 0
            };
        }
    }

    addWelcomeMessage() {
        this.chatMessages.push({
            content: this.translate.instant('aiAssistant.welcomeMessage'),
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
            let accumulatedContent = ''; // 累积完整的响应内容
            let visibleContent = ''; // 当前应该显示的内容
            let isInThinkTag = false; // 是否在<think>标签内
            let thinkStartIndex = -1; // <think>标签开始位置

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
                                    // 累积内容
                                    accumulatedContent += data.content;

                                    // 智能处理内容显示
                                    const { newVisibleContent, newIsInThinkTag, newThinkStartIndex } =
                                        this.processContentForDisplay(accumulatedContent, visibleContent, isInThinkTag, thinkStartIndex);

                                    // 更新状态
                                    isInThinkTag = newIsInThinkTag;
                                    thinkStartIndex = newThinkStartIndex;

                                    // 如果有新的可见内容，逐字符显示
                                    if (newVisibleContent !== visibleContent) {
                                        const newChars = newVisibleContent.substring(visibleContent.length);
                                        if (newChars) {
                                            await this.typeText(aiMessageIndex, newChars);
                                            visibleContent = newVisibleContent;
                                        }
                                    }
                                } else if (data.done) {
                                    this.isLoading = false;

                                    // 最终处理，确保显示所有非<think>标签的内容
                                    const finalVisibleContent = this.extractVisibleContent(accumulatedContent);
                                    if (finalVisibleContent !== visibleContent) {
                                        const remainingChars = finalVisibleContent.substring(visibleContent.length);
                                        if (remainingChars) {
                                            await this.typeText(aiMessageIndex, remainingChars);
                                        }
                                    }

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
            const partialContent = targetContent.substring(0, i + 1);
            // 每次更新后都过滤掉<think>标签，确保即使标签被分割也能正确过滤
            this.chatMessages[messageIndex].content = this.filterThinkTags(partialContent);
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

        let filteredContent = content;

        // 使用更精确的正则表达式来匹配<think>标签及其内容
        // 匹配 <think> 开始标签，然后是任意字符（包括换行符），直到 </think> 结束标签
        const thinkTagRegex = /<think[^>]*>[\s\S]*?<\/think>/gi;

        // 移除所有完整的<think>标签及其内容
        filteredContent = filteredContent.replace(thinkTagRegex, '');

        // 移除不完整的开始标签（开始标签但没有结束标签）
        filteredContent = filteredContent.replace(/<think[^>]*>[\s\S]*$/gi, '');

        // 移除不完整的结束标签（结束标签但没有开始标签）
        filteredContent = filteredContent.replace(/^[\s\S]*<\/think>/gi, '');

        // 移除任何残留的think标签（大小写变化）
        filteredContent = filteredContent.replace(/<think[^>]*>/gi, '');
        filteredContent = filteredContent.replace(/<\/think>/gi, '');

        // 清理多余的空行和空格
        filteredContent = filteredContent.replace(/\n\s*\n/g, '\n');
        filteredContent = filteredContent.replace(/^\s+|\s+$/g, '');

        return filteredContent;
    }

    /**
     * 智能处理内容显示，确保只有在<think>标签结束后才显示后续内容
     */
    private processContentForDisplay(
        accumulatedContent: string,
        currentVisibleContent: string,
        isInThinkTag: boolean,
        thinkStartIndex: number
    ): { newVisibleContent: string; newIsInThinkTag: boolean; newThinkStartIndex: number } {
        let newIsInThinkTag = isInThinkTag;
        let newThinkStartIndex = thinkStartIndex;
        let newVisibleContent = currentVisibleContent;

        // 检查是否有新的<think>标签开始
        if (!isInThinkTag) {
            const thinkStartMatch = accumulatedContent.match(/<think[^>]*>/i);
            if (thinkStartMatch) {
                newIsInThinkTag = true;
                newThinkStartIndex = thinkStartMatch.index!;
                // 只显示<think>标签之前的内容
                newVisibleContent = accumulatedContent.substring(0, newThinkStartIndex);
            } else {
                // 没有<think>标签，显示所有内容
                newVisibleContent = accumulatedContent;
            }
        } else {
            // 当前在<think>标签内，检查是否有结束标签
            const thinkEndMatch = accumulatedContent.substring(thinkStartIndex).match(/<\/think>/i);
            if (thinkEndMatch) {
                // <think>标签结束
                newIsInThinkTag = false;
                const thinkEndIndex = thinkStartIndex + thinkEndMatch.index! + thinkEndMatch[0].length;

                // 显示<think>标签之前的内容 + <think>标签之后的内容
                const beforeThink = accumulatedContent.substring(0, thinkStartIndex);
                const afterThink = accumulatedContent.substring(thinkEndIndex);
                newVisibleContent = beforeThink + afterThink;
            } else {
                // 仍在<think>标签内，只显示标签之前的内容
                newVisibleContent = accumulatedContent.substring(0, thinkStartIndex);
            }
        }

        return { newVisibleContent, newIsInThinkTag, newThinkStartIndex };
    }

    /**
     * 提取可见内容，移除所有<think>标签及其内容
     */
    private extractVisibleContent(content: string): string {
        return this.filterThinkTags(content);
    }

    /**
     * 测试filterThinkTags方法（可在控制台调用）
     */
    testFilterThinkTags() {
        const testCases = [
            '正常文本<think>思考内容</think>更多文本',
            '<think>只有思考内容</think>',
            '开始文本<think>思考内容',
            '结束文本</think>',
            '<THINK>大写标签</THINK>',
            '<Think>混合大小写</think>',
            '文本1<think>思考1</think>文本2<think>思考2</think>文本3',
            '<think>多行\n思考\n内容</think>',
            '<think>包含特殊字符的思考内容：!@#$%^&*()</think>',
            '混合内容<think>思考</think>和<think>更多思考</think>',
            '<think>只有开始标签',
            '只有结束标签</think>',
            '<think>空标签</think>',
            '正常文本，没有标签'
        ];

        console.log('=== 测试 filterThinkTags 方法 ===');
        testCases.forEach((testCase, index) => {
            const filtered = this.filterThinkTags(testCase);
            console.log(`测试 ${index + 1}:`);
            console.log(`  原始: "${testCase}"`);
            console.log(`  过滤后: "${filtered}"`);
            console.log(`  是否包含<think>: ${/<think/i.test(filtered)}`);
            console.log(`  是否包含</think>: ${/<\/think>/i.test(filtered)}`);
            console.log('---');
        });
    }

    private addErrorMessage() {
        this.chatMessages.push({
            content: this.translate.instant('aiAssistant.errorMessage'),
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
                content: this.filterThinkTags(msg.content),
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

    /**
     * 测试智能内容处理功能（可在控制台调用）
     */
    testSmartContentProcessing() {
        console.log('=== 测试智能内容处理功能 ===');

        // 模拟流式响应的累积过程
        const testScenarios = [
            {
                name: '简单<think>标签',
                steps: [
                    'Hello',
                    ' <think>',
                    '思考内容',
                    '</think>',
                    ' World!'
                ]
            },
            {
                name: '嵌套<think>标签',
                steps: [
                    '开始',
                    ' <think>',
                    '思考1',
                    ' <think>',
                    '思考2',
                    '</think>',
                    '继续思考1',
                    '</think>',
                    ' 结束'
                ]
            },
            {
                name: '不完整的<think>标签',
                steps: [
                    '正常文本',
                    ' <think>',
                    '思考内容',
                    ' 更多思考'
                ]
            }
        ];

        testScenarios.forEach((scenario, scenarioIndex) => {
            console.log(`\n--- 测试场景 ${scenarioIndex + 1}: ${scenario.name} ---`);

            let accumulatedContent = '';
            let visibleContent = '';
            let isInThinkTag = false;
            let thinkStartIndex = -1;

            scenario.steps.forEach((step, stepIndex) => {
                accumulatedContent += step;

                const result = this.processContentForDisplay(
                    accumulatedContent,
                    visibleContent,
                    isInThinkTag,
                    thinkStartIndex
                );

                isInThinkTag = result.newIsInThinkTag;
                thinkStartIndex = result.newThinkStartIndex;
                visibleContent = result.newVisibleContent;

                console.log(`步骤 ${stepIndex + 1}: "${step}"`);
                console.log(`  累积内容: "${accumulatedContent}"`);
                console.log(`  可见内容: "${visibleContent}"`);
                console.log(`  在<think>标签内: ${isInThinkTag}`);
                console.log(`  <think>开始位置: ${thinkStartIndex}`);
                console.log('  ---');
            });
        });
    }
}
