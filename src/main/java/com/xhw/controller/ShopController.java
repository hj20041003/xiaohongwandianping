package com.xhw.controller;


import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import com.xhw.entity.Shop;
import com.xhw.service.IRegionService;
import com.xhw.service.IShopService;
import com.xhw.utils.SystemConstants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/shop")
public class ShopController {

    /**
     * 写接口关闭时统一返回的话术。
     * <p>
     * 刻意说"暂未开放"而不是"无权限"：这是个**还没做的功能**（管理端），
     * 不是某个用户没权限。用"无权限"会让人以为是自己的问题。
     */
    private static final String WRITE_CLOSED = "门店维护功能暂未开放";

    /**
     * 门店写接口总开关。默认 false，原因见 application.yaml 里 xhw.shop-write-enabled 的注释：
     * tb_shop 没有 owner_id，系统里根本没有"谁有权改这家店"这个信息，
     * 开着就是任何登录用户都能改任意一家店。
     */
    @Value("${xhw.shop-write-enabled:false}")
    private boolean shopWriteEnabled;

    @Resource
    public IShopService shopService;

    @Resource
    public IRegionService regionService;

    /**
     * 根据id查询商铺信息
     *
     * @param id 商铺id
     * @return 商铺详情数据
     */
    @GetMapping("/{id}")
    public Result queryShopById(@PathVariable("id") Long id) {
        return shopService.queryById(id);
    }

    /**
     * 新增商铺信息
     *
     * @param shop 商铺数据
     * @return 商铺id
     */
    @PostMapping
    public Result saveShop(@RequestBody Shop shop) {
        if (!shopWriteEnabled) {
            return Result.fail(WRITE_CLOSED);
        }
        // 写入数据库
        shopService.save(shop);
        return Result.ok();
    }

    /**
     * 更新商铺信息
     *
     * @param shop 商铺数据
     * @return 无
     */
    @PutMapping
    public Result updateShop(@RequestBody Shop shop) {
        if (!shopWriteEnabled) {
            return Result.fail(WRITE_CLOSED);
        }
        // 写入数据库
        return shopService.update(shop);
    }

    /**
     * 根据商铺类型分页查询商铺信息
     *
     * @param typeId  商铺类型
     * @param current 页码
     * @param city    城市；不传或传「全国」= 不按城市过滤
     * @return 商铺列表
     */
    @GetMapping("/of/type")
    public Result queryShopByType(
            @RequestParam("typeId") Integer typeId,
            @RequestParam(value = "current", defaultValue = "1") Integer current,
            @RequestParam(value = "x", required = false) Double x,
            @RequestParam(value = "y", required = false) Double y,
            @RequestParam(value = "province", required = false) String province,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district
    ) {
        return shopService.queryShopByType(typeId, current, x, y, region(province, city, district));
    }

    /**
     * 全国省-市-区三级树（带每个市的门店数）
     * <p>
     * 这是"选城市"选择器的数据源，和 {@code /shop/cities} 的区别是：
     * 前者只有**有门店的城市**（用来算 GEO 原点），后者是**全国完整区划**（用来选）。
     * 两个都要有：前者算距离，后者给用户挑。
     */
    @GetMapping("/regions")
    public Result queryRegions() {
        return regionService.queryRegions();
    }

    /**
     * 有商铺的城市列表（首页/店铺列表页的城市选择器用）
     *
     * @return [{name, count, x, y}, ...]
     */
    @GetMapping("/cities")
    public Result queryCities() {
        return shopService.queryCities();
    }

    /**
     * 全国门店地址目录：按城市分组，带上每座城的全部门店（地址簿的「门店」那一栏用）
     * <p>
     * 必须显式声明这条字面量映射，否则 {@code /shop/directory} 会被
     * {@code @GetMapping("/{id}")} 接走，"directory" 转 Long 失败 → 400。
     * Spring 的路径匹配里字面量优先于变量，所以只要写了这条就一定命中它。
     *
     * @return [{name, count, x, y, shops:[...]}, ...]
     */
    @GetMapping("/directory")
    public Result queryDirectory() {
        return shopService.queryDirectory();
    }

    /**
     * 根据商铺名称关键字分页查询商铺信息
     *
     * @param name    商铺名称关键字
     * @param current 页码
     * @param city    城市；不传或传「全国」= 不按城市过滤
     * @return 商铺列表
     */
    @GetMapping("/of/name")
    public Result queryShopByName(
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "current", defaultValue = "1") Integer current,
            @RequestParam(value = "province", required = false) String province,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district
    ) {
        RegionQuery region = region(province, city, district);
        // 根据类型分页查询
        Page<Shop> page = shopService.query()
                .like(StrUtil.isNotBlank(name), "name", name)
                .eq(StrUtil.isNotBlank(region.getProvince()), "province", region.getProvince())
                .eq(StrUtil.isNotBlank(region.getCity())
                        && !SystemConstants.NATIONWIDE.equals(region.getCity()), "city", region.getCity())
                .eq(StrUtil.isNotBlank(region.getDistrict()), "district", region.getDistrict())
                .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        // 返回数据
        return Result.ok(page.getRecords());
    }

    /** 三个可选参数打包成筛选条件；空字符串按"没传"处理 */
    private RegionQuery region(String province, String city, String district) {
        RegionQuery q = new RegionQuery();
        q.setProvince(StrUtil.trimToNull(province));
        q.setCity(StrUtil.trimToNull(city));
        q.setDistrict(StrUtil.trimToNull(district));
        return q;
    }
}
