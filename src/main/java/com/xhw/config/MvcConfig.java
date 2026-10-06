package com.xhw.config;

import com.xhw.interceptor.LoginInterceptor;
import com.xhw.interceptor.RefreshTokenInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.annotation.Resource;

/**
 * mvc配置
 *
 * @author CHEN
 * @date 2022/10/07
 */
@Configuration
public class MvcConfig implements WebMvcConfigurer {
    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        //登陆拦截器
        registry
                .addInterceptor(new LoginInterceptor())
                .excludePathPatterns("/user/code"
                        // 本地开发取码接口：登录页要在「还没登录」的时候调它，必须放行。
                        // 它自己由 xhw.dev-login-code 开关控制，关闭时返回失败。
                        , "/user/code/dev"
                        // 开发开关查询：登录页一进就要调，用来决定要不要锁 60 秒重发，
                        // 同样必须在「还没登录」时就能访问。
                        , "/user/dev-settings"
                        , "/user/login"
                        , "/blog/hot"
                        // 搜笔记：和 /blog/hot 一样，首页未登录也要能搜
                        , "/blog/search"
                        // 未读消息数：底部导航的"消息"小红点会在**每个页面**都问一次，
                        // 未登录时必须能拿到"0"而不是 401 —— 否则一进首页就被送进登录页。
                        // 服务层对没登录的情况返回 0，不报错。
                        , "/message/unread"
                        , "/shop/**"
                        , "/shop-type/**"
                        , "/upload/**"
                        , "/voucher/**"
                )
                .order(1);
        //Token续命拦截器
        registry
                .addInterceptor(new RefreshTokenInterceptor(stringRedisTemplate))
                .addPathPatterns("/**")
                .order(0);
    }
}
