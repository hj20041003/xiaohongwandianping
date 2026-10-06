package com.xhw.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xhw.dto.LoginFormDTO;
import com.xhw.dto.Result;
import com.xhw.entity.User;
import com.xhw.entity.UserInfo;

import javax.servlet.http.HttpSession;

/**
 * <p>
 * 服务类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
public interface IUserService extends IService<User> {

    /**
     * 发送验证码
     *
     * @param phone   手机号码
     * @param session 会话
     * @return {@link Result}
     */
    Result sendCode(String phone, HttpSession session);

    /**
     * 登录
     *
     * @param loginForm 登录表单
     * @param session   会话
     * @return {@link Result}
     */
    Result login(LoginFormDTO loginForm, HttpSession session);

    /**
     * 签到
     *
     * @return {@link Result}
     */
    Result sign();

    /**
     * 统计连续签到
     *
     * @return {@link Result}
     */
    Result signCount();

    /**
     * 修改当前登录用户的昵称与头像。
     * <p>
     * ⚠️ id 一律以登录态为准，**不接受前端传 userId** —— 和地址簿同一原则：
     * 实体上带着 id，前端完全可以塞一个别人的进来，服务端只认登录态。
     *
     * @param user 只取 nickName 与 icon 两个字段，其余忽略
     * @return {@link Result}
     */
    Result updateMe(User user);

    /**
     * 修改当前登录用户的资料详情（城市 / 性别 / 生日 / 简介）。
     * <p>
     * 用户可能还没有 tb_user_info 记录（新用户就是空的），
     * 所以这里是 upsert，不是单纯的 update。
     *
     * @param info 只取 city / gender / birthday / introduce，其余忽略
     * @return {@link Result}
     */
    Result updateMyInfo(UserInfo info);

    /**
     * 查某个用户的资料详情（<b>fans / followee 是现算的</b>）。
     * <p>
     * 这两个数<b>故意不读 tb_user_info 里的列</b>：关注关系同时存在于
     * {@code tb_follow} 和 Redis 的 {@code follows:{id}}，存列必然漂移
     * ——取关时漏改一次，那个数就永远错下去了。COUNT(tb_follow) 永远是真话。
     *
     * @param userId 用户 id
     * @return {@link Result} data 为 UserInfo
     */
    Result queryUserInfo(Long userId);

    /**
     * 给用户加减积分，并同步等级。
     * <p>
     * 积分规则（全项目只有这一处定义，别处不要自己加）：
     * <pre>
     *   每日签到   +5
     *   发布笔记   +10
     *   笔记被赞   +1
     *   笔记被评论 +2
     * </pre>
     * 等级由积分推导：{@code level = credits / 100 + 1}，上限 99
     * （{@code level} 是 tinyint，不封顶会溢出）。
     * <p>
     * 累加用一条 {@code UPDATE ... SET credits = credits + ?} 完成，
     * 是原子的；等级单独一条 UPDATE 从**新的** credits 推导 ——
     * 同一条 SQL 里 level 读到的还是旧值（SQL 的 SET 表达式都基于旧行）。
     *
     * @param userId 用户 id
     * @param delta  增量，可为负
     */
    void addCredits(Long userId, int delta);
}
