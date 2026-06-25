import { useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import type { ThemeMode } from '../types/workspace';
import { rendererBridge } from '../services/rendererBridge';
import {
  AddSquareIcon,
  BookIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CollapseIcon,
  FolderIcon,
  ImageWorkbenchIcon,
  MoonIcon,
  PenBookIcon,
  ProjectIcon,
  PromptIcon,
  SceneIcon,
  ScriptIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  VideoIcon,
} from './icons';
import './App.css';

type SidebarIcon = ComponentType<SVGProps<SVGSVGElement>>;
type ActiveNavId =
  | 'projects'
  | 'novel'
  | 'script-workbench'
  | 'image-workbench'
  | 'video-workbench'
  | 'prompts'
  | 'assets'
  | 'settings'
  | 'asset-role'
  | 'asset-scene'
  | 'asset-script'
  | 'asset-novel';

type PrimaryNavId = Exclude<ActiveNavId, 'asset-role' | 'asset-scene' | 'asset-script' | 'asset-novel'>;

const sidebarNavItems: Array<{ id: PrimaryNavId; Icon: SidebarIcon; label: string }> = [
  { id: 'projects', Icon: ProjectIcon, label: '项目管理' },
  { id: 'novel', Icon: PenBookIcon, label: '小说创作' },
  { id: 'script-workbench', Icon: ScriptIcon, label: '剧本工作台' },
  { id: 'image-workbench', Icon: ImageWorkbenchIcon, label: '生图工作台' },
  { id: 'video-workbench', Icon: VideoIcon, label: '视频工作台' },
  { id: 'prompts', Icon: PromptIcon, label: '提示词库' },
  { id: 'assets', Icon: FolderIcon, label: '资产管理' },
  { id: 'settings', Icon: SettingsIcon, label: '设置' },
];

const assetItems: Array<{ id: ActiveNavId; Icon: SidebarIcon; label: string; count: number }> = [
  { id: 'asset-role', Icon: UserIcon, label: '角色', count: 12 },
  { id: 'asset-scene', Icon: SceneIcon, label: '场景', count: 8 },
  { id: 'asset-script', Icon: ScriptIcon, label: '剧本', count: 5 },
  { id: 'asset-novel', Icon: BookIcon, label: '小说', count: 3 },
];

const mockUser = { name: '未登录用户', status: '点击登录' };

export function App() {
  const [theme, setTheme] = usePersistentTheme();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarPreviewed, setSidebarPreviewed] = useState(false);
  const [activeNavId, setActiveNavId] = useState<ActiveNavId>('projects');
  const [isAssetMenuExpanded, setAssetMenuExpanded] = useState(true);
  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon;
  const AssetChevronIcon = isAssetMenuExpanded ? ChevronDownIcon : ChevronRightIcon;
  const isSidebarVisuallyCollapsed = isSidebarCollapsed && !isSidebarPreviewed;

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? 'app-shell--sidebar-collapsed' : ''} ${isSidebarPreviewed ? 'app-shell--sidebar-previewed' : ''}`}
      data-theme={theme}
    >
      <aside
        className={`canvasflow-sidebar ${isSidebarCollapsed ? 'canvasflow-sidebar--collapsed' : ''} ${isSidebarPreviewed ? 'canvasflow-sidebar--previewed' : ''}`}
        aria-label="Endless Creation 侧边栏"
        onMouseEnter={() => {
          if (isSidebarCollapsed) setSidebarPreviewed(true);
        }}
        onMouseLeave={() => setSidebarPreviewed(false)}
      >
        <header className="canvasflow-brand">
          <span className="canvasflow-brand__mark" aria-hidden="true">
            <AddSquareIcon />
          </span>
          <span className="canvasflow-brand__name" aria-label="Endless Creation">
            <span>Endless</span>
            <span>Creation</span>
          </span>
          <button
            aria-expanded={!isSidebarCollapsed}
            className="canvasflow-collapse glass-icon-btn"
            aria-label={isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            onClick={() => {
              setSidebarCollapsed((current) => !current);
              setSidebarPreviewed(false);
            }}
            type="button"
          >
            <span className="glass-icon-btn__back" aria-hidden="true" />
            <span className="glass-icon-btn__front">
              <span className="glass-icon-btn__icon" aria-hidden="true">
                <CollapseIcon />
              </span>
            </span>
          </button>
        </header>

        <nav className="canvasflow-nav" aria-label="Endless Creation 导航">
          {sidebarNavItems.map(({ Icon, ...item }) => {
            const isAssetParent = item.id === 'assets';
            const isActive = activeNavId === item.id;

            return (
              <div className="canvasflow-nav__entry" key={item.id}>
                <button
                  aria-current={isActive ? 'page' : undefined}
                  aria-expanded={isAssetParent ? isAssetMenuExpanded : undefined}
                  aria-label={isSidebarVisuallyCollapsed ? item.label : undefined}
                  className={`canvasflow-nav__item ${isActive ? 'canvasflow-nav__item--active' : ''}`}
                  onClick={() => {
                    setActiveNavId(item.id);
                    if (isAssetParent) {
                      setAssetMenuExpanded((current) => !current);
                    }
                  }}
                  type="button"
                >
                  <span className="canvasflow-nav__icon" aria-hidden="true"><Icon /></span>
                  <span className="canvasflow-nav__label">{item.label}</span>
                  {isAssetParent && (
                    <span className="canvasflow-nav__chevron" aria-hidden="true"><AssetChevronIcon /></span>
                  )}
                </button>

                {isAssetParent && isAssetMenuExpanded && (
                  <div className="canvasflow-subnav">
                    {assetItems.map(({ Icon: AssetIcon, ...assetItem }) => (
                      <button
                        aria-current={activeNavId === assetItem.id ? 'page' : undefined}
                        aria-label={isSidebarVisuallyCollapsed ? assetItem.label : undefined}
                        className={`canvasflow-subnav__item ${activeNavId === assetItem.id ? 'canvasflow-subnav__item--active' : ''}`}
                        key={assetItem.id}
                        onClick={() => {
                          setActiveNavId(assetItem.id);
                          setAssetMenuExpanded(true);
                        }}
                        type="button"
                      >
                        <span className="canvasflow-nav__icon" aria-hidden="true"><AssetIcon /></span>
                        <span className="canvasflow-nav__label">{assetItem.label}</span>
                        <span className="canvasflow-badge" aria-label={`${assetItem.label} ${assetItem.count} 个`}>{assetItem.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <footer className="canvasflow-footer">
          <div className="canvasflow-user-row">
            <button className="canvasflow-user-button" type="button" aria-label={`${mockUser.name}，${mockUser.status}`}>
              <span className="canvasflow-user-avatar" aria-hidden="true">
                <UserIcon />
              </span>
              <span className="canvasflow-user-copy">
                <span className="canvasflow-user-name">{mockUser.name}</span>
                <span className="canvasflow-user-status">{mockUser.status}</span>
              </span>
            </button>
            <button
              aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
              aria-pressed={theme === 'light'}
              className="canvasflow-theme-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              type="button"
            >
              <ThemeIcon />
            </button>
          </div>
        </footer>
      </aside>

      <main className="blank-workspace" aria-label="空白工作区" />
    </div>
  );
}

function usePersistentTheme(): [ThemeMode, (theme: ThemeMode) => void] {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return rendererBridge.readTheme() ?? 'dark';
  });

  useEffect(() => {
    rendererBridge.writeTheme(theme);
    rendererBridge.applyTheme(theme);
  }, [theme]);

  return [theme, setThemeState];
}
