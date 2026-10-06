package com.xhw.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.CommentVO;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Blog;
import com.xhw.entity.BlogComments;
import com.xhw.entity.User;
import com.xhw.mapper.BlogCommentsMapper;
import com.xhw.service.IBlogCommentsService;
import com.xhw.service.IBlogService;
import com.xhw.service.IUserService;
import com.xhw.utils.UserHolder;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 笔记评论服务实现类
 * </p>
 *
 * @author 洪佳弘
 */
@Service
public class BlogCommentsServiceImpl extends ServiceImpl<BlogCommentsMapper, BlogComments>
        implements IBlogCommentsService {

    /** 一条评论最多多少字（tb_blog_comments.content 是 varchar(255)，留点余量） */
    private static final int MAX_CONTENT = 200;

    @Resource
    private IUserService userService;

    @Resource
    private IBlogService blogService;

    @Override
    public Result listOfBlog(Long blogId) {
        if (blogId == null) {
            return Result.fail("缺少笔记 id");
        }
        List<BlogComments> rows = lambdaQuery()
                .eq(BlogComments::getBlogId, blogId)
                .orderByDesc(BlogComments::getCreateTime)
                .orderByDesc(BlogComments::getId)
                .list();
        if (rows.isEmpty()) {
            return Result.ok(new ArrayList<CommentVO>());
        }

        // 评论人的昵称/头像一次性批量拿，不要循环里逐个查用户（那是 N+1）
        List<Long> userIds = new ArrayList<>();
        for (BlogComments c : rows) {
            if (!userIds.contains(c.getUserId())) {
                userIds.add(c.getUserId());
            }
        }
        Map<Long, User> users = new HashMap<>();
        for (User u : userService.listByIds(userIds)) {
            users.put(u.getId(), u);
        }

        Long me = currentUserId();
        List<CommentVO> out = new ArrayList<>(rows.size());
        for (BlogComments c : rows) {
            User u = users.get(c.getUserId());
            CommentVO vo = new CommentVO();
            vo.setId(c.getId());
            vo.setContent(c.getContent());
            vo.setUserId(c.getUserId());
            vo.setUserName(u == null || StrUtil.isBlank(u.getNickName()) ? "匿名用户" : u.getNickName());
            vo.setUserIcon(u == null ? null : u.getIcon());
            vo.setMine(me != null && me.equals(c.getUserId()));
            vo.setCreateTime(c.getCreateTime());
            out.add(vo);
        }
        return Result.ok(out);
    }

    @Override
    public Result add(BlogComments comment) {
        Long me = currentUserId();
        if (me == null) {
            return Result.fail("请先登录");
        }
        if (comment == null || comment.getBlogId() == null) {
            return Result.fail("缺少笔记 id");
        }
        String content = StrUtil.trimToNull(comment.getContent());
        if (content == null) {
            return Result.fail("评论内容不能为空");
        }
        if (content.length() > MAX_CONTENT) {
            return Result.fail("评论最多 " + MAX_CONTENT + " 个字");
        }
        // 笔记得真实存在，否则会往一个不存在的 blogId 上挂评论，
        // 那条评论永远不会有人看到（也不会报错）
        if (blogService.getById(comment.getBlogId()) == null) {
            return Result.fail("这篇笔记不存在");
        }

        BlogComments row = new BlogComments();
        row.setBlogId(comment.getBlogId());
        // userId 一律用登录态覆盖：实体上带着它，前端可以塞别人的进来
        row.setUserId(me);
        row.setContent(content);
        // 只做一级评论。表里留着 parentId / answerId 两列是为了以后做二级回复，
        // 现在固定填 0，语义就是"顶层评论"
        row.setParentId(0L);
        row.setAnswerId(0L);
        row.setLiked(0);
        row.setStatus(true);
        save(row);

        // 计数回写到 tb_blog.comments。
        // 不回写的话，首页/店铺详情/地图页那些卡片上的「N 条评价」永远停在种子数据里，
        // 用户发完评论点回首页发现数字没变 —— 这就是"两个真相来源"在漂移。
        // 写法与 BlogServiceImpl.likeBlog 一致（setSql 是原子的，不会有读-改-写竞态）。
        blogService.update()
                .setSql("comments = coalesce(comments, 0) + 1")
                .eq("id", row.getBlogId())
                .update();

        // 笔记被评论，作者 +2 积分；自己评论自己不给
        Blog target = blogService.getById(row.getBlogId());
        if (target != null && !me.equals(target.getUserId())) {
            userService.addCredits(target.getUserId(), 2);
        }
        return Result.ok(row.getId());
    }

    @Override
    public Result remove(Long id) {
        Long me = currentUserId();
        if (me == null) {
            return Result.fail("请先登录");
        }
        // 用 (id, userId) 一次查出来，查得到才允许删 —— 越权校验写在**查询条件**里，
        // 而不是"先查出来再判断归属"（后者漏判一次就是水平越权）
        BlogComments row = lambdaQuery()
                .eq(BlogComments::getId, id)
                .eq(BlogComments::getUserId, me)
                .one();
        if (row == null) {
            return Result.fail("评论不存在");
        }
        removeById(id);

        // 计数一起减掉。greatest 兜住"减到负数"——
        // 万一计数和实际条数本来就对不上（历史脏数据），至少不会显示 -1
        blogService.update()
                .setSql("comments = greatest(coalesce(comments, 0) - 1, 0)")
                .eq("id", row.getBlogId())
                .update();

        // 把当初给作者的 2 分退回去，否则"评论-删除"可以无限刷分
        Blog target = blogService.getById(row.getBlogId());
        if (target != null && !me.equals(target.getUserId())) {
            userService.addCredits(target.getUserId(), -2);
        }
        return Result.ok();
    }

    private Long currentUserId() {
        UserDTO user = UserHolder.getUser();
        return user == null ? null : user.getId();
    }
}
