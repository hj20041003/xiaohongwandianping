package com.xhw.config;

import com.xhw.entity.SeckillVoucher;
import com.xhw.service.ISeckillVoucherService;
import com.xhw.service.IVoucherOrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;
import java.util.Set;

import static com.xhw.utils.RedisConstants.SECKILL_STOCK_KEY;

/**
 * 秒杀状态预热。
 * <p>
 * 秒杀下单走的是一段 Lua 脚本（resources/seckill.lua），脚本第一步就是读
 * <pre>seckill:stock:{voucherId}</pre>
 * 判断库存是否充足。而课程原版里这个键只在"商家新增秒杀券"接口里写入，
 * 种子数据并不会写。于是 Redis 一旦重启（或换台机器部署），
 * 秒杀接口就会直接报：
 * <pre>
 * ERR user_script:21: attempt to compare nil with number
 * </pre>
 * 因为 {@code redis.call('get', ...)} 取到 nil，{@code tonumber(nil) <= 0} 在 Lua 中非法。
 * <p>
 * 这里在应用启动时把 tb_seckill_voucher 的库存同步进 Redis，保证开箱即用。
 * <p>
 * 同时处理"已下单用户集合"（{@code seckill:order:{voucherId}}）：
 * 当数据库里一条订单都没有时（例如本项目的 H2 内存库每次重启都重新灌种子数据），
 * Redis 里残留的"已下单用户"会造成"数据库没订单、却不让下单"的错位，
 * 因此一并清空，让两边状态对齐。
 * 反过来，如果检测到数据库已有订单（例如切回 MySQL 持久化部署），就不动 Redis，
 * 避免放开重复下单导致超卖。
 *
 * @author 改造
 */
@Slf4j
@Component
public class SeckillStockPreheat implements ApplicationRunner {

    @Resource
    private ISeckillVoucherService seckillVoucherService;

    @Resource
    private IVoucherOrderService voucherOrderService;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Value("${xhw.preheat-seckill-stock:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("秒杀状态预热已关闭（xhw.preheat-seckill-stock=false）");
            return;
        }
        try {
            // ---- 1. 库存同步 ----
            List<SeckillVoucher> vouchers = seckillVoucherService.list();
            for (SeckillVoucher sv : vouchers) {
                stringRedisTemplate.opsForValue()
                        .set(SECKILL_STOCK_KEY + sv.getVoucherId(), String.valueOf(sv.getStock()));
            }
            log.info("秒杀库存预热完成，共写入 {} 个券（key 前缀 {}）", vouchers.size(), SECKILL_STOCK_KEY);

            // ---- 2. 对齐"已下单用户集合" ----
            long dbOrderCount = voucherOrderService.count();
            if (dbOrderCount == 0) {
                Set<String> orderKeys = stringRedisTemplate.keys("seckill:order:*");
                if (orderKeys != null && !orderKeys.isEmpty()) {
                    stringRedisTemplate.delete(orderKeys);
                    log.info("数据库无订单，已清空 Redis 中 {} 个「已下单用户」集合，保持状态一致", orderKeys.size());
                }
            } else {
                log.info("数据库已有 {} 条订单，保留 Redis 中的「已下单用户」集合", dbOrderCount);
            }
        } catch (Exception e) {
            // 预热失败不应阻断应用启动
            log.warn("秒杀状态预热失败（不影响其它功能）: {}", e.getMessage());
        }
    }
}
