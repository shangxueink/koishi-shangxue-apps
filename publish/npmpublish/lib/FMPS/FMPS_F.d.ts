/**
 * koishi——data文件夹创建器，至多一个子文件夹
 * @param mainfile 主文件夹名称,
 * @param filename 子文件夹名称
 * @returns 文件夹路径
 */
export declare function rootF(mainfile?: any, filename?: any): Promise<string>;
/**
 * 文件移动函数
 * @param lpath 需要移动的文件路径
 * @param npath  要移动到的路径
 */
export declare function move_file(lpath: string, npath: string): Promise<void>;
/**
 * 文件搜索器,判断文件是否存在
 * @param filePath 文件路径
 */
export declare function file_search(filePath: string): Promise<boolean>;
