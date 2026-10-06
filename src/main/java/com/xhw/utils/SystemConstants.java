package com.xhw.utils;

public class SystemConstants {
    /**
     * 图片上传的落盘目录。
     * <p>
     * 课程源码里硬编码的是作者本机的 D:\Project\JavaProject\nginx-1.18.0\html\xhw\imgs，
     * 换台机器就成了一个不存在的路径——而 {@code File.mkdirs()} 会默默把整条路径建出来，
     * 于是上传"成功"、图片却永远 404（nginx 的 web 根目录在别处）。
     * <p>
     * 现在优先读配置 {@code xhw.upload-dir}，这里只作为兜底默认值。
     * 生产环境请改成对象存储，不要落本地磁盘。
     */
    public static final String IMAGE_UPLOAD_DIR = "D:\\xhw\\nginx-1.18.0\\html\\xhw\\imgs";
    public static final String USER_NICK_NAME_PREFIX = "user_";
    public static final int DEFAULT_PAGE_SIZE = 5;
    public static final int MAX_PAGE_SIZE = 10;

    /**
     * 「全国」这个伪城市名。
     * <p>
     * 前端城市选择器的第一项就是它，表示不按城市过滤。用一个常量而不是散落在
     * 各处的字面量，是因为前后端都认这个字符串——前端拼查询参数、后端判断要不要
     * 加 where city = ?，任何一处写成「全部」「不限」都会导致筛不出数据。
     */
    public static final String NATIONWIDE = "全国";
}
