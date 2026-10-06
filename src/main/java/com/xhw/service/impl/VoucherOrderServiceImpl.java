package com.xhw.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.OrderVO;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.SeckillVoucher;
import com.xhw.entity.Shop;
import com.xhw.entity.Voucher;
import com.xhw.entity.VoucherOrder;
import com.xhw.service.IShopService;
import com.xhw.service.IVoucherService;
import com.xhw.mapper.VoucherOrderMapper;
import com.xhw.service.ISeckillVoucherService;
import com.xhw.service.IVoucherOrderService;
import com.xhw.utils.RedisIdWorker;
import com.xhw.utils.UserHolder;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.annotation.Resource;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
@Slf4j
public class VoucherOrderServiceImpl extends ServiceImpl<VoucherOrderMapper, VoucherOrder> implements IVoucherOrderService {
    private static final DefaultRedisScript<Long> SECKILL_SCRIPT;
    //    private static final BlockingQueue<VoucherOrder> orderTasks=new ArrayBlockingQueue<>(1024*1024);
    private static final ExecutorService SECKILL_ORDER_EXECUTOR = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "seckill-order-consumer");
        // 设为守护线程：即使消费线程意外卡住，也不会阻止 JVM 正常退出
        t.setDaemon(true);
        return t;
    });

    /**
     * 消费线程运行标志。
     * <p>
     * 容器关闭（@PreDestroy）或 Redis 持续不可用时置为 false，
     * 避免线程陷入「异常 → 重试 → 再异常」的空转循环刷爆日志、拖住 JVM 无法退出。
     */
    private volatile boolean consumerRunning = true;

    static {
        SECKILL_SCRIPT = new DefaultRedisScript<>();
        SECKILL_SCRIPT.setLocation(new ClassPathResource("seckill.lua"));
        SECKILL_SCRIPT.setResultType(Long.class);
    }

    @Resource
    private ISeckillVoucherService seckillVoucherService;

    @Resource
    private IVoucherService voucherService;

    @Resource
    private IShopService shopService;
    @Resource
    private RedisIdWorker redisIdWorker;
    @Resource
    private RedissonClient redissonClient;
    @Resource
    private StringRedisTemplate stringRedisTemplate;
    /**
     * 自己注入自己为了获取代理对象 @Lazy 延迟注入 避免形成循环依赖
     */

    /**
     * 本实例在消费组里的名字，**按端口区分**。
     * <p>
     * 原来是写死的 {@code "c1"}。本机跑两个后端（IDEA 里一个 + 命令行一个）时，
     * 它们在 {@code g1} 里**共用同一个消费者身份**，于是谁先 XREADGROUP 谁拿到消息，
     * 订单就写进谁连着的库 —— 另一个库的订单列表永远是空的，
     * 表现为"下单成功但订单列表是空的"，很容易被当成代码 bug。
     * <p>
     * ⚠️ 端口必须从 {@link org.springframework.core.env.Environment} 取，
     * **不能用 {@code System.getProperty("server.port")}** ——
     * 那是 {@code --server.port=8082} 这种命令行参数进的是 Environment，不是 System 属性，
     * 结果所有实例都会拿到兜底值 8081、注册成同一个名字，等于没改。
     * <p>
     * 注意：这**只解决了"看不出来"**，没解决"抢消息"。
     * 多实例共用一个 Redis 又各连各的库时，订单仍然只会落到其中一个库 ——
     * 那是测试环境的问题；真正的多实例部署必须共用同一个数据库。
     */
    private String consumerName() {
        return "c1-" + environment.getProperty("server.port", "8081");
    }

    @Resource
    @Lazy
    private IVoucherOrderService voucherOrderService;

    @Resource
    private org.springframework.core.env.Environment environment;

    /**
     * 初始化方法，用于在对象构造完成后执行一次性的初始化操作。
     * 该方法利用Redis Stream处理秒杀订单的消费逻辑。
     * 通过持续从消息队列中读取消息并处理，实现了订单的异步处理。
     */
    @PostConstruct

    private void init() {
        // 启动时先确保 Stream 与消费组存在，否则下方 XREADGROUP 会抛
        // NOGROUP No such key 'stream.orders' / consumer group 'g1'
        // 顺带检测 Redis 是否支持 Stream：Redis 5.0 以下不支持，此时不启动消费线程，
        // 避免陷入 "异常 -> handlePendingList -> 再异常" 的死循环刷爆日志。
        if (!ensureStreamGroupExists()) {
            log.warn("============================================================");
            log.warn("  当前 Redis 不支持 Stream 命令（XADD/XREADGROUP）。");
            log.warn("  Stream 需要 Redis 5.0+，本课程推荐 Redis 6.2+。");
            log.warn("  秒杀下单功能已停用，其余功能（登录/缓存/点赞/关注/签到）不受影响。");
            log.warn("  升级 Redis 后重启应用即可自动恢复。");
            log.warn("============================================================");
            return;
        }

        SECKILL_ORDER_EXECUTOR.submit(() -> {
            String queueName = "stream.orders";
            int consecutiveErrors = 0;
            while (consumerRunning) {
                try {
                    // 从Redis Stream中读取消息
                    List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                            Consumer.from("g1", consumerName())
                            , StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2))
                            , StreamOffset.create(queueName, ReadOffset.lastConsumed())
                    );
                    // 判断是否成功获取到消息
                    if (list == null || list.isEmpty()) {
                        // 若未获取到消息，则继续尝试
                        continue;
                    }
                    consecutiveErrors = 0;
                    // 处理获取到的消息
                    MapRecord<String, Object, Object> record = list.get(0);
                    Map<Object, Object> values = record.getValue();
                    VoucherOrder voucherOrder = BeanUtil.fillBeanWithMap(values, new VoucherOrder(), true);
                    // 调用处理订单的逻辑
                    handleVoucherOrder(voucherOrder);
                    // 确认消息已被处理
                    stringRedisTemplate.opsForStream().acknowledge(queueName, "g1", record.getId());
                } catch (Exception e) {
                    if (!consumerRunning) {
                        break;
                    }
                    consecutiveErrors++;
                    // 处理异常情况，例如将订单加入重试列表
                    log.error("秒杀订单消费异常（连续第 {} 次）: {}", consecutiveErrors, e.getMessage());
                    handlePendingList();
                    // 连续失败到一定次数说明 Redis 已不可用（或连接池已销毁），
                    // 此时退出循环，避免无意义地空转刷日志。
                    if (consecutiveErrors >= 5) {
                        log.error("秒杀订单消费线程连续异常 {} 次，已停止消费。"
                                + "请检查 Redis 是否可用，修复后重启应用即可恢复。", consecutiveErrors);
                        break;
                    }
                    try {
                        // 退避等待，避免高频重试
                        Thread.sleep(1000L * consecutiveErrors);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
            log.info("秒杀订单消费线程已退出。");
        });
    }

    /**
     * 容器关闭时停止消费线程，保证应用可正常退出。
     */
    @PreDestroy
    private void stopConsumer() {
        this.consumerRunning = false;
    }

    private void handlePendingList() {
        String queueName = "stream.orders";
        int errCount = 0;
        while (consumerRunning) {
            try {
                //从消息队列中获取订单信息
                List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                        Consumer.from("g1", consumerName())
                        , StreamReadOptions.empty().count(1)
                        , StreamOffset.create(queueName, ReadOffset.from("0"))
                );
                //判断消息时候获取成功
                if (list == null || list.isEmpty()) {
                    //获取失败 没有消息 继续循环
                    break;
                }
                //获取成功 解析消息
                MapRecord<String, Object, Object> record = list.get(0);
                Map<Object, Object> values = record.getValue();
                VoucherOrder voucherOrder = BeanUtil.fillBeanWithMap(values, new VoucherOrder(), true);
                //下单
                handleVoucherOrder(voucherOrder);
                //ack确认消息
                stringRedisTemplate.opsForStream().acknowledge(queueName, "g1", record.getId());
            } catch (Exception e) {
                errCount++;
                log.error("处理 pending 消息失败（连续第 {} 次）: {}", errCount, e.getMessage());
                // 连不上时不要死循环：失败几次就放弃本轮，交给上层判断
                if (errCount >= 3) {
                    log.error("pending 列表连续处理失败，放弃本轮（Redis 可能已不可用）。");
                    break;
                }
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }

    /**
     * 确保 Redis Stream 及其消费组存在。
     * <p>
     * 原版代码假定 stream.orders 与 g1 消费组已由人工预先创建，
     * 直接启动会抛 NOGROUP。这里用原生命令 XGROUP CREATE ... MKSTREAM
     * 一次性把 stream 和 group 都建出来，MKSTREAM 保证 key 不存在时也能创建。
     * 该操作幂等：组已存在时 Redis 返回 BUSYGROUP，此处忽略即可。
     *
     * @return true 表示当前 Redis 可用 Stream；false 表示版本过低不支持
     */
    private boolean ensureStreamGroupExists() {
        final String queueName = "stream.orders";
        final String groupName = "g1";
        try {
            stringRedisTemplate.execute((RedisCallback<Object>) connection -> {
                connection.execute("XGROUP",
                        "CREATE".getBytes(),
                        queueName.getBytes(),
                        groupName.getBytes(),
                        "0".getBytes(),
                        "MKSTREAM".getBytes());
                return null;
            });
            log.info("已初始化 Redis Stream 消费组 {} / {}", queueName, groupName);
            return true;
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("BUSYGROUP")) {
                // 消费组已存在，正常情况
                log.info("Redis Stream 消费组 {} / {} 已存在，跳过创建", queueName, groupName);
                return true;
            }
            if (msg.contains("unknown command") || msg.contains("XGROUP")) {
                // Redis 版本过低（< 5.0），不支持 Stream
                return false;
            }
            log.warn("初始化 Redis Stream 消费组失败（秒杀下单功能可能不可用）: {}", msg);
            return false;
        }
    }

    private void handleVoucherOrder(VoucherOrder voucherOrder) {
        Long userId = voucherOrder.getUserId();
        //创建锁对象（兜底）
        RLock lock = redissonClient.getLock("lock:order:" + userId);
        //获取锁
        boolean isLock = lock.tryLock();
        //判断是否获取锁成功
        if (!isLock) {
            //获取失败,返回错误或者重试
            throw new RuntimeException("发送未知错误");
        }
        try {
            voucherOrderService.createVoucherOrder(voucherOrder);
        } finally {
            //释放锁
            lock.unlock();
        }

    }

    /**
     * 秒杀优惠券(消息队列)
     *
     * @param voucherId 券id
     * @return {@link Result}
     */
    @Override
    public Result seckillVoucher(Long voucherId) {
        //获取用户
        UserDTO user = UserHolder.getUser();
        //获取订单id
        Long orderId = redisIdWorker.nextId("order");
        //执行lua脚本
        Long res;
        try {
            res = stringRedisTemplate.execute(
                    SECKILL_SCRIPT
                    , Collections.emptyList()
                    , voucherId.toString()
                    , user.getId().toString()
                    , orderId.toString());
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("unknown command") || msg.contains("xadd")) {
                // 正常的 Lua 逻辑不会走到这里，除非 Redis 版本低于 5.0
                log.error("秒杀失败：当前 Redis 不支持 Stream 命令。请升级到 Redis 6.2+ 后重试。");
                return Result.fail("秒杀功能需要 Redis 5.0 以上版本，请升级 Redis");
            }
            throw e;
        }
        //判断结果是否为0
        int r = res.intValue();
        if (r != 0) {
            //不为0 没有购买资格
            return Result.fail(r == 1 ? "库存不足" : "禁止重复下单");
        }
        // 返回字符串而不是 Long：订单号是 19 位雪花号，JSON 数字在 JS 里
        // 会掉精度（2^53 上限），页面上"订单号 xxx"会显示成一个错的数。
        // 这里改成字符串，页面上显示的就是真号。
        return Result.ok(String.valueOf(orderId));
    }
    /**
     * 秒杀优惠券(异步)
     *
     * @param voucherId 券id
     * @return {@link Result}
     */
    /*@Override
    public Result seckillVoucher(Long voucherId) {
        //获取用户
        UserDTO user = UserHolder.getUser();
        //执行lua脚本
        Long res = stringRedisTemplate.execute(
                SECKILL_SCRIPT
                , Collections.emptyList()
                , voucherId.toString()
                ,user.getId().toString());
        //判断结果是否为0
        int r=res.intValue();
        if (r!=0){
            //不为0 没有购买资格
            return Result.fail(r==1?"库存不足":"禁止重复下单");
        }
        //为0有购买资格
        Long orderId = redisIdWorker.nextId("order");
        //创建订单
        VoucherOrder voucherOrder = new VoucherOrder();
        voucherOrder.setVoucherId(voucherId);
        voucherOrder.setUserId(UserHolder.getUser().getId());
        voucherOrder.setId(orderId);
        //存入阻塞队列
        orderTasks.add(voucherOrder);
        //返回订单id
        return Result.ok(orderId);
    }*/

    /**
     * 秒杀优惠券
     *
     * @param voucherId 券id
     * @return {@link Result}
     */
    /*@Override
    public Result seckillVoucher(Long voucherId) {
        //查询优惠券
        SeckillVoucher voucher = seckillVoucherService.getById(voucherId);
        //判断秒杀是否开始
        if (voucher.getBeginTime().isAfter(LocalDateTime.now())) {
            //秒杀尚未开始
            return Result.fail("秒杀尚未开始");
        }
        if (voucher.getEndTime().isBefore(LocalDateTime.now())) {
            //秒杀已经结束
            return Result.fail("秒杀已经结束");
        }
        //判断库存是否充足
        if (voucher.getStock() < 1) {
            //库存不足
            return Result.fail("库存不足");
        }
        Long userId = UserHolder.getUser().getId();
        //仅限单体应用使用
//        synchronized (userId.toString().intern()) {
//            //实现获取代理对象 比较复杂 我采用了自己注入自己的方式
//            IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
//            return voucherOrderService.getResult(voucherId);
//        }
        //创建锁对象
//        SimpleRedisLock simpleRedisLock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
        RLock lock = redissonClient.getLock("lock:order:" + userId);
        //获取锁
//        boolean isLock = simpleRedisLock.tryLock(1200L);
        boolean isLock = lock.tryLock();
        //判断是否获取锁成功
        if (!isLock){
            //获取失败,返回错误或者重试
            return Result.fail("一人一单哦！");
        }
        try {
            return voucherOrderService.getResult(voucherId);
        } finally {
            //释放锁
            lock.unlock();
        }
    }*/
    @Override
    @NotNull
    @Transactional(rollbackFor = Exception.class)
    public Result getResult(Long voucherId) {
        //是否下单
        Long userId = UserHolder.getUser().getId();
        Long count = lambdaQuery()
                .eq(VoucherOrder::getVoucherId, voucherId)
                .eq(VoucherOrder::getUserId, userId)
                .count();
        if (count > 0) {
            return Result.fail("禁止重复购买");
        }
        //扣减库存
        boolean isSuccess = seckillVoucherService.update(
                new LambdaUpdateWrapper<SeckillVoucher>()
                        .eq(SeckillVoucher::getVoucherId, voucherId)
                        .gt(SeckillVoucher::getStock, 0)
                        .setSql("stock=stock-1"));
        if (!isSuccess) {
            //库存不足
            return Result.fail("库存不足");
        }
        //创建订单
        VoucherOrder voucherOrder = new VoucherOrder();
        Long orderId = redisIdWorker.nextId("order");
        voucherOrder.setVoucherId(voucherId);
        voucherOrder.setUserId(UserHolder.getUser().getId());
        voucherOrder.setId(orderId);
        this.save(voucherOrder);
        //返回订单id
        return Result.ok(orderId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createVoucherOrder(VoucherOrder voucherOrder) {
        //扣减库存
        boolean isSuccess = seckillVoucherService.update(
                new LambdaUpdateWrapper<SeckillVoucher>()
                        .eq(SeckillVoucher::getVoucherId, voucherOrder.getVoucherId())
                        .gt(SeckillVoucher::getStock, 0)
                        .setSql("stock=stock-1"));
        //创建订单
        this.save(voucherOrder);
    }

    @Override
    public Result queryMyOrder(Integer current) {
        UserDTO me = UserHolder.getUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        int page = current == null || current < 1 ? 1 : current;
        Page<VoucherOrder> p = lambdaQuery()
                .eq(VoucherOrder::getUserId, me.getId())
                .orderByDesc(VoucherOrder::getId)
                .page(new Page<>(page, 8));
        if (p.getRecords().isEmpty()) {
            // 和 queryShopByType 一样的约定：只回 records，页大小由前端判断还有没有下一页
            return Result.ok(new java.util.ArrayList<OrderVO>());
        }

        // 券名、店名一次批量取，别在循环里逐个查（那是 N+1）
        java.util.List<Long> voucherIds = new java.util.ArrayList<>();
        for (VoucherOrder o : p.getRecords()) {
            if (!voucherIds.contains(o.getVoucherId())) {
                voucherIds.add(o.getVoucherId());
            }
        }
        java.util.Map<Long, Voucher> vouchers = new java.util.HashMap<>();
        for (Voucher v : voucherService.listByIds(voucherIds)) {
            vouchers.put(v.getId(), v);
        }
        java.util.List<Long> shopIds = new java.util.ArrayList<>();
        for (Voucher v : vouchers.values()) {
            if (v.getShopId() != null && !shopIds.contains(v.getShopId())) {
                shopIds.add(v.getShopId());
            }
        }
        java.util.Map<Long, Shop> shops = new java.util.HashMap<>();
        if (!shopIds.isEmpty()) {
            for (Shop sh : shopService.listByIds(shopIds)) {
                shops.put(sh.getId(), sh);
            }
        }

        java.util.List<OrderVO> out = new java.util.ArrayList<>(p.getRecords().size());
        for (VoucherOrder o : p.getRecords()) {
            Voucher v = vouchers.get(o.getVoucherId());
            OrderVO vo = new OrderVO();
            vo.setId(o.getId());
            vo.setVoucherId(o.getVoucherId());
            if (v != null) {
                vo.setVoucherTitle(v.getTitle());
                vo.setVoucherSubTitle(v.getSubTitle());
                vo.setShopId(v.getShopId());
                vo.setPayValue(v.getPayValue());
                vo.setActualValue(v.getActualValue());
            }
            Shop sh = shops.get(vo.getShopId());
            vo.setShopName(sh == null ? "门店已下线" : sh.getName());
            vo.setStatus(o.getStatus());
            vo.setStatusText(statusText(o.getStatus()));
            vo.setPayType(o.getPayType());
            vo.setPayTypeText(payTypeText(o.getPayType()));
            vo.setCreateTime(o.getCreateTime());
            vo.setPayTime(o.getPayTime());
            out.add(vo);
        }
        return Result.ok(out);
    }

    @Override
    public Result payMyOrder(Long orderId) {
        UserDTO me = UserHolder.getUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        // 越权 + 状态校验全写在 where 里：别人的订单（user_id 不匹配）和
        // 已经付过的订单（status != 1）都会被这一条挡住，返回影响 0 行
        boolean ok = update(new LambdaUpdateWrapper<VoucherOrder>()
                .eq(VoucherOrder::getId, orderId)
                .eq(VoucherOrder::getUserId, me.getId())
                .eq(VoucherOrder::getStatus, 1)
                .set(VoucherOrder::getStatus, 2)
                .set(VoucherOrder::getPayTime, LocalDateTime.now()));
        if (!ok) {
            return Result.fail("订单不存在或已支付");
        }
        return Result.ok();
    }

    /** 订单状态的中文案。和 DTO 注释里的约定一一对应 */
    private static String statusText(Integer status) {
        if (status == null) {
            return "未知";
        }
        switch (status) {
            case 1:
                return "待支付";
            case 2:
                return "已支付";
            case 3:
                return "已核销";
            case 4:
                return "已退款";
            default:
                return "未知";
        }
    }

    private static String payTypeText(Integer type) {
        if (type == null) {
            return "";
        }
        switch (type) {
            case 1:
                return "余额";
            case 2:
                return "微信";
            case 3:
                return "支付宝";
            case 4:
                return "花呗";
            default:
                return "";
        }
    }
}
