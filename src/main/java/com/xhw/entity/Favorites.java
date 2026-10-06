package com.xhw.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 笔记收藏。
 * <p>
 * 表 tb_favorites 由 {@code _qa/_gen_nationwide_sql.py} 生成，
 * 别手改 {@code src/main/resources/db/xhw.sql} —— 下次重跑生成器会被整份覆盖。
 *
 * @author 洪佳弘
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("tb_favorites")
public class Favorites implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 谁收藏的。
     * <p>
     * ⚠️ 这个字段只以**登录态**为准，绝不接受前端传进来的 userId。
     * 实体上带着它，就一定会有人往里塞别人的 id。
     */
    private Long userId;

    /** 被收藏的笔记 */
    private Long blogId;

    private LocalDateTime createTime;
}
