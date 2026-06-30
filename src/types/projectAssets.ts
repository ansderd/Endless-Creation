export interface ProjectAssetCollection {
  version: 1;
  assets: ProjectAsset[];
}

export type ProjectAsset = TextAsset | ImageAsset;

export interface ProjectAssetBase {
  id: string;
  kind: 'text' | 'image';
  title: string;
  tags: string[];
  source?: 'manual' | 'image-workbench' | 'canvas' | 'prompt-library';
  note?: string;
  status?: 'ready' | 'missing';
  createdAt: string;
  updatedAt: string;
}

export interface TextAsset extends ProjectAssetBase {
  kind: 'text';
  data: { content: string };
}

export interface ImageAsset extends ProjectAssetBase {
  kind: 'image';
  data: {
    fileName: string;
    relativePath: string;
    mimeType: string;
    bytes: number;
    width?: number;
    height?: number;
    thumbnailPath?: string;
  };
}

export type TextAssetInput = {
  title: string;
  content: string;
  tags?: string[];
  note?: string;
  source?: ProjectAssetBase['source'];
};

export type AssetPatch = Partial<Pick<ProjectAssetBase, 'title' | 'tags' | 'note' | 'source' | 'status'>> & {
  data?: { content?: string };
};
