package com.xhw.dto;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 一条消息（互动通知）。
 * <p>
 * <b>注意这里没有 message 表。</b>消息是**从已有数据里派生出来的**，
 * 不落库：
 * <pre>
 *   like    谁赞了我的笔记  -> Redis ZSet `blog:liked:{blogId}`，score 就是点赞时间戳
 *   follow  谁关注了我      -> tb_follow 表（follow_user_id = 我）
 *   comment 谁评论了我的笔记 -> tb_blog_comments 表（blog_id in 我的笔记）
 * </pre>
 * 三条来源本来就是"事实数据"，再存一份消息表等于给自己制造两个真相来源：
 * 赞被取消、评论被删、关注被取关之后，消息表里的那条就成了幽灵。
 * 派生出来的消息天然不会出现这种情况。<br>
 * 代价是每次都要现算（见 MessageServiceImpl 里的成本说明），
 * 而且**已读状态必须另存**（不能从事实数据里推出来），所以存在 Redis 的一个时间戳上。
 *
 * @author 洪佳弘
 */
@Data
public class MessageVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** like / follow / comment */
    private String type;

    /** 触发这条消息的人 */
    private Long fromUserId;
    private String fromName;
    private String fromIcon;

    /** 相关的笔记（follow 类型没有） */
    private Long blogId;
    private String blogTitle;

    /** 评论正文（只有 comment 类型有） */
    private String content;

    private LocalDateTime createTime;

    /** 比上次已读时间新 = 未读 */
    private Boolean unread;
}
