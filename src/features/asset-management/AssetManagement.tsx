import { useEffect, useMemo, useState } from 'react';
import { projectAssetService } from '../../services/projectAssetService';
import type { ProjectAsset, TextAsset } from '../../types/projectAssets';
import './AssetManagement.css';

const PROJECT_ID = 'default';
const emptyForm = { title: '', content: '', tags: '', note: '' };

type AssetForm = typeof emptyForm;

export function AssetManagement() {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setLoading] = useState(true);

  const textAssets = useMemo(() => assets.filter((asset): asset is TextAsset => asset.kind === 'text'), [assets]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = query.trim()
      ? projectAssetService.searchAssets(PROJECT_ID, query)
      : projectAssetService.listAssets(PROJECT_ID);
    void request.then((items) => { if (active) setAssets(items); }).catch((error) => { if (active) setFeedback(error instanceof Error ? error.message : '加载资产失败。'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  async function reload() {
    const items = query.trim() ? await projectAssetService.searchAssets(PROJECT_ID, query) : await projectAssetService.listAssets(PROJECT_ID);
    setAssets(items);
  }

  async function saveTextAsset() {
    if (!form.title.trim() && !form.content.trim()) { setFeedback('请填写标题或内容。'); return; }
    if (editingId) {
      await projectAssetService.updateAsset(PROJECT_ID, editingId, { title: form.title, tags: parseTags(form.tags), note: form.note, data: { content: form.content } });
      setFeedback('文本资产已更新。');
    } else {
      await projectAssetService.createTextAsset(PROJECT_ID, { title: form.title, content: form.content, tags: parseTags(form.tags), note: form.note });
      setFeedback('文本资产已新增。');
    }
    setForm(emptyForm);
    setEditingId(null);
    await reload();
  }

  function editAsset(asset: TextAsset) {
    setEditingId(asset.id);
    setForm({ title: asset.title, content: asset.data.content, tags: asset.tags.join(', '), note: asset.note ?? '' });
  }

  async function deleteAsset(asset: ProjectAsset) {
    await projectAssetService.deleteAsset(PROJECT_ID, asset.id);
    setFeedback('资产已删除。');
    if (editingId === asset.id) { setEditingId(null); setForm(emptyForm); }
    await reload();
  }

  return (
    <main className="asset-management" aria-label="资产管理">
      <section className="asset-management__header">
        <div>
          <p>Assets v1</p>
          <h1>资产管理</h1>
          <span>当前本地项目内的文本与图片资产。</span>
        </div>
      </section>

      <section className="asset-management__panel asset-management__form" aria-label="新增文本资产">
        <div className="asset-management__panel-head"><h2>{editingId ? '编辑文本资产' : '新增文本资产'}</h2><span>{textAssets.length} 条文本</span></div>
        <div className="asset-management__form-grid">
          <label><span>标题</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="例如：角色设定" /></label>
          <label><span>标签</span><input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="用逗号分隔" /></label>
        </div>
        <label><span>内容</span><textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="输入可复用的文本、设定或提示词…" /></label>
        <label><span>备注</span><input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="可选" /></label>
        <div className="asset-management__form-actions"><button onClick={() => void saveTextAsset()} type="button">{editingId ? '保存更新' : '新增文本'}</button>{editingId && <button onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">取消编辑</button>}</div>
      </section>

      <section className="asset-management__toolbar" aria-label="搜索资产">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、标签、内容或来源…" type="search" />
      </section>

      {feedback && <div className="asset-management__feedback" aria-live="polite">{feedback}</div>}

      <section className="asset-management__panel" aria-label="资产列表">
        {isLoading ? <div className="asset-management__empty">正在加载资产…</div> : assets.length === 0 ? <div className="asset-management__empty"><strong>暂无资产</strong><span>新增一条文本资产后，会显示在这里。</span></div> : <div className="asset-management__list">{assets.map((asset) => <article className="asset-card" key={asset.id}><div className="asset-card__main"><span className={`asset-card__kind asset-card__kind--${asset.kind}`}>{asset.kind === 'text' ? '文本' : '图片'}</span><h3>{asset.title}</h3>{asset.kind === 'text' ? <p>{asset.data.content}</p> : <p>{asset.data.fileName}</p>}<div className="asset-card__meta">{asset.tags.map((tag) => <span key={tag}>{tag}</span>)}{asset.note && <span>{asset.note}</span>}</div></div><div className="asset-card__actions">{asset.kind === 'text' && <button onClick={() => editAsset(asset)} type="button">编辑</button>}<button onClick={() => void deleteAsset(asset)} type="button">删除</button></div></article>)}</div>}
      </section>
    </main>
  );
}

function parseTags(value: string): string[] {
  return value.split(/[,?]/).map((tag) => tag.trim()).filter(Boolean);
}
