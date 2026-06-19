export class JunkFile {
  path: string;
  sizeMB: number;
  category: string;
  constructor(source?: Partial<JunkFile>);
  static createFrom(source: any): JunkFile;
}
