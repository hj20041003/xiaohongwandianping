package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.Result;
import com.xhw.entity.BlogComments;

/**
 * <p>
 * 笔记评论服务类
 * </p>
 *
 * @author 洪佳弘
 */
public interface IBlogCommentsService extends IService<BlogComments> {

    /**
     * 某篇笔记的评论列表，按时间倒序
     *
     * @param blogId 笔记 id
     * @return {@link Result} data 为 CommentVO 列表
     */
    Result listOfBlog(Long blogId);

    /**
     * 发表评论
     *
     * @param comment 只取 blogId 与 content；userId 一律以登录态为准
     * @return {@link Result} data 为新评论的 id
     */
    Result add(BlogComments comment);

    /**
     * 删掉自己的一条评论
     *
     * @param id 评论 id
     * @return {@link Result}
     */
    Result remove(Long id);
}
