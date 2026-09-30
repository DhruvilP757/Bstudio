export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export interface FileContent {
  filePath: string;
  content: string;
  isReadOnly?: boolean;
}
