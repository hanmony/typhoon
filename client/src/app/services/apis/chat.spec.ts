import { ChatApi } from './chat';

describe('ChatApi session endpoints', () => {
  let http: {
    postSilent: jasmine.Spy;
    getSilent: jasmine.Spy;
    deleteSilent: jasmine.Spy;
  };
  let api: ChatApi;

  beforeEach(() => {
    http = {
      postSilent: jasmine.createSpy('postSilent').and.resolveTo({}),
      getSilent: jasmine.createSpy('getSilent').and.resolveTo([]),
      deleteSilent: jasmine.createSpy('deleteSilent').and.resolveTo({ code: 0 }),
    };
    api = new ChatApi(http as any, { token: 'test-token' } as any);
  });

  it('uses interceptor-relative URLs for session CRUD', async () => {
    await api.createSession('chat', [], 'cocc');
    expect(http.postSilent).toHaveBeenCalledWith('/chat/sessions', {
      type: 'chat',
      from: 'cocc',
    });

    await api.listSessions('chat', 'cocc');
    expect(http.getSilent).toHaveBeenCalledWith('/chat/sessions', {
      type: 'chat',
      from: 'cocc',
    });

    await api.getSession('session-id');
    expect(http.getSilent).toHaveBeenCalledWith('/chat/sessions/session-id');

    await api.deleteSession('session-id');
    expect(http.deleteSilent).toHaveBeenCalledWith('/chat/sessions/session-id');
  });
});
