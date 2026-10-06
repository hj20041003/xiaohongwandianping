package com.xhw.service.impl;

import com.xhw.dto.MessageVO;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Blog;
import com.xhw.entity.BlogComments;
import com.xhw.entity.Follow;
import com.xhw.entity.User;
import com.xhw.service.IBlogCommentsService;
import com.xhw.service.IBlogService;
import com.xhw.service.IFollowService;
import com.xhw.service.IMessageService;
import com.xhw.service.IUserService;
import com.xhw.utils.RedisConstants;
import com.xhw.utils.UserHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 消息中心实现。
 * <p>
 * <b>成本说明（重要）：</b>「赞了我」要遍历我的每一篇笔记、各读一次 Redis ZSet，
 * 所以这部分是 O(我的笔记数) 次 Redis 调用。<br>
 * 笔记很少时（几十篇）完全没问题，所以这里给了一个上限 {@link #MAX_SCAN_BLOGS}：
 * 超过就只看最近的那些，宁可漏掉很早以前的赞，也不要一次请求打几十上百次 Redis。
 * 如果哪天笔记多到必须全量通知，正确做法是**落一张 message 表**、
 * 在点赞/关注/评论时同步写一条，而不是把这里的扫描范围继续放大。
 *
 * @author 洪佳弘
 */
@Service
public class MessageServiceImpl implements IMessageService {

    /** 一次最多扫多少篇自己的笔记（见上面的成本说明） */
    private static final int MAX_SCAN_BLOGS = 50;

    /** 每页多少条 */
    private static final int PAGE_SIZE = 20;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private IBlogService blogService;

    @Resource
    private IBlogCommentsService blogCommentsService;

    @Resource
    private IFollowService followService;

    @Resource
    private IUserService userService;

    @Override
    public Result list(Integer current) {
        Long me = currentUserId();
        if (me == null) {
            return Result.fail("请先登录");
        }
        List<MessageVO> all = collect(me, lastReadAt(me));
        // 三类合并之后统一按时间倒序。派生消息没有全局有序的天然来源，
        // 只能在内存里排一次；总量是本用户收到的互动数，量级很小。
        all.sort(Comparator.comparing(MessageVO::getCreateTime,
                Comparator.nullsLast(Comparator.reverseOrder())));

        int total = all.size();
        int page = current == null || current < 1 ? 1 : current;
        int from = Math.min((page - 1) * PAGE_SIZE, total);
        int to = Math.min(from + PAGE_SIZE, total);

        int unread = 0;
        for (MessageVO m : all) {
            if (Boolean.TRUE.equals(m.getUnread())) {
                unread++;
            }
        }
        Map<String, Object> data = new LinkedHashMap<>(4);
        data.put("list", all.subList(from, to));
        data.put("total", total);
        data.put("unread", unread);
        return Result.ok(data);
    }

    @Override
    public Result unread() {
        Long me = currentUserId();
        if (me == null) {
            // 没登录不是错误：底导的小红点只是不显示。返回 0 而不是 fail，
            // 免得每次访问首页都弹一个错误提示。
            return Result.ok(0);
        }
        int unread = 0;
        for (MessageVO m : collect(me, lastReadAt(me))) {
            if (Boolean.TRUE.equals(m.getUnread())) {
                unread++;
            }
        }
        return Result.ok(unread);
    }

    @Override
    public Result markRead() {
        Long me = currentUserId();
        if (me == null) {
            return Result.fail("请先登录");
        }
        // 位点推到"现在"。这里不加 TTL：一个用户一个 key，量有上界；
        // 加了 TTL 的话过期后所有历史消息会重新变成未读，那才是 bug。
        stringRedisTemplate.opsForValue()
                .set(RedisConstants.MESSAGE_READ_KEY + me, String.valueOf(System.currentTimeMillis()));
        return Result.ok();
    }

    /* ------------------------------------------------------------------ 内部 */

    /**
     * 把三类互动拼成一个列表。lastRead 之前的算已读、之后的算未读。
     */
    private List<MessageVO> collect(Long me, long lastRead) {
        List<MessageVO> out = new ArrayList<>();

        // 我的笔记：赞和评论都挂在这上面
        List<Blog> myBlogs = blogService.lambdaQuery()
                .select(Blog::getId, Blog::getTitle)
                .eq(Blog::getUserId, me)
                .orderByDesc(Blog::getId)
                .last("limit " + MAX_SCAN_BLOGS)
                .list();
        Map<Long, String> titles = new HashMap<>();
        List<Long> blogIds = new ArrayList<>();
        for (Blog b : myBlogs) {
            titles.put(b.getId(), b.getTitle());
            blogIds.add(b.getId());
        }

        // ---- 1. 谁赞了我的笔记 ----
        for (Long blogId : blogIds) {
            Set<ZSetOperations.TypedTuple<String>> tuples = stringRedisTemplate.opsForZSet()
                    .rangeWithScores(RedisConstants.BLOG_LIKED_KEY + blogId, 0, -1);
            if (tuples == null || tuples.isEmpty()) {
                continue;
            }
            for (ZSetOperations.TypedTuple<String> t : tuples) {
                if (t.getValue() == null) {
                    continue;
                }
                Long uid;
                try {
                    uid = Long.valueOf(t.getValue());
                } catch (NumberFormatException e) {
                    continue;   // 脏数据不该让整个消息列表挂掉
                }
                if (uid.equals(me)) {
                    // 自己赞自己不算通知，否则每次给自己点个赞都会收到一条消息
                    continue;
                }
                // ZSet 的 score 就是点赞那一刻的时间戳，所以这里不用额外查时间
                long ts = t.getScore() == null ? 0L : t.getScore().longValue();
                MessageVO m = base("like", uid, toTime(ts), lastRead);
                m.setBlogId(blogId);
                m.setBlogTitle(titles.get(blogId));
                out.add(m);
            }
        }

        // ---- 2. 谁关注了我 ----
        for (Follow f : followService.lambdaQuery()
                .eq(Follow::getFollowUserId, me)
                .orderByDesc(Follow::getId)
                .last("limit 200")
                .list()) {
            out.add(base("follow", f.getUserId(), f.getCreateTime(), lastRead));
        }

        // ---- 3. 谁评论了我的笔记 ----
        if (!blogIds.isEmpty()) {
            for (BlogComments c : blogCommentsService.lambdaQuery()
                    .in(BlogComments::getBlogId, blogIds)
                    .orderByDesc(BlogComments::getId)
                    .last("limit 200")
                    .list()) {
                if (me.equals(c.getUserId())) {
                    continue;   // 自己评论自己不算通知
                }
                MessageVO m = base("comment", c.getUserId(), c.getCreateTime(), lastRead);
                m.setBlogId(c.getBlogId());
                m.setBlogTitle(titles.get(c.getBlogId()));
                m.setContent(c.getContent());
                out.add(m);
            }
        }

        fillUsers(out);
        return out;
    }

    /** 建一条消息骨架并把未读标记算好 */
    private MessageVO base(String type, Long fromUserId, LocalDateTime time, long lastRead) {
        MessageVO m = new MessageVO();
        m.setType(type);
        m.setFromUserId(fromUserId);
        m.setCreateTime(time);
        m.setUnread(time != null && toMillis(time) > lastRead);
        return m;
    }

    /**
     * 一次性把所有发送者的昵称/头像填上。
     * 不在上面的循环里逐个查用户 —— 那就是 N+1。
     */
    private void fillUsers(List<MessageVO> list) {
        if (list.isEmpty()) {
            return;
        }
        List<Long> ids = new ArrayList<>();
        for (MessageVO m : list) {
            if (m.getFromUserId() != null && !ids.contains(m.getFromUserId())) {
                ids.add(m.getFromUserId());
            }
        }
        Map<Long, User> users = new HashMap<>();
        if (!ids.isEmpty()) {
            for (User u : userService.listByIds(ids)) {
                users.put(u.getId(), u);
            }
        }
        for (MessageVO m : list) {
            User u = users.get(m.getFromUserId());
            m.setFromName(u == null || u.getNickName() == null || u.getNickName().isEmpty()
                    ? "已注销用户" : u.getNickName());
            m.setFromIcon(u == null ? null : u.getIcon());
        }
    }

    /** 上次已读时间戳（毫秒）。没读过就返回 0，于是所有消息都算未读 */
    private long lastReadAt(Long me) {
        String v = stringRedisTemplate.opsForValue().get(RedisConstants.MESSAGE_READ_KEY + me);
        if (v == null) {
            return 0L;
        }
        try {
            return Long.parseLong(v);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private static LocalDateTime toTime(long epochMilli) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZoneId.systemDefault());
    }

    private static long toMillis(LocalDateTime t) {
        return t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private Long currentUserId() {
        UserDTO user = UserHolder.getUser();
        return user == null ? null : user.getId();
    }
}
