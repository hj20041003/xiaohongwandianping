package com.xhw.dto;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 一条评论（给前端看的形状）。
 * <p>
 * 为什么不直接把 {@code BlogComments} 实体返回：
 * 评论列表要显示**是谁评的**（昵称+头像），而实体里只有 userId；
 * 页面上还有"这条是不是我发的"（决定要不要显示删除按钮）。
 * 这些都要在服务端一次算完，不能让前端拿着 userId 再逐个查用户 —— 那就是 N+1。
 *
 * @author 洪佳弘
 */
@Data
public class CommentVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;

    /** 评论正文 */
    private String content;

    private Long userId;

    /** 评论人昵称 */
    private String userName;

    /** 评论人头像 */
    private String userIcon;

    /** 是不是我自己发的（前端据此决定显示不显示删除） */
    private Boolean mine;

    private LocalDateTime createTime;
}
