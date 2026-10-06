package com.xhw.config;

import com.xhw.entity.Shop;
import com.xhw.service.IShopService;
import com.xhw.utils.CacheClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static com.xhw.utils.RedisConstants.CACHE_SHOP_KEY;
import static com.xhw.utils.RedisConstants.CACHE_SHOP_TTL;

/**
 * 商铺缓存预热。
 * <p>
 * 课程中"缓存击穿 - 逻辑过期"方案的预热是手工调用单元测试完成的，
 * 缺了这一步，{@code ShopServiceImpl.queryById} 会因为 Redis 里没有缓存而
 * 直接返回"店铺不存在"（逻辑过期方案不查数据库，只读缓存）。
 * <p>
 * 这里改为应用启动时自动把 tb_shop 全部写入 Redis，实现开箱即跑。
 * 如不需要，可在 application.yaml 中设置：
 * <pre>
 * xhw:
 *   preheat-shop-cache: false
 * </pre>
 *
 * @author 改造
 */
@Slf4j
@Component
public class ShopCachePreheat implements ApplicationRunner {

    @Resource
    private IShopService shopService;

    @Resource
    private CacheClient cacheClient;

    @Value("${xhw.preheat-shop-cache:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("商铺缓存预热已关闭（xhw.preheat-shop-cache=false）");
            return;
        }
        try {
            List<Shop> shops = shopService.list();
            for (Shop shop : shops) {
                // 使用逻辑过期方案预热，与 ShopServiceImpl.queryById 保持一致
                cacheClient.setWithLogicalExpire(
                        CACHE_SHOP_KEY + shop.getId(), shop, CACHE_SHOP_TTL, TimeUnit.MINUTES);
            }
            log.info("商铺缓存预热完成，共写入 {} 条（key 前缀 {}，逻辑过期 {} 分钟）",
                    shops.size(), CACHE_SHOP_KEY, CACHE_SHOP_TTL);
        } catch (Exception e) {
            // 预热失败不应该阻断应用启动
            log.warn("商铺缓存预热失败（不影响启动，但店铺详情页可能为空）: {}", e.getMessage());
        }
    }
}
