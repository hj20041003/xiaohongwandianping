package com.xhw.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Favorites;
import com.xhw.mapper.FavoritesMapper;
import com.xhw.service.IBlogService;
import com.xhw.service.IFavoritesService;
import com.xhw.utils.UserHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;

/**
 * 笔记收藏。
 * <p>
 * 刻意不做成"点赞那种切换"：点赞是 {@code PUT /blog/like/{id}} 一次调用、
 * 内部判断加还是减；收藏如果也那样，接口语义就变成了"反一个开关"，
 * 前端得先知道当前状态才知道该发什么。这里拆成
 * {@link #add} / {@link #remove} 两个幂等方法，各自明确。
 *
 * @author 洪佳弘
 */
@Slf4j
@Service
public class FavoritesServiceImpl extends ServiceImpl<FavoritesMapper, Favorites>
        implements IFavoritesService {

    @Resource
    private IBlogService blogService;

    @Override
    public Result add(Long blogId) {
        UserDTO me = currentUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        if (blogId == null) {
            return Result.fail("缺少笔记 id");
        }
        // 笔记得真实存在，否则会收藏一个 404 的页面，而且永远不会被发现
        if (blogService.getById(blogId) == null) {
            return Result.fail("这篇笔记不存在");
        }
        Favorites f = new Favorites();
        // userId 一律取登录态，忽略前端传的（这里压根没有可传的字段）
        f.setUserId(me.getId());
        f.setBlogId(blogId);
        try {
            save(f);
        } catch (DuplicateKeyException e) {
            // uk_fav_user_blog 挡住了：说明已经收藏过了，幂等地当成成功
            log.debug("用户 {} 已收藏过笔记 {}，忽略重复收藏", me.getId(), blogId);
        }
        return Result.ok();
    }

    @Override
    public Result remove(Long blogId) {
        UserDTO me = currentUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        if (blogId == null) {
            return Result.fail("缺少笔记 id");
        }
        // 条件里带上 user_id：只能删自己的收藏行
        remove(wrapper(me.getId(), blogId));
        // 没收藏过也返回成功：取消收藏是幂等的，前端不用先查状态
        return Result.ok();
    }

    @Override
    public Result isFavorited(Long blogId) {
        UserDTO me = currentUser();
        if (me == null || blogId == null) {
            return Result.ok(false);
        }
        // 用显式 LambdaQueryWrapper，不用 lambdaQuery() 链式包装器 ——
        // 链式那套只能喂给 list()/page()，传给 count() 或 remove() 会抛
        //   MybatisPlusException: can not use this method for "getSqlFirst" / "getEntity"
        // （MyBatis-Plus 注入的 SQL 片段要取 ew.entity / ew.sqlFirst，
        //   而链式对象不是真正的 Wrapper，取不到。这个坑本轮踩了两次才定位。）
        // 另外这里也不用 count()：uk_fav_user_blog 保证最多一行，list() 判空就够。
        return Result.ok(list(wrapper(me.getId(), blogId)).size() > 0);
    }

    /** "我收藏了这篇" 的查询条件。抽出来是因为三处都要用同一套 where。 */
    private LambdaQueryWrapper<Favorites> wrapper(Long userId, Long blogId) {
        return new LambdaQueryWrapper<Favorites>()
                .eq(Favorites::getUserId, userId)
                .eq(Favorites::getBlogId, blogId);
    }

    private UserDTO currentUser() {
        return UserHolder.getUser();
    }
}
