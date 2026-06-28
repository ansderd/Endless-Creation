import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { rendererBridge } from '../../services/rendererBridge';
import type { ApiConnectionTestResult, ApiProviderConfig } from '../../types/apiProvider';
import type { ThemeMode } from '../../types/workspace';
import './SettingsPage.css';

interface SettingsPageProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onClose: () => void;
}

type ConfigTabId = 'channels' | 'models' | 'preferences' | 'webdav';
type StartupPage = 'home' | 'projects' | 'last';

interface ModelPreferences {
  textModel: string;
  imageModel: string;
  videoModel: string;
  audioModel: string;
  availableModels: string[];
}

interface GenerationPreferences {
  imageQuality: 'auto' | 'low' | 'medium' | 'high';
  imageRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  imageCount: '1' | '2' | '4';
  canvasImageCount: '1' | '2' | '3' | '4';
  videoSeconds: '5' | '6' | '8' | '10';
  videoQuality: '720' | '1080';
  audioFormat: 'mp3' | 'wav';
  audioSpeed: '0.8' | '1' | '1.2';
  startupPage: StartupPage;
  compactCanvas: boolean;
  autoSave: boolean;
}

interface WebdavConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  directory: string;
  proxyMode: 'direct' | 'app-proxy';
  lastTestedAt?: string;
  lastStatus?: 'untested' | 'success' | 'failed';
}

export const API_PROVIDER_STORAGE_KEY = 'endless-creation.api-provider-config';
export const MODEL_PREFERENCES_STORAGE_KEY = 'endless-creation.model-preferences';
export const GENERATION_PREFERENCES_STORAGE_KEY = 'endless-creation.generation-preferences';
export const WEBDAV_CONFIG_STORAGE_KEY = 'endless-creation.webdav-config';

const configTabs: Array<{ id: ConfigTabId; label: string }> = [
  { id: 'channels', label: '渠道' },
  { id: 'models', label: '模型' },
  { id: 'preferences', label: '生成偏好' },
  { id: 'webdav', label: 'WebDAV' },
];

const defaultProviderConfig: ApiProviderConfig = {
  id: 'openai-compatible-default',
  label: 'OpenAI',
  type: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  defaultModel: 'gpt-4o-mini',
  enabled: true,
  lastTestStatus: 'untested',
};

const defaultModelPreferences: ModelPreferences = {
  textModel: 'gpt-4o-mini',
  imageModel: 'gpt-image-1',
  videoModel: 'sora',
  audioModel: 'gpt-4o-mini-tts',
  availableModels: [],
};

const defaultGenerationPreferences: GenerationPreferences = {
  imageQuality: 'auto',
  imageRatio: '1:1',
  imageCount: '1',
  canvasImageCount: '3',
  videoSeconds: '6',
  videoQuality: '720',
  audioFormat: 'mp3',
  audioSpeed: '1',
  startupPage: 'home',
  compactCanvas: false,
  autoSave: true,
};

const defaultWebdavConfig: WebdavConfig = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  directory: 'endless-creation',
  proxyMode: 'direct',
  lastStatus: 'untested',
};

export function SettingsPage({ theme, onThemeChange, onClose }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<ConfigTabId>('channels');
  const [feedback, setFeedback] = useState('');
  const [providerConfig, setProviderConfig] = useState<ApiProviderConfig>(() => readStorage(API_PROVIDER_STORAGE_KEY, defaultProviderConfig));
  const [modelPreferences, setModelPreferences] = useState<ModelPreferences>(() => readStorage(MODEL_PREFERENCES_STORAGE_KEY, defaultModelPreferences));
  const [generationPreferences, setGenerationPreferences] = useState<GenerationPreferences>(() => readStorage(GENERATION_PREFERENCES_STORAGE_KEY, defaultGenerationPreferences));
  const [webdavConfig, setWebdavConfig] = useState<WebdavConfig>(() => readStorage(WEBDAV_CONFIG_STORAGE_KEY, defaultWebdavConfig));
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebdavPassword, setShowWebdavPassword] = useState(false);
  const [testResult, setTestResult] = useState<ApiConnectionTestResult | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isTesting = providerConfig.lastTestStatus === 'testing';
  const modelOptions = useMemo(() => uniqueModels([providerConfig.defaultModel, ...modelPreferences.availableModels]), [modelPreferences.availableModels, providerConfig.defaultModel]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function changeTab(tabId: ConfigTabId) {
    setActiveTab(tabId);
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, tabId: ConfigTabId) {
    const currentIndex = configTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0) return;

    const nextIndex = event.key === 'ArrowRight'
      ? (currentIndex + 1) % configTabs.length
      : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + configTabs.length) % configTabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? configTabs.length - 1
            : -1;

    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = configTabs[nextIndex].id;
    setActiveTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`settings-tab-${nextTab}`)?.focus());
  }

  function updateProviderConfig(patch: Partial<ApiProviderConfig>) {
    setProviderConfig((current) => ({ ...current, ...patch }));
  }

  function saveProviderConfig(nextConfig = providerConfig, quiet = false) {
    writeStorage(API_PROVIDER_STORAGE_KEY, nextConfig);
    if (!quiet) setFeedback('渠道配置已保存。');
  }

  async function testConnection() {
    const testingConfig: ApiProviderConfig = { ...providerConfig, lastTestStatus: 'testing' };
    setProviderConfig(testingConfig);
    setTestResult({ ok: false, message: '正在测试连接…' });

    const result = await rendererBridge.testApiConnection(testingConfig);
    const nextProvider: ApiProviderConfig = {
      ...testingConfig,
      lastTestedAt: new Date().toLocaleString(),
      lastTestStatus: result.ok ? 'success' : 'failed',
    };
    const nextModels: ModelPreferences = result.models?.length
      ? { ...modelPreferences, availableModels: uniqueModels([...modelPreferences.availableModels, ...result.models]) }
      : modelPreferences;

    setProviderConfig(nextProvider);
    setModelPreferences(nextModels);
    setTestResult(result);
    writeStorage(API_PROVIDER_STORAGE_KEY, nextProvider);
    writeStorage(MODEL_PREFERENCES_STORAGE_KEY, nextModels);
  }

  function updateModelPreferences(patch: Partial<ModelPreferences>) {
    setModelPreferences((current) => ({ ...current, ...patch }));
  }

  function saveModelPreferences() {
    writeStorage(MODEL_PREFERENCES_STORAGE_KEY, modelPreferences);
    setFeedback('模型偏好已保存。');
  }

  function updateGenerationPreferences(patch: Partial<GenerationPreferences>) {
    setGenerationPreferences((current) => ({ ...current, ...patch }));
  }

  function saveGenerationPreferences() {
    writeStorage(GENERATION_PREFERENCES_STORAGE_KEY, generationPreferences);
    setFeedback('生成偏好已保存。');
  }

  function updateWebdavConfig(patch: Partial<WebdavConfig>) {
    setWebdavConfig((current) => ({ ...current, ...patch }));
  }

  function saveWebdavConfig(nextConfig = webdavConfig, quiet = false) {
    writeStorage(WEBDAV_CONFIG_STORAGE_KEY, nextConfig);
    if (!quiet) setFeedback('WebDAV 配置已保存。');
  }

  function testWebdavConfig() {
    const nextConfig: WebdavConfig = {
      ...webdavConfig,
      lastTestedAt: new Date().toLocaleString(),
      lastStatus: webdavConfig.url.trim() ? 'success' : 'failed',
    };
    setWebdavConfig(nextConfig);
    saveWebdavConfig(nextConfig, true);
    setFeedback(webdavConfig.url.trim() ? 'WebDAV 配置已保存，真实连接后续接入。' : '请先填写 WebDAV 地址。');
  }

  return (
    <div className="settings-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal__dialog settings-config-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeButtonRef} className="settings-modal__close" type="button" aria-label="关闭设置" title="关闭设置" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>

        <header className="settings-config-header">
          <div>
            <h1 id="settings-title">配置与用户偏好</h1>
            <p>渠道聚合、模型选择和同步偏好</p>
          </div>
          {feedback ? <span className="settings-page__feedback" role="status">{feedback}</span> : null}
        </header>

        <div className="settings-config-tabs" role="tablist" aria-label="配置分类">
          {configTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                id={`settings-tab-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={selected ? 'settings-config-tab settings-config-tab--active' : 'settings-config-tab'}
                onClick={() => changeTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <main className="settings-config-body">
          {activeTab === 'channels' && (
            <section id="settings-panel-channels" role="tabpanel" aria-labelledby="settings-tab-channels" className="settings-panel">
              <div className="settings-panel-toolbar">
                <div>
                  <h2>渠道</h2>
                  <p>配置 OpenAI-compatible 渠道并拉取模型。</p>
                </div>
                <div className="settings-inline-actions">
                  <button className="settings-page__secondary" type="button" disabled={isTesting || !providerConfig.enabled} onClick={() => void testConnection()}>{isTesting ? '拉取中…' : '拉取全部'}</button>
                  <button className="settings-page__secondary" type="button" onClick={() => setFeedback('多渠道后续接入，当前先保留一个默认渠道。')}>新增渠道</button>
                </div>
              </div>

              <article className="settings-card settings-channel-card">
                <div className="settings-card__header">
                  <div>
                    <h2>{providerConfig.label || '未命名渠道'}</h2>
                    <p>{providerConfig.baseUrl || '未填写 Base URL'}</p>
                  </div>
                  <span className={providerConfig.enabled ? 'settings-card__badge settings-card__badge--success' : 'settings-card__badge settings-card__badge--untested'}>{providerConfig.enabled ? '已启用' : '未启用'}</span>
                </div>

                <div className="settings-channel-summary">
                  <span>API 格式：OpenAI-compatible</span>
                  <span>默认模型：{providerConfig.defaultModel || '未设置'}</span>
                  <span>测试状态：{statusTitle(providerConfig.lastTestStatus ?? 'untested')}</span>
                </div>

                <div className="settings-api-grid">
                  <label className="settings-field">
                    <span>渠道名称</span>
                    <input value={providerConfig.label} onChange={(event) => updateProviderConfig({ label: event.target.value })} placeholder="OpenAI" />
                  </label>
                  <label className="settings-field">
                    <span>API 格式</span>
                    <input value="OpenAI-compatible" readOnly />
                  </label>
                  <label className="settings-field settings-field--wide">
                    <span>Base URL</span>
                    <input value={providerConfig.baseUrl} onChange={(event) => updateProviderConfig({ baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" />
                  </label>
                  <label className="settings-field settings-field--wide">
                    <span>API Key</span>
                    <span className="settings-secret-field">
                      <input value={providerConfig.apiKey} onChange={(event) => updateProviderConfig({ apiKey: event.target.value })} placeholder="sk-..." type={showApiKey ? 'text' : 'password'} />
                      <button type="button" onClick={() => setShowApiKey((current) => !current)}>{showApiKey ? '隐藏' : '显示'}</button>
                    </span>
                  </label>
                  <label className="settings-field settings-field--wide">
                    <span>默认模型</span>
                    <input value={providerConfig.defaultModel} onChange={(event) => updateProviderConfig({ defaultModel: event.target.value })} placeholder="gpt-4o-mini" />
                  </label>
                </div>

                <ToggleRow title="启用此渠道" description="关闭后后续生成流程不会默认使用该配置。" checked={providerConfig.enabled} onChange={(enabled) => updateProviderConfig({ enabled })} />

                <div className="settings-api-actions">
                  <button className="settings-page__primary" type="button" onClick={() => saveProviderConfig()}>保存配置</button>
                  <button className="settings-page__secondary" type="button" disabled={isTesting} onClick={() => void testConnection()}>{isTesting ? '测试中…' : '测试连接'}</button>
                  <button className="settings-page__secondary" type="button" onClick={() => setFeedback('至少保留一个渠道。')}>删除</button>
                </div>

                <div className={`settings-api-status settings-api-status--${providerConfig.lastTestStatus ?? 'untested'}`} role="status">
                  <strong>{statusTitle(providerConfig.lastTestStatus ?? 'untested')}</strong>
                  <span>{testResult?.message ?? statusDescription(providerConfig)}</span>
                  {modelPreferences.availableModels.length ? <em>模型示例：{modelPreferences.availableModels.slice(0, 6).join('、')}</em> : null}
                </div>
              </article>
            </section>
          )}

          {activeTab === 'models' && (
            <section id="settings-panel-models" role="tabpanel" aria-labelledby="settings-tab-models" className="settings-panel">
              <div className="settings-panel-toolbar">
                <div>
                  <h2>模型</h2>
                  <p>为文本、生图、视频和音频流程设置默认模型。</p>
                </div>
                <button className="settings-page__primary" type="button" onClick={saveModelPreferences}>保存模型偏好</button>
              </div>
              <article className="settings-card">
                <div className="settings-model-grid">
                  <ModelField label="默认文本模型" value={modelPreferences.textModel} options={modelOptions} onChange={(textModel) => updateModelPreferences({ textModel })} />
                  <ModelField label="默认生图模型" value={modelPreferences.imageModel} options={modelOptions} onChange={(imageModel) => updateModelPreferences({ imageModel })} />
                  <ModelField label="默认视频模型" value={modelPreferences.videoModel} options={modelOptions} onChange={(videoModel) => updateModelPreferences({ videoModel })} />
                  <ModelField label="默认音频模型" value={modelPreferences.audioModel} options={modelOptions} onChange={(audioModel) => updateModelPreferences({ audioModel })} />
                </div>
                <div className="settings-api-status">
                  <strong>可选模型列表</strong>
                  <span>{modelPreferences.availableModels.length ? modelPreferences.availableModels.join('、') : '暂无拉取结果，可直接手动输入模型名称。'}</span>
                </div>
              </article>
            </section>
          )}

          {activeTab === 'preferences' && (
            <section id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences" className="settings-panel">
              <div className="settings-panel-toolbar">
                <div>
                  <h2>生成偏好</h2>
                  <p>设置默认生成参数、界面主题和工作区偏好。</p>
                </div>
                <button className="settings-page__primary" type="button" onClick={saveGenerationPreferences}>保存生成偏好</button>
              </div>
              <article className="settings-card">
                <div className="settings-preference-grid">
                  <SelectField label="生图质量" value={generationPreferences.imageQuality} options={['auto', 'low', 'medium', 'high']} onChange={(imageQuality) => updateGenerationPreferences({ imageQuality: imageQuality as GenerationPreferences['imageQuality'] })} />
                  <SelectField label="图片比例" value={generationPreferences.imageRatio} options={['1:1', '16:9', '9:16', '4:3', '3:4']} onChange={(imageRatio) => updateGenerationPreferences({ imageRatio: imageRatio as GenerationPreferences['imageRatio'] })} />
                  <SelectField label="生成张数" value={generationPreferences.imageCount} options={['1', '2', '4']} onChange={(imageCount) => updateGenerationPreferences({ imageCount: imageCount as GenerationPreferences['imageCount'] })} />
                  <SelectField label="画布节点默认生成数量" value={generationPreferences.canvasImageCount} options={['1', '2', '3', '4']} onChange={(canvasImageCount) => updateGenerationPreferences({ canvasImageCount: canvasImageCount as GenerationPreferences['canvasImageCount'] })} />
                  <SelectField label="视频秒数" value={generationPreferences.videoSeconds} options={['5', '6', '8', '10']} onChange={(videoSeconds) => updateGenerationPreferences({ videoSeconds: videoSeconds as GenerationPreferences['videoSeconds'] })} />
                  <SelectField label="视频质量" value={generationPreferences.videoQuality} options={['720', '1080']} onChange={(videoQuality) => updateGenerationPreferences({ videoQuality: videoQuality as GenerationPreferences['videoQuality'] })} />
                  <SelectField label="音频格式" value={generationPreferences.audioFormat} options={['mp3', 'wav']} onChange={(audioFormat) => updateGenerationPreferences({ audioFormat: audioFormat as GenerationPreferences['audioFormat'] })} />
                  <SelectField label="音频语速" value={generationPreferences.audioSpeed} options={['0.8', '1', '1.2']} onChange={(audioSpeed) => updateGenerationPreferences({ audioSpeed: audioSpeed as GenerationPreferences['audioSpeed'] })} />
                </div>
              </article>
              <article className="settings-card">
                <div className="settings-card__header"><div><h2>界面与工作区偏好</h2><p>保留原设置中的主题、启动页和本地草稿体验。</p></div></div>
                <div className="settings-segmented" role="group" aria-label="主题模式">
                  <button className={theme === 'dark' ? 'settings-segmented__item settings-segmented__item--active' : 'settings-segmented__item'} type="button" aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}>深色模式</button>
                  <button className={theme === 'light' ? 'settings-segmented__item settings-segmented__item--active' : 'settings-segmented__item'} type="button" aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}>浅色模式</button>
                </div>
                <label className="settings-field settings-field--section">
                  <span>启动后打开</span>
                  <select value={generationPreferences.startupPage} onChange={(event) => updateGenerationPreferences({ startupPage: event.target.value as StartupPage })}>
                    <option value="home">首页</option>
                    <option value="projects">项目管理</option>
                    <option value="last">上次工作区</option>
                  </select>
                </label>
                <ToggleRow title="画布紧凑模式" description="降低工具栏和节点间距，适合小屏工作。" checked={generationPreferences.compactCanvas} onChange={(compactCanvas) => updateGenerationPreferences({ compactCanvas })} />
                <ToggleRow title="自动保存草稿" description="编辑 Prompt、画布节点时显示自动保存状态。" checked={generationPreferences.autoSave} onChange={(autoSave) => updateGenerationPreferences({ autoSave })} />
              </article>
            </section>
          )}

          {activeTab === 'webdav' && (
            <section id="settings-panel-webdav" role="tabpanel" aria-labelledby="settings-tab-webdav" className="settings-panel">
              <div className="settings-panel-toolbar">
                <div>
                  <h2>WebDAV</h2>
                  <p>保存同步入口配置，真实连接将在后续接入。</p>
                </div>
                <button className="settings-page__primary" type="button" onClick={() => saveWebdavConfig()}>保存 WebDAV</button>
              </div>
              <article className="settings-card">
                <ToggleRow title="启用 WebDAV 同步" description="开启后后续同步功能会读取这组配置。" checked={webdavConfig.enabled} onChange={(enabled) => updateWebdavConfig({ enabled })} />
                <div className="settings-api-grid settings-field--section">
                  <label className="settings-field settings-field--wide">
                    <span>WebDAV 地址</span>
                    <input value={webdavConfig.url} onChange={(event) => updateWebdavConfig({ url: event.target.value })} placeholder="https://dav.example.com/remote.php/dav/files/user" />
                  </label>
                  <label className="settings-field">
                    <span>用户名</span>
                    <input value={webdavConfig.username} onChange={(event) => updateWebdavConfig({ username: event.target.value })} />
                  </label>
                  <label className="settings-field">
                    <span>密码</span>
                    <span className="settings-secret-field">
                      <input value={webdavConfig.password} onChange={(event) => updateWebdavConfig({ password: event.target.value })} type={showWebdavPassword ? 'text' : 'password'} />
                      <button type="button" onClick={() => setShowWebdavPassword((current) => !current)}>{showWebdavPassword ? '隐藏' : '显示'}</button>
                    </span>
                  </label>
                  <label className="settings-field">
                    <span>目录</span>
                    <input value={webdavConfig.directory} onChange={(event) => updateWebdavConfig({ directory: event.target.value })} placeholder="endless-creation" />
                  </label>
                  <SelectField label="代理模式" value={webdavConfig.proxyMode} options={['direct', 'app-proxy']} onChange={(proxyMode) => updateWebdavConfig({ proxyMode: proxyMode as WebdavConfig['proxyMode'] })} />
                </div>
                <div className="settings-api-actions">
                  <button className="settings-page__secondary" type="button" onClick={testWebdavConfig}>测试连接</button>
                  <button className="settings-page__secondary" type="button" onClick={() => setFeedback('同步功能后续接入，当前仅保存配置。')}>同步</button>
                </div>
                <div className={`settings-api-status settings-api-status--${webdavConfig.lastStatus ?? 'untested'}`} role="status">
                  <strong>{webdavConfig.lastStatus === 'success' ? '配置可用' : webdavConfig.lastStatus === 'failed' ? '缺少地址' : '未测试'}</strong>
                  <span>{webdavConfig.lastTestedAt ? `上次测试：${webdavConfig.lastTestedAt}` : '填写 WebDAV 地址后可保存并进行占位测试。'}</span>
                </div>
              </article>
              <article className="settings-card">
                <div className="settings-card__header"><div><h2>关于 Endless Creation</h2><p>当前处于桌面端 MVP 阶段，优先验证本地创作工作流。</p></div><span className="settings-card__badge settings-card__badge--muted">MVP</span></div>
                <div className="settings-about-list">
                  <div><span>版本</span><strong>0.1.0 Mock Preview</strong></div>
                  <div><span>运行模式</span><strong>Electron + Vite + React</strong></div>
                  <div><span>数据说明</span><strong>当前不接账号、不做云同步、不写入真实 API Key 到代码。</strong></div>
                </div>
              </article>
            </section>
          )}
        </main>
      </section>
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="settings-toggle-row">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button className={checked ? 'settings-toggle settings-toggle--on' : 'settings-toggle'} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

function ModelField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const listId = `${label.replace(/\s+/g, '-')}-models`;
  return (
    <label className="settings-field">
      <span>{label}</span>
      <input list={listId} value={value} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>
        {options.map((option) => <option value={option} key={option} />)}
      </datalist>
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function statusTitle(status: NonNullable<ApiProviderConfig['lastTestStatus']>) {
  if (status === 'testing') return '测试中';
  if (status === 'success') return '测试成功';
  if (status === 'failed') return '测试失败';
  return '未配置';
}

function statusDescription(config: ApiProviderConfig) {
  if (config.lastTestStatus === 'success' && config.lastTestedAt) return `上次测试：${config.lastTestedAt}`;
  if (config.lastTestStatus === 'failed' && config.lastTestedAt) return `上次失败：${config.lastTestedAt}`;
  return '填写 Base URL 与 API Key 后，可以测试 /models 接口是否可用。';
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return { ...fallback, ...JSON.parse(stored) } as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}
