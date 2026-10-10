export type Project = {
  id: string;
  title: string;
  folderPath: string;
  createdAt: number;
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
