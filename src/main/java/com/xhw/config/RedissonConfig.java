package com.xhw.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * redisson配置
 *
 * @author CHEN
 * @date 2022/10/10
 */
@Configuration
public class RedissonConfig {
    @Value("${spring.redis.host}")
    private String host;
    @Value("${spring.redis.port}")
    private String port;
    @Value("${spring.redis.password}")
    private String password;

    @Bean
    public RedissonClient redissonClient() {
        //配置
        Config config = new Config();
        // 密码为空时不设置，否则 Redisson 会发一条 AUTH 命令导致
        // "ERR Client sent AUTH, but no password is set"
        SingleServerConfig singleServer = config.useSingleServer()
                .setAddress("redis://" + host + ":" + port);
        if (password != null && !password.trim().isEmpty()) {
            singleServer.setPassword(password);
        }
        //创建对并且返回
        return Redisson.create(config);
    }

}
