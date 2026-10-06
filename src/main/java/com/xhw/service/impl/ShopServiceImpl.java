package com.xhw.service.impl;

import cn.hutool.core.util.StrUtil;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.RegionQuery;
import com.xhw.dto.Result;
import com.xhw.entity.Shop;
import com.xhw.mapper.ShopMapper;
import com.xhw.service.IShopService;
import com.xhw.utils.CacheClient;
import com.xhw.utils.SystemConstants;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.TimeUnit;

import static com.xhw.utils.RedisConstants.*;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService {
    @Resource
    private StringRedisTemplate stringRedisTemplate;
    @Resource
    private CacheClient cacheClient;

    @Override
    public Result queryById(Long id) {
//        缓存穿透
//        Shop shop = queryWithPassThrough(id);
//        Shop shop = cacheClient.queryWithPassThrough(CACHE_SHOP_KEY, id, Shop.class, this::getById, CACHE_SHOP_TTL, TimeUnit.MINUTES);
//        互斥锁解决缓存击穿
//        Shop shop = queryWithMutex(id);
//        逻辑过期解决缓存击穿
//        Shop shop = queryWithLogicalExpire(id);
        Shop shop = cacheClient.queryWithLogicalExpire(CACHE_SHOP_KEY, id, Shop.class, this::getById, CACHE_SHOP_TTL, TimeUnit.MINUTES);
        if (shop == null) {
            return Result.fail("店铺不存在");
        }
        return Result.ok(shop);
    }

    /**
     * 互斥锁解决缓存击穿
     *
     * @param id id
     * @return {@link Shop}
     */
    /*private Shop queryWithMutex(Long id) {
        String shopKey = CACHE_SHOP_KEY + id;
        //从redis中查询
        String shopJson = stringRedisTemplate.opsForValue().get(shopKey);
        //判断是否存在
        if (StringUtils.isNotEmpty(shopJson)) {
            //存在直接返回
            return JSONUtil.toBean(shopJson, Shop.class);
        }
        //判断控值
        if ("".equals(shopJson)) {
            return null;
        }
        //实现缓存重建
        //获取互斥锁
        String lockKey = LOCK_SHOP_KEY + id;
        Shop shop = null;
        try {
            boolean isLock = tryLock(lockKey);
            //是否获取成功
            if (!isLock) {
                //获取失败 休眠并且重试
                Thread.sleep(50);
                return queryWithMutex(id);
            }
            //成功 通过id查询数据库
            shop = getById(id);
            //模拟重建延时
            Thread.sleep(200);
            if (shop == null) {
                //redis写入空值
                stringRedisTemplate.opsForValue().set(shopKey, "", CACHE_NULL_TTL, TimeUnit.MINUTES);
                //数据库不存在 返回错误
                return null;
            }
            //数据库存在 写入redis
            stringRedisTemplate.opsForValue().set(shopKey, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            //释放互斥锁
            unLock(lockKey);
        }
        //返回
        return shop;
    }*/

    /**
     * 逻辑过期解决缓存击穿
     *
     * @param id id
     * @return {@link Shop}
     */
    /*private Shop queryWithLogicalExpire(Long id) {
        String shopKey = CACHE_SHOP_KEY + id;
        //从redis中查询
        String shopJson = stringRedisTemplate.opsForValue().get(shopKey);
        //判断是否存在
        if (StringUtils.isEmpty(shopJson)) {
            //不存在返回空
            return null;
        }
        //命中 反序列化
        RedisDate redisDate = JSONUtil.toBean(shopJson, RedisDate.class);
        JSONObject jsonObject = (JSONObject) redisDate.getData();
        Shop shop = BeanUtil.toBean(jsonObject, Shop.class);
        LocalDateTime expireTime = redisDate.getExpireTime();
        //判断是否过期
        if (expireTime.isAfter(LocalDateTime.now())) {
            //未过期 直接返回
            return shop;
        }
        //已过期
        //获取互斥锁
        String lockKey = LOCK_SHOP_KEY + id;
        boolean flag = tryLock(lockKey);
        //是否获取锁成功
        if (flag) {
            //成功 异步重建
            CACHE_REBUILD_EXECUTOR.submit(() -> {
                try {
                    this.saveShopToRedis(id, 20L);
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                } finally {
                    //释放锁
                    unLock(lockKey);
                }
            });
        }
        //返回过期商铺信息
        return shop;
    }*/

    /**
     * 使用设置空值解决缓存穿透
     */
   /* private Shop queryWithPassThrough(Long id) {
        String shopKey = CACHE_SHOP_KEY + id;
        //从redis中查询
        String shopJson = stringRedisTemplate.opsForValue().get(shopKey);
        //判断是否存在
        if (StringUtils.isNotEmpty(shopJson)) {
            //存在直接返回
            return JSONUtil.toBean(shopJson, Shop.class);
        }
        //判断空值
        if ("".equals(shopJson)) {
            return null;
        }
        //不存在 查询数据库
        Shop shop = getById(id);
        if (shop == null) {
            //redis写入空值
            stringRedisTemplate.opsForValue().set(shopKey, "", CACHE_NULL_TTL, TimeUnit.MINUTES);
            //数据库不存在 返回错误
            return null;
        }
        //数据库存在 写入redis
        stringRedisTemplate.opsForValue().set(shopKey, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);
        //返回
        return shop;
    }*/
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result update(Shop shop) {
        Long id = shop.getId();
        if (id == null) {
            return Result.fail("id不能为空");
        }
        //更新数据库
        updateById(shop);
        //删除缓存
        stringRedisTemplate.delete(CACHE_SHOP_KEY + shop.getId());
        return Result.ok();
    }

    @Override
    public Result queryShopByType(Integer typeId, Integer current, Double x, Double y, RegionQuery region) {
        // 判断是否需要坐标查询
        if (x == null || y == null) {
            //不需要坐标查询
            Page<Shop> page = applyRegion(lambdaQuery(), region)
                    .eq(Shop::getTypeId, typeId)
                    .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
            return Result.ok(page.getRecords());
        }
        //计算分页参数
        int from = (current - 1) * SystemConstants.MAX_PAGE_SIZE;
        int end = current * SystemConstants.MAX_PAGE_SIZE;
        //查询redis 距离排序 分页
        String key = SHOP_GEO_KEY + typeId;
        GeoResults<RedisGeoCommands.GeoLocation<String>> results = stringRedisTemplate.opsForGeo()
                .search(key
                        , GeoReference.fromCoordinate(x, y)
                        , new Distance(5000)
                        , RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().includeDistance().limit(end)
                );
        //解析出id
        if (results == null) {
            return Result.ok(Collections.emptyList());
        }
        List<GeoResult<RedisGeoCommands.GeoLocation<String>>> content = results.getContent();
        // GEO 里没有这个类型的坐标，或者坐标点全部落在 5km 半径之外时，这里必须立刻返回。
        // 少了这一步会继续往下走：ids 为空 -> StrUtil.join 得到空串
        // -> "order by field(id,)" 是非法 SQL -> 接口 500。
        if (content.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        if (content.size() < from) {
            //没有下一页
            return Result.ok();
        }
        //截取
        List<Long> ids = new ArrayList<>(content.size());
        Map<String, Distance> distanceMap = new HashMap<>();
        content.stream().skip(from).forEach(result -> {
            //店铺id
            String shopId = result.getContent().getName();
            ids.add(Long.valueOf(shopId));
            //距离
            Distance distance = result.getDistance();
            distanceMap.put(shopId, distance);
        });
        // 翻到超出范围的一页时 ids 会为空，同样要短路，否则还是那句非法 SQL
        if (ids.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        //根据id查询shop
        List<Shop> shopList = applyRegion(lambdaQuery(), region)
                .in(Shop::getId, ids)
                .list();
        // 按 GEO 返回的距离顺序重排。
        // 课程源码这里是 "order by field(id,...)"，那是 MySQL 专有函数，
        // H2 没有 FIELD()，这句 SQL 会直接抛
        // Function "FIELD" not found —— 也就是说换成 H2 之后「距离排序」一直是坏的。
        // 改成查出后在内存里按 ids 的顺序排，跟具体数据库无关。
        Map<Long, Integer> orderMap = new HashMap<>(ids.size());
        for (int i = 0; i < ids.size(); i++) {
            orderMap.put(ids.get(i), i);
        }
        shopList.sort(Comparator.comparingInt(s -> orderMap.getOrDefault(s.getId(), Integer.MAX_VALUE)));
        for (Shop shop : shopList) {
            Distance distance = distanceMap.get(shop.getId().toString());
            if (distance != null) {
                shop.setDistance(distance.getValue());
            }
        }
        return Result.ok(shopList);
    }

    /**
     * 把省 / 市 / 区条件拼到查询上。
     * <p>
     * 三个字段各自独立：传了哪级就加哪级的 where。
     * 「全国」这个伪城市名在这里被当成"不过滤"处理——它不是一座真实城市。
     * <p>
     * Geo 分支和非 Geo 分支都要调它一遍，漏掉哪一边就会出现
     * "带坐标查得到、不带坐标查不到"这种只在某一种入口复现的怪问题。
     */
    private LambdaQueryChainWrapper<Shop> applyRegion(LambdaQueryChainWrapper<Shop> q, RegionQuery region) {
        if (region == null || region.isAll()) {
            return q;
        }
        boolean hasProvince = StrUtil.isNotBlank(region.getProvince());
        boolean hasCity = StrUtil.isNotBlank(region.getCity())
                && !SystemConstants.NATIONWIDE.equals(region.getCity());
        boolean hasDistrict = StrUtil.isNotBlank(region.getDistrict());
        return q.eq(hasProvince, Shop::getProvince, region.getProvince())
                .eq(hasCity, Shop::getCity, region.getCity())
                .eq(hasDistrict, Shop::getDistrict, region.getDistrict());
    }

    @Override
    public List<Long> shopIdsIn(RegionQuery region) {
        return applyRegion(lambdaQuery().select(Shop::getId), region)
                .list().stream().map(Shop::getId).collect(Collectors.toList());
    }

    /**
     * 前端城市选择器里城市的展示顺序。
     * <p>
     * 不按 SQL 的默认排序来，是因为那样得到的是「上海、北京、广州…」这种按
     * Unicode 码位排的结果，跟用户的直觉顺序对不上。杭州排第一是因为原版种子
     * 数据就在杭州，那是这个项目的「主场」。
     */
    private static final List<String> CITY_ORDER = Arrays.asList(
            "杭州", "北京", "上海", "广州", "深圳", "成都", "重庆", "西安");

    @Override
    public Result queryCities() {
        // 分组统计交给数据库，别把 84 行全捞进内存再算
        List<Map<String, Object>> rows = listMaps(new QueryWrapper<Shop>()
                .select("city AS name", "count(*) AS cnt", "avg(x) AS lon", "avg(y) AS lat")
                .isNotNull("city")
                .ne("city", "")
                .groupBy("city"));
        if (rows == null || rows.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        List<Map<String, Object>> cities = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>(4);
            item.put("name", String.valueOf(pick(row, "name")));
            item.put("count", toLong(pick(row, "cnt")));
            // 城市中心点 = 该城所有商铺坐标的均值，前端拿它当 GEO 查询的原点
            item.put("x", toDouble(pick(row, "lon")));
            item.put("y", toDouble(pick(row, "lat")));
            cities.add(item);
        }
        // H2 的列别名一律转大写返回，MySQL 保留原样，所以不能直接 row.get("cnt")，
        // 必须忽略大小写找键，否则换个数据库这里就全是 null。
        cities.sort(Comparator
                .comparingInt((Map<String, Object> m) -> {
                    int i = CITY_ORDER.indexOf(m.get("name"));
                    return i < 0 ? CITY_ORDER.size() : i;
                })
                .thenComparing(m -> String.valueOf(m.get("name"))));
        return Result.ok(cities);
    }

    @Override
    public Result queryDirectory() {
        // 不 select images：地址簿要的是"地址"不是图片墙，
        // 而 images 是这张表最长的一列（最多 1024 字符），带上它响应体积会翻几倍。
        List<Shop> shops = lambdaQuery()
                .select(Shop::getId, Shop::getName, Shop::getTypeId,
                        Shop::getProvince, Shop::getCity, Shop::getDistrict,
                        Shop::getArea, Shop::getAddress, Shop::getX, Shop::getY,
                        Shop::getAvgPrice, Shop::getScore, Shop::getSold,
                        Shop::getComments, Shop::getOpenHours)
                .orderByAsc(Shop::getId)
                .list();
        if (shops.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        Map<String, List<Shop>> byCity = new LinkedHashMap<>();
        for (Shop shop : shops) {
            String city = StrUtil.isBlank(shop.getCity()) ? "其他" : shop.getCity();
            byCity.computeIfAbsent(city, k -> new ArrayList<>()).add(shop);
        }
        // 输出顺序按 CITY_ORDER 走；不在名单里的城市（比如手工加的新城）排到最后，
        // 这样至少不会因为一个名字没登记就整块数据消失
        List<String> order = new ArrayList<>(CITY_ORDER);
        for (String city : byCity.keySet()) {
            if (!order.contains(city)) {
                order.add(city);
            }
        }
        List<Map<String, Object>> cities = new ArrayList<>(byCity.size());
        for (String city : order) {
            List<Shop> list = byCity.get(city);
            if (list == null || list.isEmpty()) {
                continue;
            }
            double sumX = 0, sumY = 0;
            int hasPos = 0;
            for (Shop shop : list) {
                if (shop.getX() != null && shop.getY() != null) {
                    sumX += shop.getX();
                    sumY += shop.getY();
                    hasPos++;
                }
            }
            Map<String, Object> item = new LinkedHashMap<>(5);
            item.put("name", city);
            item.put("count", list.size());
            item.put("x", hasPos == 0 ? null : round6(sumX / hasPos));
            item.put("y", hasPos == 0 ? null : round6(sumY / hasPos));
            item.put("shops", list);
            cities.add(item);
        }
        return Result.ok(cities);
    }

    /** 坐标保留 6 位小数，免得前端显示出 120.14631228571429 这种一长串 */
    private static double round6(double v) {
        return Math.round(v * 1_000_000d) / 1_000_000d;
    }

    /** 忽略大小写取 map 里的值（见 queryCities 里关于 H2 列名转大写的注释）。 */
    private static Object pick(Map<String, Object> row, String key) {
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (e.getKey().equalsIgnoreCase(key)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static Long toLong(Object v) {
        if (v == null) {
            return 0L;
        }
        return v instanceof Number ? ((Number) v).longValue() : Long.parseLong(v.toString());
    }

    private static Double toDouble(Object v) {
        if (v == null) {
            return null;
        }
        // H2/MySQL 的 avg() 返回 BigDecimal，直接强转 Double 会 ClassCastException
        return v instanceof Number ? ((Number) v).doubleValue() : Double.parseDouble(v.toString());
    }

//    private static final ExecutorService CACHE_REBUILD_EXECUTOR = Executors.newFixedThreadPool(10);

    /*    *//**
     * 获取锁
     *
     * @param key 关键
     * @return boolean
     *//*
    private boolean tryLock(String key) {
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", LOCK_SHOP_TTL, TimeUnit.SECONDS);
        return BooleanUtil.isTrue(flag);
    }

    *//**
     * 释放锁
     *
     * @param key 关键
     *//*
    private void unLock(String key) {
        stringRedisTemplate.delete(key);
    }

    *//**
     * 存入redis 携带逻辑过期时间
     *//*
    public void saveShopToRedis(Long id, Long expireSeconds) throws InterruptedException {
        //查询店铺数据
        Shop shop = getById(id);
        Thread.sleep(200);
        //封装逻辑过期
        RedisDate redisDate = new RedisDate();
        redisDate.setData(shop);
        redisDate.setExpireTime(LocalDateTime.now().plusSeconds(expireSeconds));
        //写了redis
        stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY + id, JSONUtil.toJsonStr(redisDate));
    }*/
}
