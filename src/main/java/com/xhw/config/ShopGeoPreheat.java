package com.xhw.config;

import com.xhw.entity.Shop;
import com.xhw.service.IShopService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.xhw.utils.RedisConstants.SHOP_GEO_KEY;

/**
 * 商铺 GEO 坐标预热。
 * <p>
 * 课程里的 {@code shop:geo:{typeId}} 是手工用单元测试 GEOADD 进去的，
 * 项目本身没有任何一处写入逻辑。缺了这份数据会连锁出一个 500：
 * <pre>
 *   /shop/of/type 带了 x、y  ->  走 GEO 分支
 *   查到空结果               ->  content 为空但 size(=0) < from(=0) 不成立，继续往下
 *   ids 为空                 ->  StrUtil.join(",", ids) == ""
 *   lambdaQuery().in(id, []) ->  "order by field(id,)" 这种非法 SQL
 *                            ->  接口 500「服务器异常」
 * </pre>
 * 而前端店铺列表页每次请求都带坐标，所以那一页此前一直打不开。
 * <p>
 * 这里改成启动时自动把 tb_shop 的经纬度灌进 Redis；同时
 * {@code ShopServiceImpl.queryShopByType} 也补了空结果短路，双重保险。
 * <p>
 * 如不需要，可在 application.yaml 中设置：
 * <pre>
 * xhw:
 *   preheat-shop-geo: false
 * </pre>
 */
@Slf4j
@Component
public class ShopGeoPreheat implements ApplicationRunner {

    @Resource
    private IShopService shopService;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Value("${xhw.preheat-shop-geo:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("商铺 GEO 预热已关闭（xhw.preheat-shop-geo=false）");
            return;
        }
        try {
            List<Shop> shops = shopService.list();
            Map<Long, List<Shop>> byType = shops.stream()
                    .filter(s -> s.getTypeId() != null && s.getX() != null && s.getY() != null)
                    .collect(Collectors.groupingBy(Shop::getTypeId));

            int total = 0;
            for (Map.Entry<Long, List<Shop>> entry : byType.entrySet()) {
                String key = SHOP_GEO_KEY + entry.getKey();
                // 先删再写，避免重复启动后残留上一次的坐标（清库重灌时会不一致）
                stringRedisTemplate.delete(key);
                for (Shop shop : entry.getValue()) {
                    stringRedisTemplate.opsForGeo().add(
                            key, new Point(shop.getX(), shop.getY()), shop.getId().toString());
                    total++;
                }
            }
            log.info("商铺 GEO 预热完成，{} 个类型共写入 {} 个坐标点（key 前缀 {}）",
                    byType.size(), total, SHOP_GEO_KEY);
        } catch (Exception e) {
            // 预热失败不应该阻断应用启动
            log.warn("商铺 GEO 预热失败（不影响启动，但「距离」排序会返回空）: {}", e.getMessage());
        }
    }
}
