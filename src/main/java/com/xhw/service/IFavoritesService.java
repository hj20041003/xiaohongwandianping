package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.Result;
import com.xhw.entity.Favorites;

/**
 * 笔记收藏
 *
 * @author 洪佳弘
 */
public interface IFavoritesService extends IService<Favorites> {

    /**
     * 收藏一篇笔记（**幂等**）。
     * <p>
     * 重复收藏不算错：这和"点赞"不一样 —— 点赞是切换（点一下取消），
     * 收藏是显式开关（点一下收藏、再点一下取消），所以接口是分开的两个方法。
     * <p>
     * 表上有 {@code uk_fav_user_blog} 唯一索引，所以并发下两个人同时收藏同一篇
     * 也不会插出两行；这里 catch 住 DuplicateKeyException 就算成功。
     *
     * @param blogId 笔记 id
     * @return {@link Result}
     */
    Result add(Long blogId);

    /**
     * 取消收藏（幂等，收藏过才会真删）
     *
     * @param blogId 笔记 id
     * @return {@link Result}
     */
    Result remove(Long blogId);

    /**
     * 我有没有收藏这篇
     *
     * @param blogId 笔记 id
     * @return {@link Result} data 为 true / false
     */
    Result isFavorited(Long blogId);
}
