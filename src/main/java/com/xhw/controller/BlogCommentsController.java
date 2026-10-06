package com.xhw.controller;


import com.xhw.dto.Result;
import com.xhw.entity.BlogComments;
import com.xhw.service.IBlogCommentsService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

/**
 * 笔记评论。
 * <p>
 * 原来这个类是**空的** —— 表有、实体有、Service 有，就是没接口，
 * 所以笔记详情页一直没有评论区。这里把它补上。
 * <p>
 * 只做一级评论（不做楼中楼）：`tb_blog_comments` 里的 `parent_id` / `answer_id`
 * 两列留着是为了以后扩展，现在固定写 0。
 *
 * @author 洪佳弘
 */
@RestController
@RequestMapping("/blog-comments")
public class BlogCommentsController {

    @Resource
    private IBlogCommentsService blogCommentsService;

    /**
     * 某篇笔记的评论列表（按时间倒序）
     * <p>
     * 这个接口**不要求登录**：没登录也应该能看评论，只是发不了。
     * 所以它得加进 {@code MvcConfig} 的放行名单（见那里的注释）。
     */
    @GetMapping("/{blogId}")
    public Result listOfBlog(@PathVariable("blogId") Long blogId) {
        return blogCommentsService.listOfBlog(blogId);
    }

    /**
     * 发表评论
     *
     * @return 新评论的 id
     */
    @PostMapping
    public Result add(@RequestBody BlogComments comment) {
        return blogCommentsService.add(comment);
    }

    /**
     * 删除自己的一条评论
     */
    @DeleteMapping("/{id}")
    public Result remove(@PathVariable("id") Long id) {
        return blogCommentsService.remove(id);
    }
}
