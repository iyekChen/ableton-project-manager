export type Project = {
  id: string;
  title: string;
  folderPath: string;
  createdAt: number;
  inode: number; // 文件夹 inode：改名/移动/进出废纸篓不变，复制出来的文件夹不同
  modifiedAt: number;
  stageId: string | null;
  genreIds: string[];
  collectionIds: string[];
  notes: string;
  pinned: boolean;
  pinOrder: number | null;
  setsCount: number;
  bouncesCount: number;
};
