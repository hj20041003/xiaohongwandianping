package com.xhw.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import com.xhw.dto.ScrollResult;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Blog;
import com.xhw.entity.Follow;
import com.xhw.entity.Shop;
import com.xhw.entity.User;
import com.xhw.mapper.BlogMapper;
import com.xhw.service.IBlogService;
import com.xhw.service.IFollowService;
import com.xhw.service.IShopService;
import com.xhw.service.IUserService;
import com.xhw.utils.RedisConstants;
import com.xhw.utils.SystemConstants;
import com.xhw.utils.UserHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class BlogServiceImpl extends ServiceImpl<BlogMapper, Blog> implements IBlogService {
    @Resource
    private IUserService userService;
    @Resource
    private IFollowService followService;
    @Resource
    private IShopService shopService;
    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public Result queryHotBlog(Integer current, RegionQuery region, String sort) {
        Page<Blog> page;
        if (region != null && !region.isAll()) {
            // tb_blog 上没有省市区——区域是商铺的属性，只能先按区域把店铺 id 捞出来，
            // 再用 shop_id in (...) 过滤笔记。这是一次额外的查询，但店铺表很小
            // （种子数据 84 行），比给笔记表再加两列冗余区域要干净得多。
            List<Long> shopIds = shopService.shopIdsIn(region);
            if (shopIds.isEmpty()) {
                // 该城一家店都没有 -> 必然没有笔记。这里必须短路：
                // in(空集合) 在 MyBatis-Plus 里会拼出 "shop_id IN ()"，是非法 SQL，直接 500。
                return Result.ok(Collections.emptyList());
            }
            page = query().in("shop_id", shopIds)
                    .orderByDesc(sortColumn(sort))
                    .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        } else {
            // 不按城市过滤时走的就是原版那条 SQL，行为完全不变（除了排序方式）
            page = query().orderByDesc(sortColumn(sort))
                    .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        }
        // 获取当前页数据
        List<Blog> records = page.getRecords();
        // 补上「这条笔记是哪家店、在哪座城」——首页「全国」视图要靠它标城市
        fillShopInfo(records);
        // 查询用户
        records.forEach(blog -> {
            queryBlogUser(blog);
            isBlogLiked(blog);
        });
        return Result.ok(records);
    }

    @Override
    public Result searchBlog(String keyword, Integer current, RegionQuery region, String sort) {
        String kw = keyword == null ? "" : keyword.trim();
        if (kw.isEmpty()) {
            // 空关键词不是"搜索全部"，是"没搜" —— 直接回空列表，
            // 否则用户刚点进搜索框就看到一个假的结果
            return Result.ok(Collections.emptyList());
        }
        // LIKE 的通配符要转义，否则用户搜 "%" 会把全表都匹配出来
        String like = "%" + escapeLike(kw) + "%";
        String column = sortColumn(sort);

        Page<Blog> page;
        if (region != null && !region.isAll()) {
            List<Long> shopIds = shopService.shopIdsIn(region);
            if (shopIds.isEmpty()) {
                return Result.ok(Collections.emptyList());
            }
            page = query().in("shop_id", shopIds)
                    .and(w -> w.like("title", like).or().like("content", like))
                    .orderByDesc(column)
                    .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        } else {
            page = query()
                    .and(w -> w.like("title", like).or().like("content", like))
                    .orderByDesc(column)
                    .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        }
        List<Blog> records = page.getRecords();
        fillShopInfo(records);
        records.forEach(blog -> {
            queryBlogUser(blog);
            isBlogLiked(blog);
        });
        return Result.ok(records);
    }

    /**
     * 排序字段白名单。
     * <p>
     * <b>这里必须是白名单，不能把前端传的 sort 直接拼进 order by。</b>
     * 拼字符串 = SQL 注入。而且就算不注入，"排序列名"这种从参数来的东西
     * 天然只该在一份固定清单里挑。
     */
    private static String sortColumn(String sort) {
        return "new".equals(sort) ? "create_time" : "liked";
    }

    /**
     * 转义 LIKE 里的通配符。MySQL 默认的 LIKE 没有默认转义符
     * （要自己写 ESCAPE），所以这里用反斜杠转义，跟 MySQL 的行为对齐。
     */
    private static String escapeLike(String kw) {
        return kw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /**
     * 批量把笔记对应的店铺名与城市填进去（不改库，只填 {@code @TableField(exist = false)} 字段）。
     * <p>
     * 一次 listByIds 查完，避免在循环里逐条查库。
     */
    private void fillShopInfo(List<Blog> blogs) {
        if (blogs == null || blogs.isEmpty()) {
            return;
        }
        Set<Long> shopIds = blogs.stream()
                .map(Blog::getShopId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (shopIds.isEmpty()) {
            return;
        }
        Map<Long, Shop> shopMap = shopService.listByIds(shopIds).stream()
                .collect(Collectors.toMap(Shop::getId, s -> s, (a, b) -> a));
        for (Blog blog : blogs) {
            Shop shop = shopMap.get(blog.getShopId());
            if (shop != null) {
                blog.setShopName(shop.getName());
                blog.setCity(shop.getCity());
            }
        }
    }

    @Override
    public Result queryBlogById(Long id) {
        //查询blog
        Blog blog = getById(id);
        if (blog == null) {
            return Result.fail("博客不存在");
        }
        queryBlogUser(blog);
        isBlogLiked(blog);
        return Result.ok(blog);
    }

    @Override
    public Result likeBlog(Long id) {
        //获取当前登陆用户
        Long userId = UserHolder.getUser().getId();
        //判断当前用户是否点赞
        String key = RedisConstants.BLOG_LIKED_KEY + id;
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        if (score == null) {
            //如果未点赞 可以点赞
            //写数据库
            boolean isSuccess = update().setSql("liked=liked+1").eq("id", id).update();
            //保存数据到redis
            if (isSuccess) {
                stringRedisTemplate.opsForZSet().add(key, userId.toString(), System.currentTimeMillis());
                // 笔记被赞，作者 +1 积分。自己赞自己不给分
                Blog target = getById(id);
                if (target != null && !userId.equals(target.getUserId())) {
                    userService.addCredits(target.getUserId(), 1);
                }
            }
        } else {
            //如果已经点赞 取消点赞
            //数据库-1
            boolean isSuccess = update().setSql("liked=liked-1").eq("id", id).update();
            //redis删除数据
            if (isSuccess) {
                stringRedisTemplate.opsForZSet().remove(key, userId.toString());
                // 取消赞要把那 1 分退回去，否则来回点几次就能刷积分
                Blog target = getById(id);
                if (target != null && !userId.equals(target.getUserId())) {
                    userService.addCredits(target.getUserId(), -1);
                }
            }
        }
        return Result.ok();
    }

    @Override
    public Result queryBlogLikesById(Long id) {
        String key = RedisConstants.BLOG_LIKED_KEY + id;
        //查询top5的点赞用户
        Set<String> top5 = stringRedisTemplate.opsForZSet().range(key, 0, 4);
        if (top5 == null || top5.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        //解析出用户id
        List<Long> userIds = top5.stream().map(Long::valueOf).collect(Collectors.toList());
        String join = StrUtil.join(",", userIds);
        //根据id查询用户
        List<UserDTO> userDTOS = userService.lambdaQuery()
                .in(User::getId, userIds)
                .last("order by field(id," + join + ")")
                .list()
                .stream().map(user ->
                        BeanUtil.copyProperties(user, UserDTO.class)
                ).collect(Collectors.toList());
        //返回
        return Result.ok(userDTOS);
    }

    @Override
    public Result saveBlog(Blog blog) {
        // 获取登录用户
        UserDTO user = UserHolder.getUser();
        blog.setUserId(user.getId());
        // 保存探店博文
        boolean isSuccess = save(blog);
        if (!isSuccess) {
            return Result.fail("新增笔记失败");
        }
        // 发帖 +10 积分（规则见 IUserService.addCredits 的注释）
        userService.addCredits(user.getId(), 10);
        //查询笔记作者的所有粉丝
        List<Follow> follows = followService.lambdaQuery()
                .eq(Follow::getFollowUserId, user.getId())
                .list();
        //推送笔记给所有粉丝
        for (Follow follow : follows) {
            Long userId = follow.getUserId();
            //推送
            String key = "feed:" + userId;
            stringRedisTemplate.opsForZSet().add(key, blog.getId().toString(), System.currentTimeMillis());
        }
        // 返回id
        return Result.ok(blog.getId());
    }

    @Override
    public Result queryBlogOfFollow(Long max, Integer offset) {
        //获取当前用户
        UserDTO user = UserHolder.getUser();
        //查询收件箱
        String key = "feed:" + user.getId();
        Set<ZSetOperations.TypedTuple<String>> typedTuples = stringRedisTemplate.opsForZSet()
                .reverseRangeByScoreWithScores(key, 0, max, offset, 2);
        //非空判断
        if (typedTuples == null || typedTuples.isEmpty()) {
            return Result.ok();
        }
        //解析数据 blogId minTime offset
        List<Long> ids = new ArrayList<>(typedTuples.size());
        long minTime = 0;
        int os = 1;
        for (ZSetOperations.TypedTuple<String> typedTuple : typedTuples) {
            //获取id
            String blogId = typedTuple.getValue();
            ids.add(Long.valueOf(blogId));
            long time = typedTuple.getScore().longValue();
            if (time == minTime) {
                os++;
            } else {
                minTime = time;
                os = 1;
            }
        }
        //根据id查询blog
        List<Blog> blogs = new ArrayList<>(ids.size());
        for (Long id : ids) {
            Blog blog = getById(id);
            blogs.add(blog);
        }
        blogs.forEach(this::isBlogLiked);
        //封装 返回
        ScrollResult scrollResult = new ScrollResult();
        scrollResult.setList(blogs);
        scrollResult.setOffset(os);
        scrollResult.setMinTime(minTime);
        return Result.ok(scrollResult);
    }

    private void queryBlogUser(Blog blog) {
        Long userId = blog.getUserId();
        User user = userService.getById(userId);
        blog.setName(user.getNickName());
        blog.setIcon(user.getIcon());
    }

    private void isBlogLiked(Blog blog) {
        //获取当前登陆用户
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return;
        }
        Long userId = user.getId();
        //判断当前用户是否点赞
        String key = RedisConstants.BLOG_LIKED_KEY + blog.getId();
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        blog.setIsLike(score != null);
    }

}
