package com.xhw.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import cn.hutool.core.lang.UUID;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xhw.dto.LoginFormDTO;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.User;
import com.xhw.entity.Follow;
import com.xhw.entity.UserInfo;
import com.xhw.mapper.FollowMapper;
import com.xhw.mapper.UserInfoMapper;
import com.xhw.mapper.UserMapper;
import com.xhw.service.IRegionService;
import com.xhw.service.IUserInfoService;
import com.xhw.service.IUserService;
import com.xhw.utils.RegexUtils;
import com.xhw.utils.UserHolder;
import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.connection.BitFieldSubCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static com.xhw.utils.RedisConstants.*;
import static com.xhw.utils.SystemConstants.USER_NICK_NAME_PREFIX;


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
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {
    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private IUserInfoService userInfoService;

    @Resource
    private IRegionService regionService;

    @Resource
    private UserInfoMapper userInfoMapper;

    @Resource
    private FollowMapper followMapper;

    /**
     * 本地开发用的「跳过短信限流」开关，由 xhw.dev-skip-sms-limit 控制。
     * <p>默认 false —— 保持原版真实的限流行为（1 分钟 1 条、5 分钟 5 条，
     * 超了升级到一级 5 分钟 / 二级 20 分钟限制）。本地反复调登录时这个限制很碍事，
     * 所以给了开关；<b>部署到别人能访问的环境前必须改回 false</b>，
     * 否则发短信接口会被刷爆。</p>
     */
    @Value("${xhw.dev-skip-sms-limit:false}")
    private boolean devSkipSmsLimit;

    @PostConstruct
    public void warnIfSmsLimitSkipped() {
        if (devSkipSmsLimit) {
            log.warn("xhw.dev-skip-sms-limit=true：已跳过短信限流，同一个手机号可以无限次取码，"
                    + "仅限本地开发。部署到别人能访问的环境前，务必改成 false。");
        }
    }

    @Override
    public Result sendCode(String phone, HttpSession session) {
        // 0. 校验手机号格式
        if (RegexUtils.isPhoneInvalid(phone)) {
            //手机号不符合
            return Result.fail("手机号格式错误");
        }

        // 1~4. 短信限流。
        //   这一段是经典的限流考点：用 Redis 的 Set 做分级限制（一级 5 分钟、
        //   二级 20 分钟），用 ZSet 按 1 分钟 / 5 分钟两个滑动窗口统计发送次数。
        //   逻辑原样保留，只是外面套了一个开发开关——否则本地想连续测几次登录，
        //   第二次就会被「距离上次发送时间不足1分钟」拦下来，连验证码都不生成。
        //   开关关掉后就是原版行为，用来演示/验收限流效果。
        if (devSkipSmsLimit) {
            log.info("[限流已跳过] xhw.dev-skip-sms-limit=true，手机号 {} 直接发码", phone);
        } else {
            // 1. 判断是否在一级限制条件内
            Boolean oneLevelLimit = stringRedisTemplate.opsForSet().isMember(ONE_LEVERLIMIT_KEY + phone, "1");
            if (oneLevelLimit != null && oneLevelLimit) {
                // 在一级限制条件内，不能发送验证码
                return Result.fail("您需要等5分钟后再请求");
            }

            // 2. 判断是否在二级限制条件内
            Boolean twoLevelLimit = stringRedisTemplate.opsForSet().isMember(TWO_LEVERLIMIT_KEY + phone, "1");
            if (twoLevelLimit != null && twoLevelLimit) {
                // 在二级限制条件内，不能发送验证码
                return Result.fail("您需要等20分钟后再请求");
            }

            // 3. 检查过去1分钟内发送验证码的次数
            long oneMinuteAgo = System.currentTimeMillis() - 60 * 1000;
            long count_oneminute = stringRedisTemplate.opsForZSet().count(SENDCODE_SENDTIME_KEY + phone, oneMinuteAgo, System.currentTimeMillis());
            if (count_oneminute >= 1) {
                // 过去1分钟内已经发送了1次，不能再发送验证码
                return Result.fail("距离上次发送时间不足1分钟，请1分钟后重试");
            }

            // 4. 检查发送验证码的次数
            long fiveMinutesAgo = System.currentTimeMillis() - 5 * 60 * 1000;
            long count_fiveminute = stringRedisTemplate.opsForZSet().count(SENDCODE_SENDTIME_KEY + phone, fiveMinutesAgo, System.currentTimeMillis());
            if (count_fiveminute % 3 == 2 && count_fiveminute > 5) {
                // 发送了8, 11, 14, ...次，进入二级限制
                stringRedisTemplate.opsForSet().add(TWO_LEVERLIMIT_KEY + phone, "1");
                stringRedisTemplate.expire(TWO_LEVERLIMIT_KEY + phone, 20, TimeUnit.MINUTES);
                return Result.fail("接下来如需再发送，请等20分钟后再请求");
            } else if (count_fiveminute == 5) {
                // 过去5分钟内已经发送了5次，进入一级限制
                stringRedisTemplate.opsForSet().add(ONE_LEVERLIMIT_KEY + phone, "1");
                stringRedisTemplate.expire(ONE_LEVERLIMIT_KEY + phone, 5, TimeUnit.MINUTES);
                return Result.fail("5分钟内已经发送了5次，接下来如需再发送请等待5分钟后重试");
            }
        }

        // 5. 生成验证码并存入 Redis（与登录时的 key 保持一致）
        String code = RandomUtil.randomNumbers(6);
        stringRedisTemplate.opsForValue().set(LOGIN_CODE_KEY + phone, code, LOGIN_CODE_TTL, TimeUnit.MINUTES);

        // 6. 本地开发环境没有接入真实短信网关，验证码直接打印到控制台
        //    接入阿里云/腾讯云短信时，把下面这行替换成真实的 SMS SDK 调用即可
        log.info("========================================");
        log.info("  [登录验证码] 手机号: {}  验证码: {}", phone, code);
        log.info("  请在 {} 分钟内使用，登录时填入该验证码", LOGIN_CODE_TTL);
        log.info("========================================");

        // 7. 更新发送时间和次数
        stringRedisTemplate.opsForZSet().add(SENDCODE_SENDTIME_KEY + phone, System.currentTimeMillis() + "", System.currentTimeMillis());

        return Result.ok();
    }

    @Override
    public Result login(LoginFormDTO loginForm, HttpSession session) {
        //校验手机号
        String phone = loginForm.getPhone();
        if (RegexUtils.isPhoneInvalid(phone)) {
            //手机号不符合
            return Result.fail("手机号格式错误");
        }
        //从redis中获取验证码 校验验证码
        /*  Object cacheCode = session.getAttribute("code");*/
        String cacheCode = stringRedisTemplate.opsForValue().get(LOGIN_CODE_KEY + phone);
        String code = loginForm.getCode();
        if (cacheCode == null || !cacheCode.equals(code)) {
            //不一致 报错
            return Result.fail("验证码错误");
        }
        //一致 根据手机号查询用户
        User user = baseMapper
                .selectOne(new LambdaQueryWrapper<User>()
                        .eq(User::getPhone, phone));
        //判断用户是否存在
        if (user == null) {
            //不存在 创建新用户
            user = createUserWithPhone(phone);
        }
        /*//保存用户信息到session
        session.setAttribute("user", BeanUtil.copyProperties(user, UserDTO.class));*/
        //生成token
        String token = UUID.randomUUID().toString(true);
        //userDTO转map
        UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
        Map<String, Object> map = BeanUtil.beanToMap(userDTO, new HashMap<>()
                , CopyOptions.create().setIgnoreNullValue(true)
                        .setFieldValueEditor(
                                (name, value) -> value.toString()
                        ));
        //保存用户信息到redis
        stringRedisTemplate.opsForHash().putAll(LOGIN_USER_KEY + token, map);
        //设置过期时间
        stringRedisTemplate.expire(LOGIN_USER_KEY + token, LOGIN_USER_TTL, TimeUnit.MINUTES);
        return Result.ok(token);
    }

    @Override
    public Result queryUserInfo(Long userId) {
        UserInfo info = userInfoService.getById(userId);
        if (info == null) {
            // 还没有资料行（新用户、或从没编辑过资料）。
            // 返回一个带 userId 的空壳，前端就不用到处判空
            info = new UserInfo();
            info.setUserId(userId);
            // level 补成 1：不补的话，"没有资料行"显示 0、"有资料行但 0 积分"显示 1，
            // 同一个 0 积分的用户会看到两个不同的等级。约定是 level = credits/100 + 1，
            // 所以 0 积分对应 1 级。
            info.setCredits(0);
            info.setLevel(1);
        }
        // fans / followee 现算，不读列 —— 理由见 IUserService.queryUserInfo 的注释。
        // 这里注入的是 FollowMapper 而不是 IFollowService：
        // FollowServiceImpl 反向依赖 IUserService，用 service 会形成循环依赖，
        // 而 Spring Boot 2.6+ 默认不允许（要 allow-circular-references 才能开）。
        info.setFans(Math.toIntExact(followMapper.selectCount(
                new LambdaQueryWrapper<Follow>().eq(Follow::getFollowUserId, userId))));
        info.setFollowee(Math.toIntExact(followMapper.selectCount(
                new LambdaQueryWrapper<Follow>().eq(Follow::getUserId, userId))));
        info.setCreateTime(null);
        info.setUpdateTime(null);
        return Result.ok(info);
    }

    @Override
    public void addCredits(Long userId, int delta) {
        if (userId == null || delta == 0) {
            return;
        }
        // 第 1 条：原子累加。coalesce 兜住"行存在但 credits 是 NULL"的历史脏数据；
        // greatest 兜住减到负数（比如删评论把加分退回去时）
        boolean ok = userInfoService.update(new LambdaUpdateWrapper<UserInfo>()
                .eq(UserInfo::getUserId, userId)
                .setSql("credits = greatest(coalesce(credits, 0) + " + delta + ", 0)"));
        if (!ok) {
            // 新用户还没有资料行，补一行再重新累加
            try {
                userInfoMapper.initRow(userId);
            } catch (DuplicateKeyException e) {
                // 并发下别人先建好了，忽略即可
            }
            userInfoService.update(new LambdaUpdateWrapper<UserInfo>()
                    .eq(UserInfo::getUserId, userId)
                    .setSql("credits = greatest(coalesce(credits, 0) + " + delta + ", 0)"));
        }
        // 第 2 条：等级从**新的** credits 推导。
        // 必须单独一条 —— 同一条 SQL 里所有 SET 表达式读到的都是旧行值，
        // 那样 level 会比 credits 晚一拍。
        userInfoService.update(new LambdaUpdateWrapper<UserInfo>()
                .eq(UserInfo::getUserId, userId)
                .setSql("level = least(greatest(coalesce(credits, 0), 0) / 100 + 1, 99)"));
    }

    @Override
    public Result sign() {
        //获取当前登陆用户
        Long id = UserHolder.getUser().getId();
        //获取日期
        LocalDateTime now = LocalDateTime.now();
        //拼接key
        String yyyyMM = now.format(DateTimeFormatter.ofPattern("yyyy:MM:"));
        String key = USER_SIGN_KEY + yyyyMM + id;
        //获取今天是本月的第几天
        int dayOfMonth = now.getDayOfMonth();
        //写了redis
        stringRedisTemplate.opsForValue().setBit(key, dayOfMonth - 1, true);
        // 签到 +5 积分（规则见 IUserService.addCredits 的注释）
        addCredits(id, 5);
        return Result.ok();
    }

    @Override
    public Result signCount() {
        //获取当前登陆用户
        Long id = UserHolder.getUser().getId();
        //获取日期
        LocalDateTime now = LocalDateTime.now();
        //拼接key
        String yyyyMM = now.format(DateTimeFormatter.ofPattern("yyyy:MM:"));
        String key = USER_SIGN_KEY + yyyyMM + id;
        //获取今天是本月的第几天
        int dayOfMonth = now.getDayOfMonth();
        //获取截至本月今天的所有签到记录
        List<Long> result = stringRedisTemplate.opsForValue().bitField(key
                , BitFieldSubCommands
                        .create()
                        .get(BitFieldSubCommands.BitFieldType
                                .unsigned(dayOfMonth))
                        .valueAt(0)
        );
        if (result == null || result.isEmpty()) {
            return Result.ok(0);
        }
        Long num = result.get(0);
        if (num == null || num == 0) {
            return Result.ok(0);
        }
        //转二进制字符串
        String binaryString = Long.toBinaryString(num);
        //计算连续签到天数
        int count = 0;
        for (int i = binaryString.length() - 1; i >= 0; i--) {
            if (binaryString.charAt(i) == '1') {
                count++;
            } else {
                break;
            }
        }
        //返回
        return Result.ok(count);
    }

    @Override
    public Result updateMe(User user) {
        UserDTO me = UserHolder.getUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        if (user == null) {
            return Result.fail("参数不能为空");
        }
        String nick = StrUtil.trimToNull(user.getNickName());
        if (nick == null) {
            return Result.fail("昵称不能为空");
        }
        if (nick.length() > 32) {
            return Result.fail("昵称最多 32 个字");
        }
        String icon = StrUtil.trimToNull(user.getIcon());
        if (icon != null && icon.length() > 255) {
            return Result.fail("头像地址过长");
        }

        User update = new User();
        // 只认登录态里的 id：实体上带着 id，前端完全可以把别人的塞进来
        update.setId(me.getId());
        update.setNickName(nick);
        // 用 UpdateWrapper 显式 set，而不是 updateById：
        // updateById **默认忽略 null 字段**，所以"清空头像"（icon = null）
        // 会静默不生效 —— 用户点了保存，头像还在。
        update(new LambdaUpdateWrapper<User>()
                .eq(User::getId, me.getId())
                .set(User::getNickName, nick)
                .set(User::getIcon, icon));

        // 同步刷掉 Redis 里那份登录态缓存。
        // 那个 hash 只在登录时写过一次，之后每个请求都从它读 —— 不刷的话，
        // 改完昵称刷新页面看到的还是旧的，看起来就像"没保存成功"。
        String token = UserHolder.getToken();
        if (token != null) {
            String key = LOGIN_USER_KEY + token;
            stringRedisTemplate.opsForHash().put(key, "nickName", nick);
            if (icon == null) {
                // 头像是"清空"的情况。put 一个 null 会抛异常，所以走 delete
                stringRedisTemplate.opsForHash().delete(key, "icon");
            } else {
                stringRedisTemplate.opsForHash().put(key, "icon", icon);
            }
        }

        // 同一个请求里的后续读取也要看到新值（响应体里就会带上）
        me.setNickName(nick);
        me.setIcon(icon);
        return Result.ok();
    }

    @Override
    public Result updateMyInfo(UserInfo info) {
        UserDTO me = UserHolder.getUser();
        if (me == null) {
            return Result.fail("请先登录");
        }
        if (info == null) {
            return Result.fail("参数不能为空");
        }
        String city = StrUtil.trimToNull(info.getCity());
        String introduce = StrUtil.trimToNull(info.getIntroduce());
        if (city != null && city.length() > 64) {
            return Result.fail("城市名过长");
        }
        // 拦住不合法的城市。不校验的话用户能把 city 写成任意字符串，
        // 页面上会显示一个不存在的城市，而且按城市筛选时永远查不到东西
        if (!regionService.hasCity(city)) {
            return Result.fail("这个城市不在区划数据里");
        }
        if (introduce != null && introduce.length() > 128) {
            return Result.fail("个人简介最多 128 个字");
        }
        LocalDate birthday = info.getBirthday();
        if (birthday != null) {
            if (birthday.isAfter(LocalDate.now())) {
                return Result.fail("生日不能是未来的日期");
            }
            if (birthday.isBefore(LocalDate.of(1900, 1, 1))) {
                return Result.fail("生日早于 1900 年");
            }
        }

        UserInfo update = new UserInfo();
        update.setUserId(me.getId());
        update.setCity(city);
        update.setIntroduce(introduce);
        update.setGender(info.getGender());
        update.setBirthday(birthday);

        // upsert：新用户的 tb_user_info 是**空的**（不是"有一行全是 null"），
        // 所以不能直接 updateById —— 那样影响 0 行，用户会以为保存成功了其实什么也没存。
        if (userInfoService.getById(me.getId()) == null) {
            userInfoService.save(update);
        } else {
            // ⚠️ 这里必须用 UpdateWrapper 显式 set 每一列，不能用 updateById。
            // updateById 默认**忽略 null 字段**，两个后果：
            //   ① 把城市/生日清空（传 null）根本不生效；
            //   ② 四个字段全是 null 时，生成的 SQL 是
            //      `UPDATE tb_user_info SET WHERE user_id = ?` —— 语法错误，直接 500。
            // （实测：只传 city="" 清空城市就会触发，报"服务器异常"。）
            userInfoService.update(new LambdaUpdateWrapper<UserInfo>()
                    .eq(UserInfo::getUserId, me.getId())
                    .set(UserInfo::getCity, city)
                    .set(UserInfo::getIntroduce, introduce)
                    .set(UserInfo::getGender, info.getGender())
                    .set(UserInfo::getBirthday, birthday));
        }
        return Result.ok();
    }

    private User createUserWithPhone(String phone) {
        User user = new User();
        user.setPhone(phone);
        //生成随机昵称
        user.setNickName(USER_NICK_NAME_PREFIX + RandomUtil.randomString(10));
        baseMapper.insert(user);
        return user;
    }
}
