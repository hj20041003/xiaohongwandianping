package com.xhw.controller;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import cn.hutool.core.util.StrUtil;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Blog;
import com.xhw.entity.Favorites;
import com.xhw.service.IFavoritesService;
import com.xhw.service.IBlogService;
import com.xhw.utils.SystemConstants;
import com.xhw.utils.UserHolder;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/blog")
public class BlogController {

    @Resource
    private IBlogService blogService;

    @Resource
    private IFavoritesService favoritesService;

    @PostMapping
    public Result saveBlog(@RequestBody Blog blog) {
        return blogService.saveBlog(blog);
    }

    @PutMapping("/like/{id}")
    public Result likeBlog(@PathVariable("id") Long id) {
        // 修改点赞数量
        return blogService.likeBlog(id);
    }

    /**
     * 收藏一篇笔记（幂等，重复收藏不算错）
     */
    @PutMapping("/{id}/favorite")
    public Result favorite(@PathVariable("id") Long blogId) {
        return favoritesService.add(blogId);
    }

    /**
     * 取消收藏（幂等）
     */
    @DeleteMapping("/{id}/favorite")
    public Result unfavorite(@PathVariable("id") Long blogId) {
        return favoritesService.remove(blogId);
    }

    /**
     * 我有没有收藏这篇
     */
    @GetMapping("/{id}/favorite")
    public Result isFavorited(@PathVariable("id") Long blogId) {
        return favoritesService.isFavorited(blogId);
    }

    /**
     * 我的收藏（分页）。
     * <p>
     * 返回的形状和 {@code /blog/of/me} 一样：直接是 Blog 列表（没有外层包装），
     * 这样前端两个页面可以共用同一套渲染代码。
     * <p>
     * ⚠️ 这些接口都**不在** MvcConfig 的放行名单里 —— 收藏是私有数据，
     * 必须登录（LoginInterceptor 兜着）。未登录会被 401，前端 axios 拦截器会跳登录页。
     */
    @GetMapping("/of/favorite")
    public Result queryMyFavorite(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        // 显式 LambdaQueryWrapper（理由见 FavoritesServiceImpl 里的注释）
        Page<Favorites> favPage = favoritesService.page(
                new Page<>(current, SystemConstants.MAX_PAGE_SIZE),
                new LambdaQueryWrapper<Favorites>()
                        .eq(Favorites::getUserId, user.getId())
                        .orderByDesc(Favorites::getId));
        if (favPage.getRecords().isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        // 按收藏顺序（新的在前）把笔记取出来。
        // 一次性 listByIds 再按 id 顺序摆回去 —— 逐个 getById 循环就是 N+1
        List<Long> blogIds = new ArrayList<>();
        for (Favorites f : favPage.getRecords()) {
            if (!blogIds.contains(f.getBlogId())) {
                blogIds.add(f.getBlogId());
            }
        }
        Map<Long, Blog> blogMap = new HashMap<>();
        for (Blog b : blogService.listByIds(blogIds)) {
            blogMap.put(b.getId(), b);
        }
        List<Blog> ordered = new ArrayList<>();
        for (Long id : blogIds) {
            Blog b = blogMap.get(id);
            if (b != null) {
                ordered.add(b);
            }
        }
        return Result.ok(ordered);
    }

    @GetMapping("/of/me")
    public Result queryMyBlog(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        // 获取登录用户
        UserDTO user = UserHolder.getUser();
        // 根据用户查询
        // 显式按发布时间倒序：不写 order by 的话顺序由数据库决定，
        // 同一个人发两篇笔记时页面上可能是乱序的
        Page<Blog> page = blogService.query()
                .eq("user_id", user.getId())
                .orderByDesc("create_time")
                .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        // 获取当前页数据
        List<Blog> records = page.getRecords();
        return Result.ok(records);
    }

    /**
     * 热门笔记。
     * <p>
     * {@code city} 是后加的：不传或传「全国」就是原来的全站热榜；传具体城市时，
     * 后端顺着 shop_id 关联 tb_shop.city 筛出该城的笔记。
     * <p>
     * 注意这个接口在 MvcConfig 里是放行的（首页未登录也要能看），
     * 所以新增参数不能做成必填，否则老前端立刻 400。
     */
    /**
     * 搜笔记
     * <p>
     * 和 {@code /blog/hot} 一样**不要求登录**（首页未登录也要能搜），
     * 所以它得在 MvcConfig 的放行名单里。
     */
    /**
     * 把三个平铺的 query 参数收成一个 {@link RegionQuery}。
     * <p>
     * 三个参数各自要 trim + 空串转 null（空串会让 isAll() 判断失真），
     * 三个接口都要用，所以抽出来只写一份。
     */
    private RegionQuery region(String province, String city, String district) {
        RegionQuery r = new RegionQuery();
        r.setProvince(StrUtil.trimToNull(province));
        r.setCity(StrUtil.trimToNull(city));
        r.setDistrict(StrUtil.trimToNull(district));
        return r;
    }

    @GetMapping("/search")
    public Result searchBlog(@RequestParam("keyword") String keyword,
                             @RequestParam(value = "current", defaultValue = "1") Integer current,
                             @RequestParam(value = "sort", defaultValue = "new") String sort,
                             @RequestParam(value = "province", required = false) String province,
                             @RequestParam(value = "city", required = false) String city,
                             @RequestParam(value = "district", required = false) String district) {
        return blogService.searchBlog(keyword, current, region(province, city, district), sort);
    }

    @GetMapping("/hot")
    public Result queryHotBlog(@RequestParam(value = "current", defaultValue = "1") Integer current,
                               @RequestParam(value = "sort", defaultValue = "hot") String sort,
                               @RequestParam(value = "province", required = false) String province,
                               @RequestParam(value = "city", required = false) String city,
                               @RequestParam(value = "district", required = false) String district) {
        return blogService.queryHotBlog(current, region(province, city, district), sort);
    }

    @GetMapping("/{id}")
    public Result queryBlogById(@PathVariable("id") Long id) {
        return blogService.queryBlogById(id);
    }

    @GetMapping("/likes/{id}")
    public Result queryBlogLikesById(@PathVariable("id") Long id) {
        return blogService.queryBlogLikesById(id);
    }

    @GetMapping("/of/user")
    public Result queryBlogByUserId(@RequestParam(value = "current", defaultValue = "1") Integer current,
                                    @RequestParam("id") Long id) {
        Page<Blog> page = blogService.query().eq("user_id", id)
                .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));

        List<Blog> records = page.getRecords();
        return Result.ok(records);
    }

    @GetMapping("/of/follow")
    public Result queryBlogOfFollow(@RequestParam("lastId") Long max, @RequestParam(value = "offset", defaultValue = "0") Integer offset) {
        return blogService.queryBlogOfFollow(max, offset);
    }
}
