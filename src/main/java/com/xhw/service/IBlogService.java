package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import com.xhw.entity.Blog;

/**
 * <p>
 * 服务类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
public interface IBlogService extends IService<Blog> {

    /**
     * 查询热门博客
     *
     * @param current 当前
     * @param region  省 / 市 / 区筛选条件；三级都为空 = 不过滤
     * @return {@link Result}
     */
    /**
     * 笔记列表（首页「达人探店」那一栏）。
     *
     * @param current 页码
     * @param region  区域；null 或「全国」= 不按区域过滤
     * @param sort    hot（默认，按人气=liked 倒序）/ new（按发布时间倒序）
     * @return {@link Result} data 为 Blog 列表
     */
    Result queryHotBlog(Integer current, RegionQuery region, String sort);

    /**
     * 搜笔记（标题或正文里包含关键词）。
     * <p>
     * 用的是 {@code LIKE %kw%}，不是全文索引 —— 种子数据只有 20 篇笔记，
     * 上 MySQL 全文索引反而是过度设计。等笔记量级到几万再考虑
     * Elasticsearch 或 MySQL 的 FULLTEXT。
     *
     * @param keyword 关键词；空或纯空白按"没搜"处理，直接返回空列表
     * @param current  页码
     * @param region   区域，同 queryHotBlog
     * @param sort     同 queryHotBlog
     * @return {@link Result} data 为 Blog 列表
     */
    Result searchBlog(String keyword, Integer current, RegionQuery region, String sort);

    /**
     * 通过id查询博客
     *
     * @param id id
     * @return {@link Result}
     */
    Result queryBlogById(Long id);

    /**
     * 点赞博客
     *
     * @param id id
     * @return {@link Result}
     */
    Result likeBlog(Long id);

    /**
     * 查询博客点赞排行榜
     *
     * @param id id
     * @return {@link Result}
     */
    Result queryBlogLikesById(Long id);

    /**
     * 保存博客
     *
     * @param blog 博客
     * @return {@link Result}
     */
    Result saveBlog(Blog blog);

    /**
     * 查询博客遵循
     *
     * @param max    马克斯
     * @param offset 抵消
     * @return {@link Result}
     */
    Result queryBlogOfFollow(Long max, Integer offset);
}
