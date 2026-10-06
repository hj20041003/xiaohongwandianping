package com.xhw.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xhw.entity.UserInfo;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

/**
 * <p>
 * Mapper 接口
 * </p>
 *
 * @author 洪佳弘
 */
public interface UserInfoMapper extends BaseMapper<UserInfo> {

    /**
     * 给一个还没有资料行的用户补一行"全空"的记录。
     * <p>
     * <b>为什么不用 MyBatis-Plus 的 save：</b>
     * {@code tb_user_info.gender} 的列默认值是 {@code 0}，
     * 而 MyBatis-Plus 的 {@code save} 会**跳过 null 字段**，
     * 于是新用户的 gender 会被数据库填成 0。
     * 而本项目里 {@code gender = 0} 的含义是<b>男</b>（Boolean 的 false），
     * 也就是一个从没填过性别的用户会显示成"男" —— 一个很隐蔽的假数据。
     * <p>
     * 这里显式写 {@code NULL}，让"没填过"和"填了男"是两回事。
     * <p>
     * 并发下可能两个线程同时补行，第二个会撞主键（user_id 是主键）；
     * 调用方捕获 {@code DuplicateKeyException} 忽略即可 —— 那说明别人已经建好了。
     *
     * @param userId 用户 id
     */
    @Insert("INSERT INTO tb_user_info (user_id, credits, level, gender) VALUES (#{userId}, 0, 0, NULL)")
    void initRow(@Param("userId") Long userId);
}
