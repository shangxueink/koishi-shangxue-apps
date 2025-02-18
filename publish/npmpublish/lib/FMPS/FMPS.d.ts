import { Context } from "koishi";
export declare class FMPS {
    private ctx;
    constructor(ctx: Context);
    /**
     * 服务器选择函数，待写
     *     async server_selection() {
    }
     */
    /**
     * json解析函数
     * @param path json文件的路径
     * @returns 解析后的JSON对象或在出错时返回null
     */
    json_parse(path: string): Promise<any | null>;
    /**
     * json文件创建函数
     * @param path 生成文件存放的路径
     * @param fname 文件名
     * @param json 传入的内容
     * @returns 返回文件路径
     */
    json_create(dirPath: string, fname: string, json: any): Promise<string>;
    /**
     * buffer图像储存函数
     * @param buffer 传入的buffer
     * @param dirpath 要保存到的路径
     * @param fname 文件名，带格式
     */
    img_save(buffer: Buffer, dirpath: string, fname: string): Promise<void>;
    /**
     * 文件下载函数
     * @param url 传入下载的链接
     * @param dirPath 完整的文件存放的路径
     * @param fname 带拓展名的文件名
     */
    file_download(url: string, dirPath: string, fname: string): Promise<void>;
    /**
     * 模仿饼干🍪佬的自动补齐换皮别名和拼英
     * @param text 传入文本
     * @returns
     */
    complete_alias(text: string): string[];
    /**
     * 学生生日爬取
     * @param root 存储json文件的路径
     */
    student_birthdays_get(root: any): Promise<void>;
    /**
     * 学生json数据的自动创建函数，爬取db
     * @param root 存储json文件的路径
     */
    match_auto_update(root: string): Promise<void>;
    /**
     * 芝士自动生成sanae match to arona键值表的函数
     * @param root 文件夹路径
     */
    sanae_match_refinement(root: string): Promise<void>;
    /**
     * 检测to arona部分的数据是否是精确匹配
     * @param sms_arona 传入sanae match systeam to arona data的json，使用json_parse解析
     */
    name_detection(sms_arona: any, type: any): Promise<void>;
    /**
     * 刷新机器人的令牌并上传图片到指定频道,抄的上学的，上学抄的22的（）
     * @param data - 图片数据或者文件路径(buffer)
     * @param appId - 机器人AppID
     * @param secret - 机器人Secret
     * @param channelId - 频道ID
     */
    img_to_channel(data: Buffer, appId: any, secret: any, channelId: any): Promise<string>;
    /**
     * 攻略系统的图片下载和调用函数
     * @param folderPath 传入的文件夹目录（一般是root）
     * @param imageUrl 图片url
     * @param imageName 图片名称，一般是哈希值，没有拓展名
     * @param loggers 是否开日志
     */
    guide_download_image(folderPath: string, imageUrl: string, imageName: string, loggers?: boolean): Promise<string>;
    /**
     * 文件删除函数
     * @param dirPath 文件夹路径
     * @param file 文件名称，缺省时将删除文件夹内全部内容
     */
    file_delete(dirPath: string, file?: string): Promise<void>;
    /**
     * 将Unix时间戳转换为指定时区的时间字符串，格式为YYYY-MM-DDTHH:mm:ss+HH:MM。
     * @param {number} timestamp - Unix时间戳（秒）
     * @returns {string} 返回格式化的时间字符串
     */
    formatTimestamp(timestamp: any): string;
}
