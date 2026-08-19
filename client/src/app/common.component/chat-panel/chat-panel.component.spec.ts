import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  ArrowDownOutline,
  CloseOutline,
  DeleteOutline,
  DownOutline,
  LoadingOutline,
  PauseCircleOutline,
  RadarChartOutline,
  SendOutline,
  ThunderboltOutline,
} from '@ant-design/icons-angular/icons';
import { ChatApi, ChatSessionSummary, QueryStreamOptions, AnalysisPayload } from '../../services/apis/chat';
import { StorageService } from '../../services/storage.service';
import { ChatPanelComponent } from './chat-panel.component';

/**
 * M2 步骤 10 单测：前端 localStorage 历史迁移到服务端会话。
 * 覆盖：服务端会话加载 / localStorage 回退 / 发送时自动创建会话 /
 * 创建失败回退 / 清空删除会话 / 模式切换加载对应会话 / 会话失效自动重建。
 */
describe('ChatPanelComponent（M2 步骤 10：服务端会话 + localStorage 回退）', () => {
  let component: ChatPanelComponent;
  let fixture: ComponentFixture<ChatPanelComponent>;
  let chatApi: jasmine.SpyObj<ChatApi>;
  let msg: jasmine.SpyObj<NzMessageService>;
  let storage: { token: string | null };
  let analyzeCancel: jasmine.Spy;

  const WELCOME = '你好！我是防汛智策助手，有什么可以帮助你的吗？';
  const HISTORY_KEY = 'cocc-chat-history-anonymous-chat'; // token 为空 → anonymous
  const AGENT_HISTORY_KEY = 'cocc-chat-history-anonymous-agent';
  const LEGACY_HISTORY_KEY = 'cocc-chat-history-anonymous';
  interface CapturedCallbacks {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (err: Error) => void;
    onStatus?: (status: string) => void;
    onAnalysis?: (data: AnalysisPayload) => void;
    onThinking?: (thinking: string) => void;
    onUsage?: (data: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  }
  const streamCallbacks: {
    chat?: CapturedCallbacks;
    agent?: CapturedCallbacks;
    analyze?: CapturedCallbacks;
  } = {};

  const sessionSummary = (id: string, type: 'chat' | 'agent' = 'chat'): ChatSessionSummary => ({
    id,
    type,
    from: 'cocc',
    title: '测试会话',
    messageCount: 2,
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
  });

  beforeEach(async () => {
    chatApi = jasmine.createSpyObj<ChatApi>('ChatApi', [
      'createSession',
      'listSessions',
      'getSession',
      'deleteSession',
      'queryStream',
      'queryAgentStream',
      'analyzeStream',
    ]);
    msg = jasmine.createSpyObj<NzMessageService>('NzMessageService', ['warning', 'error']);
    analyzeCancel = jasmine.createSpy('analyzeCancel');
    storage = { token: null };
    // 默认：无服务端会话；发送即捕获回调并返回取消函数
    chatApi.listSessions.and.returnValue(Promise.resolve([]));
    chatApi.createSession.and.resolveTo({
      _id: 's-new',
      type: 'chat',
      title: '',
      messages: [],
      createdAt: '',
      updatedAt: '',
    });
    chatApi.deleteSession.and.resolveTo({ code: 0 });
    chatApi.queryStream.and.callFake((_q: string, cb: CapturedCallbacks) => {
      streamCallbacks.chat = cb;
      return () => {};
    });
    chatApi.queryAgentStream.and.callFake((_q: string, cb: CapturedCallbacks) => {
      streamCallbacks.agent = cb;
      return () => {};
    });
    chatApi.analyzeStream.and.callFake((_dto: unknown, cb: CapturedCallbacks) => {
      streamCallbacks.analyze = cb;
      return analyzeCancel;
    });

    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ChatPanelComponent],
      providers: [
        { provide: ChatApi, useValue: chatApi },
        { provide: NzMessageService, useValue: msg },
        { provide: StorageService, useValue: storage },
        provideMarkdown(),
        // 模板中 nz-icon 用到的 outline 图标需静态注册，避免动态加载失败影响测试
        {
          provide: NZ_ICONS,
          useValue: [
            ArrowDownOutline,
            CloseOutline,
            DeleteOutline,
            DownOutline,
            LoadingOutline,
            PauseCircleOutline,
            RadarChartOutline,
            SendOutline,
            ThunderboltOutline,
          ],
        },
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('服务端无会话 → 只显示欢迎语，且不建立会话', fakeAsync(() => {
    flushMicrotasks();
    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].content).toBe(WELCOME);
    expect(chatApi.createSession).not.toHaveBeenCalled();
  }));

  it('服务端有最新会话 → 欢迎语 + 服务端历史', fakeAsync(() => {
    chatApi.listSessions.and.returnValue(Promise.resolve([sessionSummary('s1')]));
    chatApi.getSession.and.resolveTo({
      _id: 's1',
      type: 'chat',
      title: '旧会话',
      messages: [
        { role: 'user', content: '老问题' },
        { role: 'assistant', content: '老回答' },
      ],
      createdAt: '',
      updatedAt: '',
    });
    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    expect(chatApi.listSessions).toHaveBeenCalledWith('chat', 'cocc');
    expect(chatApi.getSession).toHaveBeenCalledWith('s1');
    expect(component.messages().length).toBe(3);
    expect(component.messages()[0].content).toBe(WELCOME);
    expect(component.messages()[1]).toEqual({
      role: 'user',
      content: '老问题',
    });
    expect(component.messages()[2]).toEqual({
      role: 'assistant',
      content: '老回答',
    });
  }));

  it('服务端不可用 → 回退读取 localStorage 历史', fakeAsync(() => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([
        { role: 'user', content: '本地问题' },
        { role: 'assistant', content: '本地回答' },
      ]),
    );
    chatApi.listSessions.and.returnValue(Promise.reject(new Error('network down')));
    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    expect(component.messages().length).toBe(2);
    expect(component.messages()[0].content).toBe('本地问题');
    expect(component.messages()[1].content).toBe('本地回答');
  }));

  it('发送时无服务端会话 → 自动创建会话并以 sessionId 发送（不回传 history）', fakeAsync(() => {
    component.inputText = '你好';
    component.onSend();
    flushMicrotasks();

    expect(chatApi.createSession).toHaveBeenCalledWith('chat', [], 'cocc');
    const options = chatApi.queryStream.calls.mostRecent().args[2] as QueryStreamOptions;
    expect(options?.sessionId).toBe('s-new');
    expect(options?.history).toBeUndefined();
  }));

  it('会话创建失败 → 回退回传 history + 本地保存 + 提示', fakeAsync(() => {
    chatApi.createSession.and.returnValue(Promise.reject(new Error('mongo down')));
    component.inputText = '你好';
    component.onSend();
    flushMicrotasks();

    expect(msg.warning).toHaveBeenCalledWith('会话创建失败，本轮对话仅保存在本地');
    const options = chatApi.queryStream.calls.mostRecent().args[2] as QueryStreamOptions;
    expect(options?.sessionId).toBeUndefined();
    expect(Array.isArray(options?.history)).toBeTrue();

    // 流式输出一个 token 后结束 → localStorage 双写镜像
    streamCallbacks.chat?.onToken('本地回答');
    streamCallbacks.chat?.onComplete();
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    // 保存内容 = 欢迎语 + 一问一答（与原版 saveHistory 行为一致）
    expect(saved.length).toBe(3);
    expect(saved[1].role).toBe('user');
    expect(saved[2].role).toBe('assistant');
    expect(saved[2].content).toBe('本地回答');
  }));

  it('服务端模式流结束 → localStorage 仍镜像（双写回退保障）', fakeAsync(() => {
    component.inputText = '你好';
    component.onSend();
    flushMicrotasks();
    streamCallbacks.chat?.onToken('服务端回答');
    streamCallbacks.chat?.onComplete();

    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    // 服务端会话模式同样镜像：欢迎语 + 一问一答
    expect(saved.length).toBe(3);
    expect(saved[1].role).toBe('user');
    expect(saved[2].role).toBe('assistant');
  }));

  it('清空对话 → 删除服务端会话 + 清空本地历史 + 欢迎语', fakeAsync(() => {
    chatApi.deleteSession.and.resolveTo({ code: 0 });
    component.inputText = '你好';
    component.onSend();
    flushMicrotasks();
    streamCallbacks.chat?.onComplete();

    component.onClear();
    flushMicrotasks();

    expect(chatApi.deleteSession).toHaveBeenCalledWith('s-new');
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].content).toBe(WELCOME);

    // 清空后再次发送 → 重新创建会话
    component.inputText = '又一句';
    component.onSend();
    flushMicrotasks();
    expect(chatApi.createSession.calls.count()).toBe(2);
  }));

  it('切换智能模式 → 加载 agent 类型的最新会话', fakeAsync(() => {
    // chat 类型为空，agent 类型有一个会话
    chatApi.listSessions.and.callFake((type?: 'chat' | 'agent') =>
      Promise.resolve(type === 'agent' ? [sessionSummary('a1', 'agent')] : []),
    );
    chatApi.getSession.and.resolveTo({
      _id: 'a1',
      type: 'agent',
      title: 'agent 会话',
      messages: [{ role: 'user', content: 'agent 老问题' }],
      createdAt: '',
      updatedAt: '',
    });
    component.toggleAgentMode();
    flushMicrotasks();

    expect(component.agentMode()).toBeTrue();
    expect(chatApi.listSessions).toHaveBeenCalledWith('agent', 'cocc');
    expect(component.messages()[1]).toEqual({
      role: 'user',
      content: 'agent 老问题',
    });
  }));

  it('服务端会话不存在错误 → 置空会话，下次发送自动重建', fakeAsync(() => {
    component.inputText = '第一句';
    component.onSend();
    flushMicrotasks();

    streamCallbacks.chat?.onError(new Error('会话不存在'));
    flushMicrotasks();

    component.inputText = '第二句';
    component.onSend();
    flushMicrotasks();
    expect(chatApi.createSession.calls.count()).toBe(2);
  }));

  it('restores the saved Agent mode and loads its cocc session on startup', fakeAsync(() => {
    flushMicrotasks();
    localStorage.setItem('cocc-agent-mode', 'agent');
    chatApi.listSessions.calls.reset();
    chatApi.listSessions.and.returnValue(Promise.resolve([]));

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    expect(component.agentMode()).toBeTrue();
    expect(chatApi.listSessions).toHaveBeenCalledOnceWith('agent', 'cocc');
  }));

  it('migrates the legacy shared local history into the first server session', fakeAsync(() => {
    flushMicrotasks();
    localStorage.setItem(
      LEGACY_HISTORY_KEY,
      JSON.stringify([
        { role: 'assistant', content: WELCOME },
        { role: 'user', content: '旧问题' },
        { role: 'assistant', content: '旧回答' },
      ]),
    );
    chatApi.createSession.calls.reset();

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();
    expect(component.messages().map(message => message.content)).toContain('旧问题');

    component.inputText = '新问题';
    component.onSend();
    flushMicrotasks();

    expect(chatApi.createSession).toHaveBeenCalledWith(
      'chat',
      [
        { role: 'user', content: '旧问题' },
        { role: 'assistant', content: '旧回答' },
      ],
      'cocc',
    );
    expect(localStorage.getItem(LEGACY_HISTORY_KEY)).toBeNull();
  }));

  it('uses the JWT id claim for user-specific local history', fakeAsync(() => {
    flushMicrotasks();
    storage.token = `header.${btoa(JSON.stringify({ id: 'user-42' }))}.signature`;
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify([{ role: 'user', content: '用户 42 的历史' }]));

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    expect(component.messages()[0].content).toBe('用户 42 的历史');
    expect(localStorage.getItem('cocc-chat-history-user-42-chat')).toContain('用户 42 的历史');
    expect(localStorage.getItem(LEGACY_HISTORY_KEY)).toBeNull();
  }));

  it('does not start a stream when the user stops while session creation is pending', fakeAsync(() => {
    flushMicrotasks();
    let resolveCreate!: (session: any) => void;
    chatApi.createSession.and.returnValue(new Promise(resolve => (resolveCreate = resolve)));

    component.inputText = '稍后发送';
    component.onSend();
    component.onStop();
    resolveCreate({ _id: 'late-session' });
    flushMicrotasks();

    expect(chatApi.queryStream).not.toHaveBeenCalled();
    expect(chatApi.deleteSession).toHaveBeenCalledWith('late-session');
    expect(component.loading).toBeFalse();
  }));

  it('keeps chat and Agent fallback histories in separate keys', fakeAsync(() => {
    flushMicrotasks();
    component.inputText = '普通聊天';
    component.onSend();
    flushMicrotasks();
    streamCallbacks.chat?.onToken('普通回答');
    streamCallbacks.chat?.onComplete();

    component.toggleAgentMode();
    flushMicrotasks();
    expect(component.messages()).toEqual([{ role: 'assistant', content: WELCOME }]);

    component.inputText = 'Agent 问题';
    component.onSend();
    flushMicrotasks();
    streamCallbacks.agent?.onToken('Agent 回答');
    streamCallbacks.agent?.onComplete();

    expect(localStorage.getItem(HISTORY_KEY)).toContain('普通回答');
    expect(localStorage.getItem(AGENT_HISTORY_KEY)).toContain('Agent 回答');
  }));

  it('does not let a late startup response overwrite a message being sent', fakeAsync(() => {
    flushMicrotasks();
    let resolveList!: (sessions: ChatSessionSummary[]) => void;
    chatApi.listSessions.and.returnValue(new Promise(resolve => (resolveList = resolve)));

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.inputText = '立即发送';
    component.onSend();
    resolveList([]);
    flushMicrotasks();

    expect(component.messages().some(message => message.content === '立即发送')).toBeTrue();
    expect(chatApi.queryStream).toHaveBeenCalled();
  }));

  it('clears the session id captured by a failed stream, not the newly selected mode', fakeAsync(() => {
    flushMicrotasks();
    component.inputText = '普通问题';
    component.onSend();
    flushMicrotasks();
    (component as any).agentSessionId = 'agent-session';

    component.agentMode.set(true);
    streamCallbacks.chat?.onError(new Error('会话不存在'));

    expect((component as any).chatSessionId).toBeNull();
    expect((component as any).agentSessionId).toBe('agent-session');
  }));

  it('一键研判：调 analyzeStream；analysis 事件渲染研判卡片，token 追加报告，完成收尾', fakeAsync(() => {
    flushMicrotasks();
    component.onAnalyze();
    expect(chatApi.analyzeStream).toHaveBeenCalled();
    expect(component.loading).toBeTrue();

    // analysis 事件 → 卡片数据写入消息
    const payload: AnalysisPayload = {
      affectedLines: [
        { line: '16号线', period: '09-14 04:00 ~ 09-15 04:00', riskLevel: '最高空间风险：高（12级风圈）' },
        { line: '1号线', period: '09-14 06:00 ~ 09-15 05:00', riskLevel: '可能受影响（仅7级风圈）' },
      ],
      levelSuggestion: null,
      similarCases: [{ caseId: 'x', caseName: '2022梅花', score: 1 }],
    };
    streamCallbacks.analyze?.onAnalysis?.(payload);
    fixture.detectChanges();

    const assistant = component.messages().find(m => m.role === 'assistant' && m.analysis);
    const lines = assistant?.analysis?.affectedLines ?? [];
    expect(lines.length).toBe(2);
    expect(lines[0].riskLevel).toContain('高');

    // token 流式追加 + 完成
    streamCallbacks.analyze?.onToken('研判报告文字');
    streamCallbacks.analyze?.onComplete();
    flushMicrotasks();
    expect(component.loading).toBeFalse();
    const done = component.messages().find(m => m.role === 'assistant' && m.analysis);
    expect(done?.content).toContain('研判报告文字');
    expect(done?.streaming).toBeFalse();
  }));

  it('一键研判失败 → error 文案写入消息并复位 loading', fakeAsync(() => {
    flushMicrotasks();
    component.onAnalyze();
    streamCallbacks.analyze?.onError(new Error('未找到当前台风'));
    flushMicrotasks();
    expect(component.loading).toBeFalse();
    expect(component.messages().some(m => m.content.includes('请求失败: 未找到当前台风'))).toBeTrue();
  }));
  it('renders conservative analysis details and persists the card', fakeAsync(() => {
    flushMicrotasks();
    component.onAnalyze();
    streamCallbacks.analyze?.onAnalysis?.({
      affectedLines: [
        { line: '16号线', period: '09-14', riskLevel: '最高空间风险：高（12级风圈）' },
        { line: '1号线', period: '09-15', riskLevel: '可能受影响（仅7级风圈）' },
      ],
      similarCases: [{ caseId: 'x', caseName: '梅花', score: 0.51, reason: '路径平均距离接近' }],
      levelSuggestion: null,
    });
    streamCallbacks.analyze?.onThinking?.('模型思考');
    streamCallbacks.analyze?.onUsage?.({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
    fixture.detectChanges();

    const cardText = fixture.nativeElement.querySelector('.analysis-card')?.textContent || '';
    expect(cardText).toContain('不代表运营风险或停运结论');
    expect(cardText).toContain('51%');
    expect(cardText).toContain('路径平均距离接近');
    expect(cardText).toContain('待结合预案条款与现场数据确认');
    expect(fixture.nativeElement.querySelector('.risk-high')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.risk-low')).not.toBeNull();

    streamCallbacks.analyze?.onComplete();
    const done = component.messages().find(m => m.role === 'assistant' && m.analysis);
    expect(done?.thinking).toContain('模型思考');
    expect(done?.usage?.total_tokens).toBe(15);
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as Array<{ analysis?: AnalysisPayload }>;
    expect(saved.some(message => message.analysis?.affectedLines?.[0].line === '16号线')).toBeTrue();
  }));

  it('does not present missing analysis data as confirmed no impact', fakeAsync(() => {
    flushMicrotasks();
    component.onAnalyze();
    streamCallbacks.analyze?.onAnalysis?.({
      affectedLines: [],
      similarCases: [],
      levelSuggestion: null,
    });
    fixture.detectChanges();

    const cardText = fixture.nativeElement.querySelector('.analysis-card')?.textContent || '';
    expect(cardText).toContain('不能据此断言线路不受影响');
    expect(cardText).toContain('暂无可参考的相似案例');
    expect(cardText).toContain('待结合预案条款与现场数据确认');
  }));

  it('cancels analysis and ignores callbacks from the stopped stream', fakeAsync(() => {
    flushMicrotasks();
    component.onAnalyze();
    const stale = streamCallbacks.analyze!;

    component.onStop();
    expect(analyzeCancel).toHaveBeenCalledTimes(1);
    stale.onAnalysis?.({ affectedLines: [{ line: '旧线路' }] });
    stale.onToken('旧流文本');
    stale.onError(new Error('旧流错误'));
    stale.onComplete();

    expect(component.messages().some(message => message.analysis?.affectedLines?.[0].line === '旧线路')).toBeFalse();
    expect(component.messages().some(message => message.content.includes('旧流文本'))).toBeFalse();
    expect(msg.error).not.toHaveBeenCalledWith('研判失败: 旧流错误');
  }));
});
