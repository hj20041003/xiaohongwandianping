package com.xhw.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xhw.dto.Result;
import com.xhw.entity.Region;
import com.xhw.entity.Shop;
import com.xhw.service.IRegionService;
import com.xhw.service.IShopService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 省市区行政区划服务实现。
 * <p>
 * 整棵树在 {@code @PostConstruct} 里读一次就常驻内存：68 KB、34 个省、414 个市、
 * 3233 个区，全量也只有几百 KB，放内存里比每次查库或读文件都划算，
 * 而且省掉了"并发首访时重复解析"这类问题。
 * <p>
 * ⚠️ <b>解析失败绝不能静默</b>：这棵树是三个接口筛选取值的基础，
 * 它要是空的，前端选择器会安静地变成一个空列表——正是最难查的那一类问题。
 * 所以这里读失败直接抛，表现为启动失败。
 *
 * @author 洪佳弘
 */
@Slf4j
@Service
public class RegionServiceImpl implements IRegionService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 启动时加载一次的省市区树，之后只读 */
    private volatile List<Region> tree = Collections.emptyList();

    /** 所有市名（去重后），用来校验个人资料里填的城市 */
    private volatile java.util.Set<String> cityNames = Collections.emptySet();

    @Resource
    private IShopService shopService;

    @PostConstruct
    public void load() {
        try (InputStream in = new ClassPathResource("regions.json").getInputStream()) {
            Region[] arr = MAPPER.readValue(in, Region[].class);
            int cities = 0, districts = 0;
            for (Region p : arr) {
                cities += p.getCities() == null ? 0 : p.getCities().size();
                if (p.getCities() != null) {
                    for (Region c : p.getCities()) {
                        districts += c.getDistricts() == null ? 0 : c.getDistricts().size();
                    }
                }
            }
            this.tree = java.util.Arrays.asList(arr);
            java.util.Set<String> names = new java.util.HashSet<>();
            for (Region p : arr) {
                if (p.getCities() == null) {
                    continue;
                }
                for (Region c : p.getCities()) {
                    names.add(c.getName());
                }
            }
            this.cityNames = names;
            log.info("省市区数据加载完成：{} 省 / {} 市 / {} 区", arr.length, cities, districts);
        } catch (Exception e) {
            // 抛出去让应用启动失败。静默降级成空树的话，症状是"城市选择器里什么都没有"，
            // 排查起来要绕一大圈，不如在这里就炸。
            throw new IllegalStateException("读取 classpath:regions.json 失败", e);
        }
    }

    @Override
    public boolean hasCity(String city) {
        if (city == null || city.trim().isEmpty()) {
            // 不填城市是允许的（新用户的资料就是空的）
            return true;
        }
        return cityNames.contains(city.trim());
    }

    @Override
    public Result queryRegions() {
        if (tree.isEmpty()) {
            return Result.fail("省市区数据还没加载好");
        }
        // 一次 group by 拿到「市 -> 区 -> 门店数」，别按城市循环查库。
        // 区一级的门店数是给选择器用的：光有区名没有数量的话，
        // 级联自动落到第一个区，而第一个区往往一家店都没有（行政区划的排序
        // 是按编码来的，跟有没有店完全无关），用户会一头撞上空列表。
        Map<String, Map<String, Long>> countByCityDistrict = new HashMap<>();
        List<Map<String, Object>> rows = shopService.listMaps(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Shop>()
                        .select("city", "district", "count(*) AS cnt")
                        .isNotNull("district")
                        .groupBy("city", "district"));
        for (Map<String, Object> row : rows) {
            Object city = pick(row, "city");
            Object district = pick(row, "district");
            Object cnt = pick(row, "cnt");
            if (city == null || district == null) {
                continue;
            }
            // 又是 H2 列名转大写那件事，见下面 pick 的注释
            long n = cnt instanceof Number ? ((Number) cnt).longValue() : 0L;
            countByCityDistrict
                    .computeIfAbsent(String.valueOf(city), k -> new HashMap<>())
                    .put(String.valueOf(district), n);
        }

        List<Map<String, Object>> out = new ArrayList<>(tree.size());
        for (Region prov : tree) {
            List<Region> cityList = prov.getCities();
            if (cityList == null || cityList.isEmpty()) {
                continue;
            }
            List<Map<String, Object>> cities = new ArrayList<>(cityList.size());
            for (Region city : cityList) {
                Map<String, Long> dCount = countByCityDistrict
                        .getOrDefault(city.getName(), Collections.emptyMap());
                long total = 0;
                List<Map<String, Object>> districts = new ArrayList<>();
                if (city.getDistricts() != null) {
                    for (String dn : city.getDistricts()) {
                        long n = dCount.getOrDefault(dn, 0L);
                        total += n;
                        Map<String, Object> d = new LinkedHashMap<>(2);
                        d.put("name", dn);
                        d.put("count", n);
                        districts.add(d);
                    }
                }
                Map<String, Object> item = new LinkedHashMap<>(5);
                item.put("name", city.getName());
                item.put("x", city.getX());
                item.put("y", city.getY());
                // count 用「逐区累加」而不是 city 的 group by：
                // 种子数据里每家店都填了区，两者应当相等；一旦有店的 district 为 null，
                // 这里会比 city 的计数少，正好把"有店但没填区"这种脏数据暴露出来。
                item.put("count", total);
                item.put("districts", districts);
                cities.add(item);
            }
            Map<String, Object> provItem = new LinkedHashMap<>(3);
            provItem.put("name", prov.getName());
            provItem.put("x", prov.getX());
            provItem.put("y", prov.getY());
            provItem.put("cities", cities);
            out.add(provItem);
        }
        return Result.ok(out);
    }

    /** 忽略大小写取 map 里的值（H2 的列别名会转大写，MySQL 不会） */
    private static Object pick(Map<String, Object> row, String key) {
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (e.getKey().equalsIgnoreCase(key)) {
                return e.getValue();
            }
        }
        return null;
    }
}
