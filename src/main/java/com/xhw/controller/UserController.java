package com.xhw.controller;


import cn.hutool.core.bean.BeanUtil;
import com.xhw.dto.LoginFormDTO;
import com.xhw.dto.Result;
import com.xhw.dto.UserDTO;
import com.xhw.entity.User;
import com.xhw.entity.UserInfo;
import com.xhw.service.IUserInfoService;
import com.xhw.service.IUserService;
import com.xhw.utils.RedisConstants;
import com.xhw.utils.RegexUtils;
import com.xhw.utils.UserHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Slf4j
@RestController
@RequestMapping("/user")
public class UserController {

    @Resource
    private IUserService userService;

    @Resource
    private IUserInfoService userInfoService;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    /**
     * 本地开发用的取码开关，由 xhw.dev-login-code 控制。
     * 默认 false —— 配置文件里没了这个开关，接口就自动失效（安全的那一侧兜底）。
     */
    @Value("${xhw.dev-login-code:false}")
    private boolean devLoginCode;

    @PostConstruct
    public void warnIfDevCodeOpen() {
        if (devLoginCode) {
            log.warn("xhw.dev-login-code=true：GET /user/code/dev 会把验证码直接返回给调用方，"
                    + "仅限本地开发。部署到别人能访问的环境前，务必改成 false。");
        }
    }

    /**
     * 短信限流开关，由 xhw.dev-skip-sms-limit 控制。
     * 这里读它只是为了「告诉前端」，真正的跳过逻辑在 {@code UserServiceImpl#sendCode}。
     */
    @Value("${xhw.dev-skip-sms-limit:false}")
    private boolean devSkipSmsLimit;

    /**
     * 【仅本地开发用】把当前的两项开发开关告诉前端。
     * <p>登录页需要知道「限流到底关没关」来决定要不要把按钮锁 60 秒：
     * 后端都不限流了、前端还把按钮锁着，就是自相矛盾——用户想再要一个验证码只能干等。
     * 这里只回两个布尔值，不含任何敏感信息；线上两个开关都是 false，
     * 回过去也就是 {@code {"skipSmsLimit":false,"devLoginCode":false}}。</p>
     */
    @GetMapping("/dev-settings")
    public Result devSettings() {
        Map<String, Boolean> settings = new HashMap<>(4);
        settings.put("skipSmsLimit", devSkipSmsLimit);
        settings.put("devLoginCode", devLoginCode);
        return Result.ok(settings);
    }

    /**
     * 发送手机验证码
     * 验证码会打印在后端控制台，本地开发无需接入真实短信网关
     */
    @PostMapping("code")
    public Result sendCode(@RequestParam("phone") String phone, HttpSession session) {
        return userService.sendCode(phone, session);
    }

    /**
     * 【仅本地开发用】把某手机号当前有效的验证码直接返回给前端。
     *
     * <p>为什么需要它：本地不接短信网关，验证码只打印在后端控制台；而本项目
     * 开了 {@code logging.level.com.xhw=debug}，MyBatis 每条 SQL 都打日志，
     * 那几行验证码很快就被刷走了，翻起来很烦。有了这个接口，登录页点完
     * 「获取验证码」就能把码显示出来并自动填入。</p>
     *
     * <p><b>⚠️ 这等于把验证码白送出去，是一个实打实的后门。</b>
     * 所以：由 {@code xhw.dev-login-code} 控制，关闭时直接返回失败、
     * 不泄露任何信息；部署前必须改 false。</p>
     */
    @GetMapping("/code/dev")
    public Result getDevCode(@RequestParam("phone") String phone) {
        if (!devLoginCode) {
            return Result.fail("取码接口已关闭");
        }
        if (RegexUtils.isPhoneInvalid(phone)) {
            return Result.fail("手机号格式错误");
        }
        String code = stringRedisTemplate.opsForValue()
                .get(RedisConstants.LOGIN_CODE_KEY + phone);
        if (code == null) {
            return Result.fail("验证码不存在或已过期，请先点获取验证码");
        }
        return Result.ok(code);
    }

    /**
     * 登录功能
     *
     * @param loginForm 登录参数，包含手机号、验证码；或者手机号、密码
     */
    @PostMapping("/login")
    public Result login(@RequestBody LoginFormDTO loginForm, HttpSession session) {
        // 实现登录功能
        return userService.login(loginForm, session);
    }

    /**
     * 登出功能
     *
     * @return 无
     */
    @PostMapping("/logout")
    public Result logout() {
        UserHolder.removeUser();
        return Result.ok();
    }

    @GetMapping("/me")
    public Result me() {
        //  获取当前登录的用户并返回
        return Result.ok(UserHolder.getUser());
    }

    /**
     * 修改我的昵称与头像
     * <p>
     * ⚠️ 请求体里带 id 也没用 —— 服务层一律用登录态里的 id 覆盖。
     * 这和地址簿是同一个原则：实体上有 id，就一定会有人往里塞别人的。
     */
    @PutMapping("/me")
    public Result updateMe(@RequestBody User user) {
        return userService.updateMe(user);
    }

    /**
     * 修改我的资料详情（城市 / 性别 / 生日 / 简介）
     * <p>
     * 是 upsert：新用户的 tb_user_info 是空的，直接 update 会"影响 0 行"，
     * 用户以为存上了其实什么也没写。服务层里处理了。
     */
    @PutMapping("/info")
    public Result updateMyInfo(@RequestBody UserInfo info) {
        return userService.updateMyInfo(info);
    }

    @GetMapping("/info/{id}")
    public Result info(@PathVariable("id") Long userId) {
        // 粉丝/关注数是现算的，所以走 service 而不是直接 getById（见 IUserService.queryUserInfo）
        return userService.queryUserInfo(userId);
    }

    @GetMapping("/{id}")
    public Result queryUserById(@PathVariable("id") Long userId) {
        User user = userService.getById(userId);
        if (user == null) {
            return Result.ok();
        }
        UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
        return Result.ok(userDTO);
    }

    @PostMapping("/sign")
    public Result sign() {
        return userService.sign();
    }

    @GetMapping("/sign/count")
    public Result signCount() {
        return userService.signCount();
    }
}
