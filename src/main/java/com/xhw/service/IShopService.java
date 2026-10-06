package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import com.xhw.entity.Shop;

/**
 * <p>
 * 服务类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
public interface IShopService extends IService<Shop> {

    /**
     * 根据id查询商户信息
     *
     * @param id id
     * @return {@link Result}
     */
    Result queryById(Long id);

    /**
     * 更新店铺信息
     *
     * @param shop 商店
     * @return {@link Result}
     */
    Result update(Shop shop);

    /**
     * 按类型查询商店
     *
     * @param typeId  id类型
     * @param current 当前
     * @param x       x
     * @param y       y
     * @param region  省 / 市 / 区筛选条件；三级都为空 = 不过滤
     * @return {@link Result}
     */
    Result queryShopByType(Integer typeId, Integer current, Double x, Double y, RegionQuery region);

    /**
     * 查出某个区域下的所有店铺 id。
     * <p>
     * 笔记表上没有省市区（城市是店铺的属性），所以按区域筛笔记时得先拿到店铺 id。
     * 把这件事收在服务层，调用方就不用自己拼这一段了。
     *
     * @param region 区域条件；为空则返回全部店铺 id
     * @return 店铺 id 列表
     */
    java.util.List<Long> shopIdsIn(RegionQuery region);

    /**
     * 查询有商铺的城市列表（含每城店铺数与该城坐标中心）。
     * <p>
     * 返回的 x / y 是该城所有商铺坐标的平均值，前端拿它当「本地坐标」喂给
     * {@link #queryShopByType}——那个接口的 GEO 分支搜索半径是写死的 5000m，
     * 传城市中心点才能把这一城的店捞全，传别的城市的坐标就会一家都搜不到。
     *
     * @return {@link Result} data 为 [{name, count, x, y}, ...]
     */
    Result queryCities();

    /**
     * 全国门店地址目录：按城市分组，一次性返回所有门店。
     * <p>
     * 和 {@link #queryCities()} 的区别是这里把门店也带上了，供「地址簿」的
     * 门店那一栏用。之所以不写成"分页 + 按需加载"，是因为数据量是有上界的
     * （一个点评站的种子数据也就几十上百家），一次拿全换来的是
     * 前端可以直接按城市折叠、本地搜索，不用为每个城市各发一次请求。
     * <p>
     * 刻意**不返回 images 字段**：地址簿要的是"地址"，不是图片墙，
     * 而 images 是这张表里最长的一列（最多 1024 字符），
     * 84 家店全带上会让响应体积翻好几倍。
     *
     * @return {@link Result} data 为 [{name, count, x, y, shops:[...]}, ...]
     */
    Result queryDirectory();
}
