package com.xhw.service;

import com.xhw.dto.Result;

/**
 * 消息中心（互动通知）。
 * <p>
 * 消息不落表，是从已有数据里现算出来的：
 * <pre>
 *   like    谁赞了我的笔记  -> Redis ZSet blog:liked:{blogId}（score 就是点赞时间）
 *   follow  谁关注了我      -> tb_follow（follow_user_id = 我）
 *   comment 谁评论了我的笔记 -> tb_blog_comments（blog_id in 我的笔记）
 * </pre>
 * 只有「已读位点」需要另存（Redis 的 {@code msg:read:{userId}}）。
 *
 * @author 洪佳弘
 */
public interface IMessageService {

    /**
     * 消息列表（三类互动合并后按时间倒序，内存分页）
     *
     * @param current 页码，从 1 开始
     * @return {@link Result} data 为 {list, total, unread}
     */
    Result list(Integer current);

    /**
     * 未读条数（给底部导航的小红点用）
     *
     * @return {@link Result} data 为整数
     */
    Result unread();

    /**
     * 全部标记为已读（把位点推到当前时刻）
     *
     * @return {@link Result}
     */
    Result markRead();
}
