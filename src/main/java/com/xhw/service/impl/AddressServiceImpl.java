package com.xhw.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.Address;
import com.xhw.mapper.AddressMapper;
import com.xhw.service.IAddressService;
import com.xhw.utils.RegexUtils;
import com.xhw.utils.UserHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * <p>
 * 收货地址服务实现类
 * </p>
 *
 * @author 洪佳弘
 */
@Service
public class AddressServiceImpl extends ServiceImpl<AddressMapper, Address> implements IAddressService {

    /** 默认地址标记 */
    private static final int DEFAULT_YES = 1;
    private static final int DEFAULT_NO = 0;

    @Override
    public Result queryMine() {
        Long userId = currentUserId();
        if (userId == null) {
            return Result.fail("请先登录");
        }
        List<Address> list = lambdaQuery()
                .eq(Address::getUserId, userId)
                // 默认地址排最前，其余按最近修改排。
                // is_default 是 tinyint，降序就是"1 在前"。
                .orderByDesc(Address::getIsDefault)
                .orderByDesc(Address::getUpdateTime)
                .orderByDesc(Address::getId)
                .list();
        return Result.ok(list);
    }

    @Override
    public Result queryOne(Long id) {
        Address address = findMine(id);
        if (address == null) {
            // 不存在和"存在但不属于你"返回同一句话。
            // 区分开就等于告诉攻击者"这个 id 是有效的"，属于信息泄露。
            return Result.fail("地址不存在");
        }
        return Result.ok(address);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result saveAddress(Address address) {
        Long userId = currentUserId();
        if (userId == null) {
            return Result.fail("请先登录");
        }
        String err = validateAndNormalize(address);
        if (err != null) {
            return Result.fail(err);
        }
        long total = countMine(userId);
        // 第一条地址必须是默认地址。
        // 否则用户加完地址，"默认地址"那一栏还是空的，后面凡是要用地址的地方
        // 都得再处理一次"没有默认"的分支——在数据层消灭这种状态最省事。
        boolean asDefault = total == 0 || isYes(address.getIsDefault());
        if (asDefault) {
            clearDefault(userId);
        }
        address.setId(null);
        address.setUserId(userId);
        address.setIsDefault(asDefault ? DEFAULT_YES : DEFAULT_NO);
        save(address);
        return Result.ok(address.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result updateAddress(Address address) {
        Long userId = currentUserId();
        if (userId == null) {
            return Result.fail("请先登录");
        }
        if (address == null || address.getId() == null) {
            return Result.fail("id不能为空");
        }
        // 先按 (id, userId) 查一次——查得到才允许改。这一步同时完成了越权校验，
        // 不需要再单独判断 ownership。
        Address old = findMine(address.getId());
        if (old == null) {
            return Result.fail("地址不存在");
        }
        String err = validateAndNormalize(address);
        if (err != null) {
            return Result.fail(err);
        }
        long total = countMine(userId);
        // 三种情况都必须保持默认，不然会出现"一条地址都没有默认"的坏状态：
        //   ① 表单勾了"设为默认"
        //   ② 这条本来就是默认（取消勾选也不能真的取消，想换默认去设另一条）
        //   ③ 这是用户唯一的一条地址
        boolean asDefault = isYes(address.getIsDefault()) || isYes(old.getIsDefault()) || total <= 1;
        if (asDefault) {
            clearDefault(userId);
        }
        // userId 一律以登录态为准，防止前端把地址"改"到别人名下
        address.setUserId(userId);
        address.setIsDefault(asDefault ? DEFAULT_YES : DEFAULT_NO);
        updateById(address);
        return Result.ok();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result removeAddress(Long id) {
        Long userId = currentUserId();
        if (userId == null) {
            return Result.fail("请先登录");
        }
        Address old = findMine(id);
        if (old == null) {
            return Result.fail("地址不存在");
        }
        removeById(id);
        // 删掉的如果是默认地址，得从剩下的里补一个上来。
        // 少了这一步，"默认地址"会凭空消失，界面上那一栏永远是空的，
        // 而且用户没有任何办法把它弄回来（不能把"没有"设成默认）。
        if (isYes(old.getIsDefault())) {
            List<Address> rest = lambdaQuery()
                    .eq(Address::getUserId, userId)
                    .orderByAsc(Address::getId)
                    .list();
            if (!rest.isEmpty()) {
                update().set("is_default", DEFAULT_YES)
                        .eq("id", rest.get(0).getId())
                        .update();
            }
        }
        return Result.ok();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result setDefault(Long id) {
        Long userId = currentUserId();
        if (userId == null) {
            return Result.fail("请先登录");
        }
        Address old = findMine(id);
        if (old == null) {
            return Result.fail("地址不存在");
        }
        if (isYes(old.getIsDefault())) {
            // 本来就是默认，直接返回。做成幂等，前端重复点不会产生多余写库。
            return Result.ok();
        }
        clearDefault(userId);
        update().set("is_default", DEFAULT_YES).eq("id", id).update();
        return Result.ok();
    }

    /* ------------------------------------------------------------------ 内部 */

    /**
     * 按 (id, userId) 查当前用户的某条地址。查不到返回 null。
     * <p>
     * 所有"按 id 操作"的地方都走这个方法，从入口上杜绝水平越权：
     * 只要条件里有 user_id，别人的 id 就永远查不出来。
     */
    private Address findMine(Long id) {
        Long userId = currentUserId();
        if (userId == null || id == null) {
            return null;
        }
        return lambdaQuery()
                .eq(Address::getId, id)
                .eq(Address::getUserId, userId)
                .one();
    }

    private long countMine(Long userId) {
        return lambdaQuery().eq(Address::getUserId, userId).count();
    }

    /** 把该用户所有地址的 is_default 清成 0（设新默认之前调用） */
    private void clearDefault(Long userId) {
        update().set("is_default", DEFAULT_NO)
                .eq("user_id", userId)
                .eq("is_default", DEFAULT_YES)
                .update();
    }

    private boolean isYes(Integer v) {
        return v != null && v == DEFAULT_YES;
    }

    private Long currentUserId() {
        UserDTO user = UserHolder.getUser();
        return user == null ? null : user.getId();
    }

    /**
     * 校验并就地规范化。返回 null 表示通过，否则返回给用户看的错误文案。
     * <p>
     * 手机号用的是 {@link RegexUtils#isPhoneInvalid}，也就是
     * {@code RegexPatterns.PHONE_REGEX}——和登录页、发短信接口**同一条规则**。
     * 上一轮刚因为"前端一套、后端一套"排查了半天，这里不再重复那个错误。
     */
    private String validateAndNormalize(Address a) {
        if (a == null) {
            return "参数不能为空";
        }
        if (StrUtil.isBlank(a.getName())) {
            return "收货人不能为空";
        }
        if (StrUtil.isBlank(a.getPhone())) {
            return "手机号不能为空";
        }
        if (StrUtil.isBlank(a.getProvince())) {
            return "请选择省份";
        }
        if (StrUtil.isBlank(a.getCity())) {
            return "请选择城市";
        }
        if (StrUtil.isBlank(a.getDetail())) {
            return "详细地址不能为空";
        }
        // 先规范化再校验长度：不然 "  张三  " 这种前后带空格的会被误判超长
        a.setName(a.getName().trim());
        a.setPhone(a.getPhone().trim());
        a.setProvince(a.getProvince().trim());
        a.setCity(a.getCity().trim());
        if (a.getDistrict() != null) {
            a.setDistrict(a.getDistrict().trim());
        }
        a.setDetail(a.getDetail().trim());
        if (a.getName().length() > 32) {
            return "收货人最多 32 个字";
        }
        if (RegexUtils.isPhoneInvalid(a.getPhone())) {
            return "手机号格式看着不对";
        }
        if (a.getProvince().length() > 32) {
            return "省份名过长";
        }
        if (a.getCity().length() > 32) {
            return "城市名过长";
        }
        if (a.getDistrict() != null && a.getDistrict().length() > 32) {
            return "区县名过长";
        }
        if (a.getDetail().length() > 255) {
            return "详细地址最多 255 个字";
        }
        if (a.getTag() != null && (a.getTag() < 0 || a.getTag() > 3)) {
            return "标签不合法";
        }
        if (a.getTag() == null) {
            a.setTag(0);
        }
        return null;
    }
}
